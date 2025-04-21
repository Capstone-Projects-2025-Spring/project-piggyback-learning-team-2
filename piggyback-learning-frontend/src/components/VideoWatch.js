import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/VideoWatch.css';
import ReactPlayer from 'react-player';
import logo from '../images/Mob_Iron_Hog.png';
import { useNavigate } from 'react-router-dom';


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
  const isYouTube = videoUrl?.includes("youtube.com") || videoUrl?.includes("youtu.be");

  const [question, setQuestion] = useState(null);
  const [detections, setDetections] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [autoDetect, setAutoDetect] = useState(true);
  const [lastQuestionTime, setLastQuestionTime] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [retryOption, setRetryOption] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const [sessionEnd, setSessionEnd] = useState(null);
  


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
        const res = await fetch("/video/process", {
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
      const res = await fetch("/video/process", {
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
        markCorrect();
        setFeedback("✅ Correct!");
        setDetections([]);
        setTimeout(() => {
          setFeedback("");
          setQuestion(null);
          playVideo();
        }, 2000);
      } else {
        markWrong();
        setFeedback("❌ Wrong! Let's learn why.");
        setDetections([]);
        // ❌ Ask GPT for explanation
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

  

  const handleWatchAgain = () => {
    // Clear UI elements immediately
    setQuestion(null);
    setFeedback("");
    setDetections([]);
    setRetryOption(false);
    setLastQuestionTime(0); // reset timer
  
    // Force video to restart from beginning
    if (isYouTube) {
      const player = playerRef.current?.getInternalPlayer();
      if (player?.seekTo) {
        player.seekTo(0, true);
      }
      player?.playVideo?.();
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    }
  };


  // 1. Define the result tracker
const [resultStats, setResultStats] = useState({
  total: 0,
  correct: 0,
  wrong: 0,
  skipped: 0,
  startTime: null,
  endTime: null,
});

// 2. Set start time only once when video is ready
useEffect(() => {
  if (videoReady && !resultStats.startTime) {
    setResultStats(prev => ({ ...prev, startTime: Date.now() }));
  }
}, [videoReady, resultStats.startTime]);

// 3. Call inside appropriate events:

const markCorrect = () => {
  setResultStats(prev => ({
    ...prev,
    correct: prev.correct + 1,
    total: prev.total + 1
  }));
};

const markWrong = () => {
  setResultStats(prev => ({
    ...prev,
    wrong: prev.wrong + 1,
    total: prev.total + 1
  }));
};

const handleSkip = () => {
  setResultStats(prev => ({
    ...prev,
    skipped: prev.skipped + 1,
    total: prev.total + 1
  }));
  setFeedback("⏭️ Skipped question.");
  setDetections([]);
  setQuestion(null);
  playVideo();
};

useEffect(() => {
  if (videoReady && !resultStats.startTime) {
    setResultStats(prev => ({ ...prev, startTime: Date.now() }));
  }
}, [videoReady, resultStats.startTime]);



useEffect(() => {
  setSessionStart(Date.now());
}, []);

const handleEnd = () => {
  const now = Date.now();

  // Set session end time
  setSessionEnd(now);

  // Ensure both start and end are set in resultStats
  setResultStats(prev => {
    const start = prev.startTime || sessionStart || now;
    return {
      ...prev,
      startTime: start,
      endTime: now,
    };
  });

  // Show summary
  setShowSummary(true);
};



  return (
    <div className="video-watch-container">
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
                    <button className="watch-again-btn" onClick={handleWatchAgain}>▶️ Watch Again</button>

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
                  autoPlay
                  width="640"
                  height="360"
                  onPlay={() => setAutoDetect(true)}
                  onPause={() => setAutoDetect(false)}
                  onLoadedMetadata={() => setVideoReady(true)}
                  onEnded={handleEnd}
                />
              ) : (
                <ReactPlayer
                  onEnded={handleEnd}
                  ref={playerRef}
                  url={videoUrl}
                  playing
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
                {showSummary && (
            <div className="summary-overlay-on-video">
              <div className="summary-box animate-summary">
                <h2>🌟 You're Amazing! 🌟</h2>
                <p>🎯 <strong>Total Questions:</strong> {resultStats.total}</p>
                <p>✅ <strong>Correct:</strong> {resultStats.correct}</p>
                <p>❌ <strong>Wrong:</strong> {resultStats.wrong}</p>
                <p>⏭️ <strong>Skipped:</strong> {resultStats.skipped}</p>
                <p>⏱️ <strong>Time Watched:</strong> {Math.round((resultStats.endTime - resultStats.startTime) / 1000)}s</p>
                {sessionStart && sessionEnd && (
                  <p className="summary-text">
                    🕒 <strong>Session Time:</strong> {Math.round((sessionEnd - sessionStart) / 1000)}s
                  </p>
                )}

                <button className="play-again-btn" onClick={handleWatchAgain}>🔁 Watch Again</button>
                <button className="go-back-btn" onClick={() => navigate("/profile")}>🏠 Go Back to Profile</button>
              </div>
            </div>
          )}

      </main>
  
      <footer className="footer-enhanced">
        © 2025 Piggyback Learning — Keep Exploring!
      </footer>
    </div>
  );
 
}