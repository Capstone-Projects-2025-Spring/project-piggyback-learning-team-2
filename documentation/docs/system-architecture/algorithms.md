---
sidebar_position: 7
---
# Algorithm Overview
The project leverages a variety of algorithms to process videos, analyze frames, and generate meaningful questions based on those analyses. The core components are YOLOv8 for object detection, machine learning for analyzing frames, OpenAI’s API for generating questions from those analyses, and the SysnthesisSpeech API for reading the questions aloud. The training data is sourced from videos, primarily YouTube Kids, which are used for both training and testing the model. Below is an overview of the key algorithms employed in the project:

## YOLOv8: Object Detection
YOLOv8 (You Only Look Once version 8) is a state-of-the-art object detection model, designed to identify and classify objects in images and videos in real time. YOLOv8 uses a single convolutional neural network (CNN) to predict the bounding boxes and class probabilities of objects. This allows the model to identify multiple objects within a frame with a high degree of accuracy and speed. YOLOv8 is particularly suitable for this project as it can detect objects efficiently from video frames, which is essential for creating the basis for the questions generated in the app.

### Training and Dataset for YOLOv8
 The dataset consists of videos sourced from YouTube Kids. These videos are labeled manually to identify the objects that YOLOv8 should learn to recognize. The dataset includes diverse video content (real and animated) that helps the model generalize to different scenarios and objects.

### Testing Data: 
Separate video data, also from YouTube Kids, is used to test the model. The performance of YOLOv8 is evaluated based on its ability to accurately detect objects and the speed at which it processes frames.

## OpenAI API: Question Generation
Once YOLOv8 identifies the objects in a video frame, the next step involves generating educational questions based on those objects. This is where OpenAI’s API comes in. The API is used to generate natural language questions from the detected objects and their context.

### Text Generation: 
OpenAI’s GPT model is employed to process the information about the detected objects and frame context (such as the number of objects, types, and relationships) to generate questions that are engaging and relevant to the video content.

### Natural Language Understanding: 
The system is designed to understand the relationship between detected objects and generate questions that challenge the user’s understanding. For instance, if the object detected is a ball, the system might ask, "What is the name of the object in the video?" or "How many balls are there?"
