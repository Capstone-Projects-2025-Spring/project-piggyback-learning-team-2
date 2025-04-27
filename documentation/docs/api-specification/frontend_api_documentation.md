---
sidebar_position: 1
description: Frontend API documentation
---

# Frontend Class Documentation

## App
The root component managing application initialization and routing. 

### Data Fields:

- **Routes: Array**
  - Defines paths for different pages in the app, including sign-in, sign-up, user profile, and video watch

### Methods:

**render()**

Renders the application’s routes and views.

**Arguments:** None

**Returns:** React element

## Home

This component represents the home page of the Piggyback Learning website, where users can view learning videos, add their own YouTube videos, and navigate to other parts of the site (such as profile or sign-in).

### Data Fields:

- **videoCardsRef: useRef**
  - A reference to the container holding video cards, used for scrolling.

- **responseData: String**
  - Stores the response data (such as generated learning questions) to be displayed on the UI.

- **youtubeUrls: Array**
  - Contains a list of YouTube video objects, each with a video source (src), title, and a thumbnail URL.

### Methods:

**useEffect (fetchThumbnails)**

Fetches YouTube video thumbnails based on the video URLs when the component mounts.

**Arguments:** None

**Returns:** Promise&lt;void&gt; - Resolves after thumbnails are updated.

**Exceptions:**

- Error: Any error encountered while fetching thumbnails.

**getYouTubeVideoId(url)**

Extracts the video ID from a given YouTube URL.

**Arguments:**

- url: String - The URL of the YouTube video.

**Returns:** String | null - The extracted video ID, or null if no valid ID is found.

**getThumbnailUrl(videoId)**

Fetches the thumbnail URL for a given video ID from the YouTube API.

**Arguments:**

- videoId: String - The YouTube video ID.

**Returns:**

- String - The URL of the video’s thumbnail.

**handleVideoClick(videoUrl, videoTitle)**

Handles video card clicks, navigating to the watch page and checking for cached questions.

**Arguments:**

- videoUrl: String - The URL of the video.

- videoTitle: String - The title of the video.

**Returns:** void

**Exceptions:** None

**handleYoutubeVideo()**

Handles adding a YouTube video through a URL input, validates the URL, and navigates to the watch page.

**Arguments:** None.

**Returns:** void

**Exceptions:**

- ValidationError: If the YouTube URL is invalid.

## SignIn

This component manages the sign-in process for users, including email/password sign-in, Google OAuth, and password reset.

### Data Fields:

- **showWelcome: Boolean**
  - Determines if the welcome message should be displayed after a short delay.

- **email: String**
  - Stores the user’s email input.

- **password: String**
  - Stores the user’s password input.

- **error: String**
  - Stores any error messages related to the sign-in process.

### Methods:

**useEffect (showWelcomeMessage)**

Displays a welcome message after a delay when the component mounts.

**Arguments:** None

**Returns:** void

**Exceptions:** None

**handleEmailSignIn(e)**

Handles the sign-in process using email and password. Authenticates the user with Supabase and navigates to the profile page upon success.

**Arguments:**

- e: Event - The form submission event.

**Returns:** void

**Exceptions:**

- AuthError: If sign-in fails, an error message is displayed.

**handleForgotPassword()**

Handles the password reset process by sending a reset link to the user's email.

**Arguments:** None

**Returns:** void

**Exceptions:**

- EmailNotProvided: If the email field is empty.

**handleGoogleLoginSuccess(credentialResponse)**

Handles successful Google OAuth sign-in and navigates to the profile page.

**Arguments:**

- credentialResponse: Object - Contains the Google OAuth credential.

**Returns:** void

**Exceptions:**

- AuthError: If Google sign-in fails.

**handleGoogleLoginError()**

Handles Google OAuth sign-in failure by displaying an error message.

**Arguments:** None

** Returns:** void

**Exceptions:** None

## SignUp

Handles user sign-up functionality with both email/password and Google authentication.

### Data Fields:

- **formData:** Object
    - Contains user's first name, last name, email, and password

- **showWelcome: Boolean**
  - Controls the visibility of the welcome message

-  **error: String**
    - Holds error message if sign-up fails

- **navigate: Function**
  - React Router function for navigation after successful sign-up

### Methods:

**handleInputChange(e)**

Updates the form data with user input.

**Arguments:**

 - e: Event - Input change event from form fields

**Returns:** void

**handleSubmit(e)**

Handles the submission of the sign-up form.

**Arguments:**

 - e: Event - Form submission event

**Returns:** Promise&lt;void&gt;

**Exceptions:**

- SignUpError: If the sign-up or profile creation fails

**handleGoogleLoginSuccess(credentialResponse)**

Handles successful Google login and sign-in.

**Arguments:**

- credentialResponse: Object - Response from the Google login

**Returns:** Promise&lt;void&gt;

**Exceptions:**

- GoogleLoginError: If Google login fails

**handleGoogleLoginError()**

Handles errors during Google login.

**Arguments:** None

**Returns:** void

## VideoWatch

Interactive video quiz component with question handling and progress tracking.

### Data Fields:

- **BACKEND_URL: String**
  - Base URL for API requests

- **videoRef: Ref**
  - Reference to video DOM element

- **playerRef: Ref**
  - Reference to ReactPlayer instance

- **videoWrapperRef: Ref**
  - Reference to video wrapper element

- **state: Object**
  - Component state management

### Methods:

**getYouTubeVideoId(url)**

Extracts YouTube video ID from URL

**Arguments:**

- url: String - YouTube video URL

**Returns:** 

- String|null - Video ID or null if invalid

**formatTime(seconds)**

Formats seconds into MM:SS

**Arguments:**

- seconds: Number - Time in seconds

**Returns:** String - Formatted time string

**speakQuestion(question)**

Reads question aloud using speech synthesis

**Arguments:**

- question: Object - Question data

**Returns:** void

**showQuestion(question)**

Displays question and pauses video

**Arguments:**

- question: Object - Question to display

**Returns:** void

**handleCancelProcessing()**

Cancels video processing

**Arguments:** None

**Returns:** Promise&lt;void>&gt;

**Exceptions:**

- Error: When cancellation fails

**checkQuestionTime()**

Checks if current video time matches question timestamp

**Arguments:** None

**Returns:** void

**handleWatchAgain()**

Rewinds video to re-ask current question

**Arguments:** None

**Returns:** void

**handleRestartVideo()**

Restarts video from beginning

**Arguments:** None

**Returns:** void

**handleAnswer(label)**

Processes user's answer to current question

**Arguments:**

- label: String - User's answer

**Returns:** void

**handleSkip()**

Skips current question

**Arguments:** None

**Returns:** void

**handleVideoEnded()**

Handles video end event and shows summary

**Arguments:** None

**Returns:** void

**calculateDetectionBoxStyle(det)**

Calculates position for object detection boxes

**Arguments:**

- det: Object - Detection data

**Returns:** Object - CSS style object

## UserProfileDashboard

Displays user profile information, learning progress, and quiz stats, while allowing users to manage saved videos, video history, and profile edits.

### Data Fields:

- **profile: Object | null**
  - User profile data (e.g., first name, last name, avatar, etc.)

- **loading: Boolean**
  - Indicates if the profile is still being loaded

- **darkMode: Boolean**
  - Indicates if dark mode is enabled

- **quizStats: Object**
  - Contains quiz statistics (e.g., total questions answered, correct answers, accuracy)

- **quizHistory: Array**
  - History of quizzes answered by the user

- **videoHistory: Array**
  - History of videos watched by the user

- **savedVideos: Array**
  - List of videos saved by the user

- **progressStats: Object**
  - Learning progress statistics (e.g., number of saved and watched videos, completion percentage)

- **showSaved: Boolean**
  - Toggles visibility of saved videos section

- **showHistory: Boolean**
  - Toggles visibility of video history section

- **showProgress: Boolean**
  - Toggles visibility of progress section

- **editing: Boolean**
  - Indicates whether the user is editing their profile

- **editValues: Object**
  - Values used for editing the user's profile (e.g., first name, last name, avatar URL)

### Methods:

**fetchVideoHistory(userId)**

Fetches the user's video history from the database.

**Arguments:**

- userId: String - User identifier

**Returns:** Promise<void>

**Exceptions:**

- Error: When video history cannot be fetched

**fetchSavedVideos(userId)**

Fetches the user's saved videos and calculates the progress statistics (watched vs. saved).

**Arguments:**

- userId: String - User identifier

**Returns:** Promise<void>

**Exceptions:**

- Error: When saved videos cannot be fetched

**fetchQuizStats(userId)**

Fetches the user's quiz stats (total questions, correct answers, accuracy).

**Arguments:**

- userId: String - User identifier

**Returns:** Promise<void>

**Exceptions:**

- Error: When quiz stats cannot be fetched

**handleInputChange(e)**

Handles input changes for profile editing.

**Arguments:**

- e: Event - Input event

**Returns:** void

**handleSaveProfile()**

Saves the edited profile to the database.

**Arguments:** None

**Returns:** void

**Exceptions:**

- Error: When profile cannot be updated

**handleSignOut()**

Signs the user out of the application.

**Arguments:** None

**Returns:** void

**Exceptions:**

- Error: When sign-out fails

## SupabaseClient

Handles connection setup to Supabase.

### Data Fields:

- **supabaseUrl: String**
    - URL for the Supabase instance

- **supabaseAnonKey: String**
  - Anon API key for authenticating with Supabase

- **supabase: Object**
  - Supabase client instance for interacting with the database

### Methods:

**createClient(url, anonKey)**

Creates and initializes a Supabase client instance.

**Arguments:**

- url: String - The Supabase URL

- anonKey: String - The Supabase Anon API key

**Returns:** Supabase client instance