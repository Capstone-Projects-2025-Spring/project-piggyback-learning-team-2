---
sidebar_position: 6
---

# Sequence Diagrams

## Use Case 1 - Creating an Account
*As a user, I want to be able to create an account in order to access videos and interact with them.*

1. Upon accessing the web application for the first time and piggybacklearning.com, the user is directed to a landing page, where there are buttons that allow the user to either login in or register with a new account.

2. The user selects the “Register” button to access the account registration page.

3. The user inputs a username, email address, and password into the relevant fields and clicks the sign-up button in order to register. If the information is valid and is processed, the user will receive a notification that their account has been created on the screen and in their email.

4. The user then is redirected to the landing page, where they log in with their email address and password. Once the user logs in they are directed to the main page, where they can click one of the videos displayed to play it, or search for a video with the search bar or topic sidebar.

<img width="670" alt="Screenshot 2025-01-30 at 6 52 17 PM" src="https://github.com/user-attachments/assets/5929a32b-ef9c-43c5-8bf9-3880409c54bb" />

## Use Case 2 - Logging In
*As a user, I want to be able to log in to my account in order to access videos, interact with them, and submit my own content to generate interactive videos from.*

1. The user accesses the web application by going to “piggybacklearning.com”.

2. The user selects the “Login” button to access the sign in page.

3. The user enters their email and password to login.

4. If the user’s email and password are valid, the user is redirected to the main page. If not, they are notified that their credentials are valid.
   
<img width="678" alt="Screenshot 2025-01-30 at 6 53 24 PM" src="https://github.com/user-attachments/assets/18a57613-9fe9-4814-be34-797f2009d0a2" />

## Use Case 3 - Resetting a Password
*As a user, I want to be able to reset my password in the event that I forget it and can no longer access my account as a result.*

1. The user accesses the web application by going to “piggybacklearning.com”.


2. The user selects the “Reset Password” button to access the reset page.

3. The user enters their email address into the relevant field.

4. If the user enters a valid, registered email address, they will receive a notification that a password reset email has been sent. If the email entered is invalid, the user will receive a notification that the email does not exist in our database and be told to register an account.

<img width="678" alt="Screenshot 2025-01-30 at 6 54 22 PM" src="https://github.com/user-attachments/assets/fdc7106a-ba04-4442-9e97-f5ff4d972116" />

## Use Case 4 - Searching for a Video
*As a user, I want to be able to search for different types of videos depending on my interests or a desired topic.*

1.The user navigates to the search bar at the top of the screen, where they can type in their search query to search for a video by name or topic. 

2.The user chooses a video from the dropdown menu that populates as they type, clicking any of the suggestions to be redirected to the page for that video and have the video start.

3. The user can also search by topic, clicking the “Topic List” text button from the options at the top of the site to be redirected to the topic list page, or hovering over it to see a list of topic options as well as a button to access the full list.

4. The user then clicks on a topic, and is redirected to that topics page, where there are a selection of videos related to that topic to choose from.

<img width="652" alt="Screenshot 2025-01-30 at 6 54 55 PM" src="https://github.com/user-attachments/assets/a3b76d14-7750-491e-a885-40007c6020b9" />

## Use Case 5 - Answering a Question During a Video
*As a user, I want to be able to answer questions during a video.*

1. The user selects a video whether from their saved videos, a video on the main page, or a video they searched for.

2. The user clicks the video to play it.

3. When the video pauses automatically at the designated timestamp for that question, users will have the text for the question appear and have the question read to them.

4. The user can then answer the question, whether by typing in an answer or selecting from a list of multiple choices. If they need to hear the question again, they can click the speaker button in the top left corner of the question box to have it read to them again.

5. After answering the question, the user is given feedback and an explanation about their answer, and the video resumes.

<img width="667" alt="Screenshot 2025-01-30 at 6 55 44 PM" src="https://github.com/user-attachments/assets/c9239c18-6f56-4062-90a7-6d3f1bf687fa" />

## Use Case 6 - Getting Results Immediately After Watching a Video
*As a user, I want to be able to see my results after answering all of the questions during a video.*

1. The user logs into an existing account, or registers with a new account to access a video.

2. The user selects a video to watch, whether from the videos on the main page, from a search, or from their saved videos.

3. The user plays the video and answers all the questions as they watch.

4. When the video ends, the user will automatically have a summary generated for them of their performance, including the number of questions answered correctly, the number of questions answered incorrectly, and a review of each question.

<img width="680" alt="Screenshot 2025-01-30 at 6 56 43 PM" src="https://github.com/user-attachments/assets/7d97348e-3c3a-4262-bb0c-af7736399120" />

## Use Case 7 - Saving a Video to Watch Later
*As a user, I want to be able to save a video to my account to interact with later rather than having to search for it.*

1. The user logs into their account, or registers with a new account in order to access videos and have a profile to save them to.

2. When the user finds a video they like, they can select the bookmark shaped save icon under the video to save it to their personal library.

3. The user receives a notification that the video has been saved to their personal library.

<img width="654" alt="Screenshot 2025-01-30 at 6 57 57 PM" src="https://github.com/user-attachments/assets/3cd50737-2082-4b11-badd-c587b3b34440" />

## Use Case 8 - Accessing Saved Videos
*As a user, I want to be able to access the videos I have saved and interact with them.*

1. The user clicks their profile icon in the top right corner of the application (which will either have a profile picture or a default picture) to go to their profile.

2. The user clicks on the “Saved Library” text button in the sidebar of the profile page.

3. The user is redirected to their saved library, where saved videos are stored in order of most recent addition. 

4. The user clicks any one of these videos to play it.

<img width="664" alt="Screenshot 2025-01-30 at 6 58 31 PM" src="https://github.com/user-attachments/assets/40858c00-7b1c-4dd4-bb21-ee49c01df82a" />

## Use Case 9 - Seeing Results from a Video Previously Watched
*As a user, I want to be able to see a record of the videos I have watched in the past and a complete summary of how I answered the questions in those videos.*

1. The user clicks their profile icon in the top right corner of the application (which will either have a profile picture or a default picture) to go to their profile.

2. The user clicks on the “Activity History” text button in the sidebar of the profile page, which redirects them to the activity history page. The user then can see a list of all the videos they interacted with, with their most recent score displayed next to the video. 

3. The user clicks the “Detailed Results” button under the most recent score for a video. This redirects them to a full breakdown of the questions for that video and their answers.

<img width="655" alt="Screenshot 2025-01-30 at 7 03 44 PM" src="https://github.com/user-attachments/assets/6cef2c32-5a89-46a6-b7cd-a342c9c906f9" />

