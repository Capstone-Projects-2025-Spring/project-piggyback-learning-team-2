from fastapi import FastAPI, HTTPException, Depends
# from fastapi import status, Response
from . import models, schemas
from sqlalchemy.orm import Session
from .database import engine, get_db
from .youtube import retreiveYoutubeMetaData
from .routers import crud_test

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(crud_test.router)


# transition to use sqlalchemy
@app.get("/sqlalchemy")
def test_url(db: Session = Depends(get_db)):
    engagement = db.query(models.User_engagment).all()
    return {"data": engagement}


@app.post("/youtube_metadata")
def get_youtube_metadata(video: schemas.YouTubeVideo):
    """
    Given a validated YouTube URL, extracts the video ID and retrieves
    metadata from the official YouTube Data API (v3).
    """
    #    Extract the video ID from the embed form
    #    Example: "https://www.youtube.com/embed/<video_id>"
    url_str = str(video.url)
    video_id = None

    if "youtube.com/embed/" in url_str:
        video_id = url_str.split("youtube.com/embed/")[-1]
    elif "youtu.be/" in url_str:
        video_id = url_str.split("youtu.be/")[-1]
    elif "watch?v=" in url_str:
        video_id = url_str.split("watch?v=")[-1]

    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="""Could not extract a valid video
            ID from the provided URL."""
        )
    metadata = retreiveYoutubeMetaData(video_id)
    return {"metadata": metadata}
