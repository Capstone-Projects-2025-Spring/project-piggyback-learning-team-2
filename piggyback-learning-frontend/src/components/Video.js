
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
import { supabase } from './supabaseClient';
import { questions, questionOptions } from './data';

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

  const [someVideoEmbed, setSomeVideoEmbed] = useState("9e5lcQycf2M");

  const [counter, setCounter] = React.useState(0);
  const [retry, setRetry] = React.useState(null);

  const [apiData, setApiData] = useState([]);
  const [apiOptions, setApiOptions] = useState([]);
  const [currentVideoId, setCurrentVideoId] = useState("9e5lcQycf2M");

  const test1 = videoRef.current ? videoRef.current.getCurrentTime() : 0;  // Time of video playback
  const test2 = apiData[triggerCount];  // Questions data based on triggerCount
  const test3 = triggerCount;
  





  useEffect(() => {
    const fetchData = async () => {
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*');
  
      const { data: options, error: optionsError } = await supabase
        .from('question_options')
        .select('*');
  
      if (questionsError) console.error('Error fetching questions:', questionsError);
      if (optionsError) console.error('Error fetching options:', optionsError);
  
      if (questions) setApiData(questions);
      if (options) setApiOptions(options);
    };
  
    fetchData();
  }, []);

  

  // store question data
  // this should be replaced with something that makes an API call to fill the array with content.


  //  Why Do We Get Hiccups? | Body Science for Kids     embed: 9e5lcQycf2M     link: https://youtu.be/9e5lcQycf2M
  // const questionsData = React.useMemo(() => [
  //   {
  //     id: "question1",
  //     type: "image",
  //     title: "Who is Squeeks? (Click on the Image!)",
  //     otherTimeStamp: 20,
  //     someTriggerCount: 0,
  //     correctAnswer: ""
  //   },
  //   {
  //     id: "question2",
  //     type: "multipleChoice",
  //     title: "What muscle is responsible for causing hiccups?",
  //     options: [
  //       { value: "A", label: "Heart" },
  //       { value: "B", label: "Diaphragm" },
  //       { value: "C", label: "Stomach" },
  //       { value: "D", label: "Lungs" }
  //     ],
  //     otherTimeStamp: 80,
  //     someTriggerCount: 1,
  //     correctAnswer: "B"
  //   },
  //   {
  //     id: "question3",
  //     type: "multipleChoice",
  //     title: "Which of the following is NOT a common cause of hiccups?",
  //     options: [
  //       { value: "A", label: "Eating too quickly" },
  //       { value: "B", label: "Drinking carbonated beverages" },
  //       { value: "C", label: "Holding your breath" },
  //       { value: "D", label: "Sudden excitement" }
  //     ],
  //     otherTimeStamp: 90,
  //     someTriggerCount: 2,
  //     correctAnswer: "D"
  //   },
  //   {
  //     id: "question4",
  //     type: "multipleChoice",
  //     title: 'Why do hiccups make a "hic" sound?',
  //     options: [
  //       { value: "A", label: "Air quickly rushes into the lungs" },
  //       { value: "B", label: "The vocal cords suddenly close" },
  //       { value: "C", label: "The stomach contracts" },
  //       { value: "D", label: "The heart skips a beat" }
  //     ],
  //     otherTimeStamp: 118,
  //     someTriggerCount: 3,
  //     correctAnswer: "A"
  //   },
  //   {
  //     id: "end",
  //     type: "end",
  //     title: "Here's How You Did!",
  //     otherTimeStamp: 170,
  //     someTriggerCount: 4,
  //     correctAnswer: ""
  //   }
  // ], []);

  // // this works
  // const questionsData = React.useMemo(() => {
  //   return questions.map(q => ({
  //     id: `question${q.id}`,               // **Changes here!** Use new numeric id (prefixed with "question")
  //     type: q.type,
  //     title: q.title,
  //     otherTimeStamp: q.timestamp,         // **Changes here!** Map "timestamp" to "otherTimeStamp"
  //     someTriggerCount: q.trigger_count,     // **Changes here!** Map "trigger_count" to "someTriggerCount"
  //     correctAnswer: q.correct_answer,       // **Changes here!** Map "correct_answer" to "correctAnswer"
  //     ...(q.type === "multipleChoice" && {   // **Changes here!** Attach options if the question is multipleChoice
  //       options: questionOptions.filter(opt => opt.question_id === q.id)
  //     })
  //   }));
  // }, []);

  const questionsData = React.useMemo(() => {
    return apiData.map(q => ({
      id: `question${q.id}`,
      type: q.type,
      title: q.title,
      otherTimeStamp: q.timestamp,
      someTriggerCount: q.trigger_count,
      correctAnswer: q.correct_answer,
      ...(q.type === "multipleChoice" && {
        options: apiOptions.filter(opt => opt.question_id === q.id)
      })
    }));
  }, [apiData, apiOptions]);


  // Fetch data from Supabase on mount
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*');
      if (error) {
        console.error('Error fetching data:', error);
      } else {
        setApiData(data);
      }
    };
    fetchData();
  }, []);



  // //

  // React.useEffect(() => {
  //   setTimeout(() => setCounter(counter + 1), 1000);
  // }, [counter]);

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
        // console.log("something", triggerCount);
        console.log("currentQuestion", currentQuestion);
        console.log("sometime", someTime);
        // console.log("sometime", someTime);
        console.log("currentQuestion.someTriggerCount", currentQuestion.someTriggerCount);
        console.log("currentQuestion.otherTimeStamp", currentQuestion.otherTimeStamp);
        if (currentQuestion) {
          // if (someTime >= currentQuestion.otherTimeStamp && triggerCount === currentQuestion.someTriggerCount) {
          if (someTime >= currentQuestion.otherTimeStamp ) {
            setTriggerCount(triggerCount + 1);
            setIsPaused(true);
            setIsOpen(true);
            setCounter(0);
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

  const checkMousePosition = (questionId) => {
    const currentData = questionsData.find(item => item.id === questionId);
    if (someMousePosition.x >= 1020 && someMousePosition.x <= 1120 && someMousePosition.y >= 480 && someMousePosition.y <= 580) {
      alert(`thats right!`);
      setRetry(0);
      togglePandOtogether(); 
    } else {

      if (videoRef.current < 30) {
        alert(`try again!`);
        videoRef.current.seekTo(0, true);
        // setTriggerCount(triggerCount-1)
        // togglePandOtogether();
      }
      else{
        alert(`try again!`);
        videoRef.current.seekTo((currentTime-30), true);
        // setTriggerCount(triggerCount-1)
        // togglePandOtogether();
      }
      setRetry(prev => prev + 1);
      setTriggerCount(triggerCount-1)
      togglePandOtogether();
      //alert(`a Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`);
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
      // setRetry(prev => prev + 1);
      if (videoRef.current < 30) {
        alert(`try again!`);
        videoRef.current.seekTo(0, true);
        // setTriggerCount(triggerCount-1)
        // togglePandOtogether();
      }
      else{
        alert(`try again!`);
        videoRef.current.seekTo((currentTime-30), true);
        // setTriggerCount(triggerCount-1)
        // togglePandOtogether();
      }
      setRetry(prev => prev + 1);
      setTriggerCount(triggerCount-1)
      togglePandOtogether();
    }
  };


  //Simple text to speech function that works with pre-set questions. Will need to be scaled.
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech synthesis not supported");
    }
  };

  // Speak the question only when overlayType updates
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

  // question data that is going to be refactored later for a database API call that fetches the data

  const renderOverlayContent = () => {
    const currentQuestion = questionsData.find(q => q.id === overlayType);
    if (!currentQuestion) return null;

    let onSubmit = null;
    let extraProps = {};

    // Speech synthesis function
    const speakText = (text) => {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    };

    console.log("currentQuestion.id", currentQuestion.id);

    switch (currentQuestion.type) {
      case "image":
        extraProps.src = questionImage;
        extraProps.onClick = checkMousePosition;
        break;
      case "multipleChoice":
        // remove this when sure we can
        onSubmit = videoReplayOnWrongAnswer;
        break;
      case "end":
        onSubmit = togglePandOtogether;
        break;
      default:
        break;
    }

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
              <br/>
              <button className="button" onClick={() => videoReplayOnWrongAnswer(currentQuestion.id)}>
                Submit
              </button>
              <br/>
              <br/>
              <button
                  onClick={() => {
                    let textToSpeak = currentQuestion.title + " " +
                        currentQuestion.options.map(opt => opt.label).join(", ");
                    speakText(textToSpeak);
                  }}
              >
                🔊 Replay
              </button>
            </div>
        );
        //<button onClick={() => speakText(currentQuestion.title)}>🔊 Replay</button>
      case "end":
        return (
          <div>
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
                            <div>Time Taken: {answers[q.id]?.timeTaken || "0"}</div>
                            <div>Number of Retries: {answers[q.id]?.numRetry || "0"}</div>
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
              
            </div>
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
          videoId={someVideoEmbed} // we can add a variable here later when re-using this page
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
      <h3 onClick={() => alert("Test container clicked!")}>test container</h3>
      <h3>Countdown: {counter}</h3>
      <h3>Retry: {retry}</h3> 

      <h3>API info: {apiData.length > 0 ? apiData[0].title : "Loading..."}</h3>
      <h3>Test 1: {test2 ? test2.title : "No question data"}</h3>
      <h3>Test 2: {test2 ? test2.id : "No question data"}</h3>
      <h3>triggerCount {test2 ? triggerCount : "No question data"}</h3>
      <h3>Test 4: {test2 ? test2.type : "No question data"}</h3>
      <h3>timestamp : {test2 ? test2.timestamp : "No question data"}</h3> */}
    </div>
  );
}





