import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../images/Mob_Iron_Hog.png'; 
import '../styles/page.css';

function Home() {
  const [selectedGrade, setSelectedGrade] = useState("");
  const navigate = useNavigate();
  const videoCardsRef = useRef(null);
  const [responseData, setResponseData] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState([
    { src: "https://www.youtube.com/embed/DR-cfDsHCGA", title: "Introduction to Numbers" },
    { src: "https://www.youtube.com/embed/Yt8GFgxlITs", title: "Counting 1-10" },
    { src: "https://www.youtube.com/embed/tVHOBVAFjUw", title: "Basic Addition" },
    { src: "https://www.youtube.com/embed/o-6OKWU99Co", title: "Learning Shapes" },
    { src: "https://www.youtube.com/embed/qhOTU8_1Af4", title: "Colors and Patterns" },
  ]);

  const handleGradeChange = (event) => {
    const selected = event.target.value;
    setSelectedGrade(selected);
    if (selected === "Pre-K") navigate("/prek");
  };

  const scrollLeft = () => videoCardsRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollRight = () => videoCardsRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

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

  return (
    <div className="home-container">
      <header className="header-enhanced">
        <div className="logo-container">
          <img src={logo} alt="Piggyback Learning" className="logo-animated" />
          <span className="site-title">Piggyback Learning</span>
        </div>
        <nav>
          <ul>
            {["Home", "How to Join", "Sign In", "Store", "Video", "Profile", "ms"].map(item => (
              <li key={item}><Link to={`/${item.toLowerCase().replace(" ", "-")}`}>{item}</Link></li>
            ))}
          </ul>
        </nav>
      </header>

      <main>
        <section className="intro-enhanced">
          <h1>Welcome to Piggyback Learning!</h1>
          <p className="tagline">Where Learning Meets Fun & Adventure!</p>
          <Link to="/signup" className="cta-button pulse">Start Your Journey Free</Link>
        </section>
        <section className="grade-selection-enhanced">
          <h2>Choose Your Learning Path</h2>
          <div className="dropdown-container">
            <select value={selectedGrade} onChange={handleGradeChange} className="grade-dropdown">
              <option value="" disabled>Pick Your Grade</option>
              {["Pre-K", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade"].map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="videos-enhanced">
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
        </section>
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