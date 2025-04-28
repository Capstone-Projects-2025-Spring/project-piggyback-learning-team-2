import os
import random
import base64
import cv2
import numpy as np
import time
from datetime import datetime, timedelta
import re
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
import redis
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio
from concurrent.futures import ThreadPoolExecutor, Future
from functools import partial
from youtube_transcript_api import YouTubeTranscriptApi
from typing import List, Dict, Optional
import math
import requests
import logging
from PIL import Image, ImageOps
import io
from io import BytesIO
import threading

from ..gpt_helper import generate_questions_from_transcript, generate_mcq_from_labels
from ..youtube import retreiveYoutubeMetaData
from ..yolov8_detector import detect_objects_from_base64

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

# Constants and Configuration
class Config:
    PROXY_URL = os.getenv("PROXY_URL", f"http://{os.getenv('WEBSHARE_USERNAME')}:{os.getenv('WEBSHARE_PASSWORD')}@185.199.228.220:7300")
    PROXIES = [PROXY_URL] if PROXY_URL else []
    MAX_TRANSCRIPT_LENGTH = 5000
    IMAGE_PROCESSING_SIZE = (320, 320)
    PROCESSING_TIME_ESTIMATES = {
        "Initializing": 5,
        "Fetching transcript": 10,
        "Processing transcript": 15,
        "Generating questions": 30,
        "Processing image": 10,
        "Detecting objects": 20,
    }
    PROCESSING_EXECUTOR = ThreadPoolExecutor(
        max_workers=2,
        thread_name_prefix="video_processor"
    )
    MANUAL_TRANSCRIPTS = {
        "animal": "Welcome to the wild! Discover amazing animals...",
        "vehicle_names": "Let's learn vehicle names: car, jeep..."
    }

# Initialize FastAPI router
router = APIRouter()
processing_results = {}
cancellation_events = {}  # Track cancellation events per video
processing_tasks = {}

# Models
class VideoInput(BaseModel):
    youtube_url: Optional[str] = None
    image_base64: Optional[str] = None
    title: Optional[str] = None
    full_analysis: bool = False
    num_questions: int = 5
    keyframe_interval: int = 30

class AnswerInput(BaseModel):
    answer: str
    question_id: str
    selected_label: str
    timestamp: float

# Helper Functions
async def get_transcript_with_retry(video_id: str, retries=3) -> str:
    """Helper function with retry logic for transcripts"""
    for attempt in range(retries):
        try:
            proxy = random.choice(Config.PROXIES) if Config.PROXIES and attempt > 0 else None
            return YouTubeTranscriptApi.get_transcript(
                video_id,
                languages=["en"],
                proxies={"https": proxy} if proxy else None
            )
        except Exception:
            if attempt == retries - 1:
                logger.warning("Transcript failed, using manual fallback")
                return Config.MANUAL_TRANSCRIPTS.get(video_id, "")
            await asyncio.sleep(1 + attempt)

def process_image(image_base64: str) -> str:
    """Optimized image processing pipeline"""
    try:
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        image_np = np.array(ImageOps.exif_transpose(image))  # Handle EXIF orientation
        image_resized = cv2.resize(image_np, Config.IMAGE_PROCESSING_SIZE)
        _, buffer = cv2.imencode(".jpg", image_resized, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        return base64.b64encode(buffer).decode("utf-8")
    except Exception as e:
        logger.error(f"Image processing error: {str(e)}")
        raise

async def update_processing_state(video_id: str, **kwargs):
    """Helper to update processing state"""
    if video_id in processing_results:
        processing_results[video_id].update(kwargs)

async def run_in_executor(func, *args):
    """Wrapper for running sync functions in executor"""
    return await asyncio.get_running_loop().run_in_executor(
        Config.PROCESSING_EXECUTOR, func, *args
    )

async def get_video_duration(video_id: str) -> Optional[float]:
    """Get video duration using YouTube API"""
    try:
        api_key = os.getenv("YOUTUBE_API_KEY")
        if not api_key:
            return None

        url = f"https://www.googleapis.com/youtube/v3/videos?id={video_id}&key={api_key}&part=contentDetails"
        response = await run_in_executor(requests.get, url)
        data = response.json()

        if data.get('items'):
            duration_str = data['items'][0]['contentDetails']['duration']
            return parse_youtube_duration(duration_str)
    except Exception as e:
        logger.error(f"Failed to get duration: {str(e)}")
    return None

def parse_youtube_duration(duration: str) -> float:
    """Convert YouTube duration string to seconds"""
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
    if not match:
        return 0

    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0

    return hours * 3600 + minutes * 60 + seconds

def extract_video_id(url: str) -> str:
    """Extract video ID from various YouTube URL formats"""
    for pattern in ["embed/([^/?]+)", "watch\\?v=([^&]+)", "youtu.be/([^/?]+)"]:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise HTTPException(status_code=400, detail="Invalid YouTube URL format")

# Processing Functions
async def generate_questions_for_section(title: str, section_text: str) -> Dict:
    """Generate questions for a transcript section"""
    return await run_in_executor(
        partial(generate_questions_from_transcript, title, section_text)
    )

async def process_keyframe(video_id: str, timestamp: int) -> Optional[Dict]:
    """Process a single keyframe and generate question with improved object detection"""
    try:
        thumbnail_url = f"https://img.youtube.com/vi/{video_id}/{timestamp}.jpg"
        response = await run_in_executor(requests.get, thumbnail_url)

        # Fall back to default if timestamp-specific thumbnail fails
        if response.status_code != 200:
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/0.jpg"
            response = await run_in_executor(requests.get, thumbnail_url)

        if response.status_code != 200:
            logger.warning(f"Failed to fetch thumbnail for {video_id}")
            return None

        # Convert to PIL Image first to ensure proper format
        img = Image.open(BytesIO(response.content)).convert("RGB")

        # Convert to numpy array
        img_np = np.array(img)

        # Convert back to bytes in JPEG format
        _, buffer = cv2.imencode(".jpg", img_np)
        img_bytes = base64.b64encode(buffer).decode('utf-8')

        # Run object detection
        detections = await run_in_executor(detect_objects_from_base64, img_bytes)

        if not detections or len(detections) < 1:
            logger.debug(f"No objects detected in keyframe at {timestamp}s")
            return None

        # Get the primary object (largest detection)
        primary_object = max(detections, key=lambda x: (x['box'][2]-x['box'][0])*(x['box'][3]-x['box'][1]))

        # Filter detections to only include the primary object
        filtered_detections = [d for d in detections if d['label'] == primary_object['label']]

        question = {
            'id': f"obj-det-{timestamp}-{int(time.time())}",
            'text': f"Click on the {primary_object['label']}",
            'type': 'object_detection',
            'options': [primary_object['label']],
            'answer': primary_object['label'],
            'timestamp': timestamp,  # Keep original precise timestamp
            'objects': filtered_detections,
            'original_width': img.width,  # Add original dimensions
            'original_height': img.height
        }
        return question

    except Exception as e:
        logger.error(f"Keyframe processing failed: {str(e)}")
        return None

async def process_transcript_sections(transcript: List[Dict], title: str, num_questions: int) -> List[Dict]:
    """Process transcript sections with time adjustments for MCQs"""
    questions = []
    total_duration = transcript[-1]['start'] + transcript[-1]['duration']
    section_length = total_duration / num_questions

    for i in range(num_questions):
        start_time = i * section_length
        end_time = (i + 1) * section_length

        section = [t for t in transcript if start_time <= t['start'] <= end_time]
        section_text = " ".join([t['text'] for t in section])

        if section_text:
            question = await generate_questions_for_section(title, section_text)
            # Add 5 seconds to MCQ questions only
            if question['type'] != 'object_detection':
                question['timestamp'] = start_time + (section_length / 2) + 5
            else:
                question['timestamp'] = start_time + (section_length / 2)
            questions.append(question)

    return questions

# Main Processing Functions
async def run_full_analysis(
        video_id: str,
        youtube_url: str,
        title: str,
        num_questions: int,
        keyframe_interval: int
):
    """Full analysis pipeline"""
    entry = processing_results[video_id]
    cancellation_event = threading.Event()
    cancellation_events[video_id] = cancellation_event

    try:
        # Set a shorter timeout for better responsiveness
        async with asyncio.timeout(300):  # 5 minutes max
            # Check for cancellation at every major step
            await update_processing_state(video_id, progress="Fetching transcript")
            if cancellation_event.is_set():
                logger.info(f"Cancellation detected at transcript stage for {video_id}")
                raise asyncio.CancelledError()

            transcript = await get_transcript_with_retry(video_id)
            if not transcript:
                raise HTTPException(status_code=404, detail="No transcript available")

            # Process transcript in smaller chunks for better cancellation response
            await update_processing_state(video_id, progress="Generating transcript questions")
            if cancellation_event.is_set():
                logger.info(f"Cancellation detected at question generation stage for {video_id}")
                raise asyncio.CancelledError()

            # Generate questions with better progress updates
            transcript_questions = []
            sections_count = min(num_questions, 5)  # Limit sections for faster processing
            for i in range(sections_count):
                if cancellation_event.is_set():
                    raise asyncio.CancelledError()

                progress_msg = f"Generating questions {i+1}/{sections_count}"
                await update_processing_state(video_id, progress=progress_msg)

                # Process section subset
                start_idx = i * len(transcript) // sections_count
                end_idx = (i + 1) * len(transcript) // sections_count
                section = transcript[start_idx:end_idx]

                section_text = " ".join([t['text'] for t in section])
                if section_text:
                    question = await generate_questions_for_section(title, section_text)
                    question['timestamp'] = round(section[0]['start'] +
                                                  (section[-1]['start'] + section[-1]['duration'] - section[0]['start']) / 2) + 5
                    transcript_questions.append(question)

            # Skip keyframe processing if cancelled
            if cancellation_event.is_set():
                raise asyncio.CancelledError()

            # Update progress more frequently during keyframe analysis
            await update_processing_state(video_id, progress="Analyzing keyframes")
            keyframe_questions = []

            duration = await get_video_duration(video_id) or 300  # Default 5 min
            max_keyframes = min(5, math.ceil(duration / keyframe_interval))
            step = math.ceil((duration - 20) / max_keyframes)  # Leave first 10 seconds

            # Start timestamps from 10 seconds in
            timestamps = [20 + (i * step) for i in range(max_keyframes)]

            # Process keyframes sequentially with cancellation checks
            for i, timestamp in enumerate(timestamps):
                if cancellation_event.is_set():
                    raise asyncio.CancelledError()

                progress_msg = f"Analyzing keyframe {i+1}/{len(timestamps)}"
                await update_processing_state(video_id, progress=progress_msg)

                question = await process_keyframe(video_id, timestamp)
                if question:
                    keyframe_questions.append(question)

            # Final results
            await update_processing_state(video_id, progress="Selecting questions")
            all_questions = sorted(
                [q for q in (transcript_questions + keyframe_questions) if q],
                key=lambda x: x['timestamp']
            )[:num_questions]

            await update_processing_state(video_id,
                                          status="complete",
                                          questions=all_questions,
                                          completed_at=datetime.now().isoformat()
                                          )

            # Ensure questions are saved to local storage
            return all_questions

    except asyncio.TimeoutError:
        logger.error(f"Processing timed out for video {video_id}")
        await update_processing_state(video_id,
                                      status="timeout",
                                      error="Processing took too long",
                                      failed_at=datetime.now().isoformat())
    except asyncio.CancelledError:
        logger.info(f"Processing cancelled for video {video_id}")
        await update_processing_state(video_id,
                                      status="cancelled",
                                      progress="Processing cancelled",
                                      cancelled_at=datetime.now().isoformat())
    except Exception as e:
        logger.error(f"Full analysis failed: {str(e)}")
        await update_processing_state(video_id,
                                      status="error",
                                      error=str(e),
                                      failed_at=datetime.now().isoformat())
    finally:
        # Always clean up
        if video_id in cancellation_events:
            del cancellation_events[video_id]

async def run_quick_processing(video_id: str, payload: VideoInput):
    """Quick processing pipeline"""
    entry = processing_results[video_id]

    try:
        async with asyncio.timeout(600):  # 10 minute timeout
            if payload.image_base64:
                # Image processing path
                await update_processing_state(video_id, progress="Processing image")
                processed_image = await run_in_executor(process_image, payload.image_base64)

                await update_processing_state(video_id, progress="Detecting objects")
                labels = await run_in_executor(detect_objects_from_base64, processed_image)

                await update_processing_state(video_id, progress="Generating questions")
                question = await run_in_executor(generate_mcq_from_labels, labels)

                await update_processing_state(video_id,
                                              status="complete",
                                              question=question,
                                              objects=labels,
                                              completed_at=datetime.now().isoformat()
                                              )

            elif payload.youtube_url:
                # YouTube processing path
                await update_processing_state(video_id, progress="Fetching transcript")
                video_id = extract_video_id(payload.youtube_url)
                transcript_raw = await get_transcript_with_retry(video_id)

                await update_processing_state(video_id, progress="Processing transcript")
                transcript = " ".join([t['text'] for t in transcript_raw])[:Config.MAX_TRANSCRIPT_LENGTH]

                await update_processing_state(video_id, progress="Generating questions")
                question = await run_in_executor(
                    generate_questions_from_transcript,
                    payload.title or "Video",
                    transcript
                )

                await update_processing_state(video_id,
                                              status="complete",
                                              question=question,
                                              completed_at=datetime.now().isoformat()
                                              )

    except asyncio.TimeoutError:
        logger.error(f"Processing timed out for video {video_id}")
        await update_processing_state(video_id,
                                      status="timeout",
                                      error="Processing took too long",
                                      failed_at=datetime.now().isoformat()
                                      )
    except Exception as e:
        logger.error(f"Quick processing failed: {str(e)}")
        await update_processing_state(video_id,
                                      status="error",
                                      error=str(e),
                                      failed_at=datetime.now().isoformat()
                                      )

# API Endpoints
@router.on_event("startup")
async def initialize_cache():
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        logger.warning("REDIS_URL not set, falling back to in-memory cache")
        FastAPICache.init(InMemoryBackend(), prefix="video-cache")
        return

    try:
        # For Redis 4.x+ connections (newer versions)
        redis_client = redis.Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_timeout=10,
            socket_connect_timeout=10,
            ssl_cert_reqs=None  # This is the correct parameter for SSL
        )

        # Potential Alternative if above doesn't work:
        # redis_client = redis.StrictRedis.from_url(
        #     redis_url,
        #     decode_responses=True,
        #     socket_timeout=10,
        #     socket_connect_timeout=10,
        #     ssl_cert_reqs=None
        # )

        # Test connection
        if not redis_client.ping():
            raise ConnectionError("Redis ping failed")

        # Initialize FastAPI cache with Redis
        FastAPICache.init(RedisBackend(redis_client), prefix="video-cache")
        logger.info("✅ Redis connected successfully")

    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        logger.info("⚠️ Falling back to in-memory cache")
        FastAPICache.init(InMemoryBackend(), prefix="video-cache-fallback")

@router.post("/process/{video_id}")
async def start_video_processing(
        video_id: str,
        payload: VideoInput,
        background_tasks: BackgroundTasks,
        request: Request
):
    """Start video processing with comprehensive error handling"""
    # Check if already processing
    if video_id in processing_results and processing_results[video_id]["status"] == "processing":
        logger.info(f"Video {video_id} is already processing")
        return JSONResponse(
            content={"status": "already_processing"},
            status_code=200
        )

    # Initialize processing state with better defaults
    processing_results[video_id] = {
        "status": "processing",
        "start_time": time.time(),
        "progress": "Initializing",
        "mode": "full" if (payload.full_analysis and payload.youtube_url) else "quick",
        "last_updated": time.time(),
        "elapsed_seconds": 0,
        "estimated_remaining": 60  # Default estimate
    }

    # Create a new event for this task
    cancellation_events[video_id] = threading.Event()
    logger.info(f"Starting {'FULL' if payload.full_analysis else 'QUICK'} analysis for {video_id}")
    logger.info(f"Current processing state: {processing_results}")

    try:
        if payload.full_analysis and payload.youtube_url:
            # Create and store the task
            task = asyncio.create_task(
                run_full_analysis(
                    video_id,
                    payload.youtube_url,
                    payload.title or "Video",
                    payload.num_questions,
                    payload.keyframe_interval
                )
            )
            processing_tasks[video_id] = task
        else:
            task = asyncio.create_task(run_quick_processing(video_id, payload))
            processing_tasks[video_id] = task

        # Add cleanup callback
        task.add_done_callback(lambda _: cleanup_task(video_id))

        return JSONResponse(
            content=processing_results[video_id],
            status_code=202
        )

    except Exception as e:
        logger.error(f"Processing failed: {str(e)}", exc_info=True)
        cleanup_task(video_id)  # Clean up if initialization fails
        raise HTTPException(status_code=500, detail=str(e))

# Add a GET method to make debugging easier
@router.get("/process/{video_id}")
async def get_processing_status(video_id: str):
    """Get current processing status (debugging helper)"""
    if video_id not in processing_results:
        return JSONResponse(
            content={"status": "not_found", "message": "No processing found for this video"},
            status_code=404
        )

    return JSONResponse(
        content=processing_results[video_id],
        status_code=200
    )

# In the get_processing_results function
@router.get("/results/{video_id}")
async def get_processing_results(video_id: str):
    """Get processing results with better error handling"""
    cleanup_old_entries()

    if video_id not in processing_results:
        return {"status": "not_started"}

    result = processing_results[video_id].copy()

    # Update the elapsed time every time results are requested
    if result["status"] == "processing":
        elapsed = time.time() - result.get("start_time", time.time())
        current_step = result.get("progress", "Initializing")

        # Update the processing result with current elapsed time
        result.update({
            "elapsed": elapsed,
            "last_updated": time.time()
        })

        # Also update the stored result
        processing_results[video_id].update({
            "elapsed": elapsed,
            "last_updated": time.time()
        })

        # Set a realistic remaining time based on current step
        step_estimate = Config.PROCESSING_TIME_ESTIMATES.get(current_step, 30)
        remaining = max(5, step_estimate - (elapsed % step_estimate))
        result["remaining"] = remaining
        processing_results[video_id]["remaining"] = remaining

    return result

@router.get("/transcript/{video_id}")
@cache(expire=int(timedelta(hours=24).total_seconds()))
async def get_cached_transcript(video_id: str):
    """Get cached transcript with retry logic"""
    try:
        transcript = await get_transcript_with_retry(video_id)
        return {"status": "success", "transcript": transcript}
    except Exception as e:
        logger.error(f"Transcript error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Improve cancel_processing function
@router.post("/cancel/{video_id}")
async def cancel_processing(video_id: str):
    """Cancel video processing with improved handling"""
    if video_id not in processing_results:
        return {"status": "not_found", "message": "No processing found for this video"}

    # Signal cancellation
    if video_id in cancellation_events:
        cancellation_events[video_id].set()
        logger.info(f"Cancellation event set for {video_id}")

    # Forcefully update status immediately
    processing_results[video_id].update({
        "status": "cancelled",
        "cancelled_at": datetime.now().isoformat(),
        "progress": "Cancelled by user"
    })

    # Cancel the task if it exists
    if video_id in processing_tasks:
        try:
            task = processing_tasks[video_id]
            if not task.done() and not task.cancelled():
                task.cancel()
                logger.info(f"Processing task cancelled for {video_id}")

            # Wait a bit to ensure cancellation has propagated
            await asyncio.sleep(0.5)

            # Remove from active tasks
            if video_id in processing_tasks:
                del processing_tasks[video_id]
        except Exception as e:
            logger.error(f"Error cancelling task: {str(e)}")

    # Also remove from tracking
    if video_id in cancellation_events:
        del cancellation_events[video_id]

    # Return the cancellation confirmation
    return {
        "status": "cancelled",
        "message": f"Processing for video {video_id} was cancelled",
        "cancelled_at": datetime.now().isoformat()
    }

@router.post("/answer")
def answer_question(payload: AnswerInput):
    """Check answer correctness"""
    correct = payload.answer.strip().lower() == payload.selected_label.strip().lower()
    logger.info("Video Answer endpoint called")
    return {"correct": correct}

@router.post("/explain")
def explain_wrong_answer(payload: dict):
    """Generate explanation for wrong answer"""
    from openai import OpenAI
    import os
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    prompt = f"""
You are a friendly and kind teach for young children. A student gave a wrong answer to the following quiz:

❓ Question: {payload['question']}
🟰 Their Answer: {payload['selected_label']}
✅ Correct Answer: {payload['answer']}

Options: {', '.join(payload['options'])}

If the answer is incorrect, please explain *briefly* and kindly why the answer is incorrect, and encourage them to try again or rewatch the video.
If the answer is correct, please explain *briefly* and kindly why the answer is correct. Respond with a single friendly sentence.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        explanation = response.choices[0].message.content.strip()
        logger.info("Explanation called")
        return {"message": explanation}
    except Exception as e:
        logger.error(f"GPT explanation error: {e}")
        return {"message": "Oops! Something went wrong trying to explain the answer."}

# Utility Functions
def cleanup_old_entries():
    """Cleanup old processing entries"""
    now = time.time()
    for vid in list(processing_results.keys()):
        entry = processing_results[vid]
        if "start_time" in entry and (now - entry["start_time"] > 3600):
            del processing_results[vid]

def cleanup_task(video_id: str):
    """Clean up task resources"""
    if video_id in processing_tasks:
        del processing_tasks[video_id]
    if video_id in cancellation_events:
        del cancellation_events[video_id]

@router.get("/health")
async def health_check():
    return {"status": "healthy"}