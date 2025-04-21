from ultralytics import YOLO
from PIL import Image
import sys

# ✅ Path to your test image (replace with any image file)
IMAGE_PATH = "backend/tests/dog.jpg"  # Put an image in your project root

try:
    # ✅ Load the model
    print("🔄 Loading YOLOv8 model...")
    model = YOLO("yolov8n.pt")  # Uses cache or auto-downloads

    # ✅ Load image
    print(f"🖼️ Opening image: {IMAGE_PATH}")
    image = Image.open(IMAGE_PATH)

    # ✅ Run prediction
    print("🔍 Running prediction...")
    results = model.predict(image)

    # ✅ Show results
    for result in results:
        print("\n📦 Detection Result:")
        for box in result.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            name = model.names[cls_id]
            print(f"  - {name}: {conf:.2f}")

except Exception as e:
    print("🔥 ERROR:", str(e))
    sys.exit(1)
