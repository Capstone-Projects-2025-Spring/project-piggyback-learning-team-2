import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/VideoWatch.css';
import ReactPlayer from 'react-player';
import logo from '../images/Mob_Iron_Hog.png';

export default function InteractiveVideoQuiz() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const canvasRef = useRef(null);
  const videoWrapperRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const videoUrl = queryParams.get("video");
  const videoTitle = queryParams.get("title") || "Unknown Video";
  const isProcessing = queryParams.get("processing") === "true";
  const isYouTube = videoUrl?.includes("youtube.com") || videoUrl?.includes("youtu.be");

  const videoId = getYouTubeVideoId(videoUrl);

  const [processingState, setProcessingState] = useState({
    status: isProcessing ? 'processing' : 'idle',
    progress: '',
    elapsed: 0,
    remaining: null
  });
  const [processingError, setProcessingError] = useState(null);

  const [question, setQuestion] = useState(null);
  const [detections, setDetections] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [autoDetect, setAutoDetect] = useState(true);
  const [lastQuestionTime, setLastQuestionTime] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [retryOption, setRetryOption] = useState(false);


  // Check for cached results first
  // Check for cached results first
  useEffect(() => {
    if (!isProcessing && videoId) {
      const cachedResults = localStorage.getItem(`video_${videoId}_results`);
      if (cachedResults) {
        try {
          const data = JSON.parse(cachedResults);
          if (data.question) {
            setQuestion(data.question);
          }
        } catch (e) {
          console.error("Error parsing cached results:", e);
        }
      }
    }
  }, [isProcessing, videoId]);

  useEffect(() => {
    if (!isProcessing) return;

    if (!videoId) {
      setProcessingError("Invalid video URL");
      return;
    }

    let timeoutId;
    let attempts = 0;
    const maxAttempts = 30; // ~5 minutes max with backoff

    const pollForResults = async () => {
      try {
        attempts++;
        const response = await fetch(`/api/v1/video/results/${videoId}`,  {
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }

        const data = await response.json();

        // Handle different states
        if (data.status === 'complete') {
          localStorage.setItem(`video_${videoId}_results`, JSON.stringify(data));
          if (data.question) {
            setQuestion(data.question);
          }
          // Update URL to remove processing flag
          navigate(`/watch?video=${encodeURIComponent(videoUrl)}&title=${encodeURIComponent(videoTitle)}`, {
            replace: true
          });
        } else if (data.status === 'error') {
          setProcessingError(data.error || "Processing failed");
        } else if (data.status === 'cancelled') {
          setProcessingState({ status: 'cancelled' });
        } else if (attempts >= maxAttempts) {
          setProcessingError("Processing timed out");
        } else {
          // Continue polling with backoff
          const delay = Math.min(10000, 1000 + (attempts * 300));
          timeoutId = setTimeout(pollForResults, delay);
        }

        setProcessingState({
          status: data.status,
          progress: data.progress || '',
          elapsed: data.elapsed_seconds || 0,
          remaining: data.estimated_remaining || null
        });

      } catch (error) {
        setProcessingError("Connection error - try refreshing");
        console.error("Polling error:", error);
      }
    };

    // Start processing
    const startProcessing = async () => {
      try {
        const response = await fetch(`/api/v1/video/process/${videoId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl })
        });

        if (!response.ok) {
          throw new Error("Failed to start processing");
        }

        pollForResults();
      } catch (error) {
        setProcessingError(error.message);
      }
    };

    startProcessing();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isProcessing, videoUrl, videoTitle, navigate, videoId]);

  const pauseVideo = useCallback(() => {
    if (isYouTube) {
      playerRef.current?.getInternalPlayer()?.pauseVideo();
    } else {
      videoRef.current?.pause();
    }
  }, [isYouTube]);

  const playVideo = useCallback(() => {
    if (isYouTube) {
      playerRef.current?.getInternalPlayer()?.playVideo();
    } else {
      videoRef.current?.play();
    }
  }, [isYouTube]);

  const getCurrentTime = useCallback(() => {
    return isYouTube
      ? playerRef.current?.getInternalPlayer()?.getCurrentTime?.() || 0
      : videoRef.current?.currentTime || 0;
  }, [isYouTube]);

  const captureFrame = useCallback(async () => {
    if (isYouTube) {
      // 🟢 YouTube Mode — use transcript
      setFeedback("⏳ Getting question from YouTube transcript...");
  
      try {
        const res = await fetch(`/api/v1/video/process/${videoId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ youtube_url: videoUrl, title: videoTitle }),
        });
  
        if (!res.ok) {
          const err = await res.text();
          console.error("❌ Transcript fetch failed:", err);
          setFeedback("⚠️ Could not get transcript question.");
          return;
        }
  
        const data = await res.json();
        setDetections([]); // No boxes in YouTube mode
        setQuestion(data.question || null);
        setFeedback("");
      } catch (err) {
        console.error("❌ Error getting GPT question:", err);
        setFeedback("⚠️ Failed to process YouTube transcript.");
      }
  
      return;
    }
  
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
  
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg").split(",")[1];
  
    setFeedback("⏳ Detecting objects...");
    try {
      const res = await fetch(`/api/v1/video/process/${videoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64, title: videoTitle }),
      });
  
      if (!res.ok) {
        const err = await res.text();
        console.error("Server error:", err);
        setFeedback("⚠️ Object detection failed.");
        return;
      }
  
      const data = await res.json();
      const detected = Array.isArray(data.objects) ? data.objects : [];
      setDetections(detected);
  
      let questionFromBackend = data.question;
      if (!questionFromBackend && Array.isArray(data.questions)) {
        questionFromBackend = {
          id: "q1",
          text: typeof data.questions[0] === "string" ? data.questions[0] : data.questions[0]?.text,
        };
      }
  
      if (!questionFromBackend && detected.length === 0) {
        setFeedback("🤷 No objects or question found in this frame.");
      } else {
        setFeedback("");
      }
  
      setQuestion(questionFromBackend || null);
    } catch (err) {
      console.error("Failed to detect:", err);
      setFeedback("⚠️ Error contacting detection service.");
    }
  }, [isYouTube, videoUrl, videoTitle]);
  

  // Pause when a question appears
  useEffect(() => {
    if (question) pauseVideo();
  }, [question, pauseVideo]);

  // Time-based auto-detection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = Math.floor(video.currentTime);
      if (currentTime - lastQuestionTime >= 25 && !question) {
        setLastQuestionTime(currentTime);
        captureFrame();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [lastQuestionTime, question, captureFrame]);

  useEffect(() => {
    if (!videoReady || question) return;
    const interval = setInterval(() => {
      const now = getCurrentTime();
      if (now - lastQuestionTime >= 20) {
        setLastQuestionTime(now);
        captureFrame();
      }
    }, 1000); // check every second, ask only after 20s
    return () => clearInterval(interval);
  }, [lastQuestionTime, question, captureFrame, getCurrentTime, videoReady]);
  
  // Auto-detect if enabled
  useEffect(() => {
    if (!autoDetect) return;
    const currentTime = getCurrentTime();
    if (currentTime - lastQuestionTime >= 25 && !question) {
      setLastQuestionTime(currentTime);
      captureFrame();
    }
  }, [lastQuestionTime, question, autoDetect, captureFrame, getCurrentTime]);

  const handleClick = async (label) => {
    if (!question?.id || !label || !question.answer) return;

    try {
      const res = await fetch("/video/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: question.answer,
          selected_label: label,
          question_id: question.id,
          timestamp: getCurrentTime(),
        }),
      });

      const result = await res.json();

      if (!result || result.correct === undefined) {
        setFeedback("⚠️ Could not check your answer.");
        return;
      }

      if (result.correct) {
        setFeedback("✅ Correct!");
        setDetections([]);
        setTimeout(() => {
          setFeedback("");
          setQuestion(null);
          playVideo();
        }, 2000);
      } else {
        const explainRes = await fetch("/video/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answer: question.answer,
            selected_label: label,
            question: question.text,
            options: question.options,
          }),
        });

        const explain = await explainRes.json();
        setFeedback(`❌ ${explain.message}`);
        setRetryOption(true);
      }
    } catch (error) {
      console.error("❌ Error submitting answer:", error);
      setFeedback("⚠️ Could not check your answer.");
    }
  };

  const skipQuestion = () => {
    setFeedback("⏭️ Skipped question.");
    setDetections([]);
    setQuestion(null);
    playVideo();
  };

  const handleSkip = () => {
    skipQuestion();
  };
  
  return (
      <div className="video-watch-container">
        {!videoId && videoUrl && (
          <div className="error-overlay">
          <h3>Invalid Video URL</h3>
          <p>The provided YouTube URL is not valid.</p>
          <button onClick={() => navigate('/')}>Go Back</button>
          </div>
        )}
        {processingState.status === 'processing' && (
            <div className="processing-overlay">
              <div className="spinner"></div>
              <h3>Processing Video: {videoTitle}</h3>
              <div className="progress-container">
                <div
                    className="progress-bar"
                    style={{ width: `${Math.min(100, (processingState.elapsed / 180) * 100)}%` }}
                ></div>
              </div>
              <p>Step: {processingState.progress || 'Starting...'}</p>
              <p>Elapsed: {formatTime(processingState.elapsed)}</p>
              {processingState.remaining && (
                  <p>Estimated remaining: {formatTime(processingState.remaining)}</p>
              )}
              <button
                  onClick={async () => {
                    try {
                      await fetch(`/api/v1/video/cancel/${videoId}`, { method: 'POST' });
                      setProcessingState({ status: 'cancelled' });
                      navigate(`/watch?video=${encodeURIComponent(videoUrl)}&title=${encodeURIComponent(videoTitle)}`);
                    } catch (error) {
                      console.error("Cancellation error:", error);
                    }
                  }}
                  className="cancel-button"
              >
                Cancel Processing
              </button>
            </div>
        )}

        {processingError && (
            <div className="error-overlay">
              <h3>Processing Error</h3>
              <p>{processingError}</p>
              <button onClick={() => window.location.reload()}>Reload Page</button>
            </div>
        )}
      <header className="video-watch-header">
        <div className="video-watch-logo-container">
          <img src={logo} alt="Logo" className="video-watch-logo-animated" />
          <span className="video-watch-site-title">Interactive Video Quiz</span>
        </div>
        <nav className="video-watch-nav-links">
          <a href="/">Home</a>
          <a href="/profile">Profile</a>
        </nav>
      </header>
  
      <main className="video-watch-content">
        <h2>🎬 Learning Time!</h2>
  
        {!videoUrl ? (
          <p className="feedback">⚠️ No video selected</p>
        ) : (
          <>
            {question && (
              <div className="question-box dynamic-glow">
                <h3 className="question-text">🧠 {question.text}</h3>
                {question.options && (
                  <div className="options">
                    {question.options.map((opt, index) => (
                      <button
                        key={index}
                        className="option-button vibrant-border"
                        onClick={() => handleClick(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {feedback && <p className="feedback colorful-feedback">{feedback}</p>}
                <button onClick={handleSkip} className="skip-button fancy-skip">⏭️ Skip</button>
  
                {retryOption && (
                  <div className="retry-buttons inside-box">
                    <button className="retry-btn" onClick={() => setRetryOption(false)}>🔁 Try Again</button>
                    <button
                      className="watch-again-btn"
                      onClick={() => {
                        setRetryOption(false);
                        videoRef.current?.play();
                      }}
                    >
                      ▶️ Watch Again
                    </button>
                  </div>
                )}
              </div>
            )}
  
            <div
              className="video-wrapper"
              ref={videoWrapperRef}
              style={{ position: "relative", width: "640px", height: "360px" }}
            >
              {!isYouTube ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  crossOrigin="anonymous"
                  controls
                  autoPlay={!isProcessing}
                  width="640"
                  height="360"
                  onPlay={() => setAutoDetect(true)}
                  onPause={() => setAutoDetect(false)}
                  onLoadedMetadata={() => setVideoReady(true)}
                />
              ) : (
                <ReactPlayer
                  ref={playerRef}
                  url={videoUrl}
                  playing={!isProcessing}
                  controls
                  width="640px"
                  height="360px"
                  onPlay={() => {
                    setAutoDetect(true);
                    setVideoReady(true);
                  }}
                  onPause={() => setAutoDetect(false)}
                  onReady={() => setVideoReady(true)}
                />
              )}
  
  {videoReady && detections.map((det, i) => {
  const video = videoRef.current;
  const wrapper = videoWrapperRef.current;

  if (!video || !wrapper || !video.videoWidth || !video.videoHeight) return null;

  const [x1, y1, x2, y2] = det.box;

  const intrinsicWidth = video.videoWidth;
  const intrinsicHeight = video.videoHeight;
  const displayedWidth = wrapper.clientWidth;
  const displayedHeight = wrapper.clientHeight;

  const videoAspect = intrinsicWidth / intrinsicHeight;
  const wrapperAspect = displayedWidth / displayedHeight;

  let scaleX, scaleY, offsetX = 0, offsetY = 0;

  if (wrapperAspect > videoAspect) {
    const scaledHeight = displayedHeight;
    const scaledWidth = scaledHeight * videoAspect;
    scaleX = scaleY = scaledWidth / intrinsicWidth;
    offsetX = (displayedWidth - scaledWidth) / 5;
  } else {
    const scaledWidth = displayedWidth;
    const scaledHeight = scaledWidth / videoAspect;
    scaleX = scaleY = scaledWidth / intrinsicWidth;
    offsetY = (displayedHeight - scaledHeight) / 5;
  }

  const originalWidth = (x2 - x1) * scaleX;
  const originalHeight = (y2 - y1) * scaleY;

  const scaleFactor = 2;
  const width = originalWidth * scaleFactor;
  const height = originalHeight * scaleFactor;

  const centerX = x1 * scaleX + offsetX + originalWidth / 0.3;
  const centerY = y1 * scaleY + offsetY + originalHeight / 1;
  const left = centerX - width / 1.5;
  const top = centerY - height / 2;

  const boxStyle = {
    position: "absolute",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    border: "2px solid limegreen",
    backgroundColor: "rgba(0, 255, 0, 0.25)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "bold",
    zIndex: 10,
    pointerEvents: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div key={i} style={boxStyle} onClick={() => handleClick(det.label)}>
      {det.label}
    </div>
  );
})}


              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
  
            <button onClick={captureFrame} className="video-watch-detect-button">
              ✨ Ask Question Now
            </button>
  
            {detections.length === 0 && (
              <p className="feedback subtle-alert">⚠️ No clickable objects detected in this frame.</p>
            )}
            {feedback && !question && <p className="feedback subtle-alert">{feedback}</p>}
          </>
        )}
      </main>
  
      <footer className="footer-enhanced">
        © 2025 Piggyback Learning — Keep Exploring!
      </footer>
    </div>
  );
 
}

function getYouTubeVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}