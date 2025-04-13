from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from . import db_models, schemas, tools
from sqlalchemy.orm import Session
from .database import engine, get_db
from .youtube import retreiveYoutubeMetaData
from .routers import crud_test, authentication, videos

db_models.Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = ["https://branma-front-latest.onrender.com/"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crud_test.router)
app.include_router(authentication.router)
app.include_router(videos.router)


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
