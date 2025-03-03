import React, { useState, useEffect } from 'react';

const VideoPlayer = () => {
  const [videoPlaying, setVideoPlaying] = useState(false);

  useEffect(() => {
    // Initialize the YouTube player
    const player = new window.YT.Player('youtube-player', {
      videoId: 'DR-cfDsHCGA', // Sample video ID
      events: {
        onStateChange: handleVideoStateChange
      }
    });

    function handleVideoStateChange(event) {
      if (event.data === window.YT.PlayerState.PLAYING) {
        setVideoPlaying(true);
      } else {
        setVideoPlaying(false);
      }
    }
  }, []);

  return (
    <div>
      <div id="youtube-player"></div>
      {videoPlaying && <VideoQuestionUI />}
    </div>
  );
};

const VideoQuestionUI = () => {
  return (
    <div className="video-question-ui">
      <h3>What is this shape?</h3>
      <button>Option A</button>
      <button>Option B</button>
      <button>Option C</button>
    </div>
  );
};

export default VideoPlayer;
