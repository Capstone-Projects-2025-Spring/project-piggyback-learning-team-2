[![Open in Codespaces](https://classroom.github.com/assets/launch-codespace-2972f46106e565e64193e422d61a12cf1da4916b45550586e14ef0a7c637dd04.svg)](https://classroom.github.com/open-in-codespaces?assignment_repo_id=17853442)
<div align="center">

# Project Name
[![Report Issue on Jira](https://img.shields.io/badge/Report%20Issues-Jira-0052CC?style=flat&logo=jira-software)](https://temple-cis-projects-in-cs.atlassian.net/jira/software/c/projects/DT/issues)
[![Deploy Docs](https://github.com/ApplebaumIan/tu-cis-4398-docs-template/actions/workflows/deploy.yml/badge.svg)](https://github.com/ApplebaumIan/tu-cis-4398-docs-template/actions/workflows/deploy.yml)
[![Documentation Website Link](https://img.shields.io/badge/-Documentation%20Website-brightgreen)](https://capstone-projects-2025-spring.github.io/project-piggyback-learning-team-2/)


</div>

## Keywords


Section 002, Web application, JavaScript, HTML, CSS, Python, Computer Vision, AI, Early Education, Learning


## Project Abstract
This document proposes a web application that enhances the educational potential of Youtube videos for children by adding interactive AI generated questions for them to answer throughout the video. Users can watch videos, search for videos based on the topics they want to explore, answer and recieve feedback on video questions, save videos to watch later, and see their watch history and past results.


## High Level Requirement


This application will be a web-based tool accessible on any modern browser, allowing users to track their interactions with educational videos without requiring authentication. Using IndexedDB, the app will locally store user activity, such as video clicks, time spent, and engagement metrics, ensuring a seamless and private experience. For users who want to retain their progress beyond a session, Flask/FastAPI with a relational database (e.g., MySQL) will provide optional long-term storage and analytics so users can track their progress over time. The app may also incorporate gamified engagement elements, offering visual indicators or progress insights based on user activity. By leveraging client-side storage for privacy and offline functionality, the application ensures users have full control over their data while maintaining a frictionless and scalable experience for video-based learning.


## Conceptual Design


The frontend of the application will be built using JavaScript, React, HTML, and CSS. React will be used to build UI components and create interactive elements such as animations. JavaScript, HTML, and CSS will be used to create the User interface and handle User interactions and ensure compatability across devices. The backend will be built using Flask or FastAPI to handle interactions with YouTube's API to fetch and play videos, managing user data, and handling video related interactions. MongoDB or PostgreSQL will be used for storing the User's profile data, quiz results, and video data. IndexedDB will be used to collect user data, such as time spent on the application during a session, question engagement, and most interacted with topics locally without authentication, and this data will be synced to allow for long term storage and analysis of this data without user authentication.


## Background


Numerous web applications exist to enhance user engagement with video-based learning, study tracking, and interactive content. Platforms like Khan Academy and Coursera provide structured learning experiences with videos and quizzes, while YouTube offers a vast, user-driven educational resource. However, most of these platforms lack personalized tracking and gamified engagement without requiring authentication, making it challenging for casual users to track their progress seamlessly.


This application distinguishes itself by offering a lightweight, authentication-free approach to tracking user interactions with educational videos. Utilizing IndexedDB for client-side storage, the app enables users to record their session activity—such as video interactions, time spent, and engagement patterns—without requiring an account. This provides a privacy-conscious and frictionless experience while still allowing users to track their learning progress over multiple sessions.


Compared to Google Analytics or YouTube’s Watch History, which require platform-based tracking and login credentials, this app offers local, transparent control over user data. Additionally, while study platforms like Quizlet or My Study Life allow goal-setting and reminders, they typically require accounts and long-term storage. By leveraging IndexedDB for short-term session tracking and Flask/FastAPI with a relational database (e.g., MySQL) for long-term persistence, this application strikes a balance between instant user interaction and scalable backend storage.


By combining client-side storage for fast, private interaction tracking with backend data management for long-term analytics, this application provides a unique blend of engagement, convenience, and user autonomy, catering to users who prefer seamless video-based learning without the barriers of authentication.


## Required Resources


This project will require the use of various frontend and backend software tools, including JavaScript, React, HTML/CSS, Flask or FastAPI, IndexedDB, MongdoDB or PostgreSQL and the YouTubeAPI. React will be used for the front-end, Flask or FastAPI for the backend, along with IndexedDB to collect user data locally. MongoDB or PostgresSQL will store user data such as quiz results, and serve as persistent storage for the user data collected locally by IndexedDB such as user clicks. No specialized hardware or software is required for the completion of this project.

## How to Run
For instructions on how to run the code locally, please reference the Backend setup.docx in the repository or in the release for detailed instructions.


## Collaborators

[//]: # ( readme: collaborators -start )
<table>
<tr>
    <td align="center">
        <a href="https://github.com/ApplebaumIan">
            <img src="https://avatars.githubusercontent.com/u/9451941?v=4" width="100;" alt="ApplebaumIan"/>
            <br />
            <sub><b>Ian Tyler Applebaum</b></sub>
        </a>
    </td>
    <td align="center">
        <a href="https://github.com/leighflagg">
            <img src="https://avatars.githubusercontent.com/u/77810293?v=4" width="100;" alt="leighflagg"/>
            <br />
            <sub><b>Null</b></sub>
        </a>
    </td></tr>
</table>

[//]: # ( readme: collaborators -end )
