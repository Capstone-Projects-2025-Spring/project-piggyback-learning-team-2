import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/VideoWatch.css';
import ReactPlayer from 'react-player';
import logo from '../images/Mob_Iron_Hog.png';

export default function InteractiveVideoQuiz() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

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
  const [pollCount, setPollCount] = useState(0);

  // Question state
  const [questions, setQuestions] = useState([]); // All pre-generated questions
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [detections, setDetections] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [answeredQuestions, setAnsweredQuestions] = useState({}); // Track answered questions by ID

  // Player state
  const [autoDetect, setAutoDetect] = useState(true);
  const [lastQuestionTime, setLastQuestionTime] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [retryOption, setRetryOption] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const [sessionEnd, setSessionEnd] = useState(null);

  // Result tracking
  const [resultStats, setResultStats] = useState({
    total: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    startTime: null,
    endTime: null,
  });

  // Add completed flag to track if processing is finished
  const [completed, setCompleted] = useState(false);

  console.log('VideoWatch mounted with props:', {
    videoUrl,
    videoTitle,
    isProcessing,
    videoId
  });

  // Set session start time on component mount
  useEffect(() => {
    setSessionStart(Date.now());

    // Also set result stats start time if not already set
    if (!resultStats.startTime) {
      setResultStats(prev => ({ ...prev, startTime: Date.now() }));
    }
  }, []);

  // Processed video to generate questions and timestamps
  useEffect(() => {
    if (!isProcessing || !videoId) return;

    let pollInterval = null;
    let consecutiveErrors = 0;
    const MAX_ERRORS = 5;
    const POLL_INTERVAL_MS = 2000;
    const MAX_POLL_COUNT = 150; // Maximum polling attempts (5 minutes at 2 second intervals)

    const processVideo = async () => {
      console.log(`Starting processing for video ${videoId}`);

      setProcessingState({
        status: 'processing',
        progress: 'Starting...',
        elapsed: 0,
        remaining: null
      });

      try {
        // Start processing
        const response = await fetch(`${BACKEND_URL}/api/v1/video/process/${videoId}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            youtube_url: videoUrl,
            title: videoTitle,
            full_analysis: true,
            num_questions: 5,
            keyframe_interval: 30
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error("Processing error:", error);
        setProcessingError(error.message);
        return;
      }
    };

    const pollResults = async () => {
      try {
        // Increment poll count
        setPollCount(prevCount => {
          const newCount = prevCount + 1;

          // Check if we've polled too many times
          if (newCount > MAX_POLL_COUNT) {
            clearInterval(pollInterval);
            setProcessingError("Processing timeout. Please try again later.");
            console.error("Max polling count reached, stopping polling");
            return newCount;
          }

          return newCount;
        });

        console.log(`Polling attempt ${pollCount} for ${videoId}`);

        const resultsResponse = await fetch(`${BACKEND_URL}/api/v1/video/results/${videoId}`, {
          method: 'GET',
          cache: 'no-store' // Bypass cache for fresh results
        });

        if (!resultsResponse.ok) {
          throw new Error(`HTTP error! status: ${resultsResponse.status}`);
        }

        const resultsData = await resultsResponse.json();
        consecutiveErrors = 0; // Reset error counter on success

        console.log('Polling results:', resultsData);

        // Update processing state
        setProcessingState(prevState => ({
          ...prevState,
          ...resultsData,
          // Make sure we don't lose the status from the response
          status: resultsData.status || prevState.status
        }));

        if (resultsData.status === 'cancelled') {
          clearInterval(pollInterval);
          console.log("Processing was cancelled");
          setTimeout(() => {
            window.location.href = '/'; // Redirect to home after cancellation
          }, 2000);
          return;
        }

        if (resultsData.status === 'complete') {
          clearInterval(pollInterval);
          setCompleted(true);

          // Handle the questions data
          if (resultsData.questions && Array.isArray(resultsData.questions)) {
            // Ensure questions have all required fields
            const validatedQuestions = resultsData.questions.map((q, index) => ({
              id: q.id || `question-${index}`,
              text: q.text || "What is shown in this frame?",
              type: q.type || "text",
              options: q.options || [],
              answer: q.answer || "",
              timestamp: q.timestamp || 0,
              objects: q.objects || []
            }));

            console.log(`Completed with ${validatedQuestions.length} questions:`, validatedQuestions);
            setQuestions(validatedQuestions);
            localStorage.setItem(
                `video_${videoId}_questions`,
                JSON.stringify(validatedQuestions)
            );
          } else {
            console.error("No questions or invalid questions format in response:", resultsData);
            setProcessingError("No questions were generated. Please try again.");
          }
        }
        else if (resultsData.status === 'error') {
          clearInterval(pollInterval);
          setProcessingError(resultsData.error || "Processing failed");
        }

        // Add timeout check - if it's been processing for too long, force a refresh
        if (resultsData.status === 'processing' && resultsData.elapsed > 300) { // 5 minutes
          clearInterval(pollInterval);
          setProcessingError("Processing is taking too long. Please try again.");
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }

      } catch (error) {
        console.error("Polling error:", error);
        consecutiveErrors++;

        // After MAX_ERRORS consecutive errors, stop polling
        if (consecutiveErrors >= MAX_ERRORS) {
          console.error("Too many consecutive errors, stopping polling");
          clearInterval(pollInterval);
          setProcessingError("Connection to server lost. Please refresh the page.");
        }
      }
    };

    // Execute the processing
    processVideo();

    // Set up the polling interval
    pollInterval = setInterval(pollResults, POLL_INTERVAL_MS);

    // Initial poll after a short delay
    const initialPollTimeout = setTimeout(pollResults, 1000);

    // Cleanup function
    return () => {
      if (pollInterval) clearInterval(pollInterval);
      clearTimeout(initialPollTimeout);
    };
  }, [isProcessing, videoId, videoUrl, videoTitle, BACKEND_URL]);

  // Check for cached questions
  useEffect(() => {
    if (!isProcessing && videoId) {
      const cachedQuestions = localStorage.getItem(`video_${videoId}_questions`);
      if (cachedQuestions) {
        try {
          const parsedQuestions = JSON.parse(cachedQuestions);
          if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
            // Validate and transform the cached questions
            const validatedQuestions = parsedQuestions.map((q, index) => ({
              id: q.id || `question-${index}`,
              text: q.text || "What is shown in this frame?",
              type: q.type || "text",
              options: q.options || [],
              answer: q.answer || "",
              timestamp: q.timestamp || 0,
              objects: q.objects || []
            }));

            setQuestions(validatedQuestions);
            console.log("Loaded cached questions:", validatedQuestions);
          }
        } catch (error) {
          console.error("Error parsing cached questions:", error);
        }
      }
    }
  }, [isProcessing, videoId]);

  const pauseVideo = useCallback(() => {
    if (isYouTube) {
      if (playerRef.current?.getInternalPlayer) {
        const player = playerRef.current.getInternalPlayer();
        if (player && player.pauseVideo) {
          player.pauseVideo();
        }
      }
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isYouTube]);

  const playVideo = useCallback(() => {
    if (isYouTube) {
      if (playerRef.current?.getInternalPlayer) {
        const player = playerRef.current.getInternalPlayer();
        if (player && player.playVideo) {
          player.playVideo();
        }
      }
    } else if (videoRef.current) {
      videoRef.current.play();
    }
  }, [isYouTube]);

  // Effect to play video when processing completes
  useEffect(() => {
    if ((processingState.status === 'complete' || completed) && videoReady) {
      playVideo();
    }
  }, [processingState.status, completed, videoReady, playVideo]);

  const getCurrentTime = useCallback(() => {
    if (isYouTube) {
      if (playerRef.current?.getInternalPlayer) {
        const player = playerRef.current.getInternalPlayer();
        if (player && player.getCurrentTime) {
          return player.getCurrentTime();
        }
      }
      return 0;
    } else if (videoRef.current) {
      return videoRef.current.currentTime;
    }
    return 0;
  }, [isYouTube]);

  // Modified time update handler to find questions at timestamps
  useEffect(() => {
    if (!videoReady || questions.length === 0) return;

    const checkQuestionTime = () => {
      const currentTime = getCurrentTime();

      // Find the next question that is ahead of our last shown question time
      // but close to current time (within 2 seconds)
      // AND hasn't been answered yet
      const nextQuestion = questions.find(q =>
          q.timestamp > lastQuestionTime &&
          q.timestamp <= currentTime + 1 &&
          !answeredQuestions[q.id] &&
          (!currentQuestion || q.id !== currentQuestion.id)
      );

      if (nextQuestion) {
        console.log("Found question to show at time:", currentTime, nextQuestion);
        setCurrentQuestion(nextQuestion);

        // If it's an object detection question, also set the detections
        if (nextQuestion.type === 'object_detection' && nextQuestion.objects) {
          console.log("Setting detections for object detection question:", nextQuestion.objects);
          setDetections(nextQuestion.objects);
        } else {
          // Clear any previous detections for regular questions
          setDetections([]);
        }

        pauseVideo();
        setLastQuestionTime(currentTime);
      }
    };

    const interval = setInterval(checkQuestionTime, 1000);
    return () => clearInterval(interval);
  }, [videoReady, questions, currentQuestion, getCurrentTime, pauseVideo, lastQuestionTime, answeredQuestions]);


  const captureFrame = useCallback(async () => {

    setFeedback("");

    if (questions.length > 0) {
      // Find the next question that hasn't been shown yet
      const currentTime = getCurrentTime();
      const availableQuestions = questions.filter(q => q.timestamp > lastQuestionTime);

      if (availableQuestions.length > 0) {
        // Sort questions by timestamp
        const sortedQuestions = [...availableQuestions].sort((a, b) => a.timestamp - b.timestamp);
        const nextQuestion = sortedQuestions[0];

        setCurrentQuestion(nextQuestion);

        // If it's an object detection question, also set the detections
        if (nextQuestion.type === 'object_detection' && nextQuestion.objects) {
          setDetections(nextQuestion.objects);
        } else {
          setDetections([]); // Clear detections for non-object detection questions
        }

        setLastQuestionTime(currentTime);
        return;
      } else {
        // If we've shown all questions, provide feedback
        setFeedback("All prepared questions have been shown. Generating a new one...");
      }
    }

    // Live processing fallback
    if (isYouTube) {
      setFeedback("⏳ Getting question from YouTube transcript...");
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/video/process/${videoId}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            youtube_url: videoUrl,
            title: videoTitle,
            full_analysis: false, // Quick analysis
            num_questions: 1,
            keyframe_interval: 30
          })
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (data.question) {
          // Ensure the question has all required fields
          const validatedQuestion = {
            id: data.question.id || `question-live-${Date.now()}`,
            text: data.question.text || "What is shown in this frame?",
            type: data.question.type || "text",
            options: data.question.options || [],
            answer: data.question.answer || "",
            timestamp: data.question.timestamp || getCurrentTime(),
            objects: data.objects || []
          };

          // Handle object detection question type
          if (data.objects && data.objects.length > 0) {
            validatedQuestion.type = 'object_detection';
            setDetections(data.objects);
          } else {
            setDetections([]);
          }

          if (data.objects && data.objects.length > 0) {
            console.log("Object detection data received:", data.objects);
            // Ensure we set the question type correctly
            validatedQuestion.type = 'object_detection';
            setDetections(data.objects);
          }

          setCurrentQuestion(validatedQuestion);
          setFeedback("");
        } else {
          setFeedback("⚠️ Could not generate a question at this point.");
        }
      } catch (err) {
        console.error("Error getting question:", err);
        setFeedback("⚠️ Failed to process YouTube transcript.");
      }
      return;
    }

    // Local video processing
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setFeedback("⚠️ Video player not ready.");
      return;
    }

    setFeedback("⏳ Capturing frame...");

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg").split(",")[1];

      setFeedback("⏳ Detecting objects...");

      const res = await fetch(`${BACKEND_URL}/api/v1/video/process/${videoId || 'frame'}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          image_base64: base64,
          title: videoTitle,
          full_analysis: false,
          num_questions: 1,
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.question) {
        // Ensure the question has all required fields
        const validatedQuestion = {
          id: data.question.id || `question-live-${Date.now()}`,
          text: data.question.text || "What is shown in this frame?",
          type: data.question.type || "text",
          options: data.question.options || [],
          answer: data.question.answer || "",
          timestamp: data.question.timestamp || getCurrentTime(),
          objects: data.objects || []
        };

        // Set question type based on presence of objects
        if (data.objects && data.objects.length > 0) {
          validatedQuestion.type = 'object_detection';
          setDetections(data.objects);
        } else {
          setDetections([]);
        }

        setCurrentQuestion(validatedQuestion);
        setFeedback("");
      } else {
        setFeedback("⚠️ Could not generate a question from this frame.");
      }
    } catch (err) {
      console.error("Error processing frame:", err);
      setFeedback("⚠️ Error contacting detection service.");
    }
  }, [isYouTube, videoUrl, videoTitle, videoId, questions, getCurrentTime, BACKEND_URL, lastQuestionTime]);

  // Handle cancellation
  const handleCancelProcessing = async () => {
    try {
      console.log(`Cancelling processing for ${videoId}`);

      // First update UI immediately for better responsiveness
      setProcessingState(prevState => ({
        ...prevState,
        status: 'cancelling',
        progress: 'Cancelling processing...'
      }));

      const response = await fetch(`${BACKEND_URL}/api/v1/video/cancel/${videoId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
      });

      if (response.ok) {
        // Update the local state to reflect cancellation
        setProcessingState(prevState => ({
          ...prevState,
          status: 'cancelled',
          progress: 'Processing cancelled'
        }));

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
      setProcessingState(prevState => ({
        ...prevState,
        status: 'cancelled',
        progress: 'Processing cancelled (forced)'
      }));

      setProcessingError(`Failed to cancel: ${error.message}`);

      // Redirect anyway
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  };

  // Answer handling - FIXED to prevent double counting
  const handleAnswer = async (label) => {
    if (!currentQuestion?.id) {
      setFeedback("⚠️ No active question to answer.");
      return;
    }

    if (!label) {
      setFeedback("⚠️ No answer selected.");
      return;
    }

    // Check if this question has already been answered
    const questionAlreadyAnswered = answeredQuestions[currentQuestion.id];

    // Only update stats if this is the first time answering this question
    if (!questionAlreadyAnswered) {
      // Add to answered questions tracking
      setAnsweredQuestions(prev => ({
        ...prev,
        [currentQuestion.id]: true
      }));

      // Determine if answer is correct
      const correctAnswer = currentQuestion.answer || currentQuestion.options?.[0] || "";
      const isCorrect = label.toLowerCase() === correctAnswer.toLowerCase();

      // Update stats based on correctness
      if (isCorrect) {
        markCorrect();
      } else {
        markWrong();
      }
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/video/answer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          answer: currentQuestion.answer,
          selected_label: label,
          question_id: currentQuestion.id,
          timestamp: getCurrentTime(),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();

      if (result.correct) {
        setFeedback("✅ Correct!");
        setDetections([]);
        setTimeout(() => {
          setFeedback("");
          setCurrentQuestion(null);
          playVideo();
        }, 2000);
      } else {
        try {
          const explainRes = await fetch(`${BACKEND_URL}/api/v1/video/explain`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
              answer: currentQuestion.answer,
              selected_label: label,
              question: currentQuestion.text,
              options: currentQuestion.options,
            }),
          });

          if (!explainRes.ok) {
            throw new Error(`HTTP error! status: ${explainRes.status}`);
          }

          const explain = await explainRes.json();
          setFeedback(`❌ ${explain.message}`);
        } catch (explainError) {
          console.error("Error getting explanation:", explainError);
          setFeedback("❌ That's not correct. Try again!");
        }
        setRetryOption(true);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      setFeedback("⚠️ Could not check your answer. " + error.message);
    }
  };

  // Pause when a question appears
  useEffect(() => {
    if (currentQuestion) pauseVideo();
  }, [currentQuestion, pauseVideo]);

  // Time-based auto-detection
  useEffect(() => {
    if (!videoReady || !autoDetect || currentQuestion) return;

    const interval = setInterval(() => {
      const now = getCurrentTime();
      if (now - lastQuestionTime >= 25) {
        setLastQuestionTime(now);
        // Clear any old feedback before showing new question
        setFeedback("");
        captureFrame();
      }
    }, 5000); // check every 5 seconds

    return () => clearInterval(interval);
  }, [videoReady, autoDetect, currentQuestion, captureFrame, getCurrentTime, lastQuestionTime]);

  // Skip question
  const handleSkip = () => {
    // Only count skipped if we have a current question to skip
    if (currentQuestion) {
      // Mark as skipped in our stats
      markSkipped();

      // Mark as answered so we don't show it again
      setAnsweredQuestions(prev => ({
        ...prev,
        [currentQuestion.id]: true
      }));

      console.log(`Skipped question ${currentQuestion.id}`);
    }

    setFeedback("⏭️ Skipped question.");
    setDetections([]);
    setCurrentQuestion(null);
    setRetryOption(false);
    playVideo();

    // Clear feedback after a delay
    setTimeout(() => {
      setFeedback("");
    }, 1500);
  };

  // Result tracking helpers
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

  const markSkipped = () => {
    setResultStats(prev => ({
      ...prev,
      skipped: prev.skipped + 1,
      total: prev.total + 1
    }));
  };

  // Improved watch again handler - FIXED
  const handleWatchAgain = () => {
    // Preserve current question to show it again
    const questionToReshow = currentQuestion;

    setShowSummary(false);

    // Clear UI elements completely
    setFeedback("");
    setRetryOption(false);

    // If we have a valid question to rewatch, remove it from answered questions
    if (questionToReshow && questionToReshow.id) {
      // Un-mark the current question as answered so it can appear again
      setAnsweredQuestions(prev => {
        const updated = {...prev};
        delete updated[questionToReshow.id]; // Remove this question from answered questions
        return updated;
      });
    }

    setCurrentQuestion(null);

    // If we have a timestamp for the current question, rewind to 5 seconds before
    if (questionToReshow && questionToReshow.timestamp) {
      // Rewind to 5 seconds before the question
      if (isYouTube && playerRef.current?.seekTo) {
        playerRef.current.seekTo(Math.max(0, questionToReshow.timestamp - 5));
      } else if (videoRef.current) {
        // videoRef.current.currentTime = Math.max(0, questionToReshow.timestamp - 5);
        videoRef.current.currentTime = 0;
      }

      // Reset last question time to slightly before the question's time
      // so it will trigger again when we reach the timestamp
      setLastQuestionTime(Math.max(0, questionToReshow.timestamp - 10));

      // Play video to reach question again
      playVideo();
    } else {
      // If no timestamp (shouldn't happen), just restart video
      if (isYouTube) {
        const player = playerRef.current?.getInternalPlayer();
        if (player?.seekTo) {
          player.seekTo(0, true);
        }
        player?.playVideo?.();
      } else if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    }
  };

  useEffect(() => {
    if (currentQuestion) {
      console.log('Current question:', {
        type: currentQuestion.type,
        objects: currentQuestion.objects,
        text: currentQuestion.text
      });
      if (currentQuestion.type === 'object_detection') {
        console.log('Object detection boxes:', currentQuestion.objects);
      }
    }
  }, [currentQuestion]);

  // Handle video ended - show summary
  const handleVideoEnded = () => {
    // Capture end time
    const now = Date.now();
    setSessionEnd(now);

    // Update result stats end time
    setResultStats(prev => ({
      ...prev,
      endTime: now
    }));

    // Show summary overlay
    setShowSummary(true);
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
              {processingState.progress && (
                  <p>Step: {processingState.progress}</p>
              )}
              <p>Elapsed: {formatTime(processingState.elapsed || 0)}</p>
              {processingState.remaining && (
                  <p>Estimated remaining: {formatTime(processingState.remaining)}</p>
              )}
              <button onClick={handleCancelProcessing} className="cancel-button">
                Cancel Processing
              </button>
            </div>
        )}

        {processingState.status === 'cancelling' && (
            <div className="processing-overlay">
              <div className="spinner"></div>
              <h3>Cancelling Processing...</h3>
              <p>Please wait...</p>
            </div>
        )}

        {processingError && (
            <div className="error-overlay">
              <h3>Processing Error</h3>
              <p>{processingError}</p>
              <button onClick={() => window.location.reload()}>Reload Page</button>
              <button onClick={() => navigate('/')}>Go Home</button>
            </div>
        )}

        {/* Debugging panel - only show in development */}
        {process.env.NODE_ENV === 'development' && (
            <div className="debug-panel" style={{
              position: 'fixed',
              bottom: '10px',
              right: '10px',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '10px',
              borderRadius: '5px',
              fontSize: '12px',
              zIndex: 1000,
              maxWidth: '300px'
            }}>
              <h4>Debug Info</h4>
              <p>Status: {processingState.status}</p>
              <p>Progress: {processingState.progress}</p>
              <p>Elapsed: {formatTime(processingState.elapsed || 0)}</p>
              <p>Poll count: {pollCount}</p>
              <p>Questions loaded: {questions.length}</p>
              <p>Video ready: {videoReady ? 'Yes' : 'No'}</p>
              <p>Current question: {currentQuestion?.id || 'None'}</p>
              <p>Question type: {currentQuestion?.type || 'N/A'}</p>
              <p>Detections: {detections.length}</p>
              <p>Unique questions answered: {Object.keys(answeredQuestions).length}</p>
              <button onClick={() => console.log({
                processingState,
                questions,
                currentQuestion,
                videoReady,
                detections,
                answeredQuestions,
                resultStats
              })}>Log State</button>
            </div>
        )}

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
                {currentQuestion && currentQuestion.type === 'summary' ? (
                    <div className="question-box dynamic-glow">
                      {/* Summary content */}
                    </div>
                ) : currentQuestion ? (
                    <div className="question-box dynamic-glow">
                      <h3 className="question-text">🧠 {currentQuestion.text}</h3>

                      {currentQuestion.type === 'object_detection' ? (
                          <p className="instruction">Click on the object in the video!</p>
                      ) : (
                          currentQuestion.options?.length > 0 && (
                              <div className="options">
                                {currentQuestion.options.map((opt, index) => (
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
                      {feedback && <p className="feedback colorful-feedback">{feedback}</p>}
                      <button onClick={handleSkip} className="skip-button fancy-skip">⏭️ Skip</button>

                      {retryOption && (
                          <div className="retry-buttons inside-box">
                            <button className="retry-btn" onClick={() => {
                              setRetryOption(false);
                              setFeedback("");
                            }}>
                              🔁 Try Again
                            </button>
                            <button className="watch-again-btn" onClick={() => {
                              const questionToReshow = currentQuestion;
                              setRetryOption(false);
                              setFeedback("");
                              setCurrentQuestion(null);

                              if (questionToReshow && questionToReshow.id) {
                                setAnsweredQuestions(prev => {
                                  const updated = {...prev};
                                  delete updated[questionToReshow.id];
                                  return updated;
                                });
                              }

                              if (questionToReshow && questionToReshow.timestamp) {
                                if (isYouTube && playerRef.current?.seekTo) {
                                  playerRef.current.seekTo(Math.max(0, questionToReshow.timestamp - 5));
                                } else if (videoRef.current) {
                                  videoRef.current.currentTime = Math.max(0, questionToReshow.timestamp - 5);
                                }
                                setLastQuestionTime(Math.max(0, questionToReshow.timestamp - 10));
                              }
                              playVideo();
                            }}>
                              ▶️ Watch Again
                            </button>
                          </div>
                      )}
                    </div>
                ) : null}
                <div
                    className="video-wrapper"
                    ref={videoWrapperRef}
                    style={{position: "relative", width: "640px", height: "360px"}}
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
                          onEnded={handleVideoEnded}
                      />
                  ) : (
                      <ReactPlayer
                          ref={playerRef}
                          url={videoUrl}
                          playing={!isProcessing && processingState.status === 'complete'}
                          controls
                          width="640px"
                          height="360px"
                          onPlay={() => {
                            setAutoDetect(true);
                            setVideoReady(true);
                          }}
                          onPause={() => setAutoDetect(false)}
                          onReady={() => setVideoReady(true)}
                          onEnded={handleVideoEnded}
                          onError={(e) => {
                            console.error("Video playback error:", e);
                            setFeedback("⚠️ Video playback error. Please try refreshing.");
                          }}
                      />
                  )}

                  {videoReady && detections.map((det, i) => {
                    const wrapper = videoWrapperRef.current;
                    let videoElement, videoWidth, videoHeight;

                    if (isYouTube) {
                      // For YouTube, we'll use the wrapper dimensions
                      videoElement = wrapper;
                      videoWidth = det.original_width || 640; // Use original dimensions if available
                      videoHeight = det.original_height || 360;
                    } else {
                      // For direct video, use video dimensions
                      videoElement = videoRef.current;
                      videoWidth = videoElement?.videoWidth || 640;
                      videoHeight = videoElement?.videoHeight || 360;
                    }

                    if (!wrapper || !videoElement) return null;

                    // Calculate the scale factor based on the actual player size
                    const wrapperWidth = wrapper.clientWidth;
                    const wrapperHeight = wrapper.clientHeight;

                    // Calculate aspect ratios
                    const videoAspect = videoWidth / videoHeight;
                    const wrapperAspect = wrapperWidth / wrapperHeight;

                    let scale, offsetX = 0, offsetY = 0;

                    if (wrapperAspect > videoAspect) {
                      // Letterboxing (black bars on sides)
                      scale = wrapperHeight / videoHeight;
                      offsetX = (wrapperWidth - videoWidth * scale) / 2;
                    } else {
                      // Pillarboxing (black bars top and bottom)
                      scale = wrapperWidth / videoWidth;
                      offsetY = (wrapperHeight - videoHeight * scale) / 2;
                    }

                    const [x1, y1, x2, y2] = det.box;
                    const left = offsetX + x1 * scale;
                    const top = offsetY + y1 * scale;
                    const width = (x2 - x1) * scale;
                    const height = (y2 - y1) * scale;

                    // Ensure the values are reasonable
                    console.log(`Detection ${i}: ${det.label}, Box: [${x1},${y1},${x2},${y2}], Calculated: [${left},${top},${width},${height}]`);

                    const boxStyle = {
                      position: "absolute",
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      border: "3px solid limegreen",
                      backgroundColor: "rgba(0, 255, 0, 0.3)",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "bold",
                      zIndex: 10,
                      pointerEvents: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      textShadow: "0 0 3px black, 0 0 3px black"  // Make text more visible
                    };

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

                  <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>

                <button onClick={captureFrame} className="video-watch-detect-button">
                  ✨ Ask Question Now
                </button>

                {detections.length === 0 && (
                    <p className="feedback subtle-alert">⚠️ No clickable objects detected in this frame.</p>
                )}
                {feedback && !currentQuestion && <p className="feedback subtle-alert">{feedback}</p>}


              </>
          )}
          {showSummary && (
              <div className="summary-overlay-on-video">
                <div className="summary-box dynamic-glow">
                  <h2>🌟 You're Amazing! 🌟</h2>
                  <div className="results-summary">
                    <p>🎯 <strong>Total Questions:</strong> {resultStats.total}</p>
                    <p>✅ <strong>Correct:</strong> {resultStats.correct}</p>
                    <p>❌ <strong>Wrong:</strong> {resultStats.wrong}</p>
                    <p>⏭️ <strong>Skipped:</strong> {resultStats.skipped}</p>
                    <p>⏱️ <strong>Time Watched:</strong> {Math.round((resultStats.endTime - resultStats.startTime) / 1000)}s</p>
                    {sessionStart && sessionEnd && (
                        <p>🕒 <strong>Session Time:</strong> {Math.round((sessionEnd - sessionStart) / 1000)}s</p>
                    )}
                  </div>

                  <div className="summary-buttons">
                    <button className="fancy-button" onClick={() => {
                      setShowSummary(false);
                      handleWatchAgain();
                    }}>🔁 Watch Again</button>
                    <button className="fancy-button" onClick={() => navigate("/profile")}>🏠 Go to Profile</button>
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
