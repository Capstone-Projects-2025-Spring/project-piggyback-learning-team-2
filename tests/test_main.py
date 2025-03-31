# import pytest
from fastapi.testclient import TestClient
from backend.main import app
from urllib.parse import quote
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base, get_db
from pathlib import Path
from dotenv import load_dotenv
import os

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

SQLAlchemy_Database_URL = os.getenv("database_url_test")

engine = create_engine(SQLAlchemy_Database_URL)

TestingSessionLocal = sessionmaker(autocommit=False,
                                   autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


client = TestClient(app)


def test_sqlalchemy_endpoint():
    response = client.get("/sqlalchemy")
    assert response.status_code == 200

    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)


# Testing a valid YouTube video (Baby shark song)
def test_valid_YTvideo():
    valid_payload = {"url": "https://www.youtube.com/watch?v=lg5wznn3IBE"}
    response = client.post("/validateYT_URL", json=valid_payload)
    # already exist
    assert response.status_code == 400


# Testing an incorrect YouTube video URL with an extra t
def test_invalid_YTvideo():
    invalid_payload = {"url": "https://www.youttube.com/watch?v=XqZsoesa55w"}
    response = client.post("/validateYT_URL", json=invalid_payload)
    assert response.status_code == 422


def test_get_url():
    video = "https://www.youtube.com/embed/lg5wznn3IBE"
    encoded_video = quote(video, safe='')
    response = client.get(f"/validateYT_URL/{encoded_video}")
    assert response.status_code == 200


def test_delete_url():
    video = "https://www.youtube.com/embed/lg5wznn3IBE"
    encoded_video = quote(video, safe='')
    response = client.get(f"/validateYT_URL/{encoded_video}")
    assert response.status_code == 200


# test for success
def test_register():
    payload = {
        "email": "hahaa@gmail.com",
        "password": "1234"
    }
    response = client.post("/register", json=payload)
    assert response.status_code == 201


# test for failure
def test_duplicate_register():
    payload = {
        "email": "haha@gmail.com",
        "password": "1234"
    }
    response = client.post("/register", json=payload)
    assert response.status_code == 400


def test_login_success():
    form_data = {
        "username": "hahaa@gmail.com",
        "password": "1234"
    }
    response = client.post("/login", data=form_data)
    assert response.status_code == 201, response.text
    json_data = response.json()
    assert "access_token" in json_data
    assert json_data["token_type"] == "bearer"


def test_login_failure():
    form_data = {
        "username": "1234@gmail.com",
        "password": "1234"
    }
    response = client.post("/login", data=form_data)
    assert response.status_code == 403, response.text
