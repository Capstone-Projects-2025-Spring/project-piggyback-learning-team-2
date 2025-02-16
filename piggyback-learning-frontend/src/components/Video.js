import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/video.css';
import { Button } from 'react-bootstrap';
import { Container } from 'react-bootstrap';

// cd piggyback-learning-frontend
// npm install react-bootstrap bootstrap


// used https://youtu.be/xNRJwmlRBNU as a tutorial

const Video = () => {
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
                <iframe src="https://www.youtube.com/embed/xNRJwmlRBNU" title="YouTube video" allowFullScreen></iframe>
            </div>
            <Button variant="primary">Click Me</Button>;
        </Container>
       
      </main>

      <footer>
        <p>&copy; 2025 Piggyback Learning. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Video;
