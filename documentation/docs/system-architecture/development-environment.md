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

### Databases
* PostgreSQL: For user authentication, managing user accounts, and storing structured data like video metadata, questions, answers, and user progress. This will allow for features like saving content and tracking question progress.

* MongoDB: For tracking user activity such as time spent on each question, video playback interactions (play/pause/stop), and where they clicked within the application. Useful for logging high-volume, unstructured data.

* Cloudinary: For hosting and serving user-uploaded videos and related media. This reduces the storage load on the server while providing fast access to video content.

## Hardware
There is no hardware used for this project.
