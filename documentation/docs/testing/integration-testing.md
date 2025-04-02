---
sidebar_position: 2
---
# Integration Testing
To ensure the functionality of our application aligns with the defined use cases, we will implement integration tests that simulate user interactions with the system. These tests will validate the end-to-end workflow, from user input to system response, without requiring manual data entry or result interpretation.

We will use FastAPI’s TestClient to simulate API requests and validate backend responses. For frontend testing, we will use Jest, a JavaScript testing framework, to test React components and user interactions. This approach allows us to test the full stack without relying on browser automation tools like Selenium.

To maintain consistency and avoid contamination of production data, we will use a clean instance of our production build and database for testing. A set of reserved user IDs will be allocated specifically for integration testing purposes.

## Basic Workflow

### Mock Data Preparation:
Mock data will be preloaded into the database using Python scripts. This ensures that the application has the necessary data to simulate real-world scenarios.

### Sample Python Script for Loading Data:

```python
    from models import User  # Example model
    from database import SessionLocal

    db = SessionLocal()

    # Mock user data
    mock_user = {
        "username": "test_user",
        "email": "test@example.com",
        "password": "securepassword123"
    }

    # Create and save mock user
    user = User(**mock_user)
    db.add(user)
    db.commit()
```

### Backend Testing:
FastAPI’s TestClient will be used to send HTTP requests to the API endpoints and validate the responses.

#### Sample FastAPI Test Script:

```javascript
    from fastapi.testclient import TestClient
    from main import app  # FastAPI app instance

    client = TestClient(app)

    def test_create_account():
        response = client.post("/register", json={
            "username": "test_user",
            "email": "test@example.com",
            "password": "securepassword123"
        })
    
        assert response.status_code == 200
        assert response.json() == {"message": "Account created successfully"}
```
### Frontend Testing with Jest:
Jest will be used to test React components and user interactions. We will mock API responses to ensure the frontend behaves as expected when interacting with the backend.

#### Example Jest Test Script:

```javascript
    // Mocked API response for account creation
    jest.mock("axios"); // Mocking axios for API calls
    axios.post.mockResolvedValue({ data: { message: "Account created successfully" } });

    test("clicking the register button creates an account", async () => {
        render(<RegisterForm />);

        // Simulate user input
        const usernameInput = screen.getByLabelText("Username");
        const emailInput = screen.getByLabelText("Email");
        const passwordInput = screen.getByLabelText("Password");
        fireEvent.change(usernameInput, { target: { value: "test_user" } });
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(passwordInput, { target: { value: "securepassword123" } });

        // Simulate form submission
        const registerButton = screen.getByText("Register");
        fireEvent.click(registerButton);

        // Verify success message
        const successMessage = await screen.findByText("Account created successfully");
        expect(successMessage).toBeInTheDocument();
    });
```
## Use Case 1 - Creating an Account
*As a user, I want to be able to create an account in order to access videos and interact with them.*

1. Upon accessing the web application for the first time and piggybacklearning.com, the user is directed to a landing page, where there are buttons that allow the user to either login in or register with a new account.

2. The user selects the “Register” button to access the account registration page.

3. The user inputs a username, email address, and password into the relevant fields and clicks the sign-up button in order to register. If the information is valid and is processed, the user will receive a notification that their account has been created on the screen and in their email.

4. The user then is redirected to the landing page, where they log in with their email address and password. Once the user logs in they are directed to the main page, where they can click one of the videos displayed to play it, or search for a video with the search bar or topic sidebar.

## Assertations:

1. Upon selecting the "Register" button, the user is directed to the account registration page.

2. Upon submitting valid information (username, email, and password), the user receives a notification that their account has been created.

3. The user’s account information is stored in the database.

4. After account creation, the user is redirected to the landing page to log in.

5. Upon successful login, the user is directed to the main page where they can access videos.

## Use Case 2 - Logging In
*As a user, I want to be able to log in to my account in order to access videos, interact with them, and submit my own content to generate interactive videos from.*

1. The user accesses the web application by going to “piggybacklearning.com”.

2. The user selects the “Login” button to access the sign in page.

3. The user enters their email and password to login.

4. If the user’s email and password are valid, the user is redirected to the main page. If not, they are notified that their credentials are valid.

## Assertations:

1. Upon selecting the "Login" button, the user is directed to the sign-in page.

2. Upon entering valid credentials (email and password), the user is redirected to the main page.

3. Upon entering invalid credentials, the user is notified that their credentials are invalid.

4. The user’s session is authenticated and maintained upon successful login.

## Use Case 3 - Resetting a Password
*As a user, I want to be able to reset my password in the event that I forget it and can no longer access my account as a result.*

1. The user accesses the web application by going to “piggybacklearning.com”.

2. The user selects the “Reset Password” button to access the reset page.

3. The user enters their email address into the relevant field.

4. If the user enters a valid, registered email address, they will receive a notification that a password reset email has been sent. If the email entered is invalid, the user will receive a notification that the email does not exist in our database and be told to register an account.

## Assertations:

1. Upon selecting the "Reset Password" button, the user is directed to the password reset page.

2. Upon entering a valid, registered email address, the user receives a notification that a password reset email has been sent.

3. Upon entering an invalid email address, the user is notified that the email does not exist in the database.

4. The password reset email contains a valid link to reset the user’s password.

## Use Case 4 - Searching for a Video
*As a user, I want to be able to search for different types of videos depending on my interests or a desired topic.*

1.The user navigates to the search bar at the top of the screen, where they can type in their search query to search for a video by name or topic. 

2.The user chooses a video from the dropdown menu that populates as they type, clicking any of the suggestions to be redirected to the page for that video and have the video start.

3. The user can also search by topic, clicking the “Topic List” text button from the options at the top of the site to be redirected to the topic list page, or hovering over it to see a list of topic options as well as a button to access the full list.

4. The user then clicks on a topic, and is redirected to that topics page, where there are a selection of videos related to that topic to choose from.

## Assertations:

1. Upon typing a query in the search bar, a dropdown menu populates with relevant video suggestions.

2. Upon selecting a video from the dropdown menu, the user is redirected to the video’s page, and the video starts playing.

3. Upon clicking the "Topic List" button, the user is redirected to the topic list page.

4. Upon selecting a topic, the user is redirected to a page displaying videos related to that topic.

## Use Case 5 - Answering a Question During a Video
*As a user, I want to be able to answer questions during a video.*

1. The user selects a video whether from their saved videos, a video on the main page, or a video they searched for.

2. The user clicks the video to play it.

3. When the video pauses automatically at the designated timestamp for that question, users will have the text for the question appear and have the question read to them.

4. The user can then answer the question, whether by typing in an answer or selecting from a list of multiple choices. If they need to hear the question again, they can click the speaker button in the top left corner of the question box to have it read to them again.

5. After answering the question, the user is given feedback and an explanation about their answer, and the video resumes.

## Assertations:

1. Upon reaching a designated timestamp, the video pauses, and a question is displayed and read aloud to the user.

2. The user can answer the question by typing or selecting from multiple-choice options.

3. Upon clicking the speaker button, the question is read aloud again.

4. After answering, the user receives feedback and an explanation about their answer.

5. The video resumes playing after the user submits their answer.

## Use Case 6 - Getting Results Immediately After Watching a Video
*As a user, I want to be able to see my results after answering all of the questions during a video.*

1. The user logs into an existing account, or registers with a new account to access a video.

2. The user selects a video to watch, whether from the videos on the main page, from a search, or from their saved videos.

3. The user plays the video and answers all the questions as they watch.

4. When the video ends, the user will automatically have a summary generated for them of their performance, including the number of questions answered correctly, the number of questions answered incorrectly, and a review of each question.

## Assertations:

1. Upon completing a video, a summary of the user’s performance is automatically generated.

2. The summary includes the number of questions answered correctly and incorrectly.

3. The summary includes a review of each question and the user’s answers.

4. The summary is displayed on the screen immediately after the video ends.

## Use Case 7 - Saving a Video to Watch Later
*As a user, I want to be able to save a video to my account to interact with later rather than having to search for it.*

1. The user logs into their account, or registers with a new account in order to access videos and have a profile to save them to.

2. When the user finds a video they like, they can select the bookmark shaped save icon under the video to save it to their personal library.

3. The user receives a notification that the video has been saved to their personal library.

## Assertations:

1. Upon clicking the bookmark-shaped save icon, the video is saved to the user’s personal library.

2. The user receives a notification confirming that the video has been saved.

3. The saved video is stored in the user’s account and can be accessed later.

## Use Case 8 - Accessing Saved Videos
*As a user, I want to be able to access the videos I have saved and interact with them.*

1. The user clicks their profile icon in the top right corner of the application (which will either have a profile picture or a default picture) to go to their profile.

2. The user clicks on the “Saved Library” text button in the sidebar of the profile page.

3. The user is redirected to their saved library, where saved videos are stored in order of most recent addition. 

4. The user clicks any one of these videos to play it.

## Assertations:

1. Upon clicking the profile icon, the user is directed to their profile page.

2. Upon clicking the "Save Library" button, the user is redirected to their saved videos.

3. The saved videos are displayed in order of most recent addition.

4. Upon clicking a saved video, the video starts playing.

## Use Case 9 - Seeing Results from a Video Previously Watched
*As a user, I want to be able to see a record of the videos I have watched in the past and a complete summary of how I answered the questions in those videos.*

1. The user clicks their profile icon in the top right corner of the application (which will either have a profile picture or a default picture) to go to their profile.

2. The user clicks on the “Activity History” text button in the sidebar of the profile page, which redirects them to the activity history page. The user then can see a list of all the videos they interacted with, with their most recent score displayed next to the video. 

3. The user clicks the “Detailed Results” button under the most recent score for a video. This redirects them to a full breakdown of the questions for that video and their answers.

## Assertions:

1. Upon clicking the profile icon, the user is directed to their profile page.

2. Upon clicking the "Activity History" button, the user is redirected to their activity history page.

3. The activity history page displays a list of videos the user has interacted with, along with their most recent score.

4. Upon clicking the "Results" button, the user is redirected to a full breakdown of the questions and their answers for that video.
