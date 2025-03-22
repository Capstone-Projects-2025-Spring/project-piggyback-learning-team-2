from googleapiclient.discovery import build
from fastapi import HTTPException
from dotenv import load_dotenv
import os
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent / ".env")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")


def retreiveYoutubeMetaData(video_id):
    # 1) Build the YouTube Data API client
    youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

    # 2) Call videos().list to get snippet, contentDetails, status, etc.
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

    # 3) Construct a simple metadata response
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
        "age_restricted": (content_details.get("contentRating", {})
                           .get("ytRating") == "ytAgeRestricted"),
        "privacy_status": status.get("privacyStatus"),
        "made_for_kids": status.get("madeForKids"),
    }

    return metadata_response
