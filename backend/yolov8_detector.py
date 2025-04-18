from ultralytics import YOLO
import cv2
import base64
import numpy as np
from PIL import Image
import io

model = YOLO("yolov8n.pt")  # or your custom-trained YOLOv8 model

def detect_objects_from_base64(image_base64):
    image_data = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_data)).convert("RGB")
    image_np = np.array(image)

    results = model(image_np)

    detections = []
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            label = model.names[int(box.cls[0])]
            confidence = float(box.conf[0])
            detections.append({
                "label": label,
                "box": [int(x1), int(y1), int(x2), int(y2)],
                "confidence": round(confidence, 2)
            })
    return detections
