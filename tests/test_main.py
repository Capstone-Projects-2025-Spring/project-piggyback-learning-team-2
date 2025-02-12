from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


# Testing a valid YouTube video (Baby shark song)
def test_valid_YTvideo():
    valid_payload = {"url": "https://www.youtube.com/watch?v=XqZsoesa55w"}
    response = client.post("/validateYT_URL", json=valid_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Valid URL"
    assert data["url"] == valid_payload["url"]


# Testing a YouTube video URL with an extra t
def test_invalid_YTvideo():
    invalid_payload = {"url": "https://www.youttube.com/watch?v=XqZsoesa55w"}
    response = client.post("/validateYT_URL", json=invalid_payload)
    assert response.status_code == 422
