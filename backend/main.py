import re
from fastapi import FastAPI, status, HTTPException, Response
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


# SQL query for testing reading data from table
@app.get("/validateYT_URL/{video_url:path}")
def get_URL(video_url: str):
    cursor.execute("""SELECT * FROM user_engagement
                   WHERE video_url = %s """, (str(video_url),))
    engagement = cursor.fetchone()
    if not engagement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f'{"video url: doesn't exist"}')
    return {"data": engagement}


# SQL query for testing adding data to table
@app.post("/validateYT_URL")
def add_URL(video: YouTubeVideo):
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
    cursor.execute("""INSERT INTO user_engagement (video_url) VALUES (%s)
                   RETURNING * """, (str(video.url),))
    new_url = cursor.fetchone()
    # conn.commit
    return {"message": "Valid URL", "url": video.url, "new row": new_url}


# SQL query for testing deleting data from table
@app.delete("/validateYT_URL/{video_url:path}",
            status_code=status.HTTP_204_NO_CONTENT)
def delete_URL(video_url: str):
    cursor.execute("""DELETE FROM user_engagement WHERE video_url = %s
                   returning *""", (str(video_url),))
    deleted_url = cursor.fetchone()
    # conn.commit
    if deleted_url is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f'{"url: doesn't exist"}')
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.put("/validateYT_URL/{video_url:path}")
def update_URL(video_url: str):
    cursor.execute("""UPDATE user_engagement SET video_url = %s
                   RETURNING *""", (str(video_url),))
    updated_url = cursor.fetchone()
    # conn.commit
    if updated_url is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f'{"video url: doesn't exist"}')
    return {"data": updated_url}
