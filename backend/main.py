import re
from fastapi import FastAPI
from pydantic import BaseModel, HttpUrl, field_validator
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os


app = FastAPI()

# Load environment variables from .env
load_dotenv()

# Fetch variables
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")


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


# Connect to the database
try:
    conn = psycopg2.connect(
        user=USER,
        password=PASSWORD,
        host=HOST,
        port=PORT,
        dbname=DBNAME,
        cursor_factory=RealDictCursor
    )
    cursor = conn.cursor()
    print("Database connection was successful!")
except Exception as error:
    print("Connecting to database failed")
    print("Error:", error)


@app.post("/validateYT_URL")
def valid_YTvideo(video: YouTubeVideo):
    """
    API endpoint for validating YouTube video URL
    It accepts a JSON payload containing YouTube  video URL

    Parameters and datatypes:
        - video (YouTubeVideo): A Pydantic model instance

    Return Value and output variables:
        - dictionary with message and url

    Exceptions:
        - Raises HTTPException (422) when data is not valid URL
    """
    return {"message": "Valid URL", "url": video.url}
