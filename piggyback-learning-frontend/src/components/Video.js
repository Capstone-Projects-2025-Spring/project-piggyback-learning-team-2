import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import YouTube from "react-youtube";
import logo from '../images/Mob_Iron_Hog.png'; 
import questionImage from '../images/placeholderquestionImage.png'; 
import '../styles/video.css';
import {Overlay} from './Overlay'
import "../styles/overlay.css";

const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: null, y: null });

  useEffect(() => {
    const updateMousePosition = (ev) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  return mousePosition;
};

export default function App() {
  const [isPaused, setIsPaused] = useState(false);
  const someMousePosition = useMousePosition(); // Still useful for debugging
  const [currentTime, setCurrentTime] = useState(0); 
  const videoRef = useRef(null);
  const imageRef = useRef(null); // Ref for the image element
  const [triggerCount, setTriggerCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [overlayType, setOverlayType] = useState(null);
  const [answers, setAnswers] = useState({});
  const [someVideoEmbed] = useState("9e5lcQycf2M");
  const [counter, setCounter] = React.useState(0);
  const [retry, setRetry] = React.useState(0);

  const questionsData = React.useMemo(() => [
    {
      id: "question1",
      type: "image",
      title: "Who is Squeeks? (Click on the Image!)",
      otherTimeStamp: 20,
      someTriggerCount: 0,
      correctAnswer: { xMin: 300, xMax: 400, yMin: 150, yMax: 250 } // Adjusted to include X=347.5, Y=192.14
    },
    // ... (rest of the questions remain unchanged)
    {
      id: "question2",
      type: "multipleChoice",
      title: "What muscle is responsible for causing hiccups?",
      options: [
        { value: "A", label: "Heart" },
        { value: "B", label: "Diaphragm" },
        { value: "C", label: "Stomach" },
        { value: "D", label: "Lungs" }
      ],
      otherTimeStamp: 80,
      someTriggerCount: 1,
      correctAnswer: "B"
    },
    {
      id: "question3",
      type: "multipleChoice",
      title: "Which of the following is NOT a common cause of hiccups?",
      options: [
        { value: "A", label: "Eating too quickly" },
        { value: "B", label: "Drinking carbonated beverages" },
        { value: "C", label: "Holding your breath" },
        { value: "D", label: "Sudden excitement" }
      ],
      otherTimeStamp: 90,
      someTriggerCount: 2,
      correctAnswer: "D"
    },
    {
      id: "question4",
      type: "multipleChoice",
      title: 'Why do hiccups make a "hic" sound?',
      options: [
        { value: "A", label: "Air quickly rushes into the lungs" },
        { value: "B", label: "The vocal cords suddenly close" },
        { value: "C", label: "The stomach contracts" },
        { value: "D", label: "The heart skips a beat" }
      ],
      otherTimeStamp: 118,
      someTriggerCount: 3,
      correctAnswer: "A"
    },
    {
      id: "end",
      type: "end",
      title: "Here's How You Did!",
      otherTimeStamp: 170,
      someTriggerCount: 4,
      correctAnswer: ""
    }
  ], []);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setCounter(prevCounter => prevCounter + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [counter]);

  const toggleOverlay = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const togglePandOtogether = () => {
    toggleOverlay();
    togglePause();
  };

  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pauseVideo();
      } else {
        videoRef.current.playVideo();
      }
    }
  }, [isPaused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.getCurrentTime() > 0) {
        const someTime = videoRef.current.getCurrentTime();
        setCurrentTime(someTime);
        const currentQuestion = questionsData[triggerCount];
        if (currentQuestion && someTime >= currentQuestion.otherTimeStamp && triggerCount === currentQuestion.someTriggerCount) {
          setTriggerCount(triggerCount + 1);
          setIsPaused(true);
          setIsOpen(true);
          setCounter(0);
          setOverlayType(currentQuestion.id);
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [triggerCount, currentTime, questionsData]);

  const _onReady = (event) => {
    videoRef.current = event.target;
  };

  const userAnswer = (questionId, selectedAnswer, someTimeTaken, someNumRetry) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: {
        ...prevAnswers[questionId],
        answer: selectedAnswer,
        timeTaken: someTimeTaken,
        numRetry: someNumRetry
      }
    }));
  };

  const handleAnswerSubmission = (questionId, userInput, event) => {
    const currentQuestion = questionsData.find(q => q.id === questionId);
    if (!currentQuestion) return;

    let isCorrect = false;

    if (currentQuestion.type === "image" && event) {
      const rect = imageRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left; // Relative to image
      const y = event.clientY - rect.top;
      const { xMin, xMax, yMin, yMax } = currentQuestion.correctAnswer;
      isCorrect = x >= xMin && x <= xMax && y >= yMin && y <= yMax;
      console.log(`Click at: X=${x}, Y=${y} | Expected: ${xMin}-${xMax}, ${yMin}-${yMax}`); // Debugging
    } else if (currentQuestion.type === "multipleChoice") {
      isCorrect = userInput === currentQuestion.correctAnswer;
    }

    if (isCorrect) {
      alert("That's right!");
      userAnswer(questionId, userInput || "correct", counter, retry);
      togglePandOtogether();
    } else {
      alert("Try again!");
      const rewindTime = currentTime < 30 ? 0 : currentTime - 30;
      videoRef.current.seekTo(rewindTime, true);
      setRetry(prev => prev + 1);
      setTriggerCount(prev => prev - 1);
      togglePandOtogether();
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech synthesis not supported");
    }
  };

  useEffect(() => {
    const currentQuestion = questionsData.find(q => q.id === overlayType);
    if (currentQuestion) {
      let textToSpeak = currentQuestion.title;
      if (currentQuestion.type === "multipleChoice") {
        textToSpeak += " " + currentQuestion.options.map(opt => opt.label).join(", ");
      }
      speakText(textToSpeak);
    }
  }, [overlayType, questionsData]);

  const renderOverlayContent = () => {
    const currentQuestion = questionsData.find(q => q.id === overlayType);
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case "image":
        return (
          <div className="overlayImage">
            <h1>{currentQuestion.title}</h1>
            <img
              ref={imageRef}
              src={questionImage}
              alt="question"
              className="questionImage"
              onClick={(e) => handleAnswerSubmission(currentQuestion.id, null, e)}
            />
            <br/>
            <button onClick={() => speakText(currentQuestion.title)}>🔊 Replay</button>
          </div>
        );

      case "multipleChoice":
        return (
          <div className="overlayImage">
            <h1>{currentQuestion.title}</h1>
            {currentQuestion.options.map(option => (
              <React.Fragment key={option.value}>
                <input
                  type="radio"
                  name={currentQuestion.id}
                  id={`${currentQuestion.id}-${option.value}`}
                  value={option.value}
                  checked={answers[currentQuestion.id]?.answer === option.value}
                  onChange={() => userAnswer(currentQuestion.id, option.value, counter, retry)}
                />
                <label htmlFor={`${currentQuestion.id}-${option.value}`}>
                  {option.label}
                </label>
                <br/>
              </React.Fragment>
            ))}
            <br/>
            <button className="button" onClick={() => handleAnswerSubmission(currentQuestion.id, answers[currentQuestion.id]?.answer)}>
              Submit
            </button>
            <br/>
            <button onClick={() => speakText(currentQuestion.title + " " + currentQuestion.options.map(opt => opt.label).join(", "))}>
              🔊 Replay
            </button>
          </div>
        );

      case "end":
        return (
          <div>
            <div style={{ height: 300, overflowY: 'scroll', border: '1px solid #ccc' }}>
              <h2>{currentQuestion.title}</h2>
              <ul>
                {questionsData.filter(q => q.type !== "end").map(q => {
                  const selectedAnswer = answers[q.id]?.answer;
                  let displayAnswer = "Not answered";
                  if (selectedAnswer && q.options) {
                    const option = q.options.find(opt => opt.value === selectedAnswer);
                    displayAnswer = option ? `(${selectedAnswer}) ${option.label}` : selectedAnswer;
                  }
                  return (
                    <li key={q.id}>
                      <strong>{q.title}</strong>
                      <div>Answer: {displayAnswer}</div>
                      <div>Time Taken: {answers[q.id]?.timeTaken || "0"}</div>
                      <div>Number of Retries: {answers[q.id]?.numRetry || "0"}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <button className="button" onClick={togglePandOtogether}>
              OK!
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <header>
        <div className="logo">
          <img src={logo} alt="Piggyback Learning Logo" />
        </div>
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/how-to-join">How to Join</Link></li>
            <li><Link to="/signin">Sign In</Link></li>
            <li><Link to="/store">Store</Link></li>
          </ul>
        </nav>
      </header>
      <div className="yvid">
        <YouTube
          videoId={someVideoEmbed}
          opts={{ height: "480", width: "854", playerVars: { autoplay: 1 } }}
          onReady={_onReady}
        />
      </div>
      <div className="overlay">
        <button className="overlay__close" onClick={togglePandOtogether}>Open Overlay</button>
        <Overlay isOpen={isOpen} onClose={togglePandOtogether}>
          {renderOverlayContent()}
        </Overlay>
      </div>
      {/* Uncomment for debugging */}
      {/* <h2>Mouse Position: X={someMousePosition.x}, Y={someMousePosition.y}</h2> */}
    </div>
  );
}