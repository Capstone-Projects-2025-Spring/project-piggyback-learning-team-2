---
sidebar_position: 2
description: Backend API documentation
---

# Backend Class Documentation

## Backend General Structure

## Routers

### Authentication

### Crud_test

### Video_process

### Videos

## Database

## Db_models

## Gpt_helper

## Main

## Oauth2

## openAIHelper

## Schemas

## Tools

## Yolov8 Detector

## Yolov8 Router

## YouTubeVideo
Class Purpose: Pydantic model for validating user-supplied YouTube URLs with common formats.

__Data Fields:__

* __url__

    * Type: HttpUrl

    * Purpose: Store the YouTube URL.

__Methods:__

* __check_YouTubeVideoURL(cls, v: HttpUrl) -> HttpUrl:__

    * Purpose: Validate that the URL matches a regex pattern for YouTube video URLs.

    * Pre-conditions:

    * v must be a string representing a URL.

    * Post-conditions:

        * If the URL matches the regex pattern, return the URL.

        * If the URL does not match, raise a ValueError.

    * Parameters:

        * v - (HttpUrl): The URL to validate.

    * Return Value:

        * Validated YouTube video URL (HttpUrl).

    * Exceptions:

        * Raises ValueError if the URL does not match the regex pattern.

* __valid_YTvideo (API Endpoint)__

    * Purpose: API endpoint for validating YouTube video URLs. It accepts a JSON payload containing a YouTube video URL.

    * Parameters:

        * video (YouTubeVideo): A Pydantic model instance containing the YouTube URL.

    * Return Value:

        * Dictionary with a message and the validated URL.

    * Exceptions:

    * Raises HTTPException (422) if the provided data is not a valid URL.

## Video_Scanning

__Purpose:__
A pipeline to break a YouTube video into frames, feed them to YOLOv7 for object detection, generate questions using OpenAI API based on the analyzed frames, and use Google TTS to read the questions aloud.

* __load_yolov7_model()__
    * Purpose: Load the YOLOv7 model with PyTorch 2.6 compatibility.

    * Pre-conditions:

        * YOLOv7 weights file (yolov7.pt) must exist at the specified path.

    * Post-conditions:

        * The YOLOv7 model is loaded and set to evaluation mode.

    * Return Value:

        * model: The loaded YOLOv7 model.

        * device: The device (CPU, GPU, or MPS) where the model is loaded.

    * Exceptions:

        * Raises FileNotFoundError if the weights file is missing.

        * Raises ValueError if the model fails to load.

* __stream_youtube_video(url)__

    * Purpose: Extract the best available video stream URL from a YouTube video.

    * Parameters:

        * url (str): The YouTube video URL.

    * Return Value:

        * The best available video stream URL.

    * Exceptions:

        * Raises ValueError if the video info cannot be extracted or no valid formats are found.

* __clear_frames_folder()__

    * Purpose: Clear the frames directory and recreate it.

    * Post-conditions:

        * The frames directory is empty and ready for new frames.

* __load_training_videos()__

    * Purpose: Load training videos from a JSON file.

    * Return Value:

        * A list of training videos.

    * Exceptions:

        * Raises ValueError if the JSON structure is invalid.

* __process_video(video_url, video_id, frame_interval=30)__

    * Purpose: Process a YouTube video by extracting frames at specified intervals and saving them to a directory.

    * Parameters:

        * video_url (str): The URL of the video stream.

        * video_id (str): A unique identifier for the video.

        * frame_interval (int): The interval (in frames) at which to extract frames. Default is 30.

    * Return Value:

        * A list of timestamps corresponding to the extracted frames.

    * Exceptions:

        * Raises ValueError if the video stream cannot be opened.

* __generate_questions(timestamps)__

    * Purpose: Generate questions based on the timestamps of extracted frames.

    * Parameters:

        * timestamps (list): A list of timestamps.

    * Return Value:

        * A list of questions, e.g., "What is happening at X seconds?"

* __speak_questions(timestamps, video_id, language='en')__

    * Purpose: Generate questions based on timestamps and convert them to speech using Google Text-to-Speech (TTS).

    * Parameters:

        * timestamps (list):

            * Type: List of floats.

            * Purpose: Timestamps of the extracted frames from the video.

        * video_id (str):

            * Type: String.

            * Purpose: Unique identifier for the video (used to organize audio files).

        * language (str):

            * Type: String.

            * Purpose: Language code for the TTS engine (default is 'en' for English).

            * Return Value:

        * audio_files (list):

            * Type: List of strings.

            * Purpose: File paths to the generated audio files (e.g., ['audio/video_1/question_1.mp3', 'audio/video_1/question_2.mp3']).

    * Exceptions:

        * Raises Exception if the TTS conversion fails (e.g., due to network issues or invalid input).
    
