import re
from fastapi import FastAPI, status, HTTPException, Response, Depends
from pydantic import BaseModel, HttpUrl, field_validator
from . import models
from sqlalchemy.orm import Session
from .database import engine, get_db


models.Base.metadata.create_all(bind=engine)

app = FastAPI()


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
        # regex pattern found online that covers most YouTube video URL formats
        pattern = (
            r'^(?:https?:)?(?:\/\/)'
            r'?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/'
            r'(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))'
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
