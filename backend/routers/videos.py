import os
import random
import base64
import cv2
import numpy as np
import time
import re
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
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

@router.post("/video/answer")
def answer_question(payload: AnswerInput):
    correct = payload.answer.strip().lower() == payload.selected_label.strip().lower()
    logger.info("Video Answer endpoint called")
    return {"correct": correct}

@router.post("/video/process/{video_id}")
def start_video_processing(video_id: str, payload: VideoInput, background_tasks: BackgroundTasks):
    # Start processing if not already complete
    if video_id in processing_results and processing_results[video_id]["status"] == "complete":
        return {"status": "already complete"}

    processing_results[video_id] = {"status": "processing"}
    background_tasks.add_task(run_processing_job, video_id, payload)
    logger.info("Video Process endpoint called")
    return {"status": "started"}

def run_processing_job(video_id: str, payload: VideoInput):
    try:
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
            yt_id = extract_video_id(payload.youtube_url)

            transcript_raw = None
            for proxy in random.sample(PROXIES, len(PROXIES)):
                try:
                    transcript_raw = YouTubeTranscriptApi.get_transcript(yt_id, languages=["en"], proxies={"https": proxy})
                    break
                except:
                    try:
                        transcript_raw = YouTubeTranscriptApi.get_transcript(yt_id, languages=["es"], proxies={"https": proxy})
                        break
                    except Exception as proxy_err:
                        continue

            if not transcript_raw:
                transcript = manual_transcripts.get(video_id)
                if not transcript:
                    processing_results[video_id] = {"status": "error", "detail": "Transcript unavailable."}
                    return
            else:
                transcript = " ".join([t['text'] for t in transcript_raw])

            question_obj = generate_questions_from_transcript(payload.title or "Video", transcript)

            processing_results[video_id] = {
                "status": "complete",
                "question": {"id": "transcript1", **question_obj},
                "objects": [],
                "video_id": yt_id,
                "title": payload.title or "YouTube Video"
            }
            logger.info("run_processing was called and run")

    except Exception as e:
        processing_results[video_id] = {"status": "error", "detail": str(e)}

@router.get("/video/results/{video_id}")
def get_processing_results(video_id: str):
    if video_id not in processing_results:
        logger.info("Results not found")
        return JSONResponse(status_code=404, content={"status": "not_found"})
    logger.info("Results found")
    return processing_results[video_id]

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


