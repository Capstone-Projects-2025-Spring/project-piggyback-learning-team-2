from googleapiclient.discovery import build
from fastapi import HTTPException
from dotenv import load_dotenv
import os
from pathlib import Path
import re
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, VideoUnavailable

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# YouTube API key
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# Function to retrieve YouTube video metadata
def retreiveYoutubeMetaData(video_id):
    youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

    request = youtube.videos().list(
        part="snippet,contentDetails,status",
        id=video_id
    )
    response = request.execute()

    items = response.get("items", [])
    if not items:
        raise HTTPException(
            status_code=404,
            detail="No video found for this ID."
        )

    video_data = items[0]
    snippet = video_data.get("snippet", {})
    content_details = video_data.get("contentDetails", {})
    status = video_data.get("status", {})

    metadata_response = {
        "video_id": video_id,
        "title": snippet.get("title"),
        "description": snippet.get("description"),
        "published_at": snippet.get("publishedAt"),
        "channel_id": snippet.get("channelId"),
        "channel_title": snippet.get("channelTitle"),
        "tags": snippet.get("tags"),
        "category_id": snippet.get("categoryId"),
        "content_rating": content_details.get("contentRating", {}),
        "duration": content_details.get("duration"),
        "dimension": content_details.get("dimension"),
        "definition": content_details.get("definition"),
        "caption": content_details.get("caption"),
        "licensed_content": content_details.get("licensedContent"),
        "age_restricted": (content_details.get("contentRating", {}).get("ytRating") == "ytAgeRestricted"),
        "privacy_status": status.get("privacyStatus"),
        "made_for_kids": status.get("madeForKids"),
    }

    return metadata_response

# Helper function to extract video ID from URL
def extract_video_id(url):
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    if match:
        return match.group(1)
    raise ValueError("Invalid YouTube URL")

# Function to retrieve YouTube transcript text
def retreiveYoutubeTranscript(youtube_url):
    try:
        video_id = extract_video_id(youtube_url)
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        transcript_text = " ".join([entry['text'] for entry in transcript_list])
        return transcript_text

    except VideoUnavailable:
        raise HTTPException(status_code=404, detail="YouTube video is unavailable.")
    except TranscriptsDisabled:
        raise HTTPException(status_code=404, detail="Transcript is disabled for this video.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcript fetch failed: {str(e)}")