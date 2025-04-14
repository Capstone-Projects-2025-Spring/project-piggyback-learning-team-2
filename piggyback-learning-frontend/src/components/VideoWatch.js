import React, { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/VideoWatch.css';
import logo from '../images/Mob_Iron_Hog.png';

export default function InteractiveVideoQuiz() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const videoUrl = queryParams.get("video");
  const videoTitle = queryParams.get("title") || "Unknown Video";

  const [question, setQuestion] = useState(null);
  const [detections, setDetections] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [autoDetect, setAutoDetect] = useState(true);

     useEffect(() => {
    const interval = setInterval(() => {
      if (autoDetect) {
        captureFrame();
      }
    }, 8000); // every 8 seconds
    return () => clearInterval(interval);
    }, [autoDetect]); 

    
    const handleClick = async (label) => {
      if (!question?.id || !label) return;
    
      try {
        const res = await fetch("http://localhost:8000/video/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_id: videoTitle.toLowerCase().replace(/\s+/g, "_"),
            question_id: question.id,
            selected_label: label,
            timestamp: videoRef.current?.currentTime || 0,
          }),
        });
    
        const data = await res.json();
        setFeedback(data.correct ? "✅ Correct!" : "❌ Try again!");
      } catch (err) {
        console.error("Error submitting answer:", err);
        setFeedback("⚠️ Submission failed");
      }
    };
    

    const captureFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
    
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg").split(",")[1];
    
      setFeedback("⏳ Generating question...");
      try {
        const res = await fetch("http://localhost:8000/video/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: base64, title: videoTitle }),
        });
        
        if (!res.ok) {
          const errText = await res.text();
          console.error("Server error:", errText);
          setFeedback("⚠️ Server returned error");
          return;
        }
    
        const data = await res.json();
        if (!data || typeof data !== "object") {
          throw new Error("Invalid response from backend");
        }
    
        console.log("📦 Detections:", data.objects);
        console.log("📜 Question:", data.question?.text || data.questions?.[0]?.text);
    
        const detected = Array.isArray(data.objects) ? data.objects : [];
        setDetections(detected);
    
        let questionFromBackend = data.question;
        if (!questionFromBackend && Array.isArray(data.questions)) {
          questionFromBackend = {
            id: "q1",
            text: typeof data.questions[0] === "string"
              ? data.questions[0]
              : data.questions[0]?.text
          };
        }
    
        if (!questionFromBackend && detected.length === 0) {
          console.warn("⚠️ No question found in response:", data);
          setFeedback("🤷 No objects or question found in this frame.");
        } else {
          setFeedback("");
        }
    
        setQuestion(questionFromBackend || null);
      } catch (err) {
        console.error("Failed to get question/detections:", err);
        setFeedback("⚠️ Error contacting backend");
      }
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
{question && <h3 className="question-text">🧠 {question.text}</h3>}

          <div className="video-wrapper">
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
/>

              {detections.map((det, i) => (
                <div
                  key={i}
                  onClick={() => handleClick(det.label)}
                  className="bounding-box"
                  style={{
                    position: "absolute",
                    left: `${det.box[0]}px`,
                    top: `${det.box[1]}px`,
                    width: `${det.box[2] - det.box[0]}px`,
                    height: `${det.box[3] - det.box[1]}px`,
                  }}
                >
                  {det.label}
                </div>
              ))}
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>

            <button onClick={captureFrame} className="video-watch-detect-button">
              Ask Question Now
            </button>
            {detections.length === 0 && (
              <p className="feedback">⚠️ No clickable objects detected in this frame.</p>
            )}
            {feedback && <p className="feedback">{feedback}</p>}
          </>
        )}
      </main>

      <footer className="footer-enhanced">
        © 2025 Piggyback Learning — Keep Exploring!
      </footer>
    </div>
  );
}
