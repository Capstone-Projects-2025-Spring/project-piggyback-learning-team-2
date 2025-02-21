import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../images/Mob_Iron_Hog.png'; 
import '../styles/signin.css';

const Signin = () => {
  return (
    <div>
      <header>
              <div className="logo">
                <img src={logo} alt="Piggyback Learning Logo" />
              </div>
              <nav>
                <ul>
                  <li><Link to="/">Home</Link></li>
                  <li><Link to="/how-to-join">How to Join</Link></li>
                  <li><Link to="/signin">Sign In</Link></li>
                  <li><Link to="/video">Video (placeholder)</Link></li>
                  <li><Link to="/store">Store</Link></li>
                </ul>
              </nav>
            </header>

      <main>
        <div className="form-container">
          <h2>Sign In</h2>
          <form>
            <div className="input-group">
              <label>Email:</label>
              <input type="email" placeholder="Enter your email" required />
            </div>
            <div className="input-group">
              <label>Password:</label>
              <input type="password" placeholder="Enter your password" required />
            </div>
            <button type="submit">Sign In</button>
          </form>
          <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
        </div>
      </main>

      <footer>
        <p>&copy; 2025 Piggyback Learning. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Signin;
