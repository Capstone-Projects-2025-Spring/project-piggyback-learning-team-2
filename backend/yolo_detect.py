import torch
import numpy as np
import cv2
from fastapi import APIRouter, UploadFile, File
from backend.yolov7.yolov7_loader import load_yolov7_model
from backend.yolov7.utils.general import non_max_suppression

# Create FastAPI router
router = APIRouter(prefix="/yolo", tags=["YOLOv7"])

# Load model and device once
model, device = load_yolov7_model("backend/yolov7/yolov7.pt")
LABELS = model.names
model.eval()

# Endpoint for detection
@router.post("/detect")
async def detect_yolo(file: UploadFile = File(...)):
    image_bytes = await file.read()
    results = detect_objects(image_bytes)
    return {"detections": results}

# Detection function
def detect_objects(image_bytes, confidence_threshold=0.4):
    # Convert bytes to OpenCV image
    image_np = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(image_np, cv2.IMREAD_COLOR)
    original_h, original_w = img.shape[:2]

    # Resize to 640x640 (must be divisible by 32)
    img_resized = cv2.resize(img, (640, 640))
    img_tensor = torch.from_numpy(img_resized).permute(2, 0, 1).unsqueeze(0).float() / 255.0
    img_tensor = img_tensor.to(device)

    with torch.no_grad():
        preds = model(img_tensor)[0]
        preds = non_max_suppression(preds, conf_thres=confidence_threshold, iou_thres=0.45)[0]

    results = []

    if preds is not None and len(preds):
        for *xyxy, conf, cls in preds:
            x1, y1, x2, y2 = map(int, xyxy)
            cls_id = int(cls.item())
            label = LABELS[cls_id] if cls_id < len(LABELS) else f"class_{cls_id}"

            results.append({
                "label": label,
                "confidence": round(conf.item(), 2),
                "x": x1,
                "y": y1,
                "width": x2 - x1,
                "height": y2 - y1
            })

    return results
