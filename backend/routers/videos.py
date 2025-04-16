import os
import random
import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
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
    return {"correct": correct}


@router.post("/video/process")
def process_video(payload: VideoInput):
    import re
    video_id = re.sub(r"\s+", "_", (payload.title or "").lower())

    # 🟡 Local video: base64 image input
    if payload.image_base64:
        try:
            print("📷 Received image for detection.")
            image_data = base64.b64decode(payload.image_base64)
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            image_np = np.array(image)

            image_resized = cv2.resize(image_np, (640, 640))
            _, buffer = cv2.imencode(".jpg", image_resized)
            resized_base64 = base64.b64encode(buffer).decode("utf-8")

            labels = detect_objects_from_base64(resized_base64)
            print("🔍 Detected labels:", labels)

            if not labels:
                return {"question": None, "objects": []}

            question_obj = generate_mcq_from_labels(labels)
            print("🧠 Generated Question:", question_obj)

            return {
                "question": {
                    "id": "img1",
                    **question_obj
                },
                "objects": labels
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"YOLOv8 error: {str(e)}")

    # 🟢 YouTube video: use transcript
    elif payload.youtube_url:
        try:
            if "embed/" in payload.youtube_url:
                yt_id = payload.youtube_url.split("embed/")[-1]
            elif "watch?v=" in payload.youtube_url:
                yt_id = payload.youtube_url.split("watch?v=")[-1]
            elif "youtu.be/" in payload.youtube_url:
                yt_id = payload.youtube_url.split("youtu.be/")[-1]
            else:
                raise HTTPException(status_code=400, detail="Invalid YouTube URL format.")

            print("📹 YouTube Video ID:", yt_id)

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
                        print(f"❌ Proxy failed: {proxy} — {proxy_err}")
                        continue

            if not transcript_raw:
                if video_id in manual_transcripts:
                    transcript = manual_transcripts[video_id]
                    print("📼 Using manual transcript fallback.")
                else:
                    raise HTTPException(status_code=403, detail="Transcript unavailable.")
            else:
                transcript = " ".join([t['text'] for t in transcript_raw])

            question_obj = generate_questions_from_transcript(payload.title or "Video", transcript)
            print("🧠 GPT Question:", question_obj)

            return {
                "video_id": yt_id,
                "question": {
                    "id": "transcript1",
                    **question_obj
                },
                "objects": []
            }

        except (TranscriptsDisabled, NoTranscriptFound, CouldNotRetrieveTranscript) as e:
            raise HTTPException(status_code=403, detail=str(e))

    raise HTTPException(status_code=400, detail="No valid input provided.")

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
        return {"message": explanation}

    except Exception as e:
        print("❌ GPT explanation error:", e)
        return {"message": "Oops! Something went wrong trying to explain the answer."}
