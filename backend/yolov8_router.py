from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from backend.yolov8_detector import detect_objects_from_base64
import base64
from io import BytesIO

router = APIRouter(prefix="/yolo", tags=["YOLOv8"])

@router.post("/detect")
async def detect_yolo(file: UploadFile = File(...)):
    try:
        # Read image file
        image_bytes = await file.read()

        # Convert to base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')

        # Detect objects
        results = detect_objects_from_base64(image_base64)

        return JSONResponse(content={"detections": results})

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )