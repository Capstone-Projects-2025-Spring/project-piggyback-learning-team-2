import torch
import cv2
import numpy as np
import os
import sys
import json
import shutil
import yolov7.models.experimental
from yolov7.utils.general import non_max_suppression, scale_coords
import yt_dlp
import logging
from torch.serialization import add_safe_globals
from yolov7.models.yolo import Model  # Import the Model class
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TRAINING_VIDEOS_FILE = "training_videos.json"
FRAMES_DIR = "frames"
WEIGHTS_PATH = 'yolov7.pt'

sys.path.append(os.path.join(os.path.dirname(__file__), "yolov7"))

def load_yolov7_model():
    """Load YOLOv7 model with PyTorch 2.6 compatibility."""
    try:
        # Check if weights file exists
        if not os.path.exists(WEIGHTS_PATH):
            raise FileNotFoundError(f"YOLOv7 weights file not found at {WEIGHTS_PATH}")

        # Set device
        if torch.cuda.is_available():
            device = torch.device('cuda')
        elif torch.backends.mps.is_available():
            device = torch.device('mps')
        else:
            device = torch.device('cpu')

        logger.info(f"Using device: {device}")

        # Add Model class to safe globals
        add_safe_globals([Model])

        # Load model with modified settings
        try:
            # First try loading with weights_only=False
            model = yolov7.models.experimental.attempt_load(WEIGHTS_PATH, map_location=device, weights_only=True)
        except Exception as e:
            logger.warning(f"First loading attempt failed, trying alternative method: {str(e)}")
            # If that fails, try direct torch.load with weights_only=False
            checkpoint = torch.load(WEIGHTS_PATH, map_location=device, weights_only=False)
            model = Model(checkpoint['model'].yaml).to(device)
            model.load_state_dict(checkpoint['model'].float().state_dict())

        if model is None:
            raise ValueError("Model loading returned None")

        model.eval()
        logger.info("Model loaded successfully")
        return model, device

    except Exception as e:
        logger.error(f"Error in load_yolov7_model: {str(e)}")
        raise

# Rest of the code remains the same...
def stream_youtube_video(url):
    logger.info(f"Attempting to stream video: {url}")

    ydl_opts = {
        'format': 'best[ext=mp4]',
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'ignoreerrors': True
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info("Extracting video info...")
            info = ydl.extract_info(url, download=False)

            if info is None:
                raise ValueError(f"Could not extract video info for {url}")

            if 'formats' not in info:
                logger.error(f"No formats found in info dict: {info}")
                raise ValueError("No video formats found")

            formats = [f for f in info['formats'] if f.get('vcodec') != 'none']
            if not formats:
                raise ValueError("No valid video formats found")

            best_format = formats[-1]
            video_url = best_format['url']

            logger.info("Successfully extracted video URL")
            return video_url

    except Exception as e:
        logger.error(f"Error in stream_youtube_video: {str(e)}")
        raise

def clear_frames_folder():
    if os.path.exists(FRAMES_DIR):
        shutil.rmtree(FRAMES_DIR)
    os.makedirs(FRAMES_DIR)

def load_training_videos():
    try:
        with open(TRAINING_VIDEOS_FILE, "r") as f:
            data = json.load(f)
            if "training_videos" not in data:
                raise ValueError("Invalid JSON structure: 'training_videos' key not found")
            return data["training_videos"]
    except Exception as e:
        logger.error(f"Error loading training videos: {str(e)}")
        raise

'''
def process_video(video_url, model, device, frame_interval=150):
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            logger.info(f"Attempting to process video (attempt {retry_count + 1})")
            cap = cv2.VideoCapture(video_url)

            if not cap.isOpened():
                raise ValueError("Could not open video stream")

            timestamps = []
            frame_count = 0

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % frame_interval == 0:
                    timestamp = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
                    timestamps.append(timestamp)

                    img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    img = torch.from_numpy(img).to(device)
                    img = img.float() / 255.0
                    if img.ndimension() == 3:
                        img = img.unsqueeze(0)


                    pred = model(img, augment=False)[0]
                    pred = non_max_suppression(pred, 0.25, 0.45, classes=None, agnostic=False)


                    if len(pred):
                        frame_filename = f"frames/frame_{int(timestamp)}.jpg"
                        os.makedirs("frames", exist_ok=True)
                        cv2.imwrite(frame_filename, frame)
                        logger.info(f"Saved frame at {timestamp:.2f} seconds -> {frame_filename}")

                frame_count += 1

            cap.release()
            return timestamps

        except Exception as e:
            retry_count += 1
            logger.error(f"Attempt {retry_count} failed: {str(e)}")
            if retry_count == max_retries:
                logger.error("Max retries reached. Could not process video.")
                return []
            time.sleep(2)

'''
def process_video(video_url, video_id, frame_interval=30):
    max_retries = 3
    retry_count = 0

    # Create a folder for this video inside the frames directory
    video_frames_dir = os.path.join(FRAMES_DIR, f"video_{video_id}")
    os.makedirs(video_frames_dir, exist_ok=True)

    while retry_count < max_retries:
        try:
            logger.info(f"Attempting to process video {video_id} (attempt {retry_count + 1})")
            cap = cv2.VideoCapture(video_url)

            if not cap.isOpened():
                raise ValueError("Could not open video stream")

            timestamps = []
            frame_count = 0

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % frame_interval == 0:
                    timestamp = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
                    timestamps.append(timestamp)

                    frame_filename = os.path.join(video_frames_dir, f"frame_{int(timestamp)}.jpg")
                    cv2.imwrite(frame_filename, frame)
                    logger.info(f"Saved frame at {timestamp:.2f} seconds -> {frame_filename}")

                frame_count += 1

            cap.release()
            return timestamps

        except Exception as e:
            retry_count += 1
            logger.error(f"Attempt {retry_count} failed for video {video_id}: {str(e)}")
            if retry_count == max_retries:
                logger.error(f"Max retries reached. Could not process video {video_id}.")
                return []
            time.sleep(2)

def generate_questions(timestamps):
    return [f"What is happening at {timestamp:.2f} seconds?" for timestamp in timestamps]

if __name__ == "__main__":
    clear_frames_folder()

    try:
        training_videos = load_training_videos()
        logger.info(f"Loaded {len(training_videos)} videos from training data")

        # Load model once before processing videos
        # model, device = load_yolov7_model()
        # logger.info("YOLOv7 model loaded successfully")

        for video in training_videos:
            youtube_url = video["Link"]
            video_id = video["ID"]  # Ensure "ID" is unique per video
            logger.info(f"\nProcessing video number {video_id} with link {youtube_url}")

            try:
                video_stream_url = stream_youtube_video(youtube_url)
                if not video_stream_url:
                    logger.error(f"Could not get stream URL for video {video_id}")
                    continue

                timestamps = process_video(video_stream_url, video_id, frame_interval=30)  # Ensure correct function call

                if not timestamps:
                    logger.warning(f"No timestamps generated for video {video_id}")
                    continue

                #questions = generate_questions(timestamps)
                #for q in questions:
                    #print(q)

            except Exception as e:
                logger.error(f"Error processing video {video_id}: {str(e)}")
                continue

    except Exception as e:
        logger.error(f"Fatal error in main execution: {str(e)}")
