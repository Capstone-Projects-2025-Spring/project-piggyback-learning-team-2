import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/page.css';

const Home = () => {
  const [selectedGrade, setSelectedGrade] = useState("");

  const handleGradeChange = (event) => {
    setSelectedGrade(event.target.value);
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

        <section className="videos">
          <h2>Learning Videos</h2>
          <div className="video-cards">
            {[
              { src: "https://www.youtube.com/embed/DR-cfDsHCGA", title: "Introduction to Numbers" },
              { src: "https://www.youtube.com/embed/Yt8GFgxlITs", title: "Counting 1-10" },
              { src: "https://www.youtube.com/embed/tVHOBVAFjUw", title: "Basic Addition" },
              { src: "https://www.youtube.com/embed/o-6OKWU99Co", title: "Learning Shapes" },
              { src: "https://www.youtube.com/embed/qhOTU8_1Af4", title: "Colors and Patterns" },
            ].map(video => (
              <div className="video-card" key={video.title}>
                <iframe src={video.src} title={video.title} allowFullScreen></iframe>
                <p>{video.title}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <p>&copy; 2025 Piggyback Learning. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
