from .. import db_models
# from fastapi import FastAPI
from fastapi import APIRouter, status, HTTPException, Response, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import YouTubeVideo

router = APIRouter()


@router.get("/")
def read_root():
    return {"message": "Welcome"}


# testing get data fromn table
@router.get("/validateYT_URL/{video_url:path}")
def get_URL(video_url: str, db: Session = Depends(get_db)):
    engagement = db.query(db_models.User_engagment).filter(
        db_models.User_engagment.video_url == video_url
    ).first()
    if not engagement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video URL doesn't exist"
        )
    return {"data": engagement}


# testing adding data to table
@router.post("/validateYT_URL")
def add_URL(video: YouTubeVideo, db: Session = Depends(get_db)):
    existing = db.query(db_models.User_engagment).filter(
        db_models.User_engagment.video_url == str(video.url)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video URL already exists"
        )
    new_engagement = db_models.User_engagment(video_url=str(video.url))
    db.add(new_engagement)
    db.commit()
    db.refresh(new_engagement)
    return {"message": "Valid URL", "url": video.url,
            "new row": new_engagement}


# testing deleting data from table
@router.delete("/validateYT_URL/{video_url:path}",
               status_code=status.HTTP_204_NO_CONTENT)
def delete_URL(video_url: str, db: Session = Depends(get_db)):
    engagement = db.query(db_models.User_engagment).filter(
        db_models.User_engagment.video_url == video_url
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
@router.put("/validateYT_URL/{video_url:path}")
def update_URL(video_url: str, video: YouTubeVideo,
               db: Session = Depends(get_db)):
    engagement = db.query(db_models.User_engagment).filter(
        db_models.User_engagment.video_url == video_url
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
