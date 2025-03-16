import re
from fastapi import FastAPI, status, HTTPException, Response, Depends
from pydantic import BaseModel, HttpUrl, field_validator
from . import models
from sqlalchemy.orm import Session
from .database import engine, get_db
# from googleapiclient.discovery import build


models.Base.metadata.create_all(bind=engine)

app = FastAPI()

YOUTUBE_API_KEY = "Insert API KEY"


class YouTubeVideo(BaseModel):
    """
    Class: Pydantic model for validating user
    supplied YouTube urls with common formats

    Data fields: url, The data type is HttpUrl
    and the purpose is to store the YouTube URL

    Methods: check_YouTubeVideoURL(cls, v: HttpUrl) -> HttpUrl:
    Checks url field matches with regex pattern

        Pre-conditions:
            - v must be a string representing a URL

        Post-conditions:
            - If URL matched with regex pattern, return URL
            - If URL doesn't match with pattern, raise ValueError

        Parameters and datatypes:
            - v is the URL to validate and the date type is String

        Return Value and output variables:
            - String of the validate YouTube video URL

        Exceptions:
            - Raises ValueError when URL doesn't match regex pattern
    """

    url: HttpUrl

    @field_validator("url")
    def check_YouTubeVideoURL(cls, v: HttpUrl) -> HttpUrl:
        url_str = str(v)
        if "watch?v=" in url_str:
            video_id = url_str.split("watch?v=")[-1]
            v = f"https://www.youtube.com/embed/{video_id}"
    # regex pattern found online that covers most YouTube video URL formats

        pattern = (
            r'^(?:https?:)?(?:\/\/)?'
            r'(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/'
            r'(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))'
            r'|(?:www\.youtubekids\.com\/watch\?v=)'
            # Add YouTube Kids URL format
            r'([a-zA-Z0-9\_-]{7,15})(?:[\?&][a-zA-Z0-9\_-]+=[a-zA-Z0-9\_-]+)*'
            r'(?:[&\/\#].*)?$'
                )
        if not re.match(pattern, url_str):
            raise ValueError(
                "The URL provided by the user is not a valid YouTube video URL"
            )
        return v


# transition to use sqlalchemy
@app.get("/sqlalchemy")
def test_url(db: Session = Depends(get_db)):
    engagement = db.query(models.User_engagment).all()
    return {"data": engagement}


@app.get("/")
def read_root():
    return {"message": "Welcome"}


# testing get data fromn table
@app.get("/validateYT_URL/{video_url:path}")
def get_URL(video_url: str, db: Session = Depends(get_db)):
    engagement = db.query(models.User_engagment).filter(
        models.User_engagment.video_url == video_url
    ).first()
    if not engagement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video URL doesn't exist"
        )
    return {"data": engagement}


# testing adding data to table
@app.post("/validateYT_URL")
def add_URL(video: YouTubeVideo, db: Session = Depends(get_db)):
    existing = db.query(models.User_engagment).filter(
        models.User_engagment.video_url == str(video.url)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video URL already exists"
        )
    new_engagement = models.User_engagment(video_url=str(video.url))
    db.add(new_engagement)
    db.commit()
    db.refresh(new_engagement)
    return {"message": "Valid URL", "url": video.url,
            "new row": new_engagement}


# testing deleting data from table
@app.delete("/validateYT_URL/{video_url:path}",
            status_code=status.HTTP_204_NO_CONTENT)
def delete_URL(video_url: str, db: Session = Depends(get_db)):
    engagement = db.query(models.User_engagment).filter(
        models.User_engagment.video_url == video_url
    ).first()
    if not engagement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="URL doesn't exist"
        )
    db.delete(engagement)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# testing updating data in table
@app.put("/validateYT_URL/{video_url:path}")
def update_URL(video_url: str, video: YouTubeVideo,
               db: Session = Depends(get_db)):
    engagement = db.query(models.User_engagment).filter(
        models.User_engagment.video_url == video_url
    ).first()
    if not engagement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video URL doesn't exist"
        )
    engagement.video_url = str(video.url)
    db.commit()
    db.refresh(engagement)
    return {"data": engagement}


# @app.post("/youtube_metadata")
# def get_youtube_metadata(video: YouTubeVideo):
#     """
#     Given a validated YouTube URL, extracts the video ID and retrieves
#     metadata from the official YouTube Data API (v3).
#     """
#     # 1) Extract the video ID from the embed form
#     #    Example: "https://www.youtube.com/embed/<video_id>"
#     url_str = str(video.url)
#     video_id = None

#     if "youtube.com/embed/" in url_str:
#         video_id = url_str.split("youtube.com/embed/")[-1]
#     elif "youtu.be/" in url_str:
#         video_id = url_str.split("youtu.be/")[-1]
#     elif "watch?v=" in url_str:
#         video_id = url_str.split("watch?v=")[-1]

#     if not video_id:
#         raise HTTPException(
#             status_code=400,
#             detail="Could not extract a valid video
#             ID from the provided URL."
#         )

#     # 2) Build the YouTube Data API client
#     youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

#     # 3) Call videos().list to get snippet, contentDetails, status, etc.
#     request = youtube.videos().list(
#         part="snippet,contentDetails,status",
#         id=video_id
#     )
#     response = request.execute()

#     items = response.get("items", [])
#     if not items:
#         raise HTTPException(
#             status_code=404,
#             detail="No video found for this ID."
#         )

#     video_data = items[0]
#     snippet = video_data.get("snippet", {})
#     content_details = video_data.get("contentDetails", {})
#     status = video_data.get("status", {})

#     # 4) Construct a simple metadata response
#     metadata_response = {
#         "video_id": video_id,
#         "title": snippet.get("title"),
#         "description": snippet.get("description"),
#         "published_at": snippet.get("publishedAt"),
#         "channel_id": snippet.get("channelId"),
#         "channel_title": snippet.get("channelTitle"),
#         "tags": snippet.get("tags"),
#         "category_id": snippet.get("categoryId"),
#         "content_rating": content_details.get("contentRating", {}),
#         "duration": content_details.get("duration"),
#         "dimension": content_details.get("dimension"),
#         "definition": content_details.get("definition"),
#         "caption": content_details.get("caption"),
#         "licensed_content": content_details.get("licensedContent"),
#         "age_restricted": (content_details.get("contentRating", {})
#                            .get("ytRating") == "ytAgeRestricted"),
#         "privacy_status": status.get("privacyStatus"),
#         "made_for_kids": status.get("madeForKids"),
#     }

#     return {"metadata": metadata_response}
