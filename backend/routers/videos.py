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
from typing import List, Dict, Optional, Any
import math
import requests
import logging
from PIL import Image, ImageOps
import io
from io import BytesIO
import threading
import json
import uuid

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
    # Maximum processing time in seconds before we stop a task
    MAX_PROCESSING_TIME = 20
    # How many keyframes to process per batch
    KEYFRAMES_PER_BATCH = 1
    # Redis key prefix for storing processing state
    REDIS_KEY_PREFIX = "video_processing:"
    # Maximum number of questions to generate per transcript section
    QUESTIONS_PER_SECTION = 1
    # Webhook URL for calling back when processing is complete (if provided)
    WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")

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
    webhook_url: Optional[str] = None

class ProcessingStep(BaseModel):
    step_id: str
    video_id: str
    step_type: str
    params: Dict[str, Any]
    status: str = "pending"

class AnswerInput(BaseModel):
    answer: str
    question_id: str
    selected_label: str
    timestamp: float

# Redis Helper Functions
def get_redis_client():
    """Get Redis client with error handling"""
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return None

    try:
        return redis.Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_timeout=10,
            socket_connect_timeout=10,
            ssl_cert_reqs=None
        )
    except Exception as e:
        logger.error(f"Redis connection error: {str(e)}")
        return None

def get_processing_state_from_redis(video_id: str) -> Dict:
    """Get processing state from Redis"""
    redis_client = get_redis_client()
    if not redis_client:
        return processing_results.get(video_id, {})

    key = f"{Config.REDIS_KEY_PREFIX}{video_id}"
    state_json = redis_client.get(key)
    if not state_json:
        return processing_results.get(video_id, {})

    try:
        return json.loads(state_json)
    except:
        return processing_results.get(video_id, {})

def save_processing_state_to_redis(video_id: str, state: Dict):
    """Save processing state to Redis"""
    redis_client = get_redis_client()
    if not redis_client:
        processing_results[video_id] = state
        return

    key = f"{Config.REDIS_KEY_PREFIX}{video_id}"
    try:
        redis_client.set(key, json.dumps(state), ex=86400)  # 24 hour expiry
        processing_results[video_id] = state  # Also keep in memory
    except Exception as e:
        logger.error(f"Failed to save state to Redis: {str(e)}")
        processing_results[video_id] = state

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
    state = get_processing_state_from_redis(video_id)
    if state:
        state.update(kwargs)
        save_processing_state_to_redis(video_id, state)

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

async def send_webhook_notification(webhook_url: str, data: Dict):
    """Send webhook notification with the processing result"""
    if not webhook_url:
        return

    try:
        headers = {"Content-Type": "application/json"}
        async with asyncio.timeout(10):  # 10 second timeout for webhook
            response = await run_in_executor(
                lambda: requests.post(webhook_url, json=data, headers=headers)
            )
            if response.status_code >= 400:
                logger.warning(f"Webhook notification failed with status {response.status_code}")
    except Exception as e:
        logger.error(f"Webhook notification error: {str(e)}")

# Processing Functions - Split into smaller chunks
async def fetch_transcript(video_id: str) -> Dict:
    """Step 1: Fetch and process transcript"""
    try:
        with asyncio.timeout(Config.MAX_PROCESSING_TIME):
            await update_processing_state(video_id, progress="Fetching transcript")

            # Get transcript
            transcript = await get_transcript_with_retry(video_id)
            if not transcript:
                raise HTTPException(status_code=404, detail="No transcript available")

            # Save to state
            await update_processing_state(
                video_id,
                status="transcript_ready",
                transcript=transcript,
                progress="Transcript ready"
            )

            return {"status": "success", "transcript": transcript}

    except asyncio.TimeoutError:
        logger.error(f"Transcript fetch timed out for {video_id}")
        await update_processing_state(
            video_id,
            status="error",
            error="Transcript fetch timed out"
        )
        return {"status": "error", "error": "Timeout"}
    except Exception as e:
        logger.error(f"Transcript fetch error: {str(e)}")
        await update_processing_state(
            video_id,
            status="error",
            error=f"Transcript error: {str(e)}"
        )
        return {"status": "error", "error": str(e)}

async def generate_questions_for_section(title: str, section_text: str) -> Dict:
    """Generate questions for a transcript section"""
    return await run_in_executor(
        partial(generate_questions_from_transcript, title, section_text)
    )

async def process_transcript_section(video_id: str, section_index: int, start_time: float, end_time: float, transcript: List[Dict], title: str) -> Dict:
    """Step 2: Process a single transcript section"""
    try:
        with asyncio.timeout(Config.MAX_PROCESSING_TIME):
            await update_processing_state(
                video_id,
                progress=f"Processing transcript section {section_index+1}"
            )

            # Get section text
            section = [t for t in transcript if start_time <= t['start'] <= end_time]
            section_text = " ".join([t['text'] for t in section])

            if not section_text:
                return {"status": "empty", "section_index": section_index}

            # Generate questions
            question = await generate_questions_for_section(title, section_text)

            # Add timestamp
            if question:
                question['timestamp'] = start_time + (end_time - start_time) / 2 + 5
                question['section_index'] = section_index

            # Update state with this section's questions
            state = get_processing_state_from_redis(video_id)
            section_questions = state.get("section_questions", [])
            if question:
                section_questions.append(question)
            await update_processing_state(
                video_id,
                section_questions=section_questions,
                progress=f"Completed section {section_index+1}"
            )

            return {"status": "success", "question": question, "section_index": section_index}

    except asyncio.TimeoutError:
        logger.error(f"Section processing timed out for {video_id} section {section_index}")
        return {"status": "timeout", "section_index": section_index}
    except Exception as e:
        logger.error(f"Section processing error: {str(e)}")
        return {"status": "error", "error": str(e), "section_index": section_index}

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

async def process_keyframe_batch(video_id: str, batch_index: int, timestamps: List[int]) -> Dict:
    """Step 3: Process a batch of keyframes"""
    try:
        with asyncio.timeout(Config.MAX_PROCESSING_TIME):
            await update_processing_state(
                video_id,
                progress=f"Processing keyframe batch {batch_index+1}"
            )

            # Process each keyframe in batch
            keyframe_questions = []
            for i, timestamp in enumerate(timestamps):
                question = await process_keyframe(video_id, timestamp)
                if question:
                    keyframe_questions.append(question)

            # Update state with this batch's keyframe questions
            state = get_processing_state_from_redis(video_id)
            all_keyframe_questions = state.get("keyframe_questions", [])
            all_keyframe_questions.extend(keyframe_questions)

            await update_processing_state(
                video_id,
                keyframe_questions=all_keyframe_questions,
                progress=f"Completed keyframe batch {batch_index+1}"
            )

            return {
                "status": "success",
                "questions": keyframe_questions,
                "batch_index": batch_index
            }

    except asyncio.TimeoutError:
        logger.error(f"Keyframe batch timed out for {video_id} batch {batch_index}")
        return {"status": "timeout", "batch_index": batch_index}
    except Exception as e:
        logger.error(f"Keyframe batch error: {str(e)}")
        return {"status": "error", "error": str(e), "batch_index": batch_index}

async def combine_results(video_id: str, num_questions: int, webhook_url: Optional[str] = None) -> Dict:
    """Step 4: Combine all results"""
    try:
        with asyncio.timeout(Config.MAX_PROCESSING_TIME):
            await update_processing_state(video_id, progress="Combining results")

            # Get current state
            state = get_processing_state_from_redis(video_id)
            section_questions = state.get("section_questions", [])
            keyframe_questions = state.get("keyframe_questions", [])

            # Combine and sort by timestamp
            all_questions = sorted(
                [q for q in (section_questions + keyframe_questions) if q],
                key=lambda x: x['timestamp']
            )[:num_questions]

            # Final update
            result = {
                "status": "complete",
                "questions": all_questions,
                "completed_at": datetime.now().isoformat()
            }

            await update_processing_state(video_id, **result)

            # Send webhook if provided
            if webhook_url:
                await send_webhook_notification(webhook_url, result)

            return result

    except asyncio.TimeoutError:
        logger.error(f"Combining results timed out for {video_id}")
        await update_processing_state(
            video_id,
            status="error",
            error="Combining results timed out"
        )
        return {"status": "error", "error": "Timeout"}
    except Exception as e:
        logger.error(f"Combining results error: {str(e)}")
        await update_processing_state(
            video_id,
            status="error",
            error=f"Combining error: {str(e)}"
        )
        return {"status": "error", "error": str(e)}

async def quick_image_processing(video_id: str, image_base64: str) -> Dict:
    """Quick processing for image"""
    try:
        with asyncio.timeout(Config.MAX_PROCESSING_TIME):
            await update_processing_state(video_id, progress="Processing image")
            processed_image = await run_in_executor(process_image, image_base64)

            await update_processing_state(video_id, progress="Detecting objects")
            labels = await run_in_executor(detect_objects_from_base64, processed_image)

            await update_processing_state(video_id, progress="Generating questions")
            question = await run_in_executor(generate_mcq_from_labels, labels)

            result = {
                "status": "complete",
                "question": question,
                "objects": labels,
                "completed_at": datetime.now().isoformat()
            }

            await update_processing_state(video_id, **result)
            return result

    except asyncio.TimeoutError:
        logger.error(f"Image processing timed out for {video_id}")
        await update_processing_state(
            video_id,
            status="error",
            error="Image processing timed out"
        )
        return {"status": "error", "error": "Timeout"}
    except Exception as e:
        logger.error(f"Image processing error: {str(e)}")
        await update_processing_state(
            video_id,
            status="error",
            error=f"Image error: {str(e)}"
        )
        return {"status": "error", "error": str(e)}

async def quick_youtube_processing(video_id: str, youtube_url: str, title: str) -> Dict:
    """Quick processing for YouTube video"""
    try:
        with asyncio.timeout(Config.MAX_PROCESSING_TIME):
            await update_processing_state(video_id, progress="Fetching transcript")
            youtube_id = extract_video_id(youtube_url)
            transcript_raw = await get_transcript_with_retry(youtube_id)

            await update_processing_state(video_id, progress="Processing transcript")
            transcript = " ".join([t['text'] for t in transcript_raw])[:Config.MAX_TRANSCRIPT_LENGTH]

            await update_processing_state(video_id, progress="Generating question")
            question = await run_in_executor(
                generate_questions_from_transcript,
                title or "Video",
                transcript
            )

            result = {
                "status": "complete",
                "question": question,
                "completed_at": datetime.now().isoformat()
            }

            await update_processing_state(video_id, **result)
            return result

    except asyncio.TimeoutError:
        logger.error(f"YouTube quick processing timed out for {video_id}")
        await update_processing_state(
            video_id,
            status="error",
            error="YouTube processing timed out"
        )
        return {"status": "error", "error": "Timeout"}
    except Exception as e:
        logger.error(f"YouTube quick processing error: {str(e)}")
        await update_processing_state(
            video_id,
            status="error",
            error=f"YouTube error: {str(e)}"
        )
        return {"status": "error", "error": str(e)}

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
    """Start video processing with chunking for render.com limits"""
    # Check if already processing
    state = get_processing_state_from_redis(video_id)
    if state and state.get("status") == "processing":
        logger.info(f"Video {video_id} is already processing")
        return JSONResponse(
            content={"status": "already_processing"},
            status_code=200
        )

    # Initialize processing state
    initial_state = {
        "status": "processing",
        "start_time": time.time(),
        "progress": "Initializing",
        "mode": "full" if (payload.full_analysis and payload.youtube_url) else "quick",
        "last_updated": time.time(),
        "processing_steps": []
    }

    # Store webhook URL if provided
    if payload.webhook_url:
        initial_state["webhook_url"] = payload.webhook_url

    save_processing_state_to_redis(video_id, initial_state)
    logger.info(f"Starting {'FULL' if payload.full_analysis else 'QUICK'} analysis for {video_id}")

    try:
        if payload.image_base64:
            # For image processing, we can handle it in one go
            background_tasks.add_task(
                quick_image_processing,
                video_id,
                payload.image_base64
            )

        elif payload.youtube_url and not payload.full_analysis:
            # For quick YouTube processing, we can handle it in one go
            background_tasks.add_task(
                quick_youtube_processing,
                video_id,
                payload.youtube_url,
                payload.title or "Video"
            )

        elif payload.youtube_url and payload.full_analysis:
            # First step for full analysis: fetch transcript
            youtube_real_id = extract_video_id(payload.youtube_url)
            background_tasks.add_task(
                fetch_transcript,
                youtube_real_id
            )

            # Store additional params for future steps
            await update_processing_state(
                video_id,
                youtube_id=youtube_real_id,
                youtube_url=payload.youtube_url,
                title=payload.title or "Video",
                num_questions=payload.num_questions,
                keyframe_interval=payload.keyframe_interval
            )

        return JSONResponse(
            content={"status": "processing", "video_id": video_id},
            status_code=202
        )

    except Exception as e:
        logger.error(f"Processing failed: {str(e)}", exc_info=True)
        await update_processing_state(
            video_id,
            status="error",
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process/{video_id}/next_step")
async def process_next_step(video_id: str, background_tasks: BackgroundTasks):
    """Process the next step for a video"""
    state = get_processing_state_from_redis(video_id)
    if not state:
        return JSONResponse(
            content={"status": "not_found"},
            status_code=404
        )

    if state.get("status") == "complete" or state.get("status") == "error":
        return JSONResponse(
            content=state,
            status_code=200
        )

    try:
        # Different logic based on what's already been done
        if state.get("status") == "transcript_ready" and "section_questions" not in state:
            # Start processing transcript sections
            transcript = state.get("transcript", [])
            youtube_id = state.get("youtube_id")
            title = state.get("title", "Video")
            num_questions = state.get("num_questions", 5)

            # Create empty section_questions array
            await update_processing_state(video_id, section_questions=[])

            # Calculate section boundaries
            total_duration = transcript[-1]['start'] + transcript[-1]['duration']
            section_length = total_duration / num_questions

            # Process first section
            background_tasks.add_task(
                process_transcript_section,
                video_id,
                0,  # section_index
                0,  # start_time
                section_length,  # end_time
                transcript,
                title
            )

            # Store section info for future steps
            await update_processing_state(
                video_id,
                current_section=0,
                total_sections=num_questions,
                section_length=section_length
            )

            return JSONResponse(
                content={"status": "processing_section", "section": 0},
                status_code=202
            )

        elif "current_section" in state and state["current_section"] < state["total_sections"] - 1:
            # Process next transcript section
            current_section = state["current_section"]
            next_section = current_section + 1
            section_length = state["section_length"]
            transcript = state.get("transcript", [])
            title = state.get("title", "Video")

            # Process next section
            background_tasks.add_task(
                process_transcript_section,
                video_id,
                next_section,  # section_index
                next_section * section_length,  # start_time
                (next_section + 1) * section_length,  # end_time
                transcript,
                title
            )

            # Update current section
            await update_processing_state(video_id, current_section=next_section)

            return JSONResponse(
                content={"status": "processing_section", "section": next_section},
                status_code=202
            )

        elif "keyframe_questions" not in state and "current_section" in state and state["current_section"] >= state["total_sections"] - 1:
            # All sections done, start processing keyframes
            youtube_id = state.get("youtube_id")
            keyframe_interval = state.get("keyframe_interval", 30)

            # Create empty keyframe_questions array
            await update_processing_state(video_id, keyframe_questions=[])

            # Prepare keyframe timestamps
            duration = await get_video_duration(youtube_id) or 300  # Default 5 min
            max_keyframes = min(5, math.ceil(duration / keyframe_interval))
            step = math.ceil((duration - 20) / max_keyframes) if max_keyframes > 0 else 60

            # Start timestamps from 20 seconds in
            all_timestamps = [20 + (i * step) for i in range(max_keyframes)]

            # Process first batch of keyframes
            first_batch = all_timestamps[:Config.KEYFRAMES_PER_BATCH]
            background_tasks.add_task(
                process_keyframe_batch,
                video_id,
                0,  # batch_index
                first_batch
            )

            # Store keyframe info for future steps
            await update_processing_state(
                video_id,
                current_keyframe_batch=0,
                all_timestamps=all_timestamps,
                total_keyframe_batches=math.ceil(len(all_timestamps) / Config.KEYFRAMES_PER_BATCH)
            )

            return JSONResponse(content={"status": "processing_keyframes", "batch": 0},
                                status_code=202
                                )

        elif "current_keyframe_batch" in state and state["current_keyframe_batch"] < state["total_keyframe_batches"] - 1:
            # Process next keyframe batch
            current_batch = state["current_keyframe_batch"]
            next_batch = current_batch + 1
            all_timestamps = state.get("all_timestamps", [])

            # Calculate batch slice
            start_idx = next_batch * Config.KEYFRAMES_PER_BATCH
            end_idx = min(start_idx + Config.KEYFRAMES_PER_BATCH, len(all_timestamps))
            batch_timestamps = all_timestamps[start_idx:end_idx]

            if batch_timestamps:
                # Process next batch
                background_tasks.add_task(
                    process_keyframe_batch,
                    video_id,
                    next_batch,
                    batch_timestamps
                )

                # Update current batch
                await update_processing_state(video_id, current_keyframe_batch=next_batch)

                return JSONResponse(
                    content={"status": "processing_keyframes", "batch": next_batch},
                    status_code=202
                )
            else:
                # No more timestamps, proceed to final combination
                background_tasks.add_task(
                    combine_results,
                    video_id,
                    state.get("num_questions", 5),
                    state.get("webhook_url")
                )

                return JSONResponse(
                    content={"status": "combining_results"},
                    status_code=202
                )

        elif "current_keyframe_batch" in state and state["current_keyframe_batch"] >= state["total_keyframe_batches"] - 1:
            # All keyframes done, combine results
            background_tasks.add_task(
                combine_results,
                video_id,
                state.get("num_questions", 5),
                state.get("webhook_url")
            )

            return JSONResponse(
                content={"status": "combining_results"},
                status_code=202
            )

        else:
            # Not sure what step we're on, return current state
            return JSONResponse(
                content=state,
                status_code=200
            )

    except Exception as e:
        logger.error(f"Next step processing failed: {str(e)}", exc_info=True)
        await update_processing_state(
            video_id,
            status="error",
            error=f"Step processing error: {str(e)}"
        )
        return JSONResponse(
            content={"status": "error", "error": str(e)},
            status_code=500
        )

@router.get("/results/{video_id}")
async def get_processing_results(video_id: str):
    """Get processing results with auto-continuation of steps"""
    state = get_processing_state_from_redis(video_id)

    if not state:
        return {"status": "not_started"}

    # If processing is not complete and not errored, trigger next step
    if state.get("status") == "processing" or "current_section" in state or "current_keyframe_batch" in state:
        # Create background task to process next step
        background_tasks = BackgroundTasks()
        background_tasks.add_task(lambda: asyncio.create_task(process_next_step(video_id, background_tasks)))

    # Update the elapsed time
    if state.get("status") == "processing":
        elapsed = time.time() - state.get("start_time", time.time())
        current_step = state.get("progress", "Initializing")

        # Get updated state with elapsed time
        updated_state = state.copy()
        updated_state.update({
            "elapsed": elapsed,
            "last_updated": time.time()
        })

        # Also update the stored state
        save_processing_state_to_redis(video_id, updated_state)

        # Provide a realistic remaining time
        step_estimate = Config.PROCESSING_TIME_ESTIMATES.get(current_step, 30)
        remaining = max(5, step_estimate - (elapsed % step_estimate))
        updated_state["remaining"] = remaining

        return updated_state

    return state

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

@router.post("/cancel/{video_id}")
async def cancel_processing(video_id: str):
    """Cancel video processing"""
    state = get_processing_state_from_redis(video_id)
    if not state:
        return {"status": "not_found", "message": "No processing found for this video"}

    # Update state to cancelled
    await update_processing_state(
        video_id,
        status="cancelled",
        cancelled_at=datetime.now().isoformat(),
        progress="Cancelled by user"
    )

    # Signal cancellation to any active tasks
    if video_id in cancellation_events:
        cancellation_events[video_id].set()

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
You are a friendly and kind teacher for young children. A student gave a wrong answer to the following quiz:

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

# For frontend polling
@router.get("/polling/{video_id}")
async def poll_and_continue_processing(video_id: str, background_tasks: BackgroundTasks):
    """Poll current status and trigger next step if needed"""
    state = get_processing_state_from_redis(video_id)

    if not state:
        return JSONResponse(
            content={"status": "not_found"},
            status_code=404
        )

    # If not complete and not error, trigger next step
    if state.get("status") == "processing" or "current_section" in state or "current_keyframe_batch" in state:
        # Create task to process next step
        background_tasks.add_task(
            lambda: asyncio.create_task(process_next_step(video_id, background_tasks))
        )

    # Update time estimates
    if state.get("status") == "processing":
        elapsed = time.time() - state.get("start_time", time.time())
        step = state.get("progress", "Initializing")
        state["elapsed"] = elapsed

        # Calculate a reasonable time estimate
        step_time = Config.PROCESSING_TIME_ESTIMATES.get(step, 30)
        state["eta"] = max(5, step_time - (elapsed % step_time))

    return JSONResponse(content=state)

# Clean-up utility
def cleanup_old_entries():
    """Cleanup old processing entries from memory"""
    now = time.time()
    # Only clean in-memory cache, Redis handles its own expiry
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