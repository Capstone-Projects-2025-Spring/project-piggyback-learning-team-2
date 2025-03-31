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
    { src: "https://www.youtube.com/embed/9e5lcQycf2M", title: " Why Do We Get Hiccups? | Body Science for Kids" },
    { src: "https://www.youtube.com/embed/al-do-HGuIk", title: "Water Cycle | How the Hydrologic Cycle Works" },
    { src: "https://www.youtube.com/embed/fEiVi9TB_RQ", title: "What Causes Thunder and Lightning? | Weather Science | SciShow Kids" },
    { src: "https://www.youtube.com/embed/Gg0TXNXgz-w", title: "How Do Airplanes Fly?" },
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
    { label: "Home", path: "/" },
    { label: "How to Join", path: "/how-to-join" },
    { label: "Sign In", path: "/signin" },
    //{ label: "Sign Up", path: "/signup" },
    { label: "Store", path: "/store" },
    { label: "Video", path: "/video" },
    { label: "Profile", path: "/profile" },
    { label: "Contact Us", path: "/contact" },];
  
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

{/* url input and video section */}
<section className="youtube-url-enhanced">
  <h2>Add Your Learning Video</h2>
  <div className="url-input-container">
    <input type="text" id="youtubeUrl" placeholder="Paste YouTube URL here..." />
    <button onClick={validateYTURL} className="submit-btn">Add Video</button>
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
            <input type="text" id="youtubeUrl" placeholder="Paste YouTube URL here..." />
            </div>
            <div>
            <button onClick={validateYTURL} className="submit-btn">Add Video</button>
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