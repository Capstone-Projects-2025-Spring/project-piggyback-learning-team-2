import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../images/Mob_Iron_Hog.png'; 
import '../styles/page.css';

function Home() {
  const [selectedGrade, setSelectedGrade] = useState("");
  const navigate = useNavigate();
  const videoCardsRef = useRef(null); // Ref for the video cards container
  const [responseData, setResponseData] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState([
    { src: "https://www.youtube.com/embed/DR-cfDsHCGA", title: "Introduction to Numbers" },
    { src: "https://www.youtube.com/embed/Yt8GFgxlITs", title: "Counting 1-10" },
    { src: "https://www.youtube.com/embed/tVHOBVAFjUw", title: "Basic Addition" },
    { src: "https://www.youtube.com/embed/o-6OKWU99Co", title: "Learning Shapes" },
    { src: "https://www.youtube.com/embed/qhOTU8_1Af4", title: "Colors and Patterns" },
    { src: "https://www.youtube.com/embed/tA6c_kMJEl8", title: "Harry The Bunny - Educational Learning Videos for Toddlers | Baby Shows Compilation | Baby Sensory" },
    { src: "https://www.youtube.com/embed/AKjxYkRlbks", title: "Mystery Doug - New 5-minute videos for your students" },
    { src: "https://www.youtube.com/embed/JrBtNPnekUU", title: "Learn Why do we Cry and more Educational Video for Kids!!!" },
  ]);

  const handleGradeChange = (event) => {
    const selected = event.target.value;
    setSelectedGrade(selected);

    if (selected === "Pre-K") {
      navigate("/prek"); // Navigate to Pre-K page
    } else {
      // Handle other grades if needed
    }
  };

  // Function to scroll left
  const scrollLeft = () => {
    if (videoCardsRef.current) {
      videoCardsRef.current.scrollBy({
        left: -300, // Scroll by 300px to the left
        behavior: 'smooth', // Smooth scrolling
      });
    }
  };

  // Function to scroll right
  const scrollRight = () => {
    if (videoCardsRef.current) {
      videoCardsRef.current.scrollBy({
        left: 300, // Scroll by 300px to the right
        behavior: 'smooth', // Smooth scrolling
      });
    }
  };

  async function validateYTURL() {
    const urlValue = document.getElementById("youtubeUrl").value;
    let data;
  
    try {
      const response = await fetch("/validateYT_URL", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      setResponseData(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error:", err);
      setResponseData("Error: " + err.message);
      return; 
    }
  
    addYoutubeUrl(data.url, "New Video");
  }
  const addYoutubeUrl = (url, title) => {
    console.log("Adding YouTube URL:", url, title);
    setYoutubeUrls([...youtubeUrls, {src: url, title: title}]);
  };

  return (
    <div className="home-container">
      {/* Header */}
      <header>
        <div className="logo">
          <img src={logo} alt="Piggyback Learning Logo" />
        </div>
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/how-to-join">How to Join</Link></li>
            <li><Link to="/signin">Sign In</Link></li>
            <li><Link to="/store">Store</Link></li>
            <li><Link to="/video">Video (placeholder)</Link></li>
            <li><Link to="/profile">Profile</Link></li>
            <li><Link to="/ms">ms</Link></li>
          </ul>
        </nav>
      </header>

      {/* Main content */}
      <main>
        {/* Welcome section */}
        <section className="intro">
          <h1>Welcome to Piggyback Learning!</h1>
          <p>Fun, Interactive Learning Games for Kids!</p>
          <Link to="/signup" className="cta-button">Sign Up for Free</Link>
        </section>
        <section className = "youtube-url">
          <h2>Enter a YouTube URL</h2>
          <input type="text" id="youtubeUrl" placeholder="Enter a YouTube URL" />
          <button onClick={validateYTURL}>Submit</button>
        </section>
        {/* Grade selection section */}
        <section className="grade-selection">
          <h2>Select Your Grade Level</h2>
          <div className="dropdown-container">
            <select value={selectedGrade} onChange={handleGradeChange} className="grade-dropdown">
              <option value="" disabled>Select Grade</option>
              <option value="Pre-K">Pre-K</option>
              <option value="Kindergarten">Kindergarten</option>
              <option value="1st Grade">1st Grade</option>
              <option value="2nd Grade">2nd Grade</option>
              <option value="3rd Grade">3rd Grade</option>
              <option value="4th Grade">4th Grade</option>
              <option value="5th Grade">5th Grade</option>
            </select>
          </div>
        </section>

        {/* Learning videos section */}
        <section className="videos">
          <h2>Learning Videos</h2>
          <div className="video-scroll-container"/>
            <button className="scroll-button left" onClick={scrollLeft}>&lt;</button>
            <div className="video-cards" ref={videoCardsRef}>
            {youtubeUrls.map(video => (
              <div className="video-card" key={video.title}>
                <iframe src={video.src} title={video.title} allowFullScreen></iframe>
                <p>{video.title}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <p>&copy; 2025 Piggyback Learning. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default Home;