

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

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.getCurrentTime() > 0) {
        const someTime = videoRef.current.getCurrentTime();
        setCurrentTime(someTime);
        if (someTime >= 10.00 && triggerCount === 0) { 
          setTriggerCount(1);
          setIsPaused(true);
          setIsOpen(true);
          setOverlayType("question1");
        }
        if (someTime >= 30.00 && triggerCount === 1) { 
          setTriggerCount(2);
          setIsPaused(true);
          setIsOpen(true);
          setOverlayType("question2");
        }
        if (someTime >= 40.00 && triggerCount === 2) { 
          setTriggerCount(3);
          setIsPaused(true);
          setIsOpen(true);
          setOverlayType("question3");
        }
        if (someTime >= 50.00 && triggerCount === 3) {
          setTriggerCount(4);
          setIsPaused(true);
          setIsOpen(true);
          setOverlayType("question4");
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [triggerCount, currentTime]);

  const _onReady = (event) => {
    videoRef.current = event.target;
  };


  // uses Copying objects with the spread syntax from https://react.dev/learn/updating-objects-in-state with help from overlord gpt
  const userAnswer = (questionKey) => {
    const selectedOption = document.querySelector(`input[name="${questionKey}"]:checked`);
    if (selectedOption) {
      setAnswers(prev => ({ ...prev, [questionKey]: selectedOption.value }));
      console.log(`Answer for ${questionKey}:`, selectedOption.value); // Debugging log
    } else {
      console.log(`No answer selected for ${questionKey}`);
    }
    togglePandOtogether(); 
  };

// used this source from chatgpt https://dev.to/remejuan/dynamically-render-components-based-on-configuration-3l42 (reasoning sucks but search is better than google at finding code that works)
// uses this way of updating the rendered overlay content because it creates a stale closure otherwise, incidentally this'll probably make it easier to coonect with any back end components 
  const renderOverlayContent = () => {
      switch(overlayType) {
        case "question1":
          return (
            <div className='overlayImage'>
              <h1>Click on Squeeks!</h1>
              <img
                onClick={() => alert(`Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`)}
                src={questionImage}
                alt="place holder question img"
                className="questionImage" 
              />
            </div>
          );
        case "question2":
          return (
            <div className='overlayImage'>
              <h1>What muscle is responsible for causing hiccups?</h1>
              <br />
              <input type="radio" name="question" value="A" id="a" />
              <label htmlFor="a">Heart</label>
              <br />
              <input type="radio" name="question" value="B" id="b" />
              <label htmlFor="b">Diaphragm</label>
              <br />
              <input type="radio" name="question" value="C" id="c" />
              <label htmlFor="c">Stomach</label>
              <br />
              <input type="radio" name="question" value="D" id="d" />
              <label htmlFor="d">Lungs</label>
              <br />
              <button className="button" onClick={() =>userAnswer("question2")}>Submit</button> 
            </div>
          );
        case "question3":
          return (
            <div className='overlayImage'>
              <h1>Which of the following is NOT a common cause of hiccups?</h1>
              <br />
              <input type="radio" name="question" value="A" id="a" />
              <label htmlFor="a">Eating too quickly</label>
              <br />
              <input type="radio" name="question" value="B" id="b" />
              <label htmlFor="b">Drinking carbonated beverages</label>
              <br />
              <input type="radio" name="question" value="C" id="c" />
              <label htmlFor="c">Holding your breath</label>
              <br />
              <input type="radio" name="question" value="D" id="d" />
              <label htmlFor="d">Sudden excitement</label>
              <br />
              <button className="button" onClick={() =>userAnswer("question3")}>Submit</button> 

            </div>
          );
        case "question4":
          return (
            <div className='overlayImage'>
              <h1>Why do hiccups make a "hic" sound?</h1>
              <br />
              <input type="radio" name="question" value="A" id="a" />
              <label htmlFor="a">Air quickly rushes into the lungs</label>
              <br />
              <input type="radio" name="question" value="B" id="b" />
              <label htmlFor="b">The vocal cords suddenly close</label>
              <br />
              <input type="radio" name="question" value="C" id="c" />
              <label htmlFor="c">The stomach contracts</label>
              <br />
              <input type="radio" name="question" value="D" id="d" />
              <label htmlFor="d">The heart skips a beat</label>
              <br />
              <button className="button" onClick={() =>userAnswer("question4")}>Submit</button> 
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
        <button className="overlay__close" onClick={() =>togglePandOtogether}>Open Overlay</button> 
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

