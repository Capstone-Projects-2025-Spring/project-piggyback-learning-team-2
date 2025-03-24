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

# Load environment variables - moved to function to avoid loading on import
def load_aws_credentials():
    load_dotenv("aws_storage_credentials.env")

    # AWS Configuration
    AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_REGION = os.getenv('AWS_DEFAULT_REGION')
    S3_AUDIO_BUCKET = os.getenv('S3_AUDIO_BUCKET_NAME')

    # Initialize AWS clients
    s3_client = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=AWS_REGION)
    transcribe_client = boto3.client('transcribe', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=AWS_REGION)
    bedrock_runtime = boto3.client('bedrock-runtime', aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=AWS_REGION)

    return s3_client, transcribe_client, bedrock_runtime, S3_AUDIO_BUCKET

# Clean existing files
def ensure_clean_files():
    """Delete existing output files to ensure fresh generation."""
    if os.path.exists("questions.txt"):
        try:
            os.remove("questions.txt")
            print(f"Removed existing questions.txt")
        except Exception as e:
            print(f"Failed to remove questions.txt: {str(e)}")

# Extracts raw audio from video
def extract_video_audio(youtube_url):
    print(f"Extracting audio from: {youtube_url}")
    ydl_opts = {'format': 'bestaudio/best', 'quiet': True, 'noplaylist': True, 'outtmpl': 'temp_audio'}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        return info['url'], info['ext']

# Transcribes the audio into text
def transcribe_audio(audio_url, format_extension, s3_client, transcribe_client, S3_AUDIO_BUCKET):
    print("Beginning audio transcription...")
    response = requests.get(audio_url, stream=True)
    if response.status_code != 200:
        raise Exception("Failed to stream audio")

    print("Converting audio...")
    audio = AudioSegment.from_file(io.BytesIO(response.content), format=format_extension)
    mp3_buffer = io.BytesIO()
    audio.export(mp3_buffer, format="mp3")
    mp3_buffer.seek(0)

    job_name = f"transcription-{uuid.uuid4()}"
    file_name = f"{job_name}.mp3"

    print(f"Uploading audio to S3 bucket: {S3_AUDIO_BUCKET}")
    s3_client.upload_fileobj(mp3_buffer, S3_AUDIO_BUCKET, file_name)

    print(f"Starting transcription job: {job_name}")
    transcribe_client.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': f"s3://{S3_AUDIO_BUCKET}/{file_name}"},
        MediaFormat='mp3',
        LanguageCode='en-US'
    )

    print("Waiting for transcription to complete...")
    while True:
        status = transcribe_client.get_transcription_job(TranscriptionJobName=job_name)
        if status['TranscriptionJob']['TranscriptionJobStatus'] in ['COMPLETED', 'FAILED']:
            break
        print("Still transcribing... (this may take several minutes)")
        time.sleep(5)

    if status['TranscriptionJob']['TranscriptionJobStatus'] == 'FAILED':
        raise Exception(f"Transcription failed: {status}")

    print("Transcription completed, retrieving results...")
    transcript_uri = status['TranscriptionJob']['Transcript']['TranscriptFileUri']
    transcript_response = requests.get(transcript_uri)
    transcript_data = transcript_response.json()

    print("Cleaning up S3 resources...")
    s3_client.delete_object(Bucket=S3_AUDIO_BUCKET, Key=file_name)

    transcript = transcript_data['results']['transcripts'][0]['transcript']
    print(f"Transcription complete: {len(transcript)} characters")
    return transcript

# Generates questions with timestamps from the transcribed text
def generate_questions(transcript, bedrock_runtime):
    print("Generating questions using Claude 3.7 Sonnet...")

    prompt = f"""
    Based on this transcript from a children's educational video, please create 5 educational questions appropriate for 5-7 year old children.
    Each question should have 4 answer choices labeled A, B, C, and D.
    Make sure the questions are simple, age-appropriate, and based on the content of the transcript.
    Additionally, provide a timestamp (in seconds) for each question indicating when it should be asked.
    
    Transcript: {transcript[:4000]}
    
    Format the output as follows:
    1. [Question]
       A. [Option A]
       B. [Option B]
       C. [Option C]
       D. [Option D]
    
    After the questions, include a list of timestamps in the format:
    [1.[timestamp]s, 2.[timestamp]s, 3.[timestamp]s, etc.]
    """

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 500,  # Adjusted max tokens to reduce costs
        "temperature": 0.7,
        "messages": [{"role": "user", "content": prompt}]
    }

    print("Sending request to Claude...")
    response = bedrock_runtime.invoke_model_with_response_stream(
        modelId="arn:aws:bedrock:us-east-1:911167886269:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",  # Correct model ID
        body=json.dumps(payload)
    )

    full_response = ""
    print("Receiving response stream...")
    for event in response['body']:
        chunk = event['chunk']
        chunk_data = json.loads(chunk['bytes'].decode('utf-8'))
        if chunk_data['type'] == 'content_block_delta':
            if 'delta' in chunk_data and 'text' in chunk_data['delta']:
                full_response += chunk_data['delta']['text']
                # Print progress indicator
                print(".", end="", flush=True)

    print("\nQuestion generation complete!")
    return full_response

# Parse questions and timestamps from the generated text
def parse_questions_and_timestamps(questions_text):
    print("Parsing generated questions and timestamps...")
    questions = []
    timestamps = []
    lines = questions_text.split('\n')

    # Parse questions
    for line in lines:
        if line.strip().startswith("1.") or line.strip().startswith("2.") or line.strip().startswith("3.") or line.strip().startswith("4.") or line.strip().startswith("5."):
            question = line.strip()
            questions.append(question)

    # Parse timestamps
    for line in lines:
        if line.strip().startswith("["):
            timestamp_line = line.strip().strip("[]")
            timestamp_pairs = timestamp_line.split(", ")
            for pair in timestamp_pairs:
                try:
                    index, timestamp = pair.split(".")
                    timestamps.append(int(timestamp.strip("s")))
                except Exception as e:
                    print(f"Failed to parse timestamp pair: {pair}, Error: {str(e)}")
                    continue

    # Combine questions and timestamps
    questions_with_timestamps = []
    for i in range(min(len(questions), len(timestamps))):
        questions_with_timestamps.append((questions[i], timestamps[i]))

    print(f"Successfully parsed {len(questions_with_timestamps)} questions with timestamps")
    return questions_with_timestamps

# Function to generate questions from a YouTube URL - combining all the steps
def generate_questions_from_youtube(youtube_url):
    # Clean existing files first
    ensure_clean_files()

    print(f"Starting question generation process for: {youtube_url}")
    s3_client, transcribe_client, bedrock_runtime, S3_AUDIO_BUCKET = load_aws_credentials()

    # Extract audio
    print("Extracting audio from video...")
    video_url, format_extension = extract_video_audio(youtube_url)

    # Transcribe audio
    print("Starting audio transcription...")
    transcript = transcribe_audio(video_url, format_extension, s3_client, transcribe_client, S3_AUDIO_BUCKET)

    # Generate questions
    print("Generating questions from transcript...")
    questions_text = generate_questions(transcript, bedrock_runtime)

    # Parse questions and timestamps
    print("Parsing questions and timestamps...")
    questions_with_timestamps = parse_questions_and_timestamps(questions_text)

    # Save the generated questions and timestamps to a .txt file
    print("Writing questions to questions.txt...")
    with open("questions.txt", "w") as file:
        for question, timestamp in questions_with_timestamps:
            file.write(f"{question}\n")
        file.write("\nTimestamps:\n")
        timestamp_line = ""
        for i, (_, timestamp) in enumerate(questions_with_timestamps, start=1):
            timestamp_line += f"{i}.{timestamp}s, "
        file.write(timestamp_line.rstrip(", "))

    print(f"Successfully wrote {len(questions_with_timestamps)} questions to questions.txt")

    # Verify file was created successfully
    if not os.path.exists("questions.txt"):
        print("WARNING: questions.txt was not created successfully")
    else:
        print(f"Confirmed questions.txt was created: {os.path.getsize('questions.txt')} bytes")

    return questions_with_timestamps

# This allows the script to be run directly or imported
if __name__ == "__main__":
    youtube_url = "https://www.youtube.com/watch?v=J20eXhZTHEo"
    print(f"Running audio_scanning.py directly for URL: {youtube_url}")

    # Always clean existing files when running directly
    ensure_clean_files()

    questions_with_timestamps = generate_questions_from_youtube(youtube_url)

    print("\nGenerated Questions:")
    for question, timestamp in questions_with_timestamps:
        print(f"Question: {question}")
        print(f"Timestamp: {timestamp}s")
