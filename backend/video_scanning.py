import time
import os
import sys
import logging
import numpy as np
import cv2
import torch
import traceback
import re
import yt_dlp
from dotenv import load_dotenv
import threading
import uuid
from datetime import datetime
from supabase import create_client
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import shutil

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={
    r"/*": {"origins": "*"}  # Open for all routes for Render deployment
})

processing_status = {}

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase
def init_supabase():
    load_dotenv()
    return create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

supabase = init_supabase()

# Add yolov7 to path
yolov7_path = os.path.join(os.path.dirname(__file__), "yolov7")
sys.path.append(yolov7_path)
from yolov7.models.experimental import attempt_load
from yolov7.utils.general import non_max_suppression
from yolov7.utils.torch_utils import select_device

# Configuration
WEIGHTS_PATH = '../yolov7.pt'

class VideoProcessor:
    def __init__(self):
        self.model, self.device = self.load_model()
        self.temp_dir = tempfile.mkdtemp(prefix='piggyback_frames_')

    def __del__(self):
        """Clean up temporary directory when processor is destroyed"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def load_model(self):
        """Load YOLOv7 model"""
        device = select_device('')
        model = attempt_load(WEIGHTS_PATH, map_location=device)
        return model, device

    def process_video(self, youtube_url, video_id):
        """Main processing pipeline"""
        try:
            self.update_status(video_id, 'processing', 10, 'Starting processing')

            # Generate questions
            self.update_status(video_id, 'processing', 30, 'Generating questions')
            questions_data = self.generate_questions_data(youtube_url)

            # Process video frames
            self.update_status(video_id, 'processing', 60, 'Processing video frames')
            stream_url = self.get_youtube_stream_url(youtube_url)
            frames_data = self.process_frames(stream_url, questions_data['timestamps'])

            # Save to Supabase
            self.update_status(video_id, 'processing', 90, 'Saving results')
            self.save_to_supabase(video_id, youtube_url, questions_data, frames_data)

            self.update_status(video_id, 'complete', 100, 'Processing complete')
            return True

        except Exception as e:
            self.update_status(video_id, 'error', 0, str(e))
            logger.error(f"Processing failed: {str(e)}")
            return False

    def generate_questions_data(self, youtube_url):
        """Generate structured questions data"""
        from backend.audio_Scanning import generate_questions_from_youtube
        questions_with_ts = generate_questions_from_youtube(youtube_url)
        return {
            'questions': [
                {
                    'text': q,
                    'timestamp': ts,
                    'options': self.extract_options(q),
                    'feedback': self.extract_feedback(q)
                }
                for q, ts in questions_with_ts
            ],
            'timestamps': [ts for _, ts in questions_with_ts]
        }

    def extract_options(self, question_text):
        """Extract multiple choice options from question text"""
        options = {}
        for option in ['A', 'B', 'C', 'D']:
            match = re.search(rf'{option}\)\s*(.+?)(?=\n[A-D]\)|$)', question_text)
            if match:
                options[option] = match.group(1).strip()
        return options

    def extract_feedback(self, question_text):
        """Extract feedback for each option"""
        feedback = {}
        feedback_block = re.search(r'Feedback:(.*?)(?=\n\d+\.|\n*$)', question_text, re.DOTALL)
        if feedback_block:
            for option in ['A', 'B', 'C', 'D']:
                match = re.search(rf'{option}\)\s*(.+?)(?=\n[A-D]\)|$)', feedback_block.group(1))
                if match:
                    feedback[option] = match.group(1).strip()
        return feedback

    def process_frames(self, stream_url, timestamps):
        """Process video frames at specified timestamps"""
        frames_data = []
        for timestamp in timestamps:
            frame = self.extract_frame_at_timestamp(stream_url, timestamp)
            if frame:
                # Save to temp directory (not stored in DB)
                frame_path = os.path.join(self.temp_dir, f"frame_{timestamp}.jpg")
                cv2.imwrite(frame_path, frame)

                # Detect objects
                detections = self.detect_objects(frame)
                frames_data.append({
                    'timestamp': timestamp,
                    'objects': self.format_detections(detections)
                })
        return frames_data

    def save_to_supabase(self, video_id, youtube_url, questions_data, frames_data):
        """Save results to Supabase (without frame images)"""
        result = supabase.table('video_results').insert({
            'video_id': video_id,
            'video_url': youtube_url,
            'questions': questions_data['questions'],
            'frames_data': frames_data,
            'created_at': datetime.now().isoformat()
        }).execute()

        if not result.data:
            raise Exception("Failed to save to Supabase")

    def extract_frame_at_timestamp(self, video_url, timestamp, max_retries=3):
        """Extract frame at specific timestamp"""
        retry_count = 0
        while retry_count < max_retries:
            try:
                cap = cv2.VideoCapture(video_url)
                if not cap.isOpened():
                    raise ValueError(f"Could not open video stream: {video_url}")

                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_number = int(timestamp * fps)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
                ret, frame = cap.read()
                cap.release()

                if not ret:
                    raise ValueError(f"Failed to read frame at timestamp {timestamp}s")

                return frame

            except Exception as e:
                retry_count += 1
                logger.warning(f"Attempt {retry_count} failed: {str(e)}")
                if retry_count == max_retries:
                    logger.error(f"Max retries reached for timestamp {timestamp}s")
                    return None
                time.sleep(1)

    def detect_objects(self, frame):
        """Detect objects in frame using YOLOv7"""
        try:
            # Preprocess frame
            img = cv2.resize(frame, (640, 640))
            img_tensor = torch.from_numpy(img).to(self.device)
            img_tensor = img_tensor.permute(2, 0, 1).float() / 255.0
            if img_tensor.ndimension() == 3:
                img_tensor = img_tensor.unsqueeze(0)

            # Detect objects
            with torch.no_grad():
                pred = self.model(img_tensor)[0]
            return non_max_suppression(pred, 0.25, 0.45)

        except Exception as e:
            logger.error(f"Detection failed: {str(e)}")
            return []

    def format_detections(self, detections):
        """Format detected objects into readable strings"""
        if not detections or len(detections) == 0:
            return []
        return [
            f"{self.model.names[int(cls)]} ({conf:.2f})"
            for det in detections
            for *_, conf, cls in det
        ]

    def get_youtube_stream_url(self, youtube_url):
        """Get direct stream URL using yt-dlp"""
        ydl_opts = {
            'format': 'best[ext=mp4]/best',
            'quiet': True,
            'no_warnings': True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            return info['url']

    def update_status(self, video_id, status, progress, message):
        """Update processing status"""
        global processing_status
        processing_status[video_id] = {
            'status': status,
            'progress': progress,
            'message': message,
            'last_updated': time.time()
        }

# Initialize processor
processor = VideoProcessor()

@app.route('/process', methods=['POST'])
def handle_process():
    """Handle video processing requests"""
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"error": "Missing YouTube URL"}), 400

    from backend.audio_Scanning import validate_youtube_url
    if not validate_youtube_url(data['url']):
        return jsonify({"error": "Invalid YouTube URL"}), 400

    video_id = str(uuid.uuid4())
    processor.update_status(video_id, 'queued', 0, 'Waiting to start')

    threading.Thread(
        target=processor.process_video,
        args=(data['url'], video_id)
    ).start()

    return jsonify({
        "video_id": video_id,
        "status_url": f"/status/{video_id}"
    })

@app.route('/status/<video_id>', methods=['GET'])
def get_status(video_id):
    """Check processing status"""
    global processing_status
    status = processing_status.get(video_id, {
        'status': 'not_found',
        'message': 'Video ID not found'
    })

    if status['status'] == 'complete':
        result = supabase.table('video_results') \
            .select('*') \
            .eq('video_id', video_id) \
            .single() \
            .execute()

        if result.data:
            return jsonify({**status, "data": result.data})

    return jsonify(status)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Render"""
    return jsonify({
        "status": "healthy",
        "version": "1.0",
        "timestamp": time.time()
    })

@app.route('/verify_url', methods=['POST'])
def verify_url():
    """Validate YouTube URLs"""
    from backend.audio_Scanning import validate_youtube_url
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"valid": False, "error": "No URL provided"}), 400
    return jsonify({
        "valid": validate_youtube_url(data['url']),
        "error": None
    })

if __name__ == '__main__':
    os.makedirs('temp_frames', exist_ok=True)
    app.run(host='0.0.0.0', port=8000)
'''
# Main function
def main():
    # Set up directories for output
    os.makedirs("frames", exist_ok=True)

    # Import time here to avoid circular import
    import time

    # Ensure clean files before starting
    ensure_clean_files()

    youtube_url = "https://www.youtube.com/watch?v=J20eXhZTHEo"
    logger.info(f"Starting processing for video: {youtube_url}")

    try:
        # Always generate new questions first
        logger.info("Generating new questions from audio...")
        questions_with_timestamps = generate_questions_from_youtube(youtube_url)

        # Wait for the questions file to be generated
        if not wait_for_file("questions.txt", timeout=300):
            logger.error("Failed to generate questions.txt or timeout occurred")
            return

        # Re-parse the file to ensure consistency
        file_questions = parse_questions_file("questions.txt")

        # Use file-based questions if available, otherwise use the directly returned ones
        if file_questions:
            questions_with_timestamps = file_questions
            logger.info(f"Using {len(questions_with_timestamps)} questions from file")
        else:
            logger.info(f"Using {len(questions_with_timestamps)} questions from direct return")

        if not questions_with_timestamps:
            logger.error("No valid questions with timestamps available")
            return

        # Get streaming URL for video processing
        stream_url = get_youtube_stream_url(youtube_url)
        logger.info("Successfully obtained stream URL")

        # Load YOLOv7 model
        model, device = load_yolov7_model(WEIGHTS_PATH)
        logger.info("YOLOv7 model loaded successfully!")

        # Get class names from the model
        class_names = model.names if hasattr(model, 'names') else {i: f'class{i}' for i in range(1000)}

        # Extract timestamps for frame extraction
        timestamps = [timestamp for _, timestamp in questions_with_timestamps]

        # Extract frames at question timestamps
        frames = process_video(stream_url, timestamps)
        logger.info(f"Extracted {len(frames)} frames from video")

        if not frames:
            logger.error("No frames were successfully extracted")
            return

        # Clear frames directory before saving new frames
        for file in os.listdir("frames"):
            if file.startswith("frame_") and file.endswith(".jpg"):
                os.remove(os.path.join("frames", file))
                logger.info(f"Removed old frame file: {file}")

        # Save extracted frames
        for i, (timestamp, frame) in enumerate(frames):
            frame_path = f"frames/frame_{timestamp}.jpg"
            cv2.imwrite(frame_path, frame)
            logger.info(f"Saved frame at {timestamp}s to {frame_path}")

        # Detect objects in frames and update questions
        updated_questions = []
        for (question, timestamp) in questions_with_timestamps:
            # Find the corresponding frame
            frame_data = next(((t, f) for t, f in frames if t == timestamp), None)

            if frame_data is None:
                logger.warning(f"No frame found for timestamp {timestamp}s")
                updated_questions.append(question)
                continue

            _, frame = frame_data

            # Detect objects
            detections = detect_objects(model, device, frame)
            detected_objects = format_detections(detections, class_names)

            # Update question with detection results
            updated_question = f"{question} (Detected Objects: {detected_objects})"
            updated_questions.append(updated_question)
            logger.info(f"Updated question with detections for timestamp {timestamp}s")

        # Save updated questions (ensuring file is overwritten)
        with open("updated_questions.txt", "w") as file:
            for question in updated_questions:
                file.write(f"{question}\n")
        logger.info("Saved updated questions to updated_questions.txt")

        # Print updated questions
        print("\nUpdated Questions with Object Detections:")
        for question in updated_questions:
            print(question)

    except Exception as e:
        logger.error(f"An error occurred during processing: {str(e)}")
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    main()
'''