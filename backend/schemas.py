from pydantic import BaseModel, EmailStr, HttpUrl


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
        orm_mode = True
