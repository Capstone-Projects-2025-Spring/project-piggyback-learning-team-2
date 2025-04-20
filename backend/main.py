from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend import db_models                      
from backend.database import engine, get_db         
from backend.routers import crud_test, authentication
from backend.routers.videos import router as video_router
from backend.youtube import retreiveYoutubeMetaData
from backend.yolov8_detector import router as yolo_router
from backend import schemas, tools       
from backend.schemas import UserCredentials, UserResponse, YouTubeVideo
          


# Initialize FastAPI app
app = FastAPI()

app.include_router(yolo_router)

# Register database models
db_models.Base.metadata.create_all(bind=engine)

# Enable CORS for frontend access (development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(crud_test.router)
app.include_router(authentication.router)
app.include_router(video_router)
app.include_router(yolo_router)

# SQLAlchemy test route
@app.get("/sqlalchemy")
def test_url(db: Session = Depends(get_db)):
    engagement = db.query(db_models.User_engagment).all()
    return {"data": engagement}

# YouTube metadata endpoint
@app.post("/youtube_metadata")
def get_youtube_metadata(video: schemas.YouTubeVideo):
    url_str = str(video.url)
    video_id = None

    if "youtube.com/embed/" in url_str:
        video_id = url_str.split("youtube.com/embed/")[-1]
    elif "youtu.be/" in url_str:
        video_id = url_str.split("youtu.be/")[-1]
    elif "watch?v=" in url_str:
        video_id = url_str.split("watch?v=")[-1]

    if not video_id:
        raise HTTPException(status_code=400, detail="Could not extract a valid video ID.")

    metadata = retreiveYoutubeMetaData(video_id)
    return {"metadata": metadata}

# User registration route
@app.post("/register", status_code=status.HTTP_201_CREATED, response_model=schemas.UserResponse)
def register_user(user: schemas.UserCredentials, db: Session = Depends(get_db)):
    existing_user = db.query(db_models.User_Login).filter(db_models.User_Login.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = tools.hash(user.password)
    user.password = hashed_password
    new_user = db_models.User_Login(**user.model_dump())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# Root welcome route
@app.get("/")
def read_root():
    return {"message": "👋 Welcome to Piggyback Learning API!"}

# App lifecycle events
@app.on_event("startup")
async def startup_message():
    print("🚀 FastAPI is running!")

@app.on_event("shutdown")
async def shutdown_message():
    print("🛑 FastAPI is shutting down...")
