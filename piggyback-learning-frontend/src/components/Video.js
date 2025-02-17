// previous code was bad (it would stop the video, not pause)
// basically ripped https://codesandbox.io/p/sandbox/react-youtube-play-pause-video-using-an-external-button-c77o1v?file=%2Fsrc%2FApp.tsx%3A19%2C18
// but removed the typescript annotations (I fought with chatgpt for like 30 min)
// i'm familiar with Effect Hooks but this is more complicated than anything I'd used before


// used npm install react-youtube

import { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import logo from '../images/Mob_Iron_Hog.png'; 
import '../styles/video.css';
import { Link } from 'react-router-dom';


export default function App() {
  const [isPaused, setIsPaused] = useState(false);
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
      <header>
        <div className="logo">
          {/*<img src="monsters036.gif" alt="Piggyback Learning Logo" />*/}
          <img src={logo} alt="Piggyback Learning Logo" />
        </div>
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/how-to-join">How to Join</Link></li>
            <li><Link to="/signin">Sign In</Link></li>
            <li><Link to="/video">Video (placeholder)</Link></li>
            <li><Link to="/store">Store</Link></li>
          </ul>
        </nav>
      </header>
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
    </div>
  );
}

