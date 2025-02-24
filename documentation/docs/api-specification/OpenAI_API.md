---
sidebar_position: 8
description: OpenAI API documentation
---

# OpenAI API Specs

## Notes:

### Base URL: 
https://api.openai.com/v1

### Authentication: 
Requires an API key.

## Endpoints for Question Generation
Generate Text Completions

### POST /completions: Generate text based on a prompt.

#### Parameters:

* string model: The model to use (e.g., gpt-3.5-turbo).

* string prompt: The input prompt for the model.

* integer max_tokens: Maximum number of tokens to generate.

#### Example Request:

    POST https://api.openai.com/v1/completions
    Headers: {
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    }

    Body: {
        "model": "gpt-3.5-turbo",
        "prompt": "What is happening in this image?",
        "max_tokens": 50
    }

#### Returns:

* string text: Generated text based on the prompt.

### Generate Image Descriptions

#### POST /images/generations: Generate descriptions or questions based on an image.

#### Parameters:

* string prompt: The input prompt describing the image.

* integer n: Number of descriptions to generate.

### Sample Request:

    POST https://api.openai.com/v1/images/generations
    
    Headers: {
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    }

    Body: {
        "prompt": "Describe the objects in this image.",
        "n": 1
    }

#### Returns:

* list descriptions: List of generated descriptions or questions.