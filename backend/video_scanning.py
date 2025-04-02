import time
import os
import sys
import logging
import numpy as np
import json
import cv2
import torch
import traceback
import re
import yt_dlp
from dotenv import load_dotenv
import threading

# Import functions from audio_scanning.py
from audio_Scanning import generate_questions_from_youtube, validate_youtube_url

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Configure CORS properly
CORS(app, resources={
    r"/health": {"origins": "*"},
    r"/verify_url": {"origins": "*"},
    r"/process": {"origins": "*"},
    r"/results": {"origins": "*"}
})

@app.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Enhanced health check endpoint"""
    response = jsonify({
        "status": "healthy",
        "version": "1.0",
        "timestamp": time.time()
    })
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    return response

app.config['UPLOAD_FOLDER'] = ('frames')
# Add the yolov7 directory to the Python path
yolov7_path = os.path.join(os.path.dirname(__file__), "yolov7")
sys.path.append(yolov7_path)

from yolov7.models.experimental import attempt_load
from yolov7.utils.general import non_max_suppression
from yolov7.utils.torch_utils import select_device

# Load environment variables
load_dotenv("aws_storage_credentials.env")

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_DEFAULT_REGION = os.getenv('AWS_DEFAULT_REGION')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')
S3_FRAMES_PREFIX = os.getenv('S3_FRAMES_PREFIX', 'frames/')
S3_TIMESTAMPS_PREFIX = os.getenv('S3_TIMESTAMPS_PREFIX', 'timestamps/')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WEIGHTS_PATH = 'yolov7.pt'

# Function to ensure clean files before processing
def ensure_clean_files():
    """Delete existing output files to ensure fresh generation."""
    files_to_clean = ["questions.txt", "updated_questions.txt"]
    for file in files_to_clean:
        if os.path.exists(file):
            try:
                os.remove(file)
                logger.info(f"Removed existing {file}")
            except Exception as e:
                logger.warning(f"Failed to remove {file}: {str(e)}")

# Load YOLOv7 model
def load_yolov7_model(weights_path):
    device = select_device('')
    model = attempt_load(weights_path, map_location=device)
    return model, device

# Detect objects in a frame using YOLOv7
def detect_objects(model, device, frame):
    # Ensure frame has the right dimensions and type
    if frame is None:
        logger.error("Cannot detect objects: frame is None")
        return []

    try:
        # Resize image to match YOLOv7 expected input (640x640 is standard)
        img_size = 640
        h, w = frame.shape[:2]

        # Calculate resize ratio while maintaining aspect ratio
        r = img_size / max(h, w)
        if r != 1:
            interp = cv2.INTER_AREA if r < 1 else cv2.INTER_LINEAR
            new_size = (int(w * r), int(h * r))
            logger.info(f"Resizing image from {w}x{h} to {new_size[0]}x{new_size[1]}")
            img = cv2.resize(frame, new_size, interpolation=interp)
        else:
            img = frame.copy()

        # Create square canvas for the image (padding with zeros)
        square_img = np.zeros((img_size, img_size, 3), dtype=np.uint8)

        # Center the resized image on the square canvas
        offset_x = (img_size - img.shape[1]) // 2
        offset_y = (img_size - img.shape[0]) // 2
        square_img[offset_y:offset_y+img.shape[0], offset_x:offset_x+img.shape[1]] = img

        # Convert to tensor and normalize
        img_tensor = torch.from_numpy(square_img).to(device)
        img_tensor = img_tensor.permute(2, 0, 1).float() / 255.0  # HWC to CHW and normalize
        if img_tensor.ndimension() == 3:
            img_tensor = img_tensor.unsqueeze(0)  # Add batch dimension

        # Model prediction
        with torch.no_grad():  # No need to track gradients
            pred = model(img_tensor)[0]

        # Apply NMS
        pred = non_max_suppression(pred, 0.25, 0.45)

        # Log detection success
        logger.info(f"Successfully ran detection, found {sum(len(d) for d in pred)} objects")
        return pred

    except Exception as e:
        logger.error(f"Error during object detection: {str(e)}")
        logger.error(traceback.format_exc())
        return []  # Return empty list on error

# Extract frame at a specific timestamp
def extract_frame_at_timestamp(video_url, timestamp, max_retries=3):
    retry_count = 0
    logger.info(f"Attempting to extract frame at timestamp: {timestamp} seconds")

    while retry_count < max_retries:
        try:
            cap = cv2.VideoCapture(video_url)
            if not cap.isOpened():
                raise ValueError(f"Could not open video stream: {video_url}")

            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps if fps > 0 else 0

            logger.info(f"Video properties: FPS={fps}, Duration={duration}s, Total frames={total_frames}")

            if timestamp > duration:
                logger.warning(f"Timestamp {timestamp}s exceeds video duration {duration}s")
                # If timestamp exceeds duration, use the last frame
                timestamp = max(0, duration - 1)

            # Convert timestamp to frame number
            frame_number = int(timestamp * fps)
            logger.info(f"Seeking to frame number: {frame_number} (timestamp: {timestamp}s)")

            # Seek to frame
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()

            if not ret:
                raise ValueError(f"Failed to read frame at timestamp {timestamp}s (frame {frame_number})")

            cap.release()
            logger.info(f"Successfully extracted frame at {timestamp}s")
            return frame

        except Exception as e:
            retry_count += 1
            logger.error(f"Attempt {retry_count} failed to extract frame at {timestamp}s: {str(e)}")
            logger.error(traceback.format_exc())

            if retry_count == max_retries:
                logger.error(f"Max retries reached. Could not extract frame at {timestamp}s.")
                return None  # Return None instead of raising to continue with other timestamps

            # Small delay before retry
            import time
            time.sleep(2)

# Get YouTube video stream URL using yt-dlp
def get_youtube_stream_url(youtube_url):
    logger.info(f"Attempting to stream video: {youtube_url}")

    ydl_opts = {
        'format': 'best[ext=mp4]/best',  # Modified to be more flexible
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,  # Changed to False to get full info
        'ignoreerrors': True
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info("Extracting video info...")
            info = ydl.extract_info(youtube_url, download=False)

            if info is None:
                raise ValueError(f"Could not extract video info for {youtube_url}")

            if 'formats' not in info:
                logger.error(f"No formats found in info dict: {info}")
                raise ValueError("No video formats found")

            formats = [f for f in info['formats'] if f.get('vcodec') != 'none']
            if not formats:
                raise ValueError("No valid video formats found")

            # Sort formats by quality
            formats.sort(key=lambda f: f.get('height', 0), reverse=True)
            best_format = formats[0]
            video_url = best_format['url']

            logger.info(f"Successfully extracted video URL (format: {best_format.get('format_id')})")
            return video_url

    except Exception as e:
        logger.error(f"Error in get_youtube_stream_url: {str(e)}")
        logger.error(traceback.format_exc())
        raise

# Parse questions.txt file to extract questions and timestamps
def parse_questions_file(filename="questions.txt"):
    file_path = os.path.join(os.getcwd(), filename)
    logger.info(f"Parsing questions file: {file_path}")

    # Check if file exists
    if not os.path.exists(file_path):
        logger.error(f"Questions file {file_path} does not exist")
        return []

    try:
        with open(file_path, 'r') as file:
            content = file.read()

        # Extract questions (numbered list)
        questions = re.findall(r'\d+\.\s+(.*?)(?=\n\d+\.|\n\s*$|\n\n|$)', content, re.DOTALL)
        questions = [q.strip() for q in questions]

        # Extract timestamps
        timestamp_line = re.search(r'Timestamps:(.*?)(?=\n|$)', content)
        if not timestamp_line:
            logger.error("No timestamps found in the file")
            return []

        # Replace the timestamp parsing section with:
        timestamp_text = timestamp_line.group(1).strip()
        # Extract numbers from format like "1.25, 2.30"
        timestamps = re.findall(r'(\d+)\.(\d+)', timestamp_text)

        if not timestamps:
            # Try alternative format without 's'
            timestamps = re.findall(r'(\d+)\s*:\s*(\d+)', timestamp_text)
            if not timestamps:
                logger.error(f"Could not parse timestamps from: {timestamp_text}")
                return []

        # Convert to seconds
        parsed_timestamps = []
        for question_num, seconds in timestamps:
            # Convert to float (e.g., "1.10s" becomes 10 seconds for question 1)
            timestamp = float(seconds)
            question_index = int(question_num) - 1  # Convert to 0-based index

            if 0 <= question_index < len(questions):
                parsed_timestamps.append((questions[question_index], timestamp))
            else:
                logger.warning(f"Invalid question index: {question_index+1}, max: {len(questions)}")

        logger.info(f"Successfully parsed {len(parsed_timestamps)} questions with timestamps")
        return parsed_timestamps

    except Exception as e:
        logger.error(f"Error parsing questions file: {str(e)}")
        logger.error(traceback.format_exc())
        return []

# Process video and extract frames at specific timestamps
def process_video(video_url, timestamps):
    frames = []
    for timestamp in timestamps:
        try:
            logger.info(f"Processing timestamp: {timestamp}s")
            frame = extract_frame_at_timestamp(video_url, timestamp)
            if frame is not None:
                frames.append((timestamp, frame))
                logger.info(f"Successfully extracted frame at {timestamp}s")
            else:
                logger.warning(f"No frame extracted at {timestamp}s")
        except Exception as e:
            logger.error(f"Failed to extract frame at {timestamp}s: {str(e)}")
            # Continue with other frames even if one fails
            continue

    return frames

# Helper function to format detected objects for human readability
def format_detections(detections, class_names):
    results = []
    for detection in detections:
        if len(detection) == 0:
            continue

        for det in detection:
            # Get class index, confidence, and coordinates
            *xyxy, conf, cls = det.cpu().numpy()
            class_name = class_names[int(cls)]
            results.append(f"{class_name} ({conf:.2f})")

    return ", ".join(results) if results else "None"

# Wait for a file to be generated with timeout
def wait_for_file(file_path, timeout=300, check_interval=5):
    """Wait for a file to be generated with timeout."""
    logger.info(f"Waiting for file to be generated: {file_path}")
    start_time = time.time()

    while not os.path.exists(file_path):
        if time.time() - start_time > timeout:
            logger.error(f"Timeout waiting for {file_path} to be generated")
            return False

        logger.info(f"File {file_path} not yet available, waiting...")
        time.sleep(check_interval)

    # Check if file has content
    if os.path.getsize(file_path) == 0:
        logger.error(f"File {file_path} exists but is empty")
        return False

    logger.info(f"File {file_path} is available")
    return True

def run_processing(youtube_url):
    try:
        # Set up directories
        os.makedirs("frames", exist_ok=True)
        ensure_clean_files()

        # Audio processing
        raw_questions_text = generate_questions_from_youtube(youtube_url) # Get the raw text
        if not wait_for_file("questions.txt", timeout=300):
            raise Exception("Question generation timeout (saving raw text failed)")

        # Parsing questions and timestamps (WE ARE BYPASSING THIS FOR NOW)
        # questions_with_timestamps = parse_questions_file("questions.txt")

        # Video processing (THIS WILL LIKELY NOT WORK CORRECTLY NOW DUE TO MISSING PARSED TIMESTAMPS)
        stream_url = get_youtube_stream_url(youtube_url)
        model, device = load_yolov7_model(WEIGHTS_PATH)
        # timestamps = [ts for _, ts in parse_questions_file("questions.txt")] # This will likely be empty

        frames = []
        # if timestamps: # Only process frames if we have timestamps (TEMPORARILY REMOVE THIS CHECK)
        #     frames = process_video(stream_url, timestamps)
        #     for timestamp, frame in frames:
        #         cv2.imwrite(f"frames/frame_{timestamp}.jpg", frame)

        # Object detection (THIS WILL LIKELY NOT WORK CORRECTLY NOW)
        # updated_questions = []
        # for q, ts in parse_questions_file():
        #     frame_data = next((f for t, f in frames if t == ts), None)
        #     if frame_data:
        #         detections = detect_objects(model, device, frame_data)
        #         obj_str = format_detections(detections, model.names)
        #         updated_questions.append(f"{q} (Objects: {obj_str})")

        # Save results (WE ARE SAVING THE RAW QUESTIONS HERE)
        with open("updated_questions.txt", "w") as f:
            f.write(raw_questions_text) # Save the raw text

        return raw_questions_text # Return the raw text

    except Exception as e:
        logger.error(f"Processing failed: {str(e)}")
        return False

# Progress tracking for audio processing
processing_status = {
    'current': 'not_started',
    'message': ''
}

@app.route('/progress', methods=['GET'])
def get_progress():
    return jsonify({
        'status': processing_status['current'],
        'message': processing_status['message']
    })

def update_progress(status, message):
    processing_status['current'] = status
    processing_status['message'] = message
    print(f"Progress: {status} - {message}")


@app.route('/process', methods=['POST'])
def handle_request():
    try:
        data = request.get_json()
        print(f"Received processing request for: {data.get('url')}")

        if not data or 'url' not in data:
            logger.error("No URL provided in request")
            return jsonify({"error": "Missing YouTube URL"}), 400

        # Verify URL again in case frontend validation was bypassed
        if not validate_youtube_url(data['url']):
            return jsonify({"error": "Invalid YouTube URL"}), 400

        # Run processing in background thread
        thread = threading.Thread(
            target=run_processing,
            args=(data['url'],)
        )
        thread.start()

        return jsonify({
            "status": "processing_started",
            "message": "Video is being processed. Check /results later."
        })

    except Exception as e:
        logger.error(f"API error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/verify_url', methods=['POST'])
def verify_url():
    """Endpoint to validate YouTube URLs before processing"""
    from audio_Scanning import validate_youtube_url

    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"valid": False, "error": "No URL provided"}), 400

    is_valid = validate_youtube_url(data['url'])
    return jsonify({
        "valid": is_valid,
        "error": "Invalid YouTube URL" if not is_valid else None
    })

@app.route('/results', methods=['GET'])
def get_results():
    """Check if processing is done with better status reporting"""
    if not os.path.exists("questions.txt"):
        return jsonify({
            "status": "processing",
            "progress": processing_status.get('message', 'In progress')
        })

    try:
        with open("questions.txt", "r") as f:
            raw_questions = f.read()

        # We are now sending the raw questions directly
        return jsonify({
            "status": "complete",
            "questions": raw_questions,
            "frames": [
                f"frames/{f}"
                for f in os.listdir("frames")
                if f.endswith('.jpg')
            ]
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        })

@app.route('/test', methods=['GET', 'OPTIONS'])
def test_endpoint():
    """Simple test endpoint"""
    response = jsonify({"message": "Backend is working!"})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)

'''
import time
import os
import sys
import logging
from pathlib import Path
import numpy as np
import cv2
import torch
import shutil
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
from yolov7_loader import load_yolov7_model
from shutil import rmtree
from yolov7.models.yolo import Model
__all__ = ['Model']

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


#supabase = init_supabase()

# Add yolov7 to path
# Get absolute path to yolov7
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
yolov7_path = os.path.join(project_root, 'yolov7')

# Force Python to prioritize yolov7 imports
sys.path.insert(0, yolov7_path)

# Now import with absolute path
from yolov7.models.experimental import attempt_load  # Explicit "yolov7." prefix
from yolov7.utils.general import non_max_suppression
from yolov7.utils.torch_utils import select_device


# Configuration
#WEIGHTS_PATH = '../yolov7.pt'
WEIGHTS_PATH = Path(__file__).parent.parent / 'yolov7.pt'  # Absolute path
print(f"Weights exist: {WEIGHTS_PATH.exists()}")

class VideoProcessor:
    def __init__(self):
        # Create temp directory first
        self.temp_dir = Path(tempfile.mkdtemp(prefix='piggyback_frames_'))
        print(f"Temporary directory created at: {self.temp_dir}")

        try:
            # Then load model using the imported function
            self.model, self.device = load_yolov7_model(WEIGHTS_PATH)
        except Exception as e:
            # Clean up if initialization fails
            self.cleanup()
            raise RuntimeError(f"Failed to initialize VideoProcessor: {str(e)}")

    # Rest of the class remains the same
    def cleanup(self):
        if hasattr(self, 'temp_dir') and self.temp_dir.exists():
            shutil.rmtree(self.temp_dir, ignore_errors=True)

    def __del__(self):
        self.cleanup()

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
            #self.save_to_supabase(video_id, youtube_url, questions_data, frames_data)

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