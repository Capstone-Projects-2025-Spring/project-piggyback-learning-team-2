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

  // const getYouTubeVideoId = (url) => {
  //   const regex = /(?:https?:\/\/(?:www\.)?youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  //   const match = url.match(regex);
  //   return match ? match[1] : '';
  // };

  // this is a better/clear-er version of stripping any youtube URLs regex is good and fun, but maybe don't use chatGPT to correct something you just learned in CIS1051
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

  const handleVideoClick = (videoUrl) => {

    const videoId = getYouTubeVideoId(videoUrl);

    navigate('/video', { state: { videoId } });
  };

  async function checkYTVideoInDatabase() {
    const urlValue = document.getElementById("youtubeUrl").value.trim();
    setResponseData("Checking video in the database...");
  
    if (!urlValue) {
      setResponseData("Please enter a YouTube URL");
      return;
    }
  
    const videoId = getYouTubeVideoId(urlValue);
    if (!videoId) {
      setResponseData("Could not extract video ID from the URL.");
      return;
    }
  
    // const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  
    // const { data: videoData, error } = await supabase
    //   .from('videos')
    //   .select('*')
    //   .eq('embed', embedUrl)
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  
    const { data: videoData, error } = await supabase
      .from('videos')
      .select('*')
      .eq('embed', videoId)
      
  
    if (error) {
      console.error('Error searching for video:', error);
      setResponseData("Error: " + error.message);
      return;
    }
    console.log(`video title: ${videoData[0]?.title} `);
    if (videoData && videoData[0]?.title.length >0) {
      setResponseData(`Video exists in our database: ${videoData[0]?.title || embedUrl}`);
      handleVideoClick(embedUrl)

    } else {
      setResponseData("Video not found in the database. You can add it.");
    }
  }

  

  const scrollLeft = () => videoCardsRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollRight = () => videoCardsRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  

  

  // const handleGradeChange = (event) => {
  //   const selected = event.target.value;
  //   setSelectedGrade(selected);
  //   if (selected === "Pre-K") navigate("/prek");
  // };

  // const scrollLeft = () => videoCardsRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  // const scrollRight = () => videoCardsRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  async function validateYTURL() {
    const urlValue = document.getElementById("youtubeUrl").value.trim();
    setResponseData("Initializing...");

    if (!urlValue) {
      setResponseData("Please enter a YouTube URL");
      return;
    }

    try {
      // 1. First verify backend connection
      setResponseData("Checking backend connection...");

      const healthResponse = await fetch('http://localhost:8000/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!healthResponse.ok) {
        throw new Error(`Backend returned status ${healthResponse.status}`);
      }

      const healthData = await healthResponse.json();
      if (healthData.status !== "healthy") {
        throw new Error("Backend service not ready");
      }

      // 2. Verify YouTube URL
      setResponseData("Validating URL...");
      const verifyResponse = await fetch('http://localhost:8000/verify_url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: urlValue })
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.message || "Invalid YouTube URL");
      }

      // 3. Start processing
      setResponseData("Starting processing...");
      const processResponse = await fetch('http://localhost:8000/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: urlValue })
      });

      if (!processResponse.ok) {
        const error = await processResponse.json();
        throw new Error(error.message || "Failed to start processing");
      }

      // 4. Poll for results
      let attempts = 0;
      const maxAttempts = 12; // 1 minute timeout (5s * 12)

      const checkResults = async () => {
        attempts++;
        setResponseData(`Processing (attempt ${attempts}/${maxAttempts})...`);

        const resultsResponse = await fetch('http://localhost:8000/results');
        const resultsData = await resultsResponse.json();

        if (resultsData.status === 'complete') {
          if (resultsData.questions && resultsData.questions.trim().length > 0) {
            setResponseData(resultsData.questions);
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
          setTimeout(checkResults, 50000); // Check again in 5 seconds
        }
      };

      checkResults();

    } catch (error) {
      let errorMessage = error.message;

      // Enhanced error messages
      if (error.message.includes('Failed to fetch')) {
        errorMessage = `Connection failed. Please ensure:
                1. The Python backend is running (video_scanning.py)
                2. No firewall is blocking port 8000
                3. You're using the correct URL`;
      }

      setResponseData(`Error: ${errorMessage}`);
      console.error("Processing error:", error);
    }
  }
  /*async function validateYTURL() {
    const urlValue = document.getElementById("youtubeUrl").value.trim();
    setResponseData("Initializing content check...");

    try {
      /*
      // 1. First check if video is appropriate
      setResponseData("Checking video content...");
      const [isSafe, videoTitle] = await isVideoSafe({ src: urlValue });


      if (!isSafe) {
        throw new Error(`Video "${videoTitle}" was blocked for inappropriate content`);
      }

       // 2. Add to local state immediately (before processing)
      addYoutubeUrl(urlValue, videoTitle);
      setResponseData(`"${videoTitle}" approved - starting processing...`);

      // 3. Start backend processing - using correct local URL
      const processResponse = await fetch('http://localhost:8000/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlValue })
      });

      if (!processResponse.ok) {
        //throw new Error(`Server error: ${processResponse.status} ${processResponse.statusText}`);
        try {
          const errorData = await processResponse.json();
          const errorMessage = errorData.error || `Server error: ${processResponse.status} ${processResponse.statusText}`;
          setResponseData(`Error: ${errorMessage}`);
          console.error("Video processing error:", errorMessage);
          if (errorMessage.includes('Invalid YouTube URL')) {
            alert("Please enter a valid YouTube URL");
          } else {
            alert("Processing failed. Please try again later.");
          }
        } catch (parseError) {
          setResponseData(`Error: Could not parse server error response. Status: ${processResponse.status}`);
          console.error("Error parsing server error:", parseError);
          alert("Processing failed due to a server error. Check the console for details.");
        }
        return; // Stop further processing on error
      }

      const { video_id, status_url } = await processResponse.json();

      // 4. Poll for processing status
      const pollStatus = async () => {
        const statusResponse = await fetch(`http://localhost:8000${status_url}`);

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();

        // Update status message
        setResponseData(
            `Processing "${videoTitle}": ${statusData.message} (${statusData.progress}%)`
        );

        if (statusData.status === 'complete') {
          // Display final questions
          const formattedQuestions = statusData.data.questions
              .map((q, i) => `${i+1}. ${q.question} (at ${q.timestamp}s)`)
              .join('\n');

          setResponseData(
              `Questions for "${videoTitle}":\n\n${formattedQuestions}`
          );
        }
        else if (statusData.status === 'error') {
          //throw new Error(`Processing failed: ${statusData.message}`);
          setResponseData(`Processing failed: ${statusData.message}`);
          console.error("Processing failed:", statusData.message);
          alert(`Processing failed: ${statusData.message}`);
        }
        else {
          setTimeout(pollStatus, 2000);
        }
      };

      pollStatus();

    } catch (error) {
      setResponseData(`Error: ${error.message}`);
      console.error("Video processing error:", error);

      // Show user-friendly alerts for specific errors
      if (error.message.includes('blocked for inappropriate')) {
        alert(error.message);
      } else if (error.message.includes('Invalid YouTube URL')) {
        alert("Please enter a valid YouTube URL");
      } else {
        alert("Processing failed. Please try again later.");
      }
    }
  }
  */
  /*async function validateYTURL() {
    const urlValue = document.getElementById("youtubeUrl").value.trim();
    setResponseData("Initializing content check...");

    try {
      // 1. First check if video is appropriate
      setResponseData("Checking video content...");
      const [isSafe, videoTitle] = await isVideoSafe({ src: urlValue });
      /*
      if (!isSafe) {
        throw new Error(`Video "${videoTitle}" was blocked for inappropriate content`);
      }

      // 2. Add to local state immediately (before processing)
      addYoutubeUrl(urlValue, videoTitle);
      setResponseData(`"${videoTitle}" approved - starting processing...`);

      // 3. Start backend processing
      const processResponse = await fetch('https://your-render-url/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlValue })
      });

      const { video_id, status_url } = await processResponse.json();

      // 4. Poll for processing status
      const pollStatus = async () => {
        const statusResponse = await fetch(`https://your-render-url${status_url}`);
        const statusData = await statusResponse.json();

        // Update status message
        setResponseData(
            `Processing "${videoTitle}": ${statusData.message} (${statusData.progress}%)`
        );

        if (statusData.status === 'complete') {
          // Display final questions
          const formattedQuestions = statusData.data.questions
              .map((q, i) => `${i+1}. ${q.question} (at ${q.timestamp}s)`)
              .join('\n');

          setResponseData(
              `Questions for "${videoTitle}":\n\n${formattedQuestions}`
          );
        }
        else if (statusData.status === 'error') {
          throw new Error(`Processing failed: ${statusData.message}`);
        }
        else {
          setTimeout(pollStatus, 2000);
        }
      };

      pollStatus();

    } catch (error) {
      setResponseData(`Error: ${error.message}`);
      console.error("Video processing error:", error);

      // Show user-friendly alerts for specific errors
      if (error.message.includes('blocked for inappropriate')) {
        alert(error.message);
      } else if (error.message.includes('Invalid YouTube URL')) {
        alert("Please enter a valid YouTube URL");
      } else {
        alert("Processing failed. Please try again later.");
      }
    }
  }*/

  async function addYoutubeUrl(url, title) {
    const [safe, videoTitle] = await isVideoSafe({ src: url });
    if (safe) {
      const newVideo = { src: url, title: videoTitle };
      setYoutubeUrls((prevUrls) => [...prevUrls, newVideo]);
      console.log(`Added video: ${videoTitle} (safe)`);
    } else {
      console.log(`Blocked video: ${videoTitle} (inappropriate)`);
      alert(`Video "${videoTitle}" was not added because it's deemed inappropriate.`);
    }
  }

  async function isVideoSafe(video) {
    try {
      const resp = await fetch("/youtube_metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video.src })
      });
      if (!resp.ok) {
        console.warn("youtube_metadata request failed:", resp.status);
        return [false, null];
      }
      const data = await resp.json();
      const isAgeRestricted = data.metadata.age_restricted;
      const videoTitle = data.metadata.title;
      return [!isAgeRestricted, videoTitle];
    } catch (error) {
      console.error("Error checking video metadata:", error);
      return [false, null];
    }
  }

  const navLinks = [
    //{ label: "Home", path: "/" },
    // { label: "How to Join", path: "/how-to-join" },
    //{ label: "Sign Up", path: "/signup" },
    // { label: "Store", path: "/store" },
    // { label: "Video", path: "/video" },
    { label: "Sign In", path: "/signin" },
    { label: "Profile", path: "/profile" },
    // { label: "Contact Us", path: "/contact" },
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
      <button onClick={checkYTVideoInDatabase} className="submit-btn">Add Video</button>
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
          
        {/* <section className="grade-selection-enhanced">
          <h2>Choose Your Learning Path</h2>
          <div className="dropdown-container">
            <select value={selectedGrade} onChange={handleGradeChange} className="grade-dropdown">
              <option value="" disabled>Pick Your Grade</option>
              {["Pre-K", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade"].map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
</section> */}

{/* url input and video section */}
    <section className="videos-enhanced">
      <h2>Explore Learning Videos</h2>
      <div className="video-scroll-wrapper">
        <button className="scroll-button left" onClick={scrollLeft}>←</button>
        <div className="video-gallery-container">
          <div className="video-cards-horizontal" ref={videoCardsRef}>
            {youtubeUrls.map((video, index) => (
              <div className="video-card" key={index} onClick={() => handleVideoClick(video.src)}>
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

        {/* <section className="videos-enhanced">
          <h2>Explore Learning Videos</h2>
          <div className="video-scroll-wrapper">
            <button className="scroll-button left" onClick={scrollLeft}>←</button>
            <div className="video-cards-horizontal" ref={videoCardsRef}>
              {youtubeUrls.map((video, index) => (
                <div className="video-card" key={index}>
                  <iframe src={video.src} title={video.title} allowFullScreen></iframe>
                  <div className="video-info">
                    <p>{video.title}</p>
                    <span className="play-icon">▶</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="scroll-button right" onClick={scrollRight}>→</button>
          </div>
        </section> */}
        <section className="youtube-url-enhanced">
          <h2>Add Your Own Learning Video</h2>
          <div className="url-input-container">
            <input type="text" id="youtubeUrl" placeholder="Paste YouTube URL here..."/>
          </div>
          <div>
            <button onClick={validateYTURL} className="submit-btn">Add Video</button>
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
      </main>

      <footer className="footer-enhanced">
        <p>Join the Piggyback Learning Adventure Today!</p>
      </footer>
    </div>
  );
}

export default Home;

/*
  async function validateYTURL() {
    const urlValue = document.getElementById("youtubeUrl").value;
    let data;
    try {
      const response = await fetch("/validateYT_URL", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlValue })
      });
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        const errorData = contentType && contentType.includes("application/json")
          ? await response.json()
          : await response.text();
        throw new Error(`${response.status}: ${JSON.stringify(errorData)}`);
      }
      data = contentType && contentType.includes("application/json")
        ? await response.json()
        : await response.text();
      console.log("Backend response data:", data);
      if (typeof data === 'string') data = JSON.parse(data);
      setResponseData(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error:", err);
      setResponseData("Error: " + err.message);
      return;
    }
    addYoutubeUrl(data.url, null);
  }
  */

/*
  async function validateYTURL() {
    const urlValue = document.getElementById("youtubeUrl").value.trim();
    setResponseData("Initializing...");

    if (!urlValue) {
      setResponseData("Please enter a YouTube URL");
      return;
    }

    try {
      // 1. First verify backend connection
      setResponseData("Checking backend connection...");

      const healthResponse = await fetch('http://localhost:8000/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!healthResponse.ok) {
        throw new Error(`Backend returned status ${healthResponse.status}`);
      }

      const healthData = await healthResponse.json();
      if (healthData.status !== "healthy") {
        throw new Error("Backend service not ready");
      }

      // 2. Verify YouTube URL
      setResponseData("Validating URL...");
      const verifyResponse = await fetch('http://localhost:8000/verify_url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: urlValue })
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.message || "Invalid YouTube URL");
      }

      // 3. Start processing
      setResponseData("Starting processing...");
      const processResponse = await fetch('http://localhost:8000/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: urlValue })
      });

      if (!processResponse.ok) {
        const error = await processResponse.json();
        throw new Error(error.message || "Failed to start processing");
      }

      // 4. Poll for results
      let attempts = 0;
      const maxAttempts = 12; // 1 minute timeout (5s * 12)

      const checkResults = async () => {
        attempts++;
        setResponseData(`Processing (attempt ${attempts}/${maxAttempts})...`);

        const resultsResponse = await fetch('http://localhost:8000/results');
        const resultsData = await resultsResponse.json();

        if (resultsData.status === 'complete') {
          if (resultsData.questions && resultsData.questions.trim().length > 0) {
            setResponseData(resultsData.questions);
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
          setTimeout(checkResults, 50000); // Check again in 5 seconds
        }
      };

      checkResults();

    } catch (error) {
      let errorMessage = error.message;

      // Enhanced error messages
      if (error.message.includes('Failed to fetch')) {
        errorMessage = `Connection failed. Please ensure:
                1. The Python backend is running (video_scanning.py)
                2. No firewall is blocking port 8000
                3. You're using the correct URL`;
      }

      setResponseData(`Error: ${errorMessage}`);
      console.error("Processing error:", error);
    }
  }
 */