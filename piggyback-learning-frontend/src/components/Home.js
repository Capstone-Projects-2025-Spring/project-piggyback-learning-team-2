import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/page.css';

function Home() {
  const [selectedGrade, setSelectedGrade] = useState("");
  const [responseData, setResponseData] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState([
    {src: "https://www.youtube.com/embed/DR-cfDsHCGA", title: "Introduction to Numbers"},
    {src: "https://www.youtube.com/embed/Yt8GFgxlITs", title: "Counting 1-10"},
    {src: "https://www.youtube.com/embed/tVHOBVAFjUw", title: "Basic Addition"},
    {src: "https://www.youtube.com/embed/o-6OKWU99Co", title: "Learning Shapes"},
    {src: "https://www.youtube.com/embed/qhOTU8_1Af4", title: "Colors and Patterns"},
  ]);

  const handleGradeChange = (event) => {
    setSelectedGrade(event.target.value);
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
      <div>
        <header>
          <div className="logo">
            <img src="/logo.png" alt="Piggyback Learning Logo" />
          </div>
          <nav>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/how-to-join">How to Join</Link></li>
              <li><Link to="/signin">Sign In</Link></li>
              <li><Link to="/store">Store</Link></li>
            </ul>
          </nav>
        </header>
        <main>
          <section className="intro">
            <h1>Welcome to Piggyback Learning!</h1>
            <p>Fun, Interactive Learning Games for Kids!</p>
            <Link to="/signup" className="cta-button">Sign Up for Free</Link>
          </section>
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
          <section className="video-submission">
            <label htmlFor="youtubeUrl">Enter a YouTube URL:</label>
            <input type="text" id="youtubeUrl"/><br></br>
            <button onClick={validateYTURL}>Validate</button>
            <pre>{responseData}</pre>
          </section>
          <section className="videos">
            <h2>Learning Videos</h2>
            <div className="video-cards">
              {youtubeUrls.map(video => (
                  <div className="video-card" key={video.src}>
                    <iframe src={video.src} title={video.title} allowFullScreen></iframe>
                    <p>{video.title}</p>
                  </div>
              ))}
            </div>
          </section>
        </main>
        <footer>
          <p>© 2025 Piggyback Learning. All Rights Reserved.</p>
        </footer>
      </div>
  );
}

export default Home;