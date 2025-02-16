git b---
sidebar_position: 2
---

# Component Descriptions

This document provides an overview of the key components in the app, the technologies used to support them, and a breakdown of the purpose of the component and the key functionality of that component.

## Frontend: React.js
### Purpose: 
The frontend of the application will be built using React.js, allowing for a modular, component-based design that is engaging, interactive, and scalable.

### Key Features:
* Interactive UI: Components such as video players, quizzes, progress trackers, and feedback panels will be created as reusable React components.
* State Management: React Hooks (useState, useEffect, etc.) will be used to manage state across the components, ensuring seamless data flow and user interaction.
* Video Embedding: The YouTube Iframe API will be integrated to handle video playback, embedding, and control of the video timeline for quizzes and learning material interaction.
* Quiz Interaction: React components will handle user interactions for quizzes (e.g., multiple-choice options) and show users feedback and summaries of their quiz performance.

## Backend: FastAPI 
### Purpose: 
The backend will manage user data, video metadata, and quiz results. FastAPI will be used to build the API for this functionality, as it well-suited for handling heavy-duty functionality such as real-time scanning and machine learning.

### Key Features:
* User Authentication: Handles account creation, login, and user session management, including password encryption.
* Quiz Data Handling: Saves quiz responses, tracks user performance, and records correct/incorrect answers.
* Video and Learning Materials: Manages the video content (including timestamps for quizzes and learning materials) and integrates them with the frontend.
* Database Interaction: Communicates with both PostgreSQL (for structured data) and MongoDB (for unstructured activity logs) for saving and retrieving data.

## Database: PostgreSQL & MongoDB
### Purpose: 
The project will utilize two databases to store structured data, such as saved user videos and user quiz results, and unstructured data for user analytics (e.g, session times, clicks)

* PostgreSQL: For user authentication, quiz results, and video metadata (e.g., timestamps, video content descriptions).
* MongoDB: For logging user activity, including time spent on quizzes and interactions during video playback.

### Key Features:
PostgreSQL: Stores user profiles, quiz data, video history, and saved user videos.
MongoDB: Tracks user engagement (e.g., play/pause actions, video timestamps, and quiz completion).

## YouTube API
### Purpose: 
The YouTube Iframe API will be used for embedding YouTube videos and interacting with the video content.

### Key Features:
* Embed Videos: Allows the frontend to display and control YouTube videos within the web application.
* Control Playback: The API will be used to pause, play, seek to specific timestamps, and sync quizzes and materials with the video timeline.
* Video Metadata: Extracts metadata like video titles, descriptions, and timestamps for display in the UI.

## Machine Learning: YOLOv7
### Purpose: 
YOLOv7 is a python-based object recognition model will be used to analyze the contents of video frames to identify objects or specific content relevant to the video as the (e.g., images for quizzes or learning materials).

### Key Features:
* Object Detection: Detects objects in video frames for later use in generating related quizzes or interactive content.
* Video Frame Analysis: Analyzes frames in real-time to trigger educational content or quizzes based on scene context.

## OpenAI API
### Purpose: 
OpenAI API will generate dynamic quiz questions based on the content of the video.

### Key Features:
* Question Generation: Analyzes video transcript or scene context to create multiple-choice or open-ended questions.
* Natural Language Understanding: Uses GPT models to generate relevant, age-appropriate questions that align with the learning objectives of the video content.

## Text-to-Speech: Google's Text-to-Speech API

### Purpose: 
The Google Text-to-Speech API will read questions and instructions out loud to users to make the application more accessible and interactive for users.

### Key Features:
* Question Readout: Converts generated quiz questions into speech, improving accessibility and user engagement.
* Real-time Speech: Can be triggered during video playback to provide an immersive learning experience.

## Progress Tracker & Question Feedback 

### Purpose: 
These UI components track and display user progress through the video, quizzes, and learning materials.

### Key Features:
* Progress Bar: Shows the user's current progress, both through the video and quiz completion.
* Feedback Panel: After each quiz, the panel displays feedback on the answers, including correct/incorrect responses and explanations.
* Quiz Results: A summary of user quiz performance after video completion, providing detailed feedback for each question.

## User Profiles & Dashboard

### Purpose: 
Users will have personalized accounts and dashboards to track their progress as well as to save content to interact with at a later time.

### Key Features:
* Account Management: Users can create, log in, and manage their accounts.
* Activity History: Displays a history of watched videos, quiz results, and saved content for future learning.
* Learning Preferences: Users can customize their learning experience by saving videos and tracking their progress over time.

## Server & Deployment: Node.js 

### Purpose: 
Node.js will be used for server-side processing and handling API interactions.

### Key Features:
* API Services: Node.js will handle server-side functionality such as managing user data, quiz results, and video-related interactions.