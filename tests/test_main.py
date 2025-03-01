from fastapi.testclient import TestClient
from backend.main import app
# from urllib.parse import quote

client = TestClient(app)


def test_sqlalchemy_endpoint():
    response = client.get("/sqlalchemy")
    assert response.status_code == 200

    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)

# # Testing a valid YouTube video (Baby shark song)
# def test_valid_YTvideo():
#     valid_payload = {"url": "https://www.youtube.com/watch?v=XqZsoesa55w"}
#     response = client.post("/validateYT_URL", json=valid_payload)
#     assert response.status_code == 200
#     data = response.json()
#     assert data["message"] == "Valid URL"
#     assert data["url"] == valid_payload["url"]

#     conn.rollback()


# # Testing an incorrect YouTube video URL with an extra t
# def test_invalid_YTvideo():
#     invalid_payload = {"url": "https://www.youttube.com/watch?v=XqZsoesa55w"}
#     response = client.post("/validateYT_URL", json=invalid_payload)
#     assert response.status_code == 422

#     conn.rollback()


# def test_get_url():
#     video = "https://www.youtube.com/watch?v=lg5wznn3IBE"
#     encoded_video = quote(video, safe='')
#     response = client.get(f"/validateYT_URL/{encoded_video}")
#     assert response.status_code == 200

#     conn.rollback()


# def test_delete_url():
#     video = "https://www.youtube.com/watch?v=lg5wznn3IBE"
#     encoded_video = quote(video, safe='')
#     response = client.get(f"/validateYT_URL/{encoded_video}")
#     assert response.status_code == 200

#     conn.rollback()


"""
def test_update_url():
    video = "https://www.youtube.com/watch?v=lg5wznn3IBE"
    encoded_video = quote(video, safe='')
    response = client.put(f"/validateYT_URL/{encoded_video}")
    assert response.status_code == 200

    conn.rollback()
"""
