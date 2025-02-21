// previous code was bad (it would stop the video, not pause)
// basically ripped https://codesandbox.io/p/sandbox/react-youtube-play-pause-video-using-an-external-button-c77o1v?file=%2Fsrc%2FApp.tsx%3A19%2C18
// but removed the typescript annotations (I fought with chatgpt for like 30 min)
// i'm familiar with Effect Hooks but this is more complicated than anything I'd used before


// used npm install react-youtube

import React from 'react';
import { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import '../styles/video.css';


// const useMousePosition = () => {
//   const [
//     mousePosition,
//     setMousePosition
//   ] = React.useState({ x: null, y: null });

//   React.useEffect(() => {
//     const updateMousePosition = ev => {
//       setMousePosition({ x: ev.clientX, y: ev.clientY });
//     };

//     window.addEventListener('mousemove', updateMousePosition);

//     return () => {
//       window.removeEventListener('mousemove', updateMousePosition);
//     };
//   }, []);

//   console.log(mousePosition)
//   return mousePosition;
// };



export default function App() {
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef(null);

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const useMousePosition = () => {
    const [
      mousePosition,
      setMousePosition
    ] = React.useState({ x: null, y: null });
  
    React.useEffect(() => {
      const updateMousePosition = ev => {
        setMousePosition({ x: ev.clientX, y: ev.clientY });
      };
  
      window.addEventListener('mousemove', updateMousePosition);
  
      return () => {
        window.removeEventListener('mousemove', updateMousePosition);
      };
    }, []);
  
    console.log(mousePosition)
    //return mousePosition;
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
      <h2>MousePosition: {useMousePosition}</h2>
    </div>
  );
}

