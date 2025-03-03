---
title: YouTube API Specs
sidebar_position: 6
description: "YouTube API documentation"
---

# YouTube API Specs

## Base URL

`https://www.googleapis.com/youtube/v3`

## Authentication

Requires an API key or OAuth 2.0 for certain endpoints.

## Endpoints for Video Processing

### Get Video Information

`GET /videos`

Retrieve metadata for a YouTube video.

#### Parameters

- **id** (string): The YouTube video ID
- **part** (string): Specifies the resource properties to return (e.g., snippet, contentDetails)

#### Example Request

```http
GET https://www.googleapis.com/youtube/v3/videos?id=VIDEO_ID&part=snippet,contentDetails&key=API_KEY
```

#### Response

Returns an object containing:

- **title** (string): Title of the video
- **description** (string): Description of the video
- **publishedAt** (string): Timestamp of when the video was published
- **duration** (string): Duration of the video in ISO 8601 format

### Search for Videos

`GET /search`

Search for videos based on a query.

#### Parameters

- **q** (string): Search query
- **part** (string): Specifies the resource properties to return (e.g., snippet)
- **maxResults** (integer): Maximum number of results to return (default is 5)

#### Example Request

```http
GET https://www.googleapis.com/youtube/v3/search?q=Python+Programming&part=snippet&maxResults=10&key=API_KEY
```

#### Response

Returns an object containing:

- **items** (list): List of video results
  - **videoId** (string): ID of the video
  - **title** (string): Title of the video
  - **description** (string): Description of the video

## OAuth2 Authentication

### Step 1: Redirect Users to Request YouTube Access

```http
GET https://accounts.google.com/o/oauth2/auth?client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&response_type=code&scope=https://www.googleapis.com/auth/youtube.readonly
```

### Step 2: Exchange Code for Access Token

```http
POST https://accounts.google.com/o/oauth2/token

{
    "code": "AUTHORIZATION_CODE",
    "client_id": "CLIENT_ID",
    "client_secret": "CLIENT_SECRET",
    "redirect_uri": "REDIRECT_URI",
    "grant_type": "authorization_code"
}
```

### Step 3: Use Access Token in Requests

```http
GET https://www.googleapis.com/youtube/v3/videos?id=VIDEO_ID&part=snippet&access_token=ACCESS_TOKEN
```
