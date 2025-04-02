from fastapi import APIRouter, Depends, HTTPException
from ..video_scanning import VideoProcessor
from ..schemas import VideoProcessRequest
from ..database import get_db
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/video",
    tags=["Video Processing"]
)

processor = VideoProcessor()

@router.post("/process")
async def process_video(
        request: VideoProcessRequest,
        db: Session = Depends(get_db)
):
    """
    Process YouTube video and generate questions
    """
    try:
        result = processor.process_video(request.youtube_url)


    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))