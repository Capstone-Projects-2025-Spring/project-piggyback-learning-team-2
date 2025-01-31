---
sidebar_position: 1
---

# System Overview

## Project Purpose
The **Piggyback Learning 002** project aims to enhance educational content by integrating interactive learning elements directly into YouTube videos. By adding quizzes, learning materials, and feedback directly into video playback, the project seeks to engage children in an interactive and structured learning experience. The goal is to transform passive video watching into an active educational journey, where children not only consume content but also participate in learning through real-time quizzes and activities.

## Core Features
### Interactive Quizzes
Quizzes are dynamically injected into the video at predefined timestamps. These quizzes are designed to engage users and assess their understanding of the material presented in the video. Users can select answers from multiple choices or enter their own responses.

### Learning Materials
Educational content such as flashcards, images, and notes are displayed alongside videos to reinforce the concepts being taught. These materials will be accessible at key moments during the video, ensuring they complement the video content.

### Progress Tracking
Users can track their progress through the video and quizzes. After each quiz or interaction, a progress bar will visually show how far along they are in the learning journey. Additionally, a summary of their performance (correct/incorrect answers) will be provided at the end of the video.

### User Profiles
Users can create accounts, log in, and save their progress. They will have access to a personal dashboard where they can view saved videos, check previous quiz results, and explore content based on their learning preferences.

### Real-Time Feedback
After completing a quiz during the video, users will immediately receive feedback on their answers. Correct answers will trigger positive reinforcement, and incorrect answers will prompt a brief explanation to help the learner understand the mistake.

## Technology Stack
### Frontend:
- **React.js**: For building the interactive UI and handling video controls.
- **JavaScript/HTML/CSS**: To ensure compatibility across modern web browsers and devices.
- **YouTube Iframe API**: For embedding and controlling YouTube videos seamlessly.

### Backend:
- **Flask or FastAPI**: For managing user data, saving quiz results, and processing video-related interactions.
- **Database**: MongoDB or PostgreSQL for storing user profiles, quiz results, and video data.

### Other Tools:
- **Node.js**: For server-side processing and managing API interactions.

## User Interaction Flow
1. **Landing Page**: Users access the landing page, where they can either log in or register.
2. **Registration/Login**: After logging in or creating an account, users are directed to the main page where they can browse available videos.
3. **Video Playback**: Users play a video, and interactive quizzes/materials appear at specified timestamps.
4. **Quiz Interaction**: During the video, users answer questions. They receive immediate feedback, and the video resumes.
5. **Results**: After the video ends, users are shown a summary of their quiz results and can access learning materials for review.
6. **Account Management**: Users can view their activity history, save videos for later, and track their learning progress.

## Dependencies
- **YouTube API**: The system depends on the YouTube Iframe API for embedding videos and controlling playback.
- **React and Node.js**: React.js for building interactive UI components and Node.js for backend services.
- **Database**: A reliable database system (e.g., MongoDB or PostgreSQL) will be used for storing user data and video interactions.
