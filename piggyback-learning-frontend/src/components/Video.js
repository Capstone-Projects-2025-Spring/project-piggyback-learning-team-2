
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

  // store question data
  // this should be replaced with something that makes an API call to fill the array with content.


  //  Why Do We Get Hiccups? | Body Science for Kids     embed: 9e5lcQycf2M     link: https://youtu.be/9e5lcQycf2M
  const questionsData = React.useMemo(() => [
    {
      id: "question1",
      type: "image",
      title: "Who is Squeeks? (Click on the Image!)",
      otherTimeStamp: 20,
      someTriggerCount: 0,
      correctAnswer: ""
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

  // // Water Cycle | How the Hydrologic Cycle Works     embed: al-do-HGuIk    link: https://youtu.be/al-do-HGuIk
  // const questionsData = React.useMemo(() => [
  //   {
  //     id: "question1",
  //     type: "multipleChoice",
  //     title: "What is the process called when water vapor cools and turns back into liquid?",
  //     options: [
  //       { value: "A", label: "Evaporation" },
  //       { value: "B", label: "Condensation" },
  //       { value: "C", label: "Precipitation" },
  //       { value: "D", label: "Collection" }
  //     ],
  //     otherTimeStamp: 30,
  //     someTriggerCount: 0,
  //     correctAnswer: "B"
  //   },
  //   {
  //     id: "question2",
  //     type: "multipleChoice",
  //     title: "The sun is the primary source of energy driving the water cycle.",
  //     options: [
  //       { value: "A", label: "True" },
  //       { value: "B", label: "False" }
  //     ],
  //     otherTimeStamp: 60,
  //     someTriggerCount: 1,
  //     correctAnswer: "A"
  //   },
  //   {
  //     id: "question3",
  //     type: "multipleChoice",
  //     title: "Which stage of the water cycle involves water soaking into the ground?",
  //     options: [
  //       { value: "A", label: "Runoff" },
  //       { value: "B", label: "Infiltration" },
  //       { value: "C", label: "Transpiration" },
  //       { value: "D", label: "Condensation" }
  //     ],
  //     otherTimeStamp: 90,
  //     someTriggerCount: 2,
  //     correctAnswer: "B"
  //   }
  // ], []);
  




  // // What Causes Thunder and Lightning? (SciShow Kids)     embed: fEiVi9TB_RQ     link: https://youtu.be/fEiVi9TB_RQ
  // const questionsData = React.useMemo(() => [
  //   {
  //     id: "question1",
  //     type: "multipleChoice",
  //     title: "What causes the sound of thunder?",
  //     options: [
  //       { value: "A", label: "Clouds colliding" },
  //       { value: "B", label: "Lightning heating the air rapidly" },
  //       { value: "C", label: "Rain hitting the ground" },
  //       { value: "D", label: "Wind speeds increasing" }
  //     ],
  //     otherTimeStamp: 40,
  //     someTriggerCount: 0,
  //     correctAnswer: "B"
  //   },
  //   {
  //     id: "question2",
  //     type: "multipleChoice",
  //     title: "Lightning always strikes from the cloud to the ground.",
  //     options: [
  //       { value: "A", label: "True" },
  //       { value: "B", label: "False" }
  //     ],
  //     otherTimeStamp: 80,
  //     someTriggerCount: 1,
  //     correctAnswer: "B"
  //   },
  //   {
  //     id: "question3",
  //     type: "multipleChoice",
  //     title: "Which of the following is a type of lightning?",
  //     options: [
  //       { value: "A", label: "Sheet lightning" },
  //       { value: "B", label: "Forked lightning" },
  //       { value: "C", label: "Ball lightning" },
  //       { value: "D", label: "All of the above" }
  //     ],
  //     otherTimeStamp: 120,
  //     someTriggerCount: 2,
  //     correctAnswer: "D"
  //   }
  // ], []);



  
  // // How Do Airplanes Fly?     embed: Gg0TXNXgz-w     link: https://youtu.be/Gg0TXNXgz-w

  // const questionsData = React.useMemo(() => [
  //   {
  //     id: "question1",
  //     type: "multipleChoice",
  //     title: "What principle explains how airplane wings generate lift?",
  //     options: [
  //       { value: "A", label: "Newton's Third Law" },
  //       { value: "B", label: "Bernoulli's Principle" },
  //       { value: "C", label: "Pythagorean Theorem" },
  //       { value: "D", label: "Archimedes' Principle" }
  //     ],
  //     otherTimeStamp: 35,
  //     someTriggerCount: 0,
  //     correctAnswer: "B"
  //   },
  //   {
  //     id: "question2",
  //     type: "multipleChoice",
  //     title: "Flaps on the wings help airplanes to take off and land.",
  //     options: [
  //       { value: "A", label: "True" },
  //       { value: "B", label: "False" }
  //     ],
  //     otherTimeStamp: 70,
  //     someTriggerCount: 1,
  //     correctAnswer: "A"
  //   },
  //   {
  //     id: "question3",
  //     type: "multipleChoice",
  //     title: "Which factor does NOT affect the lift of an airplane?",
  //     options: [
  //       { value: "A", label: "Wing shape" },
  //       { value: "B", label: "Air speed" },
  //       { value: "C", label: "Engine power" },
  //       { value: "D", label: "Air density" }
  //     ],
  //     otherTimeStamp: 110,
  //     someTriggerCount: 2,
  //     correctAnswer: "C"
  //   }
  // ], []);

  // //


  



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


  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.getCurrentTime() > 0) {
        const someTime = videoRef.current.getCurrentTime();
        setCurrentTime(someTime);
        
        const currentQuestion = questionsData[triggerCount];
        if (currentQuestion) {
          if (someTime >= currentQuestion.otherTimeStamp && triggerCount === currentQuestion.someTriggerCount) {
            setTriggerCount(triggerCount + 1);
            setIsPaused(true);
            setIsOpen(true);
            setOverlayType(currentQuestion.id);
          }
        } else {
          console.log("No trigger defined for triggerCount:", triggerCount);
        }
      } else {
        console.log("Video not ready or getCurrentTime() <= 0");
      }
    }, 100);
    return () => clearInterval(interval);
  }, [triggerCount, currentTime, questionsData]);

  

  const _onReady = (event) => {
    videoRef.current = event.target;
  };


  // https://react.dev/learn/updating-objects-in-state  helped but refactored over multiple iterations
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

  const checkMousePosition = () => {
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

    const currentData = questionsData.find(item => item.id === questionId);
    if (!currentData) {
      console.error("No data found for question:", questionId);
      return;
    }
    if (answers[questionId]?.answer === currentData.correctAnswer) {
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
                  checked={answers[currentQuestion.id]?.answer === option.value}
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
                .map(q => {
                  const selectedAnswer = answers[q.id]?.answer;
                  let displayAnswer = "Not answered";
                  if (selectedAnswer && q.options) {
                    const option = q.options.find(opt => opt.value === selectedAnswer);
                    if (option) {
                      displayAnswer = `(${selectedAnswer}) ${option.label}`;
                    } else {
                      displayAnswer = selectedAnswer;
                    }
                  }
                  return (
                    <li key={q.id}>
                      <strong>{q.title}</strong>
                      <div>Answer: {displayAnswer}</div>
                      <div>Time Taken: {answers[q.id]?.timeTaken || "N/A"}</div>
                      <div>Number of Retries: {answers[q.id]?.numRetry || "N/A"}</div>
                    </li>
                  );
                })}
            </ul>
            {/* <ul>
              {questionsData
                .filter(q => q.type !== "end")
                .map(q => (
                  <li key={q.id}>
                    <strong>{q.title}</strong>
                    <div>Answer: {answers[q.id]?.answer || "Not answered"}</div>
                    <div>Time Taken: {answers[q.id]?.timeTaken || "N/A"}</div>
                    <div>Number of Retries: {answers[q.id]?.numRetry || "N/A"}</div>
                  </li>
                ))}
            </ul> */}
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
            <li><Link to="/store">Store</Link></li>
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





