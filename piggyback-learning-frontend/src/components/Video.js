

/*

in researching how to implement the questions and have an end of video review I found this: https://react.dev/learn/updating-objects-in-state
ill research the example given for the mouse pointer for a more accurate version and likely end up using it for the image interaction
 

*/




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

// refactored https://codesandbox.io/p/sandbox/react-youtube-play-pause-video-using-an-external-button-c77o1v?file=%2Fsrc%2FApp.tsx%3A19%2C18 for the mouse cursor position code
// but removed the typescript annotations using online resources as an aid

export default function App() {
  const [isPaused, setIsPaused] = useState(false);
  const someMousePosition = useMousePosition(); 
  const [currentTime, setCurrentTime] = useState(0); 
  const videoRef = useRef(null);
  const [triggerCount, setTriggerCount] = useState(0);

  // used this for reference for the overlay: https://www.youtube.com/watch?v=D9OJX6sSyYk  and https://github.com/unhingedmagikarp/medium-overlay.git 
  const [isOpen, setIsOpen] = useState(false);
  const [overlayType, setOverlayType] = useState(null);

  const [answers, setAnswers] = useState({}); // stores answers for questions
  

  const toggleOverlay = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  


  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const togglePandOtogether = () => {
    toggleOverlay();
    togglePause();
    // setIsPaused(true)
    // setIsOpen(true)
  };
  
  
  useEffect(() => {
    if (videoRef.current) {
      const elapsed_seconds = videoRef.current.getCurrentTime();
      console.log(`Current time: ${elapsed_seconds}s`);

      if (isPaused) {
        videoRef.current.pauseVideo();
      } else {
        videoRef.current.playVideo();
      }
    }
  }, [isPaused]);

  const timeStampData = [
    { id: "question1", otherTimeStamp: 20, someTriggerCount: 0, correctAnswer: "" },
    { id: "question2", otherTimeStamp: 80, someTriggerCount: 1, correctAnswer: "B" },
    { id: "question3", otherTimeStamp: 90, someTriggerCount: 2, correctAnswer: "D" },
    { id: "question4", otherTimeStamp: 118, someTriggerCount: 3, correctAnswer: "A" },
    { id: "end",       otherTimeStamp: 170, someTriggerCount: 4, correctAnswer: "" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.getCurrentTime() > 0) {
        const someTime = videoRef.current.getCurrentTime();
        setCurrentTime(someTime);
        // console.log("Current time:", someTime);
        // console.log("Current trigger count:", triggerCount);
        
        const currentTrigger = timeStampData[triggerCount];
        if (currentTrigger) {
          // console.log("Current trigger object:", currentTrigger);
          // console.log(
          //   "Condition check:",
          //   someTime >= currentTrigger.otherTimeStamp,
          //   "&&",
          //   triggerCount === currentTrigger.someTriggerCount
          // );
          if (someTime >= currentTrigger.otherTimeStamp && triggerCount === currentTrigger.someTriggerCount) {
            // console.log("Trigger condition met for:", currentTrigger.id);
            setTriggerCount(triggerCount + 1);
            setIsPaused(true);
            setIsOpen(true);
            setOverlayType(currentTrigger.id);
          }
        } else {
          console.log("No trigger defined for triggerCount:", triggerCount);
        }
      } else {
        console.log("Video not ready or getCurrentTime() <= 0");
      }
    }, 100);
    return () => clearInterval(interval);
  }, [triggerCount, currentTime]);

  

  const _onReady = (event) => {
    videoRef.current = event.target;
  };


  // uses Copying objects with the spread syntax from https://react.dev/learn/updating-objects-in-state with help from overlord gpt
  // const userAnswer = (questionKey) => {
  //   const selectedOption = document.querySelector(`input[name="${questionKey}"]:checked`);
  //   if (selectedOption) {
  //     setAnswers(prev => ({ ...prev, [questionKey]: selectedOption.value }));
  //     console.log(`Answer for ${questionKey}:`, selectedOption.value); // Debugging log
  //   } else {
  //     console.log(`No answer selected for ${questionKey}`);
  //   }
  //   togglePandOtogether(); 
  // };


  const userAnswer = (questionId, selectedAnswer) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: selectedAnswer
    }));
  };

  const checkMousePosition = () => {
    // x >1020 && x<1120 and y>600 && y<695
    if (someMousePosition.x >= 1020 && someMousePosition.x <= 1120 && someMousePosition.y >= 600 && someMousePosition.y <= 695) {
      alert(`thats right!`);
      togglePandOtogether(); 
    } else {
      alert(`try again!`);
      // alert(`a Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`);
    }
  };

  // im gonna need to refactor to account for multiple questions, probably gonna fold checkMousePosition into this using the list logic used in for the questions 
  const videoReplayOnWrongAnswer = (questionId) => {

    const currentData = timeStampData.find(item => item.id === questionId);
    if (!currentData) {
      console.error("No data found for question:", questionId);
      return;
    }
    if (answers[questionId] === currentData.correctAnswer) {
      alert(`thats right!`);
      togglePandOtogether();
     
    } 
    else {
      if (videoRef.current < 30) {
        alert(`try again!`);
        videoRef.current.seekTo(0, true);
        setTriggerCount(triggerCount-1)
        togglePandOtogether();
      }
      else{
        alert(`try again!`);
        videoRef.current.seekTo((currentTime-30), true);
        setTriggerCount(triggerCount-1)
        togglePandOtogether();
      }
    }
  };
  
  // question data that is going to be refactored later for a database API call that fetches the data
  const questionsData = [
    {
      id: "question1",
      type: "image",
      title: "Who is Squeeks? (Click on the Image!)"
    },
    {
      id: "question2",
      type: "multipleChoice",
      title: "What muscle is responsible for causing hiccups?",
      options: [
        { value: "A", label: "Heart" },
        { value: "B", label: "Diaphragm" },
        { value: "C", label: "Stomach" },
        { value: "D", label: "Lungs" }
      ]
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
      ]
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
      ]
    },
    {
      id: "end",
      type: "end",
      title: "Here's How You Did!"
    }
  ];

  const renderOverlayContent = () => {
    // Find the current question based on overlayType
    const currentQuestion = questionsData.find(q => q.id === overlayType);
    if (!currentQuestion) return null;
  
    // Set up local variables for the submit handler and extra props.
    let onSubmit = null;
    let extraProps = {};
  
    // Decide the action functions based on the question id
    switch (currentQuestion.id) {
      case "question1":
        extraProps.src = questionImage;
        extraProps.onClick = checkMousePosition;
        break;
      case "question2":
        onSubmit = videoReplayOnWrongAnswer;
        break;
      case "question3":
      case "question4":
      case "end":
        onSubmit = togglePandOtogether;
        break;
      default:
        break;
    }

    // used https://react.dev/learn/rendering-lists and  https://dev.to/remejuan/dynamically-render-components-based-on-configuration-3l42 
    // chatgpt search function carrying alot with reasoning fixing syntax and logic errors where those occured, especially as I had to refactor the code to not account for hard-coding.
    // Render based on the type of question
    switch (currentQuestion.type) {
      case "image":
        return (
          <div className="overlayImage">
            <h1>{currentQuestion.title}</h1>
            <img
              src={extraProps.src}
              alt="question"
              className="questionImage"
              onClick={extraProps.onClick}
            />
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
                  checked={answers[currentQuestion.id] === option.value}
                  onChange={() => userAnswer(currentQuestion.id, option.value)}
                />
                <label htmlFor={`${currentQuestion.id}-${option.value}`}>
                  {option.label}
                </label>
                <br />
              </React.Fragment>
            ))}
            {/* <button className="button" onClick={onSubmit}> */}
            <button className="button" onClick={() => videoReplayOnWrongAnswer(currentQuestion.id)}>
              Submit
            </button>
          </div>
        );
      case "end":
        return (
          <div
            style={{
              height: 300,
              overflowY: 'scroll',
              border: '1px solid #ccc'
            }}
          >
            <h2>{currentQuestion.title}</h2>
            <ul>
              {questionsData
                .filter(q => q.type !== "end")
                .map(q => (
                  <li key={q.id}>
                    <strong>{q.title}</strong>
                    <div>User's Answer: {answers[q.id]?.answer || "Not answered"}</div>
                    <div>Time Taken: {answers[q.id]?.timeTaken || "N/A"}</div>
                    <div>Number of Retries: {answers[q.id]?.numRetry || "N/A"}</div>
                  </li>
                ))}
            </ul>
            <button className="button" onClick={onSubmit}>
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
            <li><Link to="/video">Video (placeholder)</Link></li>
            <li><Link to="/store">Store</Link></li>
            <li><Link to="/ms">ms</Link></li>
          </ul>
        </nav>
      </header>
    </div>
      <div className="yvid">
        <YouTube 
          videoId={"9e5lcQycf2M"} // we can add a variable here later when re-using this page
          opts={{
            height: "480",
            width: "854",
            playerVars: {autoplay: 1,},}} 
          onReady={_onReady} 
        />
      </div>
      <div className="bogos">
      </div>      
      <div className="overlay">
        <button className="overlay__close" onClick={() => togglePandOtogether()}>Open Overlay</button> 
          <Overlay isOpen={isOpen} onClose={togglePandOtogether}>
            {renderOverlayContent()}
          </Overlay>
      </div>
      {/* <h2>Mouse Position: {JSON.stringify(someMousePosition)}</h2>
      <h2>Current Time: {currentTime.toFixed(2)}</h2>
      <h3 onClick={() => alert("Test container clicked!")}>test container</h3> */}  
    </div>
  );
}





