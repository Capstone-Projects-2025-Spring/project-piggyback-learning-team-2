import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/signup.css';

const Signup = () => {
  return (
    <div>
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
          <h2>Sign Up</h2>
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
