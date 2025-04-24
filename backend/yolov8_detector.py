from ultralytics import YOLO
import cv2
import base64
import numpy as np
from PIL import Image
import io
from io import BytesIO

model = YOLO("yolov8n.pt", task='detect') # Model

def detect_objects_from_base64(image_base64):
    try:
        # Decode base64 to bytes
        image_bytes = base64.b64decode(image_base64)

        # Convert to PIL Image to ensure proper format
        img = Image.open(BytesIO(image_bytes)).convert("RGB")

        # Convert to numpy array
        img_np = np.array(img)

        # Run detection
        results = model(img_np, stream=True)

        detections = []
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                label = model.names[int(box.cls[0])]
                confidence = float(box.conf[0])
                detections.append({
                    "label": label,
                    "box": [int(x1), int(y1), int(x2), int(y2)],
                    "confidence": round(confidence, 2)
                })
        return detections

    except Exception as e:
        print(f"Detection error: {str(e)}")
        return []

