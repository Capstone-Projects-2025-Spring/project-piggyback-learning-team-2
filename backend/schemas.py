from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional, Dict, Any
from datetime import datetime

# For YouTube video validation
class YouTubeVideo(BaseModel):
    url: HttpUrl


# For user registration
class UserCredentials(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None  # Optional


# For user registration response
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str | None = None

    class Config:
        from_attributes = True

# For saving video information        
class VideoQuestionBase(BaseModel):
    video_link: str
    video_title: Optional[str] = None
    video_thumbnail: Optional[str] = None
    video_duration: Optional[int] = None
    questions_json: Dict[str, Any]

class VideoQuestionCreate(VideoQuestionBase):
    pass

class VideoQuestion(VideoQuestionBase):
    video_id: str
    created_at:datetime

    class Config:
        from_attributes = True