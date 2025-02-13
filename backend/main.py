import re
from fastapi import FastAPI
# from fastapi.params import Body
from pydantic import BaseModel, HttpUrl, field_validator


app = FastAPI()


class YouTubeVideo(BaseModel):
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


@app.post("/validateYT_URL")
def valid_YTvideo(video: YouTubeVideo):
    return {"message": "Valid URL", "url": video.url}
