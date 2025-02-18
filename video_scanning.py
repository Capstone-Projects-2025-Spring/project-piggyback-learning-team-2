import torch
import cv2
from yolov7.models.experimental import attempt_load
from yolov7.utils.datasets import LoadImages
from yolov7.utils.general import non_max_suppression, scale_coords
from pytube import YouTube
import os

# === STEP 1: Download YouTube Video ===
def download_youtube_video(url, output_dir='videos'):
    os.makedirs(output_dir, exist_ok=True)
    yt = YouTube(url)
    stream = yt.streams.filter(file_extension='mp4').first()
    video_path = os.path.join(output_dir, f"{yt.title}.mp4")
    stream.download(output_path=output_dir, filename=f"{yt.title}.mp4")
    print(f"Downloaded: {video_path}")
    return video_path

# === STEP 2: Load YOLOv7 Model ===
def load_yolov7_model(weights_path='yolov7.pt'):
    device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
    model = attempt_load(weights_path, map_location=device)
    model.eval()
    print(f"Model loaded on device: {device}")
    return model, device

# === STEP 3: Process Video and Detect Objects ===
def process_video(video_path, model, device, frame_interval=150):
    dataset = LoadImages(video_path, img_size=640)
    timestamps = []

    for frame_idx, (path, img, im0s, vid_cap) in enumerate(dataset):
        if frame_idx % frame_interval == 0:  # Process every 'frame_interval' frame
            img = torch.from_numpy(img).to(device)
            img = img.float() / 255.0
            if img.ndimension() == 3:
                img = img.unsqueeze(0)

            # Inference
            pred = model(img, augment=False)[0]
            pred = non_max_suppression(pred, 0.25, 0.45, classes=None, agnostic=False)

            # If objects detected, record the timestamp
            if len(pred) and vid_cap:
                timestamp = vid_cap.get(cv2.CAP_PROP_POS_MSEC) / 1000  # Timestamp in seconds
                timestamps.append(timestamp)

    print("Timestamps:", timestamps)
    return timestamps

# === STEP 4: Generate Questions Based on Objects ===
def generate_questions(timestamps):
    questions = []
    for timestamp in timestamps:
        question = f"What is happening at {timestamp:.2f} seconds?"
        questions.append(question)
    return questions

# === MAIN FUNCTION ===
if __name__ == "__main__":
    # YouTube video URL (replace with your own)
    youtube_url = "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"

    # Step 1: Download Video
    video_path = download_youtube_video(youtube_url)

    # Step 2: Load YOLOv7 Model
    model, device = load_yolov7_model()

    # Step 3: Process Video and Get Timestamps
    timestamps = process_video(video_path, model, device)

    # Step 4: Generate Questions
    questions = generate_questions(timestamps)
    for q in questions:
        print(q)