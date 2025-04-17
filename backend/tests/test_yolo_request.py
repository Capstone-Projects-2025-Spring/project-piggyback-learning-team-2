from PIL import Image
import base64
import requests
import io

# Load a local test image
with open("Animal_learning.mp4", "rb") as f:
    encoded_image = base64.b64encode(f.read()).decode("utf-8")

res = requests.post(
    "http://localhost:8000/video/process",
    json={"image_base64": encoded_image, "title": "test dog"}
)

print("✅ Status:", res.status_code)
print(res.json())
