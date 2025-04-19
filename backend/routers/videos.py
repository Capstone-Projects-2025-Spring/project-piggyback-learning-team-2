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
from fastapi_cache.backends.redis import Redis, RedisBackend
from fastapi_cache.decorator import cache
import redis
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio
from concurrent.futures import ThreadPoolExecutor
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

def get_redis_client():
    return redis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379"),
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5,
        health_check_interval=30
    )

# Starter that sets up redis to help speedup some of the object detection
@router.on_event("startup")
async def initialize_cache():
    redis_client = get_redis_client()
    try:
        # Test connection
        redis_client.ping()
        FastAPICache.init(RedisBackend(redis_client), prefix="video-cache")
        logger.info("Redis cache initialized successfully")
    except redis.RedisError as e:
        logger.error(f"Redis connection failed: {str(e)}")
        # Fallback to in-memory cache
        from fastapi_cache.backends.inmemory import InMemoryBackend
        FastAPICache.init(InMemoryBackend(), prefix="video-cache-mem")

# Have transcript endpoint use caches to alleviate some of workload
@router.get("/transcript/{video_id}")
@cache(expire=int(timedelta(hours=24).total_seconds()))
async def get_cached_transcript(video_id: str):
    try:
        # Your existing transcript logic
        transcript = await YouTubeTranscriptApi.get_transcript(
            video_id,
            languages=["en"],
            proxies=random.choice(PROXIES) if PROXIES else None
        )
        return {"status": "success", "transcript": transcript}
    except Exception as e:
        logger.error(f"Transcript error for {video_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/video/answer")
def answer_question(payload: AnswerInput):
    correct = payload.answer.strip().lower() == payload.selected_label.strip().lower()
    logger.info("Video Answer endpoint called")
    return {"correct": correct}

@router.post("/video/process/{video_id}")
async def start_video_processing(video_id: str, payload: VideoInput, background_tasks: BackgroundTasks):
    """Start video processing with proper cleanup and progress tracking"""
    # Cleanup any stale entries
    cleanup_old_entries()

    # Initialize processing entry
    processing_results[video_id] = {
        "status": "processing",
        "start_time": time.time(),
        "last_update": time.time(),
        "progress": "Initializing",
        "timeout_at": time.time() + 300  # 5 minute timeout
    }

    background_tasks.add_task(run_processing_job, video_id, payload)

    return {
        "status": "processing",
        "video_id": video_id,
        "check_status_url": f"/api/v1/video/results/{video_id}",
        "started_at": datetime.now().isoformat()
    }

def run_processing_job(video_id: str, payload: VideoInput):
    try:
        entry = processing_results[video_id]
        # 📷 Local image
        if payload.image_base64:
            image_data = base64.b64decode(payload.image_base64)
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            image_np = np.array(image)
            image_resized = cv2.resize(image_np, (640, 640))
            _, buffer = cv2.imencode(".jpg", image_resized)
            resized_base64 = base64.b64encode(buffer).decode("utf-8")

            labels = detect_objects_from_base64(resized_base64)
            if not labels:
                processing_results[video_id] = {"status": "complete", "question": None, "objects": []}
                return

            question_obj = generate_mcq_from_labels(labels)
            processing_results[video_id] = {
                "status": "complete",
                "question": {"id": "img1", **question_obj},
                "objects": labels,
                "video_id": video_id,
                "title": payload.title or "Image"
            }

        # 📼 YouTube video
        elif payload.youtube_url:
            entry["progress"] = "Fetching YouTube transcript"
            yt_id = extract_video_id(payload.youtube_url)

            # Try with proxies first
            transcript_raw = None
            for proxy in random.sample(PROXIES, len(PROXIES)):
                try:
                    transcript_raw = YouTubeTranscriptApi.get_transcript(
                        yt_id,
                        languages=["en"],
                        proxies={"https": proxy}
                    )
                    break
                except Exception:
                    continue

            # Fallback to direct fetch if proxies fail
            if not transcript_raw:
                try:
                    transcript_raw = YouTubeTranscriptApi.get_transcript(yt_id, languages=["en"])
                except Exception as e:
                    logger.warning(f"Transcript fetch failed: {str(e)}")
                    transcript_raw = None

            if not transcript_raw:
                transcript = manual_transcripts.get(video_id, "")
                if not transcript:
                    raise HTTPException(status_code=404, detail="Transcript unavailable")
            else:
                transcript = " ".join([t['text'] for t in transcript_raw])

            entry["progress"] = "Generating questions"
            question_obj = generate_questions_from_transcript(payload.title or "Video", transcript)

            processing_results[video_id].update({
                "status": "complete",
                "question": {"id": "transcript1", **question_obj},
                "completed_at": datetime.now().isoformat(),
                "processing_time": time.time() - entry["start_time"],
                "progress": "Done"
            })

    except Exception as e:
        processing_results[video_id].update({
            "status": "error",
            "error": str(e),
            "failed_at": datetime.now().isoformat()
        })
        logger.error(f"Processing failed for {video_id}: {str(e)}")

@router.get("/video/results/{video_id}")
def get_processing_results(video_id: str):
    """Check processing results with automatic cleanup"""
    cleanup_old_entries()

    if video_id not in processing_results:
        return {"status": "not_started"}

    result = processing_results[video_id].copy()

    # Add progress info if still processing
    if result["status"] == "processing":
        elapsed = time.time() - result["start_time"]
        result.update({
            "elapsed_seconds": elapsed,
            "estimated_remaining": max(0, result["timeout_at"] - time.time()),
            "progress": result.get("progress", "In progress")
        })

    return result

def cleanup_old_entries():
    """Cleanup entries older than 1 hour"""
    now = time.time()
    for vid in list(processing_results.keys()):
        entry = processing_results[vid]
        if "start_time" in entry and (now - entry["start_time"] > 3600):
            del processing_results[vid]

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


