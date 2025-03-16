import yt_dlp
from pydub import AudioSegment
import boto3
import requests
import io
import json
import time
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv("aws_storage_credentials.env")

# AWS Configuration
AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_DEFAULT_REGION')
S3_AUDIO_BUCKET = os.getenv('S3_AUDIO_BUCKET_NAME')

# Check if the variables are loaded
print(f"AWS_ACCESS_KEY_ID: {os.getenv('AWS_ACCESS_KEY_ID')}")
print(f"AWS_SECRET_ACCESS_KEY: {os.getenv('AWS_SECRET_ACCESS_KEY')}")
print(f"AWS_DEFAULT_REGION: {os.getenv('AWS_DEFAULT_REGION')}")
print(f"S3_AUDIO_BUCKET_NAME: {os.getenv('S3_AUDIO_BUCKET_NAME')}")

# Initialize AWS clients
s3_client = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=AWS_REGION)
transcribe_client = boto3.client('transcribe', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=AWS_REGION)
bedrock_runtime = boto3.client('bedrock-runtime', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=AWS_REGION)

#Extracts raw audio from video
def extract_video_audio(youtube_url):
    ydl_opts = {'format': 'bestaudio/best', 'quiet': True, 'noplaylist': True, 'outtmpl': 'temp_audio'}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        return info['url'], info['ext']

#Transcribes the audio into text
def transcribe_audio(audio_url, format_extension):
    response = requests.get(audio_url, stream=True)
    if response.status_code != 200:
        raise Exception("Failed to stream audio")

    audio = AudioSegment.from_file(io.BytesIO(response.content), format=format_extension)
    mp3_buffer = io.BytesIO()
    audio.export(mp3_buffer, format="mp3")
    mp3_buffer.seek(0)

    job_name = f"transcription-{uuid.uuid4()}"
    file_name = f"{job_name}.mp3"

    s3_client.upload_fileobj(mp3_buffer, S3_AUDIO_BUCKET, file_name)

    transcribe_client.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': f"s3://{S3_AUDIO_BUCKET}/{file_name}"},
        MediaFormat='mp3',
        LanguageCode='en-US'
    )

    while True:
        status = transcribe_client.get_transcription_job(TranscriptionJobName=job_name)
        if status['TranscriptionJob']['TranscriptionJobStatus'] in ['COMPLETED', 'FAILED']:
            break
        print("Waiting for transcription to complete...")
        time.sleep(5)

    if status['TranscriptionJob']['TranscriptionJobStatus'] == 'FAILED':
        raise Exception(f"Transcription failed: {status}")

    transcript_uri = status['TranscriptionJob']['Transcript']['TranscriptFileUri']
    transcript_response = requests.get(transcript_uri)
    transcript_data = transcript_response.json()

    s3_client.delete_object(Bucket=S3_AUDIO_BUCKET, Key=file_name)
    return transcript_data['results']['transcripts'][0]['transcript']

#Generates questions from the transcribed text
def generate_questions(transcript):
    prompt = f"""
    Based on this transcript from a children's educational video, please create 5 educational questions appropriate for 5-7 year old children.
    Each question should have 4 answer choices labeled A, B, C, and D.
    Make sure the questions are simple, age-appropriate, and based on the content of the transcript.
    
    Transcript: {transcript[:4000]}
    
    Format each question as:
    1. [Question]
       A. [Option A]
       B. [Option B]
       C. [Option C]
       D. [Option D]
    """

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 500,  # Adjusted max tokens to reduce costs
        "temperature": 0.7,
        "messages": [{"role": "user", "content": prompt}]
    }

    # Use invoke_model_with_response_stream
    response = bedrock_runtime.invoke_model_with_response_stream(
        modelId="arn:aws:bedrock:us-east-1:911167886269:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",  # Correct model ID
        body=json.dumps(payload)
    )

    # Process the event stream
    full_response = ""
    for event in response['body']:
        chunk = event['chunk']
        chunk_data = json.loads(chunk['bytes'].decode('utf-8'))
        print(f"Chunk Data: {chunk_data}")  # Debug: Print the chunk data

        # Handle different chunk types
        if chunk_data['type'] == 'content_block_delta':
            if 'delta' in chunk_data and 'text' in chunk_data['delta']:
                full_response += chunk_data['delta']['text']

    return full_response

# Test
youtube_url = "https://www.youtube.com/watch?v=q1xNuU7gaAQ&t=72s"

with open("transcript.txt", "r") as file:
    transcript_text = file.read()

print(f"Transcript: {transcript_text[:4000]}")
questions = generate_questions(transcript_text)
print(f"Questions: {questions}")

# Save the generated questions to a .txt file
with open("questions.txt", "w") as file:
    file.write(questions)

'''
audio_url, format_extension = extract_video_audio(youtube_url)

transcript_text = transcribe_audio(audio_url, format_extension)
#print(f"Transcript: {transcript_text}")

# Save the transcript to a .txt file
with open("transcript.txt", "w") as file:
    file.write(transcript_text)
'''