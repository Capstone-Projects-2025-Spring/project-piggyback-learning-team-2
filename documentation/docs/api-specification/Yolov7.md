---
sidebar_position: 7
description: Yolov7 documentation
---

# YOLOv7 Specs

## Notes:

### Library: 
yolov7 (PyTorch-based).

### Authentication: 
None required (local model).

## Endpoints for Object Detection

Load YOLOv7 Model

### Method: load_yolov7_model()

#### Parameters:

* string weights_path: Path to the YOLOv7 weights file (yolov7.pt).

#### Example Usage:

    model, device = load_yolov7_model()

#### Returns:

    * model: Loaded YOLOv7 model.

    * device: The device (CPU/GPU) where the model is loaded.

## Detect Objects in Frames

### Method: detect_objects(frame, model, device)

#### Parameters:

* numpy.ndarray frame: The image frame to process.

* model: The loaded YOLOv7 model.

* device: The device (CPU/GPU) to use for inference.

#### Sample Usage:

    predictions = detect_objects(frame, model, device)

#### Returns:

* list predictions: List of detected objects with bounding boxes and labels.