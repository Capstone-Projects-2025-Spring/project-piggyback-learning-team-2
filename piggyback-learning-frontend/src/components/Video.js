

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

  const [answers, setAnswers] = useState({}); // Store answers for questions

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

  const timeStampData = [{id:"question1",otherTimeStamp: 30, someTriggerCount:0},{id:"question2",otherTimeStamp: 80, someTriggerCount:0}, {id:"question3",otherTimeStamp: 90, someTriggerCount:0}, {id:"question4",otherTimeStamp: 118, someTriggerCount:0}, {id:"end",otherTimeStamp: 170, someTriggerCount:0}]
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.getCurrentTime() > 0) {
        const someTime = videoRef.current.getCurrentTime();
        setCurrentTime(someTime);
        if (someTime >= 20.00 && triggerCount === 0) { 
          setTriggerCount(triggerCount+1);
          setIsPaused(true);
          setIsOpen(true);
          setOverlayType("question1");
        }
        if (someTime >= 80.00 && triggerCount === 1) { 
          setTriggerCount(triggerCount+1);
          setIsPaused(true);
          setIsOpen(true);
          setOverlayType("question2");
        }
        if (someTime >= 90.00 && triggerCount === 2) { 
          setTriggerCount(triggerCount+1);
          setIsPaused(true);
          setIsOpen(true);
          setOverlayType("question3");
        }
        if (someTime >= 118.00 && triggerCount === 3) {
          setTriggerCount(triggerCount+1);
          setIsPaused(true);
          setIsOpen(true);
          setOverlayType("question4");
        }
        if (someTime >= 170.00 && triggerCount === 4) {
          setTriggerCount(triggerCount+1);
          setIsPaused(true);
          setIsOpen(true);
          setOverlayType("end");
        }
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
  const videoReplayOnWrongAnswer = () => {
    if (answers["question2"] === "C") {
      alert(`thats right!`);
      togglePandOtogether();
     
    } else {
      // rewind timestamp by 30 seconds
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


// used this source from chatgpt https://dev.to/remejuan/dynamically-render-components-based-on-configuration-3l42 (reasoning sucks but search is better than google at finding code that works)
// uses this way of updating the rendered overlay content because it creates a stale closure otherwise, incidentally this'll probably make it easier to coonect with any back end components 
  // const renderOverlayContent = () => {
  //     switch(overlayType) {
  //       case "question1":
  //         return (
  //           <div className='overlayImage'>
  //             <h1>Click on Squeeks!</h1>
  //             <img
  //               onClick={checkMousePosition}
  //               src={questionImage}
  //               alt="place holder question img"
  //               className="questionImage" 
  //             />
  //           </div>
  //         );
  //       case "question2":
  //         return (
  //           <div className='overlayImage'>
  //             <h1>What muscle is responsible for causing hiccups?</h1>
  //             <br />
  //             <input type="radio" name="question" value="A" id="a" />
  //             <label htmlFor="a">Heart</label>
  //             <br />
  //             <input type="radio" name="question" value="B" id="b" />
  //             <label htmlFor="b">Diaphragm</label>
  //             <br />
  //             <input type="radio" name="question" value="C" id="c" />
  //             <label htmlFor="c">Stomach</label>
  //             <br />
  //             <input type="radio" name="question" value="D" id="d" />
  //             <label htmlFor="d">Lungs</label>
  //             <br />
  //             <button className="button" onClick={() =>userAnswer("question2")}>Submit</button> 
  //           </div>
  //         );
  //       case "question3":
  //         return (
  //           <div className='overlayImage'>
  //             <h1>Which of the following is NOT a common cause of hiccups?</h1>
  //             <br />
  //             <input type="radio" name="question" value="A" id="a" />
  //             <label htmlFor="a">Eating too quickly</label>
  //             <br />
  //             <input type="radio" name="question" value="B" id="b" />
  //             <label htmlFor="b">Drinking carbonated beverages</label>
  //             <br />
  //             <input type="radio" name="question" value="C" id="c" />
  //             <label htmlFor="c">Holding your breath</label>
  //             <br />
  //             <input type="radio" name="question" value="D" id="d" />
  //             <label htmlFor="d">Sudden excitement</label>
  //             <br />
  //             <button className="button" onClick={() =>userAnswer("question3")}>Submit</button> 

  //           </div>
  //         );
  //       case "question4":
  //         return (
  //           <div className='overlayImage'>
  //             <h1>Why do hiccups make a "hic" sound?</h1>
  //             <br />
  //             <input type="radio" name="question" value="A" id="a" />
  //             <label htmlFor="a">Air quickly rushes into the lungs</label>
  //             <br />
  //             <input type="radio" name="question" value="B" id="b" />
  //             <label htmlFor="b">The vocal cords suddenly close</label>
  //             <br />
  //             <input type="radio" name="question" value="C" id="c" />
  //             <label htmlFor="c">The stomach contracts</label>
  //             <br />
  //             <input type="radio" name="question" value="D" id="d" />
  //             <label htmlFor="d">The heart skips a beat</label>
  //             <br />
  //             <button className="button" onClick={() =>userAnswer("question4")}>Submit</button> 
  //           </div>
  //         );
  //       default:
  //         return null;
  //     }
  // };

  
  // const renderOverlayContent = () => {
  //   switch(overlayType) {
  //     case "question1":
  //       return (
  //         <div className='overlayImage'>
  //           <h1>Click on Squeeks!</h1>
  //           <img
  //             onClick={checkMousePosition}
  //             src={questionImage}
  //             alt="place holder question img"
  //             className="questionImage" 
  //           />
  //         </div>
  //       );
  //     case "question2":
  //       return (
  //         <div className='overlayImage'>
  //           <h1>What muscle is responsible for causing hiccups?</h1>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question2"
  //             value="A"
  //             id="q2a"
  //             checked={answers["question2"] === "A"}
  //             onChange={() => userAnswer("question2", "A")}
  //           />
  //           <label htmlFor="q2a">Heart</label>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question2"
  //             value="B"
  //             id="q2b"
  //             checked={answers["question2"] === "B"}
  //             onChange={() => userAnswer("question2", "B")}
  //           />
  //           <label htmlFor="q2b">Diaphragm</label>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question2"
  //             value="C"
  //             id="q2c"
  //             checked={answers["question2"] === "C"}
  //             onChange={() => userAnswer("question2", "C")}
  //           />
  //           <label htmlFor="q2c">Stomach</label>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question2"
  //             value="D"
  //             id="q2d"
  //             checked={answers["question2"] === "D"}
  //             onChange={() => userAnswer("question2", "D")}
  //           />
  //           <label htmlFor="q2d">Lungs</label>
  //           <br />
  //           <button className="button" onClick={videoReplayOnWrongAnswer}>Submit</button> 
  //         </div>
  //       );
  //     case "question3":
  //       return (
  //         <div className='overlayImage'>
  //           <h1>Which of the following is NOT a common cause of hiccups?</h1>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question3"
  //             value="A"
  //             id="q3a"
  //             checked={answers["question3"] === "A"}
  //             onChange={() => userAnswer("question3", "A")}
  //           />
  //           <label htmlFor="q3a">Eating too quickly</label>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question3"
  //             value="B"
  //             id="q3b"
  //             checked={answers["question3"] === "B"}
  //             onChange={() => userAnswer("question3", "B")}
  //           />
  //           <label htmlFor="q3b">Drinking carbonated beverages</label>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question3"
  //             value="C"
  //             id="q3c"
  //             checked={answers["question3"] === "C"}
  //             onChange={() => userAnswer("question3", "C")}
  //           />
  //           <label htmlFor="q3c">Holding your breath</label>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question3"
  //             value="D"
  //             id="q3d"
  //             checked={answers["question3"] === "D"}
  //             onChange={() => userAnswer("question3", "D")}
  //           />
  //           <label htmlFor="q3d">Sudden excitement</label>
  //           <br />
  //           <button className="button" onClick={togglePandOtogether}>Submit</button> 
  //         </div>
  //       );
  //     case "question4":
  //       return (
  //         <div className='overlayImage'>
  //           <h1>Why do hiccups make a "hic" sound?</h1>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question4"
  //             value="A"
  //             id="q4a"
  //             checked={answers["question4"] === "A"}
  //             onChange={() => userAnswer("question4", "A")}
  //           />
  //           <label htmlFor="q4a">Air quickly rushes into the lungs</label>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question4"
  //             value="B"
  //             id="q4b"
  //             checked={answers["question4"] === "B"}
  //             onChange={() => userAnswer("question4", "B")}
  //           />
  //           <label htmlFor="q4b">The vocal cords suddenly close</label>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question4"
  //             value="C"
  //             id="q4c"
  //             checked={answers["question4"] === "C"}
  //             onChange={() => userAnswer("question4", "C")}
  //           />
  //           <label htmlFor="q4c">The stomach contracts</label>
  //           <br />
  //           <input
  //             type="radio"
  //             name="question4"
  //             value="D"
  //             id="q4d"
  //             checked={answers["question4"] === "D"}
  //             onChange={() => userAnswer("question4", "D")}
  //           />
  //           <label htmlFor="q4d">The heart skips a beat</label>
  //           <br />
  //           <button className="button" onClick={togglePandOtogether}>Submit</button> 
  //         </div>
  //       );
  //       case "end":
  //       return (
  //         <div className="overlayImage">
  //           <h2>Stored Answers</h2>
  //           <pre>{JSON.stringify(answers, null, 2)}</pre>
  //           <button className="button" onClick={togglePandOtogether}>OK!</button> 
  //         </div>
  //       );
  //     default:
  //       return null;
  //   }
  // };

  // used https://react.dev/learn/rendering-lists gotten from chatgpt (search function saved me again)
  const questionsData = [
    {
      id: "question1",
      type: "image",
      title: "Click on Squeeks!",
      src: questionImage,
      onClick: checkMousePosition
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
      onSubmit: videoReplayOnWrongAnswer
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
      onSubmit: togglePandOtogether
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
      onSubmit: togglePandOtogether
    },
    {
      id: "end",
      type: "end",
      title: "Stored Answers",
      onSubmit: togglePandOtogether
    }
  ];

  // Refactored render function that uses the questionsData array
  const renderOverlayContent = () => {
    const currentQuestion = questionsData.find(q => q.id === overlayType);
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case "image":
        return (
          <div className="overlayImage">
            <h1>{currentQuestion.title}</h1>
            <img
              src={currentQuestion.src}
              alt="question"
              className="questionImage"
              onClick={currentQuestion.onClick}
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
            <button className="button" onClick={currentQuestion.onSubmit}>
              Submit
            </button>
          </div>
        );
      case "end":
        return (
          <div className="overlayImage">
            <h2>{currentQuestion.title}</h2>
            <pre>{JSON.stringify(answers, null, 2)}</pre>
            <button className="button" onClick={currentQuestion.onSubmit}>
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





// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { Link } from 'react-router-dom';
// import YouTube from "react-youtube";
// import logo from '../images/Mob_Iron_Hog.png'; 
// import questionImage from '../images/placeholderquestionImage.png'; 
// import '../styles/video.css';
// import {Overlay} from './Overlay'
// import "../styles/overlay.css";


// const useMousePosition = () => {
//   const [mousePosition, setMousePosition] = useState({ x: null, y: null });

//   useEffect(() => {
//     const updateMousePosition = (ev) => {
//       setMousePosition({ x: ev.clientX, y: ev.clientY });
//     };

//     window.addEventListener("mousemove", updateMousePosition);
//     return () => window.removeEventListener("mousemove", updateMousePosition);
//   }, []);

//   return mousePosition;
// };

// // refactored https://codesandbox.io/p/sandbox/react-youtube-play-pause-video-using-an-external-button-c77o1v?file=%2Fsrc%2FApp.tsx%3A19%2C18 for the mouse cursor position code
// // but removed the typescript annotations using online resources as an aid

// export default function App() {
//   const [isPaused, setIsPaused] = useState(false);
//   const someMousePosition = useMousePosition(); 
//   const [currentTime, setCurrentTime] = useState(0); 
//   const videoRef = useRef(null);
//   const [triggerCount, setTriggerCount] = useState(0);

//   // used this for reference for the overlay: https://www.youtube.com/watch?v=D9OJX6sSyYk  and https://github.com/unhingedmagikarp/medium-overlay.git 
//   const [isOpen, setIsOpen] = useState(false);
//   const [overlayType, setOverlayType] = useState(null);

//   const [answers, setAnswers] = useState({}); // Store answers for questions

//   const toggleOverlay = useCallback(() => {
//     setIsOpen(prev => !prev);
//   }, []);
  


//   const togglePause = () => {
//     setIsPaused((prev) => !prev);
//   };

//   const togglePandOtogether = () => {
//     toggleOverlay();
//     togglePause();
//     // setIsPaused(true)
//     // setIsOpen(true)
//   };
  
  
//   useEffect(() => {
//     if (videoRef.current) {
//       const elapsed_seconds = videoRef.current.getCurrentTime();
//       console.log(`Current time: ${elapsed_seconds}s`);

//       if (isPaused) {
//         videoRef.current.pauseVideo();
//       } else {
//         videoRef.current.playVideo();
//       }
//     }
//   }, [isPaused]);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       if (videoRef.current && videoRef.current.getCurrentTime() > 0) {
//         const someTime = videoRef.current.getCurrentTime();
//         setCurrentTime(someTime);
//         if (someTime >= 20.00 && triggerCount === 0) { 
//           setTriggerCount(1);
//           setIsPaused(true);
//           setIsOpen(true);
//           setOverlayType("question1");
//         }
//         if (someTime >= 80.00 && triggerCount === 1) { 
//           setTriggerCount(2);
//           setIsPaused(true);
//           setIsOpen(true);
//           setOverlayType("question2");
//         }
//         if (someTime >= 90.00 && triggerCount === 2) { 
//           setTriggerCount(3);
//           setIsPaused(true);
//           setIsOpen(true);
//           setOverlayType("question3");
//         }
//         if (someTime >= 118.00 && triggerCount === 3) {
//           setTriggerCount(4);
//           setIsPaused(true);
//           setIsOpen(true);
//           setOverlayType("question4");
//         }
//       }
//     }, 100);
//     return () => clearInterval(interval);
//   }, [triggerCount, currentTime]);

//   const _onReady = (event) => {
//     videoRef.current = event.target;
//   };


//   // uses Copying objects with the spread syntax from https://react.dev/learn/updating-objects-in-state with help from overlord gpt
//   // const userAnswer = (questionKey) => {
//   //   const selectedOption = document.querySelector(`input[name="${questionKey}"]:checked`);
//   //   if (selectedOption) {
//   //     setAnswers(prev => ({ ...prev, [questionKey]: selectedOption.value }));
//   //     console.log(`Answer for ${questionKey}:`, selectedOption.value); // Debugging log
//   //   } else {
//   //     console.log(`No answer selected for ${questionKey}`);
//   //   }
//   //   togglePandOtogether(); 
//   // };


//   const userAnswer = (questionId, selectedAnswer) => {
//     setAnswers(prevAnswers => ({
//       ...prevAnswers,
//       [questionId]: selectedAnswer
//     }));
//   };

//   const checkMousePosition = () => {
//     // x >1020 && x<1120 and y>600 && y<695
//     if (someMousePosition.x >= 1020 && someMousePosition.x <= 1120 && someMousePosition.y >= 600 && someMousePosition.y <= 695) {
//       alert(`thats right!`);
//       togglePandOtogether(); 
//     } else {
//       alert(`try again!`);
//       // alert(`a Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`);
//     }
//   };


// // used this source from chatgpt https://dev.to/remejuan/dynamically-render-components-based-on-configuration-3l42 (reasoning sucks but search is better than google at finding code that works)
// // uses this way of updating the rendered overlay content because it creates a stale closure otherwise, incidentally this'll probably make it easier to coonect with any back end components 
//   const renderOverlayContent = () => {
//       switch(overlayType) {
//         case "question1":
//           return (
//             <div className='overlayImage'>
//               <h1>Click on Squeeks!</h1>
//               <img
//                 onClick={checkMousePosition}
//                 src={questionImage}
//                 alt="place holder question img"
//                 className="questionImage" 
//               />
//             </div>
//           );
//         case "question2":
//           return (
//             <div className='overlayImage'>
//               <h1>What muscle is responsible for causing hiccups?</h1>
//               <br />
//               <input type="radio" name="question" value="A" id="a" />
//               <label htmlFor="a">Heart</label>
//               <br />
//               <input type="radio" name="question" value="B" id="b" />
//               <label htmlFor="b">Diaphragm</label>
//               <br />
//               <input type="radio" name="question" value="C" id="c" />
//               <label htmlFor="c">Stomach</label>
//               <br />
//               <input type="radio" name="question" value="D" id="d" />
//               <label htmlFor="d">Lungs</label>
//               <br />
//               <button className="button" onClick={() =>userAnswer("question2")}>Submit</button> 
//             </div>
//           );
//         case "question3":
//           return (
//             <div className='overlayImage'>
//               <h1>Which of the following is NOT a common cause of hiccups?</h1>
//               <br />
//               <input type="radio" name="question" value="A" id="a" />
//               <label htmlFor="a">Eating too quickly</label>
//               <br />
//               <input type="radio" name="question" value="B" id="b" />
//               <label htmlFor="b">Drinking carbonated beverages</label>
//               <br />
//               <input type="radio" name="question" value="C" id="c" />
//               <label htmlFor="c">Holding your breath</label>
//               <br />
//               <input type="radio" name="question" value="D" id="d" />
//               <label htmlFor="d">Sudden excitement</label>
//               <br />
//               <button className="button" onClick={() =>userAnswer("question3")}>Submit</button> 

//             </div>
//           );
//         case "question4":
//           return (
//             <div className='overlayImage'>
//               <h1>Why do hiccups make a "hic" sound?</h1>
//               <br />
//               <input type="radio" name="question" value="A" id="a" />
//               <label htmlFor="a">Air quickly rushes into the lungs</label>
//               <br />
//               <input type="radio" name="question" value="B" id="b" />
//               <label htmlFor="b">The vocal cords suddenly close</label>
//               <br />
//               <input type="radio" name="question" value="C" id="c" />
//               <label htmlFor="c">The stomach contracts</label>
//               <br />
//               <input type="radio" name="question" value="D" id="d" />
//               <label htmlFor="d">The heart skips a beat</label>
//               <br />
//               <button className="button" onClick={() =>userAnswer("question4")}>Submit</button> 
//             </div>
//           );
//         default:
//           return null;
//       }
//   };

//   return (
    
//     <div>
//       <div>
//       <header>
//         <div className="logo">
//           <img src={logo} alt="Piggyback Learning Logo" />
//         </div>
//         <nav>
//           <ul>
//             <li><Link to="/">Home</Link></li>
//             <li><Link to="/how-to-join">How to Join</Link></li>
//             <li><Link to="/signin">Sign In</Link></li>
//             <li><Link to="/video">Video (placeholder)</Link></li>
//             <li><Link to="/store">Store</Link></li>
//             <li><Link to="/ms">ms</Link></li>
//           </ul>
//         </nav>
//       </header>
//     </div>
//       <div className="yvid">
//         <YouTube 
//           videoId={"9e5lcQycf2M"} // we can add a variable here later when re-using this page
//           opts={{
//             height: "480",
//             width: "854",
//             playerVars: {autoplay: 1,},}} 
//           onReady={_onReady} 
//         />
//       </div>
//       <div className="bogos">
//       </div>      
//       <div className="overlay">
//         <button className="overlay__close" onClick={() =>togglePandOtogether}>Open Overlay</button> 
//           <Overlay isOpen={isOpen} onClose={togglePandOtogether}>
//             {renderOverlayContent()}
//           </Overlay>
//       </div>
//       {/* <h2>Mouse Position: {JSON.stringify(someMousePosition)}</h2>
//       <h2>Current Time: {currentTime.toFixed(2)}</h2>
//       <h3 onClick={() => alert("Test container clicked!")}>test container</h3> */}  
//     </div>
//   );
// }

