import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/video.css';
import { Container } from 'react-bootstrap';
import {useRef} from "react";


// cd piggyback-learning-frontend
// npm install react-bootstrap bootstrap


// used https://youtu.be/xNRJwmlRBNU as a tutorial for the embed


const Video = () => {

const videoRef = useRef(null);

const stopVideos = () => {
    if (videoRef.current) {
      videoRef.current.src = ""; // Clear the src
      setTimeout(() => {
        videoRef.current.src = "https://www.youtube.com/embed/DR-cfDsHCGA";
      }, 100); // last argument is a delay but don't remove it because it causes the embed to disapear 
    }
    
  };


  return (
    <div>
      <header>
        <h1>Piggyback Learning</h1>
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/how-to-join">How to Join</Link></li>
            <li><Link to="/store">Store</Link></li>
          </ul>
        </nav>
      </header>

      <main>
        <Container>
            <div class="ratio ratio-16x9">
                <iframe  ref={videoRef} src="https://www.youtube.com/embed/DR-cfDsHCGA" title="YouTube video" allowFullScreen></iframe>
            </div>
            <button onClick={stopVideos}>Stop</button>;
        </Container>
       
      </main>

      <footer>
        <p>&copy; 2025 Piggyback Learning. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Video;

