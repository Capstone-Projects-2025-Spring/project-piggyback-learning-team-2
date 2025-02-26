import torch
import cv2
import numpy as np
import pandas as pd
import math
import os
import sys
import json
import yt_dlp
import logging
from torch.serialization import add_safe_globals
from yolov7.models.yolo import Model  # Import the Model class
import time
import boto3
from botocore.exceptions import ClientError
import io
from dotenv import load_dotenv
import traceback

# Load environment variables
load_dotenv("aws_storage_credentials.env")

# Debugging: Print environment variables
print(f"AWS_ACCESS_KEY_ID: {os.getenv('AWS_ACCESS_KEY_ID')}")
print(f"AWS_SECRET_ACCESS_KEY: {os.getenv('AWS_SECRET_ACCESS_KEY')}")
print(f"AWS_DEFAULT_REGION: {os.getenv('AWS_DEFAULT_REGION')}")
print(f"S3_BUCKET_NAME: {os.getenv('S3_BUCKET_NAME')}")

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_DEFAULT_REGION = os.getenv('AWS_DEFAULT_REGION')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')
S3_FRAMES_PREFIX = os.getenv('S3_FRAMES_PREFIX', 'frames/')
S3_TIMESTAMPS_PREFIX = os.getenv('S3_TIMESTAMPS_PREFIX', 'timestamps/')

if not S3_BUCKET_NAME:
    raise ValueError("S3_BUCKET_NAME environment variable is not set")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TRAINING_VIDEOS_FILE = "aws_storage_test.json"
WEIGHTS_PATH = 'yolov7.pt'

sys.path.append(os.path.join(os.path.dirname(__file__), "yolov7"))

def init_s3_client():
    """Initialize and return an S3 client."""
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_DEFAULT_REGION
        )
        logger.info(f"S3 client initialized with bucket: {S3_BUCKET_NAME}")
        return s3_client
    except Exception as e:
        logger.error(f"Error initializing S3 client: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def upload_file_to_s3(s3_client, file_data, s3_key, is_binary=True):
    """Upload a file (in memory) to S3."""
    try:
        logger.info(f"Uploading data to s3://{S3_BUCKET_NAME}/{s3_key}")
        if is_binary:
            s3_client.put_object(Bucket=S3_BUCKET_NAME, Key=s3_key, Body=file_data)
        else:
            s3_client.put_object(Bucket=S3_BUCKET_NAME, Key=s3_key, Body=file_data.getvalue())
        logger.info(f"Successfully uploaded data to {s3_key}")
        return True
    except ClientError as e:
        logger.error(f"S3 ClientError: {str(e)}")
        logger.error(traceback.format_exc())
        return False
    except Exception as e:
        logger.error(f"General error uploading to S3: {str(e)}")
        logger.error(traceback.format_exc())
        return False

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

def load_training_videos():
    try:
        with open(TRAINING_VIDEOS_FILE, "r") as f:
            data = json.load(f)
            if "aws_storage_test" not in data:
                raise ValueError("Invalid JSON structure: 'aws_storage_test' key not found")
            return data["aws_storage_test"]
    except Exception as e:
        logger.error(f"Error loading training videos: {str(e)}")
        raise

def process_video(video_url, video_id, s3_client=None, frame_interval=30):
    """
    Extracts frames and timestamps from the video and uploads them directly to S3.
    """
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            logger.info(f"Processing video {video_id}, attempt {retry_count + 1}")
            cap = cv2.VideoCapture(video_url)

            if not cap.isOpened():
                raise ValueError("Could not open video stream")
            logger.info(f"Video stream opened successfully for video {video_id}")

            frame_data = []  # Stores (frame_index, timestamp)
            frame_count = 0  # Total frames processed
            saved_frame_count = 1  # Start at 1 for sequential naming

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    logger.warning(f"Failed to read frame {frame_count} for video {video_id}")
                    break
                logger.debug(f"Read frame {frame_count} for video {video_id}")

                if frame_count % frame_interval == 0:
                    # Get the nearest second rounding up
                    timestamp = math.ceil(cap.get(cv2.CAP_PROP_POS_MSEC) / 1000)

                    # Encode frame as JPEG in memory
                    _, buffer = cv2.imencode(".jpg", frame)
                    if buffer is None:
                        logger.error(f"Failed to encode frame {frame_count} for video {video_id}")
                        continue
                    frame_bytes = io.BytesIO(buffer)

                    # Upload frame to S3
                    if s3_client:
                        s3_key = f"{S3_FRAMES_PREFIX}video_{video_id}/frame_{saved_frame_count}.jpg"
                        logger.info(f"Attempting to upload frame {saved_frame_count} to S3: {s3_key}")
                        upload_success = upload_file_to_s3(s3_client, frame_bytes, s3_key, is_binary=True)
                        if upload_success:
                            logger.info(f"Uploaded frame {saved_frame_count} to S3 successfully")
                        else:
                            logger.warning(f"Failed to upload frame {saved_frame_count} to S3")

                    # Save frame index and timestamp
                    frame_data.append((saved_frame_count, timestamp))
                    logger.debug(f"Added frame {saved_frame_count} to frame_data for video {video_id}")
                    saved_frame_count += 1

                frame_count += 1

            cap.release()

            # Create CSV in memory
            if frame_data:
                csv_data = io.StringIO()
                df = pd.DataFrame(frame_data, columns=["frame_index", "timestamp_seconds"])
                df.to_csv(csv_data, index=False)

                # Upload CSV to S3
                if s3_client:
                    s3_csv_key = f"{S3_TIMESTAMPS_PREFIX}video_{video_id}_timestamps.csv"
                    logger.info(f"Attempting to upload CSV to S3: {s3_csv_key}")
                    upload_success = upload_file_to_s3(s3_client, csv_data, s3_csv_key, is_binary=False)
                    if upload_success:
                        logger.info(f"Uploaded timestamps CSV for video {video_id} to S3")
                    else:
                        logger.warning(f"Failed to upload timestamps CSV for video {video_id}")

            logger.info(f"Processing complete for video {video_id}")
            return frame_data  # Return full mapping for debugging if needed

        except Exception as e:
            retry_count += 1
            logger.error(f"Attempt {retry_count} failed for video {video_id}: {str(e)}")
            logger.error(traceback.format_exc())
            if retry_count == max_retries:
                logger.error(f"Max retries reached. Could not process video {video_id}.")
                return []
            time.sleep(2)

if __name__ == "__main__":
    try:
        # Initialize S3 client
        s3_client = init_s3_client()
        logger.info("Initialized S3 client successfully")

        # Load training videos
        with open(TRAINING_VIDEOS_FILE, "r") as f:
            training_videos = json.load(f).get("aws_storage_test", [])

        logger.info(f"Loaded {len(training_videos)} videos")

        for video in training_videos:
            youtube_url = video["Link"]
            video_id = video["ID"]

            logger.info(f"Processing video {video_id}: {youtube_url}")

            try:
                video_stream_url = stream_youtube_video(youtube_url)
                if not video_stream_url:
                    logger.error(f"Could not get stream URL for video {video_id}")
                    continue

                # Process video with S3 support
                frame_data = process_video(video_stream_url, video_id, s3_client, frame_interval=30)
                if not frame_data:
                    logger.warning(f"No frames generated for video {video_id}")

            except Exception as e:
                logger.error(f"Error processing video {video_id}: {str(e)}")
                logger.error(traceback.format_exc())

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        logger.error(traceback.format_exc())

'''
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

'''