import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../images/Mob_Iron_Hog.png';
import '../styles/page.css';
import { supabase } from './supabaseClient';

function Home() {
  const [selectedGrade, setSelectedGrade] = useState("");
  const navigate = useNavigate();
  const videoCardsRef = useRef(null);
  const [responseData, setResponseData] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState([
    { src: "https://www.youtube.com/embed/9e5lcQycf2M", title: "Why Do We Get Hiccups? | Body Science for Kids", thumbnail: "" },
    { src: "https://www.youtube.com/embed/al-do-HGuIk", title: "Water Cycle | How the Hydrologic Cycle Works", thumbnail: "" },
    { src: "https://www.youtube.com/embed/fEiVi9TB_RQ", title: "What Causes Thunder and Lightning? | Weather Science | SciShow Kids", thumbnail: "" },
    { src: "https://www.youtube.com/embed/Gg0TXNXgz-w", title: "How Do Airplanes Fly?", thumbnail: "" },
    { src: "https://www.youtube.com/embed/X3uT89xoKuc", title: "Antarctica | Destination World", thumbnail: "" },
  ]);

  useEffect(() => {
    const fetchThumbnails = async () => {
      const updatedVideos = await Promise.all(
          youtubeUrls.map(async (video) => {
            const videoId = getYouTubeVideoId(video.src);
            const thumbnailUrl = await getThumbnailUrl(videoId);
            return { ...video, thumbnail: thumbnailUrl };
          })
      );
      setYoutubeUrls(updatedVideos);
    };

    fetchThumbnails();
  }, []);

  const getYouTubeVideoId = (url) => {
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    const embedMatch = url.match(/\/embed\/([^?&]+)/);
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);

    if (watchMatch) return watchMatch[1];
    if (embedMatch) return embedMatch[1];
    if (shortMatch) return shortMatch[1];

    return null;
  };

  const getThumbnailUrl = async (videoId) => {
    if (!videoId) return '';

    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error("YOUTUBE_API_KEY is not defined in your environment variables.");
      return '';
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].snippet.thumbnails.medium.url;
      }
    } catch (error) {
      console.error('Error fetching thumbnail:', error);
    }
    return '';
  };

  const handleVideoClick = (videoUrl, videoTitle) => {
    navigate(`/watch?video=${encodeURIComponent(videoUrl)}&title=${encodeURIComponent(videoTitle)}`);
  };

  const getYTTitle = async (videoUrl) => {
    const videoId = getYouTubeVideoId(videoUrl);
    if (!videoId) return '';

    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error("YOUTUBE_API_KEY is not defined in your environment variables.");
      return '';
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].snippet.title;
      } else {
        console.warn('No video data found for ID:', videoId);
      }
    } catch (error) {
      console.error('Error fetching video title:', error);
    }

    return '';
  };

  /*
  async function handleYoutubeVideo() {
    const urlInput = document.getElementById("youtubeUrl");
    const urlValue = urlInput.value.trim();
    setResponseData("Processing video...");

    if (!urlValue) {
      setResponseData("Please enter a YouTube URL");
      return;
    }

    const videoId = getYouTubeVideoId(urlValue);
    if (!videoId) {
      setResponseData("Could not extract video ID from the URL.");
      return;
    }

    // Get video title for navigation
    const videoTitle = await getYTTitle(`https://www.youtube.com/watch?v=${videoId}`) || "Untitled Video";
    const videoUrl = `https://www.youtube.com/embed/${videoId}`;

    // Navigate to watch page, and process there
    navigate(`/watch?video=${encodeURIComponent(videoUrl)}&title=${encodeURIComponent(videoTitle)}&processing=true`);

    // First check if video exists in database
    try {
      const { data: videoData, error } = await supabase
          .from('videos')
          .select('*')
          .eq('embed', videoId);

      if (error) {
        console.error('Error searching for video:', error);
        setResponseData("Error: " + error.message);
        return;
      }

      // If video exists in database, navigate to it
      if (videoData && videoData.length > 0 && videoData[0]?.title) {
        setResponseData(`Found video in database: ${videoData[0].title}`);
        const videoUrl = `https://www.youtube.com/embed/${videoId}`;
        const videoTitle = videoData[0].title;
        handleVideoClick(videoUrl, videoTitle);
        return;
      }

      // If video doesn't exist, process it through backend
      setResponseData("Video not found in database. Processing new video...");
      await processNewVideo(urlValue, videoId);

    } catch (error) {
      setResponseData(`Error: ${error.message}`);
      console.error("Processing error:", error);
    }
  }
  */
  async function handleYoutubeVideo() {
    const urlInput = document.getElementById("youtubeUrl");
    const urlValue = urlInput.value.trim();

    if (!urlValue) {
      setResponseData("Please enter a YouTube URL");
      return;
    }

    const videoId = getYouTubeVideoId(urlValue);
    if (!videoId) {
      setResponseData("Could not extract video ID from the URL.");
      return;
    }

    // Get basic video info for immediate navigation
    const videoTitle = await getYTTitle(`https://www.youtube.com/watch?v=${videoId}`) || "Untitled Video";
    const videoUrl = `https://www.youtube.com/embed/${videoId}`;

    // Navigate immediately with processing flag
    navigate(`/watch?video=${encodeURIComponent(videoUrl)}&title=${encodeURIComponent(videoTitle)}&processing=true`);
  }

  async function processNewVideo(urlValue, videoId) {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

      setResponseData(prev => prev + "\n[1] Connecting to backend at: " + backendUrl);
      console.log("[DEBUG] Connecting to backend at:", backendUrl);

      // 1. Check backend health
      const healthResponse = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!healthResponse.ok) {
        const msg = `[ERROR] Backend health check failed: ${healthResponse.status}`;
        setResponseData(prev => prev + "\n" + msg);
        console.error(msg);
        throw new Error(msg);
      }

      // 2. Start processing
      const processResponse = await fetch(`${backendUrl}/api/v1/video/process/${videoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: urlValue })
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        const msg = `[ERROR] Processing failed: ${errorData.detail || processResponse.status}`;
        setResponseData(prev => prev + "\n" + msg);
        console.error(msg, errorData);
        throw new Error(msg);
      }

      // 3. Poll for results
      setResponseData(prev => prev + "\n[4] Processing started, waiting for results...");
      let attempts = 0;
      const maxAttempts = 12;

      const checkResults = async () => {
        attempts++;
        setResponseData(`Processing video (attempt ${attempts}/${maxAttempts})...`);

        const resultsResponse = await fetch(`${backendUrl}/api/v1/video/results/${videoId}`);
        const resultsData = await resultsResponse.json();

        if (resultsData.status === 'complete') {
          if (resultsData.questions && resultsData.questions.trim().length > 0) {
            setResponseData(resultsData.questions);

            // Add the video to the database now that it's processed
            try {
              const { error } = await supabase.from('videos').upsert(
                  {
                    embed: videoId,
                    title: resultsData.title || "Processed Video",
                    questions: resultsData.questions,
                    processed_at: new Date().toISOString()
                  },
                  { onConflict: 'embed' }
              );

              if (!error) {
                console.log("Video added to database successfully");
                const videoUrl = `https://www.youtube.com/embed/${videoId}`;
                handleVideoClick(videoUrl, resultsData.title || "Processed Video");
              }
            } catch (dbError) {
              console.error("Error adding video to database:", dbError);
            }
          } else {
            throw new Error("Received empty questions");
          }
        }
        else if (resultsData.status === 'error') {
          throw new Error(resultsData.error || "Processing error");
        }
        else if (attempts >= maxAttempts) {
          throw new Error("Processing timed out");
        }
        else {
          setTimeout(checkResults, 5000);
        }
      };

      checkResults();

    } catch (error) {
      let errorMessage = error.message;
      const errorMsg = `[FINAL ERROR] ${error.message}`;
      setResponseData(prev => prev + "\n" + errorMsg);
      console.error(errorMsg, error);

      if (error.message.includes('Failed to fetch')) {
        errorMessage = `Connection failed. Please ensure:
              1. The backend service is running
              2. No firewall is blocking the connection
              3. You're using the correct URL`;
      }

      setResponseData(`Error: ${errorMessage}`);
    }
  }

  const scrollLeft = () => videoCardsRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollRight = () => videoCardsRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  const navLinks = [
    { label: "Sign In", path: "/signin" },
    { label: "Profile", path: "/profile" },
  ];

  return (
      <div className="home-container">
        <header className="header-enhanced">
          <div className="logo-container">
            <img src={logo} alt="Piggyback Learning" className="logo-animated" />
            <span className="site-title">Piggyback Learning</span>
          </div>
          <nav>
            <ul>
              {navLinks.map((item, index) => (
                  <li key={index}>
                    <Link to={item.path}>{item.label}</Link>
                  </li>
              ))}
            </ul>
          </nav>
        </header>

        <main>
          <section className="intro-enhanced">
            <h1 className="animated-heading">Welcome to Piggyback Learning!</h1>
            <p className="tagline">Where Learning Meets Fun & Adventure!</p>
            <Link to="/signup" className="cta-button pulse">Start Your Journey Free</Link>
          </section>

          <section className="youtube-url-enhanced">
            <h2>Add Your Own Learning Video</h2>
            <div className="url-input-container">
              <input type="text" id="youtubeUrl" placeholder="Paste YouTube URL here..." />
            </div>
            <div>
              <button onClick={handleYoutubeVideo} className="submit-btn">Add Video</button>
            </div>
            <section className="processing-results">
              {responseData && (
                  <div className="generated-questions">
                    <h3>Generated Learning Questions:</h3>
                    <div className="questions-list">
                      {responseData.split('\n').map((q, i) => (
                          <p key={i}>{q}</p>
                      ))}
                    </div>
                  </div>
              )}
            </section>
          </section>

          <section className="videos-enhanced">
            <h2>Explore Learning Videos</h2>
            <div className="video-scroll-wrapper">
              <button className="scroll-button left" onClick={scrollLeft}>←</button>
              <div className="video-gallery-container">
                <div className="video-cards-horizontal" ref={videoCardsRef}>
                  {youtubeUrls.map((video, index) => (
                      <div className="video-card" key={index} onClick={() => handleVideoClick(video.src, video.title)}>
                        <img
                            src={video.thumbnail || `${process.env.PUBLIC_URL}/logo192.png`}
                            alt={video.title}
                            className="video-thumbnail"
                        />
                        <div className="video-info">
                          <p>{video.title}</p>
                          <span className="play-icon">▶</span>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
              <button className="scroll-button right" onClick={scrollRight}>→</button>
            </div>
          </section>
        </main>

        <footer className="footer-enhanced">
          <p>Join the Piggyback Learning Adventure Today!</p>
        </footer>
      </div>
  );
}

export default Home;