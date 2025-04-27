FROM python:3.11-slim

WORKDIR /usr/src/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r render_requirements.txt

# Copy application
COPY . .

RUN npm install openai dotenv

# Added threads to make some of the yolov8 stuff go faster. If it works with the rest of the code I can comment this out.
# CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

