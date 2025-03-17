

// used npm install react-youtube
import React, { useState, useEffect, useRef, useCallback } from 'react';
// import React from 'react';
// changing some stuff
import { Link } from 'react-router-dom';
// import { Link, useNavigate } from 'react-router-dom';

// import { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import logo from '../images/Mob_Iron_Hog.png'; 
import '../styles/video.css';
import {Overlay} from './Overlay'
import "../styles/overlay.css";



// got this code from https://www.joshwcomeau.com/snippets/react-hooks/use-mouse-position/
const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: null, y: null });

  useEffect(() => {
    const updateMousePosition = (ev) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };

    window.addEventListener("mousemove", updateMousePosition);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
    };
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
  const [overlayContent, setOverlayContent] = useState(null);

  // used this for reference for the overlay: https://www.youtube.com/watch?v=D9OJX6sSyYk  and https://github.com/unhingedmagikarp/medium-overlay.git 
  const [isOpen, setIsOpen] = useState(false);

  // const toggleOverlay = () => {
  //   setIsOpen(!isOpen);
  // };
  const toggleOverlay = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  


  const togglePause = () => {
    setIsPaused((prev) => !prev);
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
        console.log(`Current time: ${someTime}s`);
  
        if (someTime >= 10.00 && someTime <= 11.00) { 
          // alert(`Triggered at time: ${someTime}`)
          setIsPaused(true)
          setIsOpen(true)
          setOverlayContent(
            <div>
              <h3>This is a test of changing the content of the overlay</h3>
              <img onClick={() => alert(`Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`)} src={logo} alt="Piggyback Learning Logo" />
            </div>
          )
        }
        if (someTime >= 30.00 && someTime <= 31.00) { 
          // alert(`Triggered at time: ${someTime}`)
          setIsPaused(true)
          setIsOpen(true)
          setOverlayContent(
            <h1 onClick={() => alert(`Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`)}>
              <h2>Mouse Position: {JSON.stringify(someMousePosition)}</h2>
              <h2>Current Time: {currentTime.toFixed(2)}</h2>
              {/* <h2 onClick={() => alert(`Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`)}>test container</h2> */}
            </h1>
          )
        }
        if (someTime >= 40.00 && someTime <= 41.00) { 
          // alert(`Triggered at time: ${someTime}`)
          setIsPaused(true)
          setIsOpen(true)
          setOverlayContent(
            <h1 onClick={() => alert(`Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`)}>
              <h2>Mouse Position: {JSON.stringify(someMousePosition)}</h2>
              <h2>Current Time: {currentTime.toFixed(2)}</h2>
              {/* <h2 onClick={() => alert(`Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`)}>test container</h2> */}
            </h1>
          )
        }
        if (someTime >= 50.00 && someTime <= 51.00) {
          // alert(`Triggered at time: ${someTime}`)
          setIsPaused(true)
          setIsOpen(true)
          setOverlayContent(
            <h1 onClick={() => alert(`Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`)}>
              <h2>Mouse Position: {JSON.stringify(someMousePosition)}</h2>
              <h2>Current Time: {currentTime.toFixed(2)}</h2>
              {/* <h2 onClick={() => alert(`Mouse Position: X=${someMousePosition.x}, Y=${someMousePosition.y}`)}>test container</h2> */}
            </h1>
          )
        }
        
        

        const playerState = videoRef.current.getPlayerState();
        console.log(playerState === 1 ? "Video is playing" : "Video is paused");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [toggleOverlay, someMousePosition]);

  const _onReady = (event) => {
    videoRef.current = event.target;
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
            height: "390",
            width: "640",
            playerVars: {autoplay: 1,},}} 
          onReady={_onReady} 
        />
      </div>
      <div className="bogos">
        <button className ="abc"onClick={togglePause}>{isPaused ? "Play" : "Pause"}</button>
        <br></br>
        <button onClick={toggleOverlay}>Open Overlay</button>
      </div>      
      <div className="overlay">
        <button className="overlay__close" onClick={toggleOverlay}>Open Overlay</button> 
          <Overlay isOpen={isOpen} onClose={toggleOverlay}>
            <div>{overlayContent}</div>
          </Overlay>
      </div>
      {/* <h2>Mouse Position: {JSON.stringify(someMousePosition)}</h2>
      <h2>Current Time: {currentTime.toFixed(2)}</h2>
      <h3 onClick={() => alert("Test container clicked!")}>test container</h3> */}  
    </div>
  );
}

