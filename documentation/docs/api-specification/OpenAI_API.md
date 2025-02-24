---
title: OpenAI API Specs
sidebar_position: 8
description: "OpenAI API documentation"
---

# OpenAI API Specs

## Base URL

`https://api.openai.com/v1`

## Authentication

Requires an API key.

## Endpoints for Question Generation

### Generate Text Completions

`POST /completions`

Generate text based on a prompt.

#### Parameters

- **model** (string): The model to use (e.g., gpt-3.5-turbo)
- **prompt** (string): The input prompt for the model
- **max_tokens** (integer): Maximum number of tokens to generate

#### Example Request

```http
POST https://api.openai.com/v1/completions
Headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

{
    "model": "gpt-3.5-turbo",
    "prompt": "What is happening in this image?",
    "max_tokens": 50
}
```

#### Response

Returns an object containing:

- **text** (string): Generated text based on the prompt

### Generate Image Descriptions

`POST /images/generations`

Generate descriptions or questions based on an image.

#### Parameters

- **prompt** (string): The input prompt describing the image
- **n** (integer): Number of descriptions to generate

#### Example Request

```http
POST https://api.openai.com/v1/images/generations
Headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

{
    "prompt": "Describe the objects in this image.",
    "n": 1
}
```

#### Response

Returns an object containing:

- **descriptions** (list): List of generated descriptions or questions
Last edited j