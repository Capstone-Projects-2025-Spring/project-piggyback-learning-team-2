import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/signup.modules.css';

const Signup = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    // Show welcome message after slight delay
    setTimeout(() => setShowWelcome(true), 500);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle sign up logic, e.g., send the data to your backend
    console.log('Form Submitted:', formData);
    // After successful sign up, navigate to another page (e.g., dashboard)
    navigate('/');
  };

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

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>First Name:</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                placeholder="Enter your first name"
              />
            </div>
            <div className="input-group">
              <label>Last Name:</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                placeholder="Enter your last name"
              />
            </div>
            <div className="input-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter your email"
              />
            </div>
            <div className="input-group">
              <label>Password:</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Create a password"
              />
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
