---
sidebar_position: 6
description: YouTube API documentation
---

# YouTube API Specs

## Notes:

### Base URL: 
https://www.googleapis.com/youtube/v3

### Authentication: 
Requires an API key or OAuth 2.0 for certain endpoints.

## Endpoints for Video Processing

Get Video Information

#### GET /videos: Retrieve metadata for a YouTube video.

#### Parameters:

* string id: The YouTube video ID.

* string part: Specifies the resource properties to return (e.g., snippet, contentDetails).

Example Request:

    GET https://www.googleapis.com/youtube/v3/videos?id=VIDEO_ID&part=snippet,contentDetails&key=API_KEY

#### Returns:

* string title: Title of the video.

* string description: Description of the video.

* string publishedAt: Timestamp of when the video was published.

* string duration: Duration of the video in ISO 8601 format.

Search for Videos

#### GET /search: Search for videos based on a query.

#### Parameters:

* string q: Search query.

* string part: Specifies the resource properties to return (e.g., snippet).

* integer maxResults: Maximum number of results to return (default is 5).

#### Example Request:

    GET https://www.googleapis.com/youtube/v3/search?q=Python+Programming&part=snippet&maxResults=10&key=API_KEY

#### Returns:

* list items: List of video results.

* string videoId: ID of the video.

* string title: Title of the video.

* string description: Description of the video.


## YouTube API OAuth2

### Step 1: Redirect users to request YouTube access

    GET https://accounts.google.com/o/oauth2/auth?client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&response_type=code&scope=https://www.googleapis.com/auth/youtube.readonly

### Step 2: Exchange code for access token

    POST https://accounts.google.com/o/oauth2/token

    Body: {
        "code": "AUTHORIZATION_CODE",
        "client_id": "CLIENT_ID",
        "client_secret": "CLIENT_SECRET",
        "redirect_uri": "REDIRECT_URI",
        "grant_type": "authorization_code"
    }

### Step 3: Use access token in requests

    GET https://www.googleapis.com/youtube/v3/videos?id=VIDEO_ID&part=snippet&access_token=ACCESS_TOKEN