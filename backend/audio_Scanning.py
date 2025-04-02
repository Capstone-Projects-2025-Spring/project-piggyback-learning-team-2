import yt_dlp
from pydub import AudioSegment
import boto3
import requests
import io
import json
import time
import uuid
import os
import re
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
    files_to_clean = [
        os.path.join(os.getcwd(), "questions.txt"),
        os.path.join(os.getcwd(), "updated_questions.txt")
    ]

    if os.path.exists("questions.txt"):
        try:
            os.remove("questions.txt")
            print(f"Removed existing questions.txt")
        except Exception as e:
            print(f"Failed to remove questions.txt: {str(e)}")

#Checks if url is valid
def validate_youtube_url(url):
    """Verify the URL is a valid YouTube URL"""
    patterns = [
        r'(https?://)?(www\.)?youtube\.com/watch\?v=([^&]+)',
        r'(https?://)?(www\.)?youtu\.be/([^?]+)',
        r'(https?://)?(www\.)?youtube\.com/shorts/([^?]+)'
    ]
    return any(re.match(pattern, url) for pattern in patterns)

# Extracts raw audio from video
def extract_video_audio(youtube_url):
    """More robust audio extraction with validation"""
    print(f"Extracting audio from: {youtube_url}")
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': False,  # Show warnings for debugging
        'extractaudio': True,
        'audioformat': 'mp3',
        'outtmpl': 'temp_audio',
        'noplaylist': True,
        'ignoreerrors': True,
        'extractor_args': {
            'youtube': {
                'skip': ['hls', 'dash']  # Avoid problematic formats
            }
        },
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            print(f"Extracted info: {json.dumps(info, indent=2)[:500]}...")  # Debug
            # Verify we got valid audio info
            if not info or 'url' not in info:
                raise ValueError("Could not extract audio URL")

            print(f"Audio duration: {info.get('duration', 'unknown')} seconds")
            return info['url'], info['ext']

    except Exception as e:
        raise RuntimeError(f"Audio extraction failed: {str(e)}")

# Transcribes the audio into text
def transcribe_audio(audio_url, format_extension, s3_client, transcribe_client, S3_AUDIO_BUCKET):
    """Robust audio transcription with proper parameter validation"""
    """Enhanced transcription with detailed validation"""
    print("Beginning audio transcription with validation...")

    try:
        # 1. Download with validation
        print("Downloading audio...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Range': 'bytes=0-'
        }

        with requests.get(audio_url, stream=True, timeout=30, headers=headers) as response:
            response.raise_for_status()

            # Verify content type
            content_type = response.headers.get('Content-Type', '')
            print(f"Content-Type: {content_type}")

            # Download with size verification
            audio_buffer = io.BytesIO()
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    audio_buffer.write(chunk)
            audio_buffer.seek(0)

            # Verify minimum size
            if audio_buffer.getbuffer().nbytes < 102400:  # 100KB minimum
                raise ValueError("Downloaded audio too small (min 100KB required)")

        # 2. Convert with validation
        print("Converting audio...")
        try:
            audio = AudioSegment.from_file(audio_buffer, format=format_extension.lower())
            print(f"Audio duration: {audio.duration_seconds:.2f} seconds")

            if audio.duration_seconds < 5.0:  # Minimum 5 seconds
                raise ValueError("Audio too short (minimum 5 seconds required)")

            # Convert to MP3
            mp3_buffer = io.BytesIO()
            audio.export(
                mp3_buffer,
                format="mp3",
                codec="libmp3lame",
                bitrate="128k",
                parameters=["-ar", "44100"]
            )
            mp3_buffer.seek(0)

            # Verify conversion
            if mp3_buffer.getbuffer().nbytes < 102400:  # 100KB minimum
                raise ValueError("Converted audio too small")

        except Exception as e:
            raise ValueError(f"Audio processing failed: {str(e)}")

        # 3. Upload to S3 with verification
        job_name = f"transcribe-{int(time.time())}"
        s3_key = f"audio/{job_name}.mp3"

        print(f"Uploading {mp3_buffer.getbuffer().nbytes/1024:.1f}KB to S3...")
        s3_client.upload_fileobj(
            mp3_buffer,
            S3_AUDIO_BUCKET,
            s3_key,
            ExtraArgs={
                'ContentType': 'audio/mpeg',
                'Metadata': {
                    'source': 'youtube',
                    'processed': 'true'
                }
            }
        )

        # Verify upload
        try:
            head_response = s3_client.head_object(Bucket=S3_AUDIO_BUCKET, Key=s3_key)
            if head_response['ContentLength'] < 50 * 1024:
                raise ValueError("Uploaded file too small")
        except Exception as e:
            raise ValueError(f"S3 upload verification failed: {str(e)}")

        # 4. Configure and start transcription job
        transcribe_settings = {
            'ChannelIdentification': False,
            'ShowSpeakerLabels': False
        }

        print("Starting transcription job with validated parameters...")
        transcribe_client.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': f"s3://{S3_AUDIO_BUCKET}/{s3_key}"},
            MediaFormat='mp3',
            LanguageCode='en-US',
            MediaSampleRateHertz=44100,
            Settings=transcribe_settings
        )

        # 5. Monitor job status with timeout
        print("Monitoring transcription job...")
        start_time = time.time()
        last_status = None

        while True:
            status = transcribe_client.get_transcription_job(
                TranscriptionJobName=job_name
            )
            current_status = status['TranscriptionJob']['TranscriptionJobStatus']

            # Only log if status changed
            if current_status != last_status:
                print(f"Transcription status: {current_status}")
                last_status = current_status

            if current_status == 'COMPLETED':
                break
            elif current_status == 'FAILED':
                failure_reason = status['TranscriptionJob'].get('FailureReason', 'Unknown error')
                raise RuntimeError(f"Transcription failed: {failure_reason}")
            elif time.time() - start_time > 600:  # 10 minute timeout
                raise TimeoutError("Transcription timed out after 10 minutes")

            time.sleep(10)

        # 6. Retrieve and verify results
        transcript_uri = status['TranscriptionJob']['Transcript']['TranscriptFileUri']
        transcript_response = requests.get(transcript_uri)
        transcript_response.raise_for_status()

        transcript_data = transcript_response.json()
        print(f"Transcript metadata: {list(transcript_data.keys())}")

        if not transcript_data.get('results', {}).get('transcripts'):
            raise ValueError("No transcript content found in response")

        transcript = transcript_data['results']['transcripts'][0]['transcript']
        print(f"Successfully transcribed {len(transcript)} characters")
        print(f"Transcript sample: {transcript[:200]}...")  # Debug output

        if not transcript or len(transcript.strip()) < 50:
            raise ValueError("Transcript too short or empty")
        return transcript

    except Exception as e:
        raise RuntimeError(f"Transcription failed: {str(e)}")
    finally:
        # 7. Clean up S3 object
        try:
            s3_client.delete_object(Bucket=S3_AUDIO_BUCKET, Key=s3_key)
            print("Cleaned up S3 object")
        except Exception as e:
            print(f"Warning: Failed to clean up S3 object: {str(e)}")

# Generates questions with timestamps from the transcribed text
def generate_questions(transcript, bedrock_runtime):
    print("Generating questions using Claude 3.7 Sonnet...")

    # Verify transcript exists and has sufficient length
    if not transcript or len(transcript.strip()) < 100:
        raise ValueError("Transcript is too short or empty")

    # More structured prompt template
    prompt_template = """
    Generate exactly 3-5 multiple choice questions for children aged 5-7 based on this transcript.
    Follow these STRICT formatting rules:

    REQUIRED FORMAT:
    1. [Question text goes here]
    A) [Option A text]
    B) [Option B text] 
    C) [Option C text]
    D) [Option D text]
    Feedback:
    A) [Why option A is correct/incorrect]
    B) [Why option B is correct/incorrect]
    C) [Why option C is correct/incorrect] 
    D) [Why option D is correct/incorrect]
    Timestamp: [number in seconds]

    Example:
    1. What is the main cause of cavities?
    A) Eating too many vegetables
    B) Not brushing your teeth
    C) Drinking water
    D) Getting enough sleep
    Feedback: 
    A) Vegetables are actually good for your teeth
    B) Correct! Not brushing allows bacteria to grow
    C) Water helps clean your teeth
    D) Sleep is important but doesn't cause cavities
    Timestamp: 45

    Transcript:
    {transcript}
    """.format(transcript=transcript[:4000])

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2000,  # Increased for longer responses
        "temperature": 0.3,   # Lower for more consistent formatting
        "messages": [{
            "role": "user",
            "content": prompt_template
        }]
    }

    print("Sending request to Claude with formatted prompt...")
    try:
        response = bedrock_runtime.invoke_model_with_response_stream(
            modelId="arn:aws:bedrock:us-east-1:911167886269:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",
            body=json.dumps(payload))

        full_response = ""
        print("Receiving response...")
        for event in response['body']:
            chunk = event['chunk']
            chunk_data = json.loads(chunk['bytes'].decode('utf-8'))
            if chunk_data['type'] == 'content_block_delta':
                if 'delta' in chunk_data and 'text' in chunk_data['delta']:
                    full_response += chunk_data['delta']['text']
                    print(".", end="", flush=True)

        print("\nRaw Claude response:\n", full_response[:500], "...")  # Debug output

        if not full_response.strip():
            raise ValueError("Empty response from Claude")

        return full_response

    except Exception as e:
        raise RuntimeError(f"Question generation failed: {str(e)}")

def parse_questions_and_timestamps(questions_text):

    # At the start of the function:
    if not questions_text.strip():
        print("Error: Empty questions text received")
        return []

    print("Parsing generated questions...")
    print("Raw input text:\n", questions_text[:1000], "...")  # Debug

    questions = []
    timestamps = []

    # Improved parsing for different numbering formats
    question_blocks = re.split(r'(?=\d+\.\s)', questions_text)

    for block in question_blocks:
        try:
            # Extract question number and text
            question_match = re.match(r'(\d+)\.\s+(.+?)(?=\n[A-D]\))', block, re.DOTALL)
            if not question_match:
                continue

            question_num = int(question_match.group(1))
            question_text = question_match.group(2).strip()

            # Extract options
            options = {}
            for option in ['A', 'B', 'C', 'D']:
                option_match = re.search(r'{}\)\s*(.+?)(?=\n[A-D]\)|$)'.format(option), block)
                if option_match:
                    options[option] = option_match.group(1).strip()

            # Extract timestamp (more flexible matching)
            timestamp_match = re.search(r'Timestamp:\s*(\d+)', block)
            timestamp = int(timestamp_match.group(1)) if timestamp_match else question_num * 30  # Default to 30s intervals

            # Only add if we got valid components
            if question_text and len(options) == 4:
                questions.append(f"{question_num}. {question_text}")
                timestamps.append(timestamp)
                print(f"Parsed Q{question_num}: {question_text[:50]}... at {timestamp}s")

        except Exception as e:
            print(f"Error parsing question block: {str(e)}")
            continue

    # Verify we found questions
    if not questions:
        print("Warning: No questions found in generated text")
        print("Full text for debugging:\n", questions_text)
        print(questions_text)
        return []

    return list(zip(questions, timestamps))

# Function to generate questions from a YouTube URL - combining all the steps

def generate_questions_from_youtube(youtube_url):
    ensure_clean_files()
    print(f"Starting question generation process for: {youtube_url}")

    # Load AWS credentials
    s3_client, transcribe_client, bedrock_runtime, S3_AUDIO_BUCKET = load_aws_credentials()

    try:
        # Extract audio
        print("Extracting audio from video...")
        audio_source, format_extension = extract_video_audio(youtube_url)

        # Transcribe audio
        print("Starting audio transcription...")
        transcript = transcribe_audio(audio_source, format_extension,
                                    s3_client, transcribe_client, S3_AUDIO_BUCKET)

        # Generate questions
        print("Generating questions from transcript...")
        questions_text = generate_questions(transcript, bedrock_runtime)

        # Parsing questions and timestamps (COMMENT OUT OR REMOVE THIS LINE)
        # print("Parsing questions and timestamps...")
        # questions_with_timestamps = parse_questions_and_timestamps(questions_text)

        # Save to file (KEEP THIS FOR POTENTIAL DEBUGGING LATER)
        print("Writing raw questions to questions.txt...")
        with open("questions.txt", "w") as file:
            file.write(questions_text) # Save the raw text

        print(f"Successfully generated questions (raw text saved to questions.txt)")
        return questions_text # Return the raw Claude output

    except Exception as e:
        print(f"ERROR:__main__:Processing failed: {str(e)}")
        raise

'''
def generate_questions_from_youtube(youtube_url):
    ensure_clean_files()
    print(f"Starting question generation process for: {youtube_url}")

    # Load AWS credentials
    s3_client, transcribe_client, bedrock_runtime, S3_AUDIO_BUCKET = load_aws_credentials()

    try:
        # Extract audio (now returns either URL or file-like object)
        print("Extracting audio from video...")
        audio_source, format_extension = extract_video_audio(youtube_url)

        # Transcribe audio
        print("Starting audio transcription...")
        transcript = transcribe_audio(audio_source, format_extension,
                                      s3_client, transcribe_client, S3_AUDIO_BUCKET)

        # Generate questions
        print("Generating questions from transcript...")
        questions_text = generate_questions(transcript, bedrock_runtime)

        # Parse questions and timestamps
        print("Parsing questions and timestamps...")
        questions_with_timestamps = parse_questions_and_timestamps(questions_text)

        # Save to file
        print("Writing questions to questions.txt...")
        with open("questions.txt", "w") as file:
            for question, timestamp in questions_with_timestamps:
                file.write(f"{question}\n\n")  # Write the full question block
            file.write("\nTimestamps:\n")
            file.write(", ".join(f"{i+1}.{ts}" for i, (_, ts) in enumerate(questions_with_timestamps)))

        print(f"Successfully processed {len(questions_with_timestamps)} questions")
        return questions_with_timestamps

    except Exception as e:
        print(f"ERROR:__main__:Processing failed: {str(e)}")
        raise
'''
