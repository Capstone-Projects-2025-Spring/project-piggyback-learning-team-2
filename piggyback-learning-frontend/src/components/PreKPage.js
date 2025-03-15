import React, { useState } from 'react';
import YouTube from 'react-youtube';
import VideoQuestionUI from './VideoQuestionUI'; // Import the video question UI component

const PreKPage = () => {
  const [videoPlaying, setVideoPlaying] = useState(false);

  const _onReady = (event) => {
    event.target.playVideo();
  };

  const _onStateChange = (event) => {
    if (event.data === YouTube.PlayerState.PLAYING) {
      setVideoPlaying(true); // When video starts playing
    } else {
      setVideoPlaying(false); // When video is paused or stopped
    }
  };

  return (
    <div>
      <header>
        <h1>Piggyback Learning: Pre-K</h1>
      </header>

      <main>
        <section className="video-player">
          <YouTube
            videoId="DR-cfDsHCGA" // Example video ID for Pre-K
            opts={{
              height: '390',
              width: '640',
              playerVars: { autoplay: 1 },
            }}
            onReady={_onReady}
            onStateChange={_onStateChange}
          />
        </section>

        {/* Display question UI when the video is playing */}
        {videoPlaying && <VideoQuestionUI />}
      </main>

      <footer>
        <p>&copy; 2025 Piggyback Learning. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default PreKPage;
