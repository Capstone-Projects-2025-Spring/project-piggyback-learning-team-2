import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/signup.modules.css';

const Signup = () => {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Show welcome message after slight delay
    setTimeout(() => setShowWelcome(true), 500);
  }, []);

  return (
    <div className="signup-page">
      <header>
        <h1>Piggyback Learning</h1>
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
        <div className="form-container">
          {showWelcome && (
            <div className="welcome-box">
              <h2>Welcome to Piggyback Learning!</h2>
              <p>Join us for fun learning adventures.</p>
            </div>
          )}

          <h2 className="form-title">Sign Up</h2>

          <form>
            <div className="input-group">
              <label>First Name:</label>
              <input type="text" required placeholder="Enter your first name" />
            </div>
            <div className="input-group">
              <label>Last Name:</label>
              <input type="text" required placeholder="Enter your last name" />
            </div>
            <div className="input-group">
              <label>Email:</label>
              <input type="email" required placeholder="Enter your email" />
            </div>
            <div className="input-group">
              <label>Password:</label>
              <input type="password" required placeholder="Create a password" />
            </div>
            <button type="submit">Sign Up</button>
          </form>

          <p>Already have an account? <Link to="/signin">Sign In</Link></p>
        </div>
      </main>

      <footer>
        <p>&copy; 2025 Piggyback Learning. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Signup;
