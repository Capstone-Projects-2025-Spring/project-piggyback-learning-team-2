from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import time
import logging


from backend import db_models, schemas, tools, routers, youtube, yolov8_router
from backend.database import engine, get_db
from backend.routers import crud_test, authentication
from backend.routers import videos as video_router
from backend.youtube import retreiveYoutubeMetaData
from backend.yolov8_router import router as yolo_router
from backend.schemas import UserCredentials, UserResponse, YouTubeVideo

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Initialize FastAPI app
app = FastAPI()

app.include_router(yolo_router)

# Register database models
db_models.Base.metadata.create_all(bind=engine)

origins = ["http://localhost:3000",  # React default
"http://127.0.0.1:3000", "http://0.0.0.0:8000", "http://localhost:8000", "https://branma-front-latest.onrender.com"]

# Enable CORS for frontend access (development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(crud_test.router)
app.include_router(authentication.router)
app.include_router( video_router.router,
                    prefix="/api/v1/video",
                    tags=["videos"])
app.include_router(yolo_router)

# Add middleware to log all requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"Response status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request failed: {str(e)}")
        raise

# General backend connectivity health check route
@app.get("/health")
def health_check():
    response = {
        "status": "healthy",
        "version": "1.0",
        "timestamp": time.time()
    }
    headers = {"Access-Control-Allow-Headers": "Content-Type"}
    logger.info("Health check endpoint called")
    return JSONResponse(content=response, headers=headers)

# SQLAlchemy test route
@app.get("/sqlalchemy")
def test_url(db: Session = Depends(get_db)):
    engagement = db.query(db_models.User_engagment).all()
    logger.info("SQL checkpoint called")
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
    logger.info("Youtube metadata checkpoint called")
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
    logger.info("Registration checkpoint called")
    return new_user

# Root welcome route
@app.get("/")
def read_root():
    return {"message": "👋 Welcome to Piggyback Learning API!"}

# App lifecycle events
@app.on_event("startup")
async def startup_message():
    print("🚀 FastAPI is running!")
    print("🚀 Available routes:")
    for route in app.routes:
        if hasattr(route, "path"):
            print(f"- {route.path}")

@app.on_event("shutdown")
async def shutdown_message():
    print("🛑 FastAPI is shutting down...")

