import openai
import os
import json
import re
from dotenv import load_dotenv

# Load OpenAI API key from .env file
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# --- Safely extract JSON from GPT response ---
def safe_parse_json(json_str):
    """Safely extract and parse JSON from GPT response."""
    try:
        # Remove GPT markdown code block markers if present
        json_str = re.sub(r'^```json\s*|\s*```$', '', json_str.strip(), flags=re.DOTALL)
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"[❌] JSON parsing error: {e}")
        return None

# --- Generate multiple-choice question from detected labels ---
def generate_mcq_from_labels(labels):
    if not labels:
        return {
            "text": "No objects detected to generate a question.",
            "options": [],
            "answer": ""
        }

    joined = ", ".join([obj["label"] for obj in labels])

    prompt = f"""
You are a friendly teacher creating fun quiz questions for children.

Based on these detected objects: {joined}, generate ONE multiple-choice question
in JSON format. Use SIMPLE language and make sure all four options come from
the detected objects.

Respond with ONLY this JSON format:
{{
  "text": "Question goes here?",
  "options": ["Label1", "Label2", "Label3", "Label4"],
  "answer": "CorrectOption"
}}
"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        raw_response = response.choices[0].message.content
        parsed = safe_parse_json(raw_response)

        if not parsed:
            raise ValueError("Invalid JSON format from GPT")

        if not all(k in parsed for k in ["text", "options", "answer"]):
            raise ValueError("Missing keys in GPT response")

        if not isinstance(parsed["options"], list) or len(parsed["options"]) != 4:
            raise ValueError("Expected 4 options in 'options' list")

        return parsed

    except Exception as e:
        print(f"[⚠️] GPT MCQ generation failed: {str(e)}")
        return {
            "text": "Let's explore what's in the video!",
            "options": [],
            "answer": ""
        }

# --- Generate MCQ from YouTube transcript ---
def generate_questions_from_transcript(title: str, transcript: str):
    prompt = f"""
You are a friendly educational assistant for children. Read the transcript of a YouTube video below and create a fun multiple-choice question **in English**, even if the video is in another language.

Transcript (up to 1000 characters):
\"\"\"{transcript[:1000]}\"\"\"

Make sure:
- The question and all options are in English.
- It should be related to what kids might learn from the video.
- Provide 4 answer choices (A–D), and pick the correct one.
- Keep language easy for children to understand.

Respond with ONLY this JSON:
{{
  "text": "Your question?",
  "options": ["A", "B", "C", "D"],
  "answer": "Correct Answer"
}}
"""


    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )

        content = response.choices[0].message.content
        parsed = safe_parse_json(content)

        if not parsed:
            raise ValueError("Failed to parse GPT response")

        if not all(k in parsed for k in ["text", "options", "answer"]):
            raise ValueError("Incomplete response from GPT")

        return parsed

    except Exception as e:
        print(f"[❌] Transcript GPT error: {str(e)}")
        return {
            "text": "What do you think this video is about?",
            "options": [],
            "answer": ""
        }
