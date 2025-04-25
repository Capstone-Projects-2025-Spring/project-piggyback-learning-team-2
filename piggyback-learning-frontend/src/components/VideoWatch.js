import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/VideoWatch.css';
import ReactPlayer from 'react-player';
import logo from '../images/Mob_Iron_Hog.png';

// Utility functions
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

export default function InteractiveVideoQuiz() {
  // Constants and refs
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const videoWrapperRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // URL parameters
  const queryParams = new URLSearchParams(location.search);
  const videoUrl = queryParams.get("video");
  const videoTitle = queryParams.get("title") || "Unknown Video";
  const isProcessing = queryParams.get("processing") === "true";
  const isYouTube = videoUrl?.includes("youtube.com") || videoUrl?.includes("youtu.be");
  const videoId = getYouTubeVideoId(videoUrl);

  // State management
  const [state, setState] = useState({
    processing: {
      status: isProcessing ? 'processing' : 'idle',
      progress: '',
      elapsed: 0,
      remaining: null,
      error: null,
      pollCount: 0
    },
    quiz: {
      questions: [],
      currentQuestion: null,
      detections: [],
      feedback: "",
      answeredQuestions: {},
      questionHistory: {},  // Add this line
      retryOption: false,
      showSummary: false
    },
    player: {
      autoDetect: true,
      lastQuestionTime: 0,
      videoReady: false,
      isPlaying: false,
      lastQuestionId: null
    },
    session: {
      start: null,
      end: null,
      stats: {
        total: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        startTime: null,
        endTime: null,
      }
    }
  });

  // Derived state for easier access
  const {
    processing, quiz, player, session
  } = state;

  // Helper functions for state updates
  const updateState = (key, value) => {
    setState(prev => ({ ...prev, [key]: { ...prev[key], ...value } }));
  };

  const updateQuizState = (value) => updateState('quiz', value);
  const updatePlayerState = (value) => updateState('player', value);
  const updateProcessingState = (value) => updateState('processing', value);
  const updateSessionState = (value) => updateState('session', value);

  // Video control functions
  const pauseVideo = useCallback(() => {
    if (isYouTube) {
      const player = playerRef.current?.getInternalPlayer();
      player?.pauseVideo?.();
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
    updatePlayerState({ isPlaying: false });
  }, [isYouTube]);

  const playVideo = useCallback(() => {
    if (isYouTube) {
      const player = playerRef.current?.getInternalPlayer();
      player?.playVideo?.();
    } else if (videoRef.current) {
      videoRef.current.play();
    }
    updatePlayerState({ isPlaying: true });
  }, [isYouTube]);

  const getCurrentTime = useCallback(() => {
    if (isYouTube) {
      const player = playerRef.current?.getInternalPlayer();
      return player?.getCurrentTime?.() || 0;
    } else if (videoRef.current) {
      return videoRef.current.currentTime || 0;
    }
    return 0;
  }, [isYouTube]);

  const showQuestion = useCallback((question) => {
    const filteredDetections = question.type === 'object_detection' && question.objects
        ? question.objects.filter(obj => obj.label.toLowerCase() === question.answer.toLowerCase())
        : [];

    updateQuizState({
      currentQuestion: question,
      detections: filteredDetections,
      feedback: "", // Clear any existing feedback
      retryOption: false // Reset retry option
    });

    updatePlayerState({
      lastQuestionTime: getCurrentTime(),
      lastQuestionId: question.id
    });

    pauseVideo();
  }, [getCurrentTime, pauseVideo]);

  // Processing cancellation function
  const handleCancelProcessing = async () => {
    try {
      console.log(`Cancelling processing for ${videoId}`);

      // First update UI immediately for better responsiveness
      updateProcessingState({
        status: 'cancelling',
        progress: 'Cancelling processing...'
      });

      const response = await fetch(`${BACKEND_URL}/api/v1/video/cancel/${videoId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
      });

      if (response.ok) {
        // Update the local state to reflect cancellation
        updateProcessingState({
          status: 'cancelled',
          progress: 'Processing cancelled'
        });

        // Force a page reload after a short delay
        setTimeout(() => {
          window.location.href = '/'; // Redirect to home page after cancellation
        }, 2000);
      } else {
        throw new Error(`Cancel failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Cancellation error:", error);

      // Even if the cancellation API fails, update the UI to show cancellation
      updateProcessingState({
        status: 'cancelled',
        progress: 'Processing cancelled (forced)',
        error: `Failed to cancel: ${error.message}`
      });

      // Redirect anyway
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  };

  // Processing effects
  useEffect(() => {
    if (!isProcessing || !videoId) return;

    let pollInterval = null;
    let consecutiveErrors = 0;
    const MAX_ERRORS = 5;
    const POLL_INTERVAL_MS = 2000;
    const MAX_POLL_COUNT = 150;

    const processVideo = async () => {
      updateProcessingState({
        status: 'processing',
        progress: 'Starting...',
        elapsed: 0,
        remaining: null
      });

      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/video/process/${videoId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            youtube_url: videoUrl,
            title: videoTitle,
            full_analysis: true,
            num_questions: 5,
            keyframe_interval: 30
          })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        console.error("Processing error:", error);
        updateProcessingState({ error: error.message });
      }
    };

    const pollResults = async () => {
      try {
        updateProcessingState(prev => ({ pollCount: prev.pollCount + 1 }));

        if (processing.pollCount > MAX_POLL_COUNT) {
          clearInterval(pollInterval);
          updateProcessingState({ error: "Processing timeout. Please try again later." });
          return;
        }

        const resultsResponse = await fetch(`${BACKEND_URL}/api/v1/video/results/${videoId}`, {
          method: 'GET',
          cache: 'no-store'
        });

        if (!resultsResponse.ok) throw new Error(`HTTP error! status: ${resultsResponse.status}`);

        const resultsData = await resultsResponse.json();
        consecutiveErrors = 0;

        updateProcessingState({
          ...resultsData,
          status: resultsData.status || processing.status
        });

        if (resultsData.status === 'complete') {
          clearInterval(pollInterval);

          if (resultsData.questions?.length) {
            const validatedQuestions = resultsData.questions.map((q, index) => ({
              id: q.id || `question-${index}`,
              text: q.text || "What is shown in this frame?",
              type: q.type || "text",
              options: q.options || [],
              answer: q.answer || "",
              timestamp: q.timestamp || 0,
              objects: q.objects || []
            }));

            updateQuizState({ questions: validatedQuestions });
            localStorage.setItem(`video_${videoId}_questions`, JSON.stringify(validatedQuestions));
            playVideo();
          } else {
            updateProcessingState({ error: "No questions were generated. Please try again." });
          }
        } else if (resultsData.status === 'error') {
          clearInterval(pollInterval);
          updateProcessingState({ error: resultsData.error || "Processing failed" });
        }

      } catch (error) {
        console.error("Polling error:", error);
        if (++consecutiveErrors >= MAX_ERRORS) {
          clearInterval(pollInterval);
          updateProcessingState({ error: "Connection to server lost. Please refresh the page." });
        }
      }
    };

    processVideo();
    pollInterval = setInterval(pollResults, POLL_INTERVAL_MS);
    const initialPollTimeout = setTimeout(pollResults, 1000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(initialPollTimeout);
    };
  }, [isProcessing, videoId, videoUrl, videoTitle, BACKEND_URL]);

  // Load cached questions
  useEffect(() => {
    if (!isProcessing && videoId) {
      const cachedQuestions = localStorage.getItem(`video_${videoId}_questions`);
      if (cachedQuestions) {
        try {
          const parsedQuestions = JSON.parse(cachedQuestions);
          if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
            updateQuizState({ questions: parsedQuestions });
          }
        } catch (error) {
          console.error("Error parsing cached questions:", error);
        }
      }
    }
  }, [isProcessing, videoId]);

  // Question handling
  const checkQuestionTime = useCallback(() => {
    if (!player.videoReady || !quiz.questions.length || !player.isPlaying) return;

    const currentTime = getCurrentTime();

    // Clear current question if we've seeked before its timestamp
    if (quiz.currentQuestion && currentTime < quiz.currentQuestion.timestamp - 1) {
      updateQuizState({
        currentQuestion: null,
        detections: [],
        feedback: "",
        retryOption: false
      });
      return;
    }

    // Try to find rewatched questions first
    if (player.lastQuestionId) {
      const sameQuestion = quiz.questions.find(q =>
          q.id === player.lastQuestionId &&
          !quiz.answeredQuestions[q.id]
      );

      if (sameQuestion) {
        const timeDiff = Math.abs(sameQuestion.timestamp - currentTime);
        const threshold = sameQuestion.type === 'object_detection' ? 0.3 : 1.5;

        if (timeDiff <= threshold) {
          showQuestion(sameQuestion);
          return;
        }
      }
    }

    // Otherwise find the next appropriate question
    const nextQuestion = quiz.questions.find(q => {
      const timeDiff = Math.abs(q.timestamp - currentTime);
      const threshold = q.type === 'object_detection' ? 0.3 : 1.5;
      return timeDiff <= threshold && !quiz.answeredQuestions[q.id];
    });

    if (nextQuestion) {
      showQuestion(nextQuestion);
    }
  }, [player, quiz, getCurrentTime, pauseVideo]);

  // Lets users rewind video
  const handleWatchAgain = () => {
    const currentTime = getCurrentTime();
    const seekTime = Math.max(0, currentTime - 10);

    // Clear current question immediately when rewinding
    updateQuizState({
      currentQuestion: null,
      detections: [],
      feedback: "",
      retryOption: false
    });

    // Store the original answer data but REMOVE it from answeredQuestions
    // so the question can be asked again
    if (quiz.currentQuestion?.id) {
      const questionId = quiz.currentQuestion.id;
      const updatedAnswers = {...quiz.answeredQuestions};

      // Save the answer data in a separate property to track attempts
      const previousAnswer = updatedAnswers[questionId];

      // Actually delete the entry so the question can be asked again
      delete updatedAnswers[questionId];

      // Add to question history for tracking purposes only
      const questionHistory = quiz.questionHistory || {};
      questionHistory[questionId] = questionHistory[questionId] || [];
      questionHistory[questionId].push({
        ...previousAnswer,
        retried: true
      });

      updateQuizState({
        answeredQuestions: updatedAnswers,
        questionHistory: questionHistory
      });
    }

    // Force the same question to be asked again
    updatePlayerState({
      lastQuestionTime: 0,
      lastQuestionId: quiz.currentQuestion?.id
    });

    if (isYouTube && playerRef.current?.seekTo) {
      playerRef.current.seekTo(seekTime);
    } else if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
    playVideo();
  };

  const handleRestartVideo = () => {
    updatePlayerState({
      lastQuestionTime: 0,
      lastQuestionId: null,
    });

    updateQuizState({
      showSummary: false,
      feedback: "",
      retryOption: false,
      currentQuestion: null,
      detections: [],
      answeredQuestions: {}, // Reset answers if restarting
    });

    updateSessionState({
      stats: { // Reset stats if restarting
        total: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        startTime: Date.now(),
        endTime: null
      }
    });

    if (isYouTube && playerRef.current?.seekTo) {
      playerRef.current.seekTo(0);
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    playVideo();
  };

  useEffect(() => {
    const interval = setInterval(checkQuestionTime, 500);
    return () => clearInterval(interval);
  }, [checkQuestionTime]);

  // Answer handling
  const handleAnswer = async (label) => {
    if (!quiz.currentQuestion?.id || !label) return;

    const questionId = quiz.currentQuestion.id;
    const correctAnswer = quiz.currentQuestion.answer || quiz.currentQuestion.options?.[0] || "";
    const isCorrect = label.toLowerCase() === correctAnswer.toLowerCase();

    // Check if this is the first time answering this question
    const isFirstInteraction = !quiz.answeredQuestions[questionId] &&
        (!quiz.questionHistory || !quiz.questionHistory[questionId]);

    // Only update stats if this is the first interaction
    if (isFirstInteraction) {
      const newStats = {
        ...session.stats,
        correct: isCorrect ? session.stats.correct + 1 : session.stats.correct,
        wrong: !isCorrect ? session.stats.wrong + 1 : session.stats.wrong,
        total: session.stats.total + 1
      };
      updateSessionState({ stats: newStats });
    }

    // Track this answer
    const newAnsweredQuestions = {
      ...quiz.answeredQuestions,
      [questionId]: {
        answered: true,
        correct: isCorrect,
        selectedAnswer: label,
        timestamp: Date.now(),
        questionTime: getCurrentTime(),
        statsUpdated: true
      }
    };

    updateQuizState({
      answeredQuestions: newAnsweredQuestions,
      feedback: isCorrect ? "✅ Correct!" : "❌ That's not correct. Try again!",
      retryOption: !isCorrect
    });

    if (isCorrect) {
      setTimeout(() => {
        updateQuizState({ currentQuestion: null, detections: [], feedback: "" });
        playVideo();
      }, 2000);
    }
  };


  // Skip question
  const handleSkip = () => {
    if (quiz.currentQuestion) {
      const questionId = quiz.currentQuestion.id;

      // Only count as skipped if this is the first interaction with this question
      const isFirstInteraction = !quiz.answeredQuestions[questionId] &&
          (!quiz.questionHistory || !quiz.questionHistory[questionId]);

      // Update stats only on first interaction
      if (isFirstInteraction) {
        const newStats = {
          ...session.stats,
          skipped: session.stats.skipped + 1,
          total: session.stats.total + 1
        };
        updateSessionState({ stats: newStats });
      }

      const newAnsweredQuestions = {
        ...quiz.answeredQuestions,
        [questionId]: {
          answered: true,
          skipped: true,
          questionTime: getCurrentTime(),
          statsUpdated: true
        }
      };

      updateQuizState({
        currentQuestion: null,
        detections: [],
        feedback: "⏭️ Skipped question.",
        answeredQuestions: newAnsweredQuestions,
        retryOption: false
      });

      updatePlayerState({ lastQuestionId: null });
      playVideo();

      setTimeout(() => updateQuizState({ feedback: "" }), 1500);
    }
  };

  // Video ended handler
  const handleVideoEnded = () => {
    const now = Date.now();

    // For summary, count unique questions
    const uniqueQuestionCount = new Set(Object.keys(quiz.answeredQuestions)).size;

    // For reporting, get raw counts from the stats
    const { correct, wrong, skipped, total } = session.stats;

    updateSessionState({
      end: now,
      stats: {
        ...session.stats,
        endTime: now,
        uniqueCount: uniqueQuestionCount
      }
    });

    updateQuizState({ showSummary: true });
  };

  // Detection box calculation for object detection
  const calculateDetectionBoxStyle = (det) => {
    const wrapper = videoWrapperRef.current;
    if (!wrapper) return null;

    let videoElement, videoWidth, videoHeight;

    if (isYouTube) {
      videoElement = wrapper;
      videoWidth = det.original_width || 640;
      videoHeight = det.original_height || 360;
    } else {
      videoElement = videoRef.current;
      videoWidth = videoElement?.videoWidth || 640;
      videoHeight = videoElement?.videoHeight || 360;
    }

    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;
    const videoAspect = videoWidth / videoHeight;
    const wrapperAspect = wrapperWidth / wrapperHeight;

    let scale, offsetX = 0, offsetY = 0;

    if (wrapperAspect > videoAspect) {
      scale = wrapperHeight / videoHeight;
      offsetX = (wrapperWidth - videoWidth * scale) / 2;
    } else {
      scale = wrapperWidth / videoWidth;
      offsetY = (wrapperHeight - videoHeight * scale) / 2;
    }

    const [x1, y1, x2, y2] = det.box;
    const left = offsetX + x1 * scale;
    const top = offsetY + y1 * scale;
    const width = (x2 - x1) * scale;
    const height = (y2 - y1) * scale;

    return {
      position: "absolute",
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      border: "none", // Removed visible border
      backgroundColor: "transparent", // Made transparent
      zIndex: 10,
      pointerEvents: "auto",
      cursor: "pointer",
      opacity: 0 // Fully transparent but still clickable
    };
  };

  // Video player
  const playerProps = {
    ref: playerRef,
    url: videoUrl,
    playing: player.isPlaying && !quiz.currentQuestion,
    controls: true,
    width: "640px",
    height: "360px",
    onPlay: () => updatePlayerState({ isPlaying: true, autoDetect: true, videoReady: true }),
    onPause: () => updatePlayerState({ isPlaying: false, autoDetect: false }),
    onReady: () => {
      updatePlayerState({ videoReady: true });
      // Auto-play when ready if not processing
      if (!isProcessing) {
        playVideo();
      }
    },
    onEnded: handleVideoEnded,
    onError: (e) => {
      console.error("Video playback error:", e);
      updateQuizState({ feedback: "⚠️ Video playback error. Please try refreshing." });
    }
  };

  // Initialization
  useEffect(() => {
    updateSessionState({ start: Date.now(), stats: { ...session.stats, startTime: Date.now() } });
  }, []);

  // Render
  return (
      <div className="video-watch-container">
        {/* Error/Processing Overlays */}
        {!videoId && videoUrl && (
            <div className="error-overlay">
              <h3>Invalid Video URL</h3>
              <p>The provided YouTube URL is not valid.</p>
              <button onClick={() => navigate('/')}>Go Back</button>
            </div>
        )}

        {processing.status === 'processing' && (
            <div className="processing-overlay">
              <div className="spinner"></div>
              <h3>Processing Video: {videoTitle}</h3>
              {processing.progress && <p>Step: {processing.progress}</p>}
              <p>Elapsed: {formatTime(processing.elapsed || 0)}</p>
              {processing.remaining && <p>Estimated remaining: {formatTime(processing.remaining)}</p>}
              <button onClick={handleCancelProcessing} className="cancel-button">
                Cancel Processing
              </button>
            </div>
        )}

        {processing.status === 'cancelling' && (
            <div className="processing-overlay">
              <div className="spinner"></div>
              <h3>Cancelling Processing...</h3>
              <p>Please wait...</p>
            </div>
        )}

        {processing.error && (
            <div className="error-overlay">
              <h3>Processing Error</h3>
              <p>{processing.error}</p>
              <button onClick={() => window.location.reload()}>Reload Page</button>
              <button onClick={() => navigate('/')}>Go Home</button>
            </div>
        )}

        {/* Main Content */}
        <header className="video-watch-header">
          <div className="video-watch-logo-container">
            <img src={logo} alt="Logo" className="video-watch-logo-animated"/>
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
                {/* Question Box */}
                {quiz.currentQuestion && (
                    <div className="question-box dynamic-glow">
                      <h3 className="question-text">🧠 {quiz.currentQuestion.text}</h3>
                      {quiz.currentQuestion.type === 'object_detection' ? (
                          <p className="instruction">Click on the object in the video!</p>
                      ) : (
                          quiz.currentQuestion.options?.length > 0 && (
                              <div className="options">
                                {quiz.currentQuestion.options.map((opt, index) => (
                                    <button
                                        key={index}
                                        className="option-button vibrant-border"
                                        onClick={() => handleAnswer(opt)}
                                    >
                                      {opt}
                                    </button>
                                ))}
                              </div>
                          )
                      )}
                      {quiz.feedback && <p className="feedback colorful-feedback">{quiz.feedback}</p>}
                      <button onClick={handleSkip} className="skip-button fancy-skip">⏭️ Skip</button>

                      {quiz.retryOption && (
                          <div className="retry-buttons inside-box">
                            <button className="retry-btn" onClick={() => {
                              const updated = {...quiz.answeredQuestions};
                              delete updated[quiz.currentQuestion.id];
                              updateQuizState({
                                retryOption: false,
                                feedback: "",
                                answeredQuestions: updated
                              });
                            }}>
                              🔁 Try Again
                            </button>
                            <button className="watch-again-btn" onClick={handleWatchAgain}>
                              ▶️ Watch Again
                            </button>
                          </div>
                      )}
                    </div>
                )}

                {/* Video Player */}
                <div className="video-wrapper" ref={videoWrapperRef} style={{position: "relative", width: "640px", height: "360px"}}>
                  {!isYouTube ? (
                      <video
                          ref={videoRef}
                          src={videoUrl}
                          crossOrigin="anonymous"
                          controls
                          autoPlay={!isProcessing}
                          width="640"
                          height="360"
                          onPlay={() => updatePlayerState({ isPlaying: true, autoDetect: true })}
                          onPause={() => updatePlayerState({ isPlaying: false })}
                          onLoadedMetadata={() => updatePlayerState({ videoReady: true })}
                          onEnded={handleVideoEnded}
                      />
                  ) : (
                      <ReactPlayer {...playerProps} />
                  )}

                  {/* Detection Boxes */}
                  {player.videoReady && quiz.detections.map((det, i) => {
                    const boxStyle = calculateDetectionBoxStyle(det);
                    if (!boxStyle) return null;

                    return (
                        <div
                            key={i}
                            style={boxStyle}
                            onClick={() => handleAnswer(det.label)}
                            title={`Click to select ${det.label}`}
                        >
                          {det.label}
                        </div>
                    );
                  })}
                </div>
              </>
          )}

          {/* Summary Overlay */}
          {quiz.showSummary && (
              <div className="summary-overlay-on-video">
                <div className="summary-box dynamic-glow">
                  <h2>🌟 You're Amazing! 🌟</h2>
                  <div className="results-summary">
                    <p>🎯 <strong>Total Questions:</strong> {quiz.questions.length}</p>
                    <p>✅ <strong>Correct:</strong> {session.stats.correct}</p>
                    <p>❌ <strong>Wrong:</strong> {session.stats.wrong}</p>
                    <p>⏭️ <strong>Skipped:</strong> {session.stats.skipped}</p>
                    <p>⏱️ <strong>Time
                      Watched:</strong> {Math.round((session.stats.endTime - session.stats.startTime) / 1000)}s</p>
                    {session.start && session.end && (
                        <p>🕒 <strong>Session Time:</strong> {Math.round((session.end - session.start) / 1000)}s</p>
                    )}
                  </div>

                  <div className="summary-buttons">
                    <button className="fancy-button" onClick={handleRestartVideo}>
                      🔁 Watch Again
                    </button>
                    <button className="fancy-button" onClick={() => navigate("/profile")}>
                    🏠 Go to Profile
                    </button>
                  </div>
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