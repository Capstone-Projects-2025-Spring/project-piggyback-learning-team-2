---
sidebar_position: 4
---

# Development Environment

## Software

### IDEs
* IntelliJ
* VSCode

### Frameworks and Programming Languages
* HTML/CSS: : These languages will be used to structure the frontend UI for the application. 
* Javascript: This language will be used for the UI as well as collecting user activity data, such as clicks and time spent on the application

* Python
   * FastAPI: Framework for the backend that will support storing and acting on user input and data
   * yolov7: Python based machine learning framework that will be used to analyze video frames to determine their contents

### APIs
* OpenAI API: This API will be used to generate questions for videos based on their content
* Google's Text-To-Speech API: This API will be used to read questions out loud to users
* YouTube API: This API will be used to fetch youtube videos, display them, and play them for users

### Testing 
* pytest: Used for unit testing the backend (FastAPI) and machine learning model (YOLOv7) to ensure proper functionality and performance.
* TestClient (FastAPI): For testing API endpoints and simulating HTTP requests to check responses and data handling.
* Postman: A tool for manual testing of API interactions, including OpenAI and Google’s Text-to-Speech API.
* Jest/Cypress: Used for front-end testing of UI components and end-to-end interactions, ensuring the app functions as expected.

### Databases
* PostgreSQL: For user authentication, managing user accounts, and storing structured data like video metadata, questions, answers, and user progress. This will allow for features like saving content and tracking question progress.

* MongoDB: For tracking user activity such as time spent on each question, video playback interactions (play/pause/stop), and where they clicked within the application. Useful for logging high-volume, unstructured data.

## Hardware
There is no hardware used for this project.
