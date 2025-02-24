

// used npm install react-youtube

import React from 'react';
import { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import '../styles/video.css';

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
  const someMousePosition = useMousePosition(); // Call the hook here
  const [currentTime, setCurrentTime] = useState(0); // State for current time
  const videoRef = useRef(null);


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
        setCurrentTime(videoRef.current.getCurrentTime())
        console.log(`Current time: ${videoRef.current.getCurrentTime()}s`);

        const playerState = videoRef.current.getPlayerState();
        console.log(playerState === 1 ? "Video is playing" : "Video is paused");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const _onReady = (event) => {
    videoRef.current = event.target;
  };

  return (
    <div>
      <div className="yvid">
        <YouTube 
          videoId={"DR-cfDsHCGA"} // we can add a variable here later when re-using this page
          opts={{
            height: "390",
            width: "640",
            playerVars: {autoplay: 1,},}} 
          onReady={_onReady} 
        />
      </div>
      <button onClick={togglePause}>{isPaused ? "Play" : "Pause"}</button>
      <h2>Mouse Position: {JSON.stringify(someMousePosition)}</h2>
      <h2>Current Time: {currentTime.toFixed(2)}</h2>
      
    </div>
  );
}

