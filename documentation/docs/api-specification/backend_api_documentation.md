---
sidebar_position: 2
description: Backend API documentation
---

# Backend Class Documentation

## Backend General Structure

## Routers

### Authentication
Class Purpose: Handles user authentication including login and registration.

**Methods:**

* __login(userCredentials, db)__

    * Purpose Authenticates user and returns access token

    * Pre-conditions:

        * Database connection must be valid

        * User credentials must be provided in OAuth2 format

    * Post-conditions:

        * Returns JWT token if credentials are valid

        * Raises error if authentication fails

    * Parameters:

        * userCredentials: OAuth2PasswordRequestForm - Contains username/password

        *  db: Session - Database session

    * Return Value:

        * Dictionary with access token and type

    * Exceptions:

        * HTTPException (403): For invalid credentials

* __register_user(user, db)__

    * Purpose: Creates new user account

    * Pre-conditions:

        * Email must not already exist in database

        * Password must meet security requirements

    * Post-conditions:

        * New user record created in database

        * Hashed password stored instead of plaintext

    * Parameters:

        * user: schemas.UserCredentials - User registration data

        * db: Session - Database session

    * Return Value:
        
        * schemas.UserResponse - Registered user data

    *  Exceptions:

        * HTTPException (400): If email already exists

### Crud_test
Class Purpose: Provides basic CRUD operations for video engagement tracking.

#### Methods:

__get_URL(video_url, db)__

    * Purpose: Retrieves engagement by video URL

    * Pre-conditions:

        * Database connection must be valid

        * URL must be properly formatted

    * Post-conditions:

    * Returns engagement data if found

        * Raises 404 if URL not found

    * Parameters:

        * video_url: String - Video URL to lookup

        * db: Session - Database session

    * Return Value:

        * Engagement data dictionary

    * Exceptions:

        * HTTPException (404): If URL not found

* __add_URL(video, db)__

    * Pupose: Adds new video URL to tracking

    * Pre-conditions:

        * URL must not already exist in database

        * YouTubeVideo payload must be valid

    * Post-conditions:

        * New engagement record created

        * Returns success message

    * Parameters:

        * video: YouTubeVideo - Video data

        * db: Session - Database session

    * Return Value:
        
        * Dictionary with operation results

    * Exceptions:

        * HTTPException (400): If URL already exists

## Videos

Purpose: Handles video processing and question generation.

__Data Fields:__

* processing_results: Dict - Tracks active processing jobs

* cancellation_events: Dict - Manages cancellation states

* processing_tasks: Dict - Stores active processing tasks

__Methods:__

* __run_full_analysis(video_id, youtube_url, title, num_questions, keyframe_interval)__

    * Purpose: Performs comprehensive video analysis

    * Pre-conditions:

        * Valid YouTube video ID

    * Backend services available

        * Post-conditions:

        * Transcript and keyframes processed

        * Questions generated and stored

    * Parameters:

        * video_id: String - YouTube video ID

        * youtube_url: String - Video URL

        * title: String - Video title

        * num_questions: Integer - Questions to generate

        * keyframe_interval: Integer - Analysis interval

    * Return Value:
        
        * List of generated questions

    * Exceptions:

        * HTTPException (404): No transcript available

        * asyncio.TimeoutError: Processing timeout

* __cancel_processing(video_id)__

    * Purpose: Cancels active processing job

    * Pre-conditions:

        * Processing job must exist for video_id

    * Post-conditions:

        * Processing stopped

        * Resources cleaned up

    * Parameters:

        * video_id: String - Video identifier

    * Return Value:

        * Dictionary with cancellation confirmation

### Database

Purpose: Manages database connections and sessions.

__Data Fields:__

* SQLAlchemy_Database_URL: str - Database connection string

* engine: sqlalchemy.engine - Database engine instance

* SessionLocal: sessionmaker - Session factory

__Methods:__

* __get_db()__

    * Purpose: Provides database sessions

    * Pre-conditions:

        * Database URL properly configured

    * Post-conditions:

        * Yields usable session

        * Ensures session closure

    *  Return Value:
        
        * Generator yielding Session objects

### Schemas
Purpose: Defines data validation models.

__Main Models:__

* YouTubeVideo: Validates YouTube URLs

* UserCredentials: User registration data

* VideoQuestion: Video question structure

### Tools

Purpose: Security and utility functions.

__Methods:__

__hash(password)__

    * Purpose: Securely hashes passwords

    * Pre-conditions:

        * Password string provided

    * Post-conditions:

        * Returns irreversible hash

    * Parameters:

        * password: String - Plaintext password


    * Return Value:

        * Hashed password string

* __verify(plain_password, hashed_password)__

    * Purpose: Verifies password against hash

    *  Pre-conditions:

`   * Both plain and hashed passwords provided

    * Post-conditions:

`   * Returns boolean match result

    * Parameters:

        * plain_password: String

            * hashed_password: String

    * Return Value:

        * Boolean verification result