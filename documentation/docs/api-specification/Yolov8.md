---
sidebar_position: 7
description: Yolov8 documentation
---

# YOLOv8 Specs

## Notes:

### Library: 
yolov8 (PyTorch-based).

### Authentication: 
None required (local model).

## Endpoints for Object Detection

Load YOLOv8 Model

### Method: load_yolov7_model()

#### Parameters:

* string weights_path: Path to the YOLOv8 weights file (yolov8.pt).

#### Example Usage:

    model, device = load_yolov8_model()

#### Returns:

    * model: Loaded YOLOv8 model.

    * device: The device (CPU/GPU) where the model is loaded.

## Detect Objects in Frames

### Method: detect_objects(frame, model, device)

#### Parameters:

* numpy.ndarray frame: The image frame to process.

* model: The loaded YOLOv8 model.

* device: The device (CPU/GPU) to use for inference.

#### Sample Usage:

    predictions = detect_objects(frame, model, device)

#### Returns:

* list predictions: List of detected objects with bounding boxes and labels.