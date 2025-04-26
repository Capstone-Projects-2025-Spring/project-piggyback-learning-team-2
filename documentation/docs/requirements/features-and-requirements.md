---
sidebar_position: 4
---

# Features and Requirements

### Functional

#### Authentication
- Users must log in and register with an email/password.
- Upon successful registration, users receive a confirmation email.
- Users are redirected to the login page after registration.
- Users are directed to the main page after successful login.

#### Video Playback
- Play, pause, and resume videos with questions at specific timestamps.
- Saved videos are stored and accessible via the user's account.

#### Question Interaction
- Display and allow answers to AI-generated questions.
- Provide feedback and explanations for answers.
- Saved user responses are stored for performance tracking.

#### Performance Tracking
- Show correct, incorrect, skipped, and response times on questions after completing a video.
- Performance summaries are stored within MongoDB and accessible via the user's account.
#### Saved Videos
- Users can save videos to the supabase database by extracting the video's metadata e.g. url, watchtime, etc.
- Saved videos are accessible via the user's account.
#### Search
- User is aable to filter videos by title or topic.
- Search results are displayed in a categorized list.

### Non-Functional

#### Performance Tracking
- Authentication and video loading must be fast (within 5 seconds).
- Data collection will be upheld to COPPA standards.
#### AI Integration
- Video content must be analyzed to generate relevant questions.

#### Database Storage
- Store user data and video history inside supabase securely using SSL enforcement.

#### Usability
- Simple, intuitive UI with easy navigation.
- Define browser compatibility and recommend specific browsers for optimal performance.

#### Security
- Implement secure password management and data protection through MFA.
- Include details on password encryption and data security measures.