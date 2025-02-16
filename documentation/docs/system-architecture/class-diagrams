---
sidebar_position: 3
---

# Class Diagrams

## Frontend Class Diagram

![Alt Text](/img/Main_Class_Diagram.png)

#### Figure 1.1 All React Components
Figure 1.1 shows all the React components that make up the frontend of the Piggyback Learning.

### App
The App component is the entire site broken into smaller components. It is the main point of entry and splits into four main classes, VideoPage, Authmanager, HomePage, and DashboardPage.

#### HomePage
The HomePage component is the landing page of the site, and owns SearchEngine which is used to search for videos on the site.

### VideoPage
The VideoPage component handles display and access to videos for users, with video interaction and recording of progress being handled in the classes under this component.

### AuthManager
The AuthManager component handles authentication for users, which facilitates progress tracking and could potentially be used to faciliate recommended content.

## Backend Class Diagram

The following section will cover the backend and component diagrams, showing the classes to be developed or used and their relationship.

### Question Generation

![Alt Text](/img/Question_Generation.png)

#### Figure 1.2 Question Generation

Figure 1.2 shows the components that make up AIEngine, which is the component that handles generating questions by analyzing videos.

### AI Engine

This component handles everything related to the AI and ML aspects of the project. It handles scanning videos and collecting frames from them, which are then manually labelled and then given to yolov7 within this component in order to analyze their content to create a question. This component then uses the OpenAI API to generate relevant questions based on the frames. This component is also responsible for collecting the timestamps for the questions so that the video will stop and start and the relevant times to ask the question to a user.

### Yolov7 and OpenAI

These components are external services that the AI Engine uses to achieve it's functionality, with Yolov7 being used to break down video and analyze the content of video frames, and OpenAI's API being used to generate questions based on the frames for users to answer as they watch a video.

### Video Interaction and Progress Tracking

![Alt Text](/img/Video_Interaction_And_Progress.png)

#### Figure 1.3 Video Interaction and Progress Tracking

Figure 1.2 shows the backend components that make up VideoPage, which is the frontend component that handles displaying videos to users and making them interactive.

### VideoPlayer

This component handles the playing, stopping, and starting of the video. A video will start when a user hits the play button, and will stop at the appropriate timestamp to ask a question. Once that is complete, it will start again, and this will continue until the video's end.

### QuestionHandler

This component handles the display of a question, validation of a user's answer, giving of feedback, and using reading questions aloud to users with the assistance of Google TTS. When the appropriate timestamp is reached, a question will be displayed and the video will pause for the user to answer. The user will then recieve feedback on their answer, whether it was correct or not and an explanation, and then the video will resume.

### ProgressManager

This component handles tracking of a user's answers during a video, creating the progress summary at the ened of a video, and saving these details to the user's profile. When a user watches a video and answers all the questions, they will recieve a summary at the end that will give them a score and allow them to flip through each question and review them. The video and their answers will be saved to their "Video History" where they can review the video anytime they wish by going to that section of their profile.

### Google TTS
This component is an external service that comes from Google's text-to-speech API. It is used for reading questions aloud to users to make the application more accessible for emerging and early readers.
