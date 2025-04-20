import os
import random
import base64
import cv2
import numpy as np
import time
from datetime import datetime, timedelta
import re
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
import redis
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    CouldNotRetrieveTranscript,
)
from ..gpt_helper import generate_questions_from_transcript, generate_mcq_from_labels
from ..youtube import retreiveYoutubeMetaData
from ..yolov8_detector import detect_objects_from_base64
from PIL import Image
import io
import logging
import psutil

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()
router = APIRouter()

PROXY_USERNAME = os.getenv("WEBSHARE_USERNAME", "hvmlptke")
PROXY_PASSWORD = os.getenv("WEBSHARE_PASSWORD", "0wsd704fu1go")

PROXIES = [
    f"http://{PROXY_USERNAME}:{PROXY_PASSWORD}@185.199.228.220:7300",
]

MAX_TRANSCRIPT_LENGTH = 5000  # Characters to process for questions
IMAGE_PROCESSING_SIZE = (320, 320)  # Smaller size for faster processing

PROCESSING_TIME_ESTIMATES = {
    "Initializing": 5,
    "Fetching transcript": 10,
    "Processing transcript": 15,
    "Generating questions": 30,
    "Processing image": 10,
    "Detecting objects": 20,
}

PROCESSING_EXECUTOR = ThreadPoolExecutor(
    max_workers=2,  # Reduced from 4 for free tier
    thread_name_prefix="video_processor"
)

manual_transcripts = {
    "animal": """
Welcome to the wild! Discover amazing animals like the lion, elephant, cheetah, giraffe, and snake.
Lions rule the African savanna. Elephants are the largest land animals. Cheetahs are the fastest on land.
Giraffes are the tallest. Snakes are silent and sneaky hunters.
""",
    "vehicle_names": """
Let's learn vehicle names: car, jeep, motorcycle, scooter, van, bicycle, auto rickshaw, tractor, police car,
bus, lorry, train, airplane, submarine, helicopter, ship, rocket, boat, ambulance, crane, fire engine,
bulldozer, hot air balloon, cable car, tempo, forklift truck.
"""
}

# In-memory processing store
processing_results = {}

class VideoInput(BaseModel):
    youtube_url: str = None
    image_base64: str = None
    title: str = None

class AnswerInput(BaseModel):
    answer: str
    question_id: str
    selected_label: str
    timestamp: float

# Starter that sets up redis to help speedup some of the object detection
@router.on_event("startup")
async def initialize_cache():
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        logger.warning("REDIS_URL not set, using in-memory cache")
        FastAPICache.init(InMemoryBackend(), prefix="video-cache")
        return

    try:
        redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
            health_check_interval=30
        )
        if not redis_client.ping():
            raise redis.ConnectionError("Redis ping failed")

        FastAPICache.init(RedisBackend(redis_client), prefix="video-cache")
        logger.info("Redis cache initialized successfully")

    except Exception as e:
        logger.error(f"Redis connection failed: {str(e)}")
        FastAPICache.init(InMemoryBackend(), prefix="video-cache-mem")
        logger.info("Using in-memory cache as fallback")

# Have transcript endpoint use caches to alleviate some of workload
@router.get("/transcript/{video_id}")
@cache(expire=int(timedelta(hours=24).total_seconds()))
async def get_cached_transcript(video_id: str):
    try:
        transcript = await get_transcript_with_retry(video_id)
        return {"status": "success", "transcript": transcript}
    except Exception as e:
        logger.error(f"Transcript error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

async def get_transcript_with_retry(video_id: str, retries=3):
    """Helper function with retry logic for transcripts"""
    for attempt in range(retries):
        try:
            proxy = random.choice(PROXIES) if PROXIES and attempt > 0 else None
            return YouTubeTranscriptApi.get_transcript(
                video_id,
                languages=["en"],
                proxies={"https": proxy} if proxy else None
            )
        except Exception as e:
            if attempt == retries - 1:
                logger.warning(f"Transcript failed, using manual fallback")
                return manual_transcripts.get(video_id, "")
            await asyncio.sleep(1 + attempt)  # Exponential backoff

# Optimized image processing
def process_image(image_base64: str):
    """Optimized image processing pipeline"""
    try:
        # Decode and resize
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        image_np = np.array(image)
        image_resized = cv2.resize(image_np, IMAGE_PROCESSING_SIZE)

        # Compress before detection
        _, buffer = cv2.imencode(".jpg", image_resized, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        return base64.b64encode(buffer).decode("utf-8")
    except Exception as e:
        logger.error(f"Image processing error: {str(e)}")
        raise

# Main processing endpoint
@router.post("/video/process/{video_id}")
async def start_video_processing(video_id: str, payload: VideoInput, background_tasks: BackgroundTasks):
    """Start optimized video processing"""
    cleanup_old_entries()

    processing_results[video_id] = {
        "status": "processing",
        "start_time": time.time(),
        "progress": "Initializing",
        "timeout_at": time.time() + 180  # 3 minute timeout
    }

    background_tasks.add_task(run_optimized_processing, video_id, payload)

    return {
        "status": "processing",
        "video_id": video_id,
        "check_status_url": f"/api/v1/video/results/{video_id}",
        "started_at": datetime.now().isoformat()
    }

async def run_optimized_processing(video_id: str, payload: VideoInput):
    """Optimized processing pipeline"""
    entry = processing_results[video_id]
    loop = asyncio.get_running_loop()

    try:
        # Set a timeout for the entire processing
        async with asyncio.timeout(600):  # 3 minute timeout
            # Image processing path
            if payload.image_base64:
                entry["progress"] = "Processing image"
                processed_image = await loop.run_in_executor(
                    PROCESSING_EXECUTOR,
                    partial(process_image, payload.image_base64)
                )

                entry["progress"] = "Detecting objects"
                labels = await loop.run_in_executor(
                    PROCESSING_EXECUTOR,
                    partial(detect_objects_from_base64, processed_image)
                )

                entry["progress"] = "Generating questions"
                question_obj = await loop.run_in_executor(
                    PROCESSING_EXECUTOR,
                    partial(generate_mcq_from_labels, labels)
                )

                entry.update({
                    "status": "complete",
                    "question": question_obj,
                    "objects": labels,
                    "completed_at": datetime.now().isoformat()
                })

            # YouTube processing path
            elif payload.youtube_url:
                entry["progress"] = "Fetching transcript"
                video_id = extract_video_id(payload.youtube_url)
                transcript_raw = await get_transcript_with_retry(video_id)

                entry["progress"] = "Processing transcript"
                transcript = " ".join([t['text'] for t in transcript_raw])[:MAX_TRANSCRIPT_LENGTH]

                entry["progress"] = "Generating questions"
                question_obj = await loop.run_in_executor(
                    PROCESSING_EXECUTOR,
                    partial(generate_questions_from_transcript,
                            payload.title or "Video",
                            transcript)
                )

                entry.update({
                    "status": "complete",
                    "question": question_obj,
                    "completed_at": datetime.now().isoformat()
                })

    except asyncio.TimeoutError:
        logger.error(f"Processing timed out for video {video_id}")
        entry.update({
            "status": "timeout",
            "error": "Processing took too long",
            "failed_at": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Processing failed: {str(e)}")
        entry.update({
            "status": "error",
            "error": str(e),
            "failed_at": datetime.now().isoformat()
        })

@router.get("/video/results/{video_id}")
def get_processing_results(video_id: str):
    """Check processing results with automatic cleanup"""
    cleanup_old_entries()

    if video_id not in processing_results:
        return {"status": "not_started"}

    result = processing_results[video_id].copy()

    if result["status"] == "processing":
        elapsed = time.time() - result["start_time"]
        current_step = result.get("progress", "Initializing")

        # Calculate remaining time dynamically
        step_estimate = PROCESSING_TIME_ESTIMATES.get(current_step, 30)
        remaining = max(5, step_estimate - (elapsed % step_estimate))  # More dynamic calculation

        result.update({
            "elapsed_seconds": elapsed,
            "estimated_remaining": remaining,
            "progress": current_step
        })

    return result

def cleanup_old_entries():
    """Cleanup entries older than 1 hour"""
    now = time.time()
    for vid in list(processing_results.keys()):
        entry = processing_results[vid]
        if "start_time" in entry and (now - entry["start_time"] > 3600):
            del processing_results[vid]

@router.post("/video/cancel/{video_id}")
async def cancel_processing(video_id: str):
    if video_id in processing_results:
        processing_results[video_id].update({
            "status": "cancelled",
            "cancelled_at": datetime.now().isoformat()
        })
        return {"status": "cancelled"}
    raise HTTPException(status_code=404, detail="Video not found in processing")

@router.post("/video/answer")
def answer_question(payload: AnswerInput):
    correct = payload.answer.strip().lower() == payload.selected_label.strip().lower()
    logger.info("Video Answer endpoint called")
    return {"correct": correct}

@router.post("/video/explain")
def explain_wrong_answer(payload: dict):
    from openai import ChatCompletion
    import openai
    openai.api_key = os.getenv("OPENAI_API_KEY")

    prompt = f"""
You are an AI tutor for kids. A student gave a wrong answer to the following quiz:

❓ Question: {payload['question']}
🟰 Their Answer: {payload['selected_label']}
✅ Correct Answer: {payload['answer']}

Options: {', '.join(payload['options'])}

Please explain *briefly* and kindly why the answer is incorrect, and encourage them to try again or rewatch the video.
Respond with a single friendly sentence.
"""

    try:
        response = ChatCompletion.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        explanation = response.choices[0].message.content.strip()
        logger.info("Explanation called")
        return {"message": explanation}

    except Exception as e:
        print("❌ GPT explanation error:", e)
        return {"message": "Oops! Something went wrong trying to explain the answer."}

def extract_video_id(url: str) -> str:
    if "embed/" in url:
        return url.split("embed/")[-1]
    elif "watch?v=" in url:
        return url.split("watch?v=")[-1]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[-1]
    else:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL format.")


