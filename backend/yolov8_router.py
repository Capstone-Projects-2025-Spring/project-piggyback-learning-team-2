# yolo_router.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from backend.yolov8_detector import detect_objects_from_base64
import base64
from io import BytesIO

router = APIRouter(prefix="/yolo", tags=["Object Detection"])

@router.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    try:
        # Read and convert the uploaded file to base64
        image_bytes = await file.read()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')

        # Detect objects
        detections = detect_objects_from_base64(image_base64)

        return {
            "detections": detections,
            "count": len(detections),
            "model": "yolov8n"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Object detection failed: {str(e)}"
        )

@router.get("/health")
def yolo_health_check():
    return {
        "status": "ready",
        "model": "yolov8n"
    }