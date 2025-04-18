import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { supabase } from './supabaseClient'; // Import Supabase client
import '../styles/signup.css';
const Signup = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  
  //  const [error, setError] = useState('');
  const [, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Show welcome message after slight delay
    setTimeout(() => setShowWelcome(true), 500);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle email/password signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
  
      if (signUpError) throw signUpError;
  
      const userId = data?.user?.id;
  
      if (userId) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            avatar_url: 'https://th.bing.com/th/id/OIP.1LaOBAiExqeZ_5-dyWMFAwHaEJ?w=278&h=180&c=7&r=0&o=5&dpr=1.5&pid=1.7', 
          bio: 'This is my profile!'
          });
  
        if (insertError) throw insertError;
      }
  
      console.log('Signup and profile creation successful:', data);
      navigate('/profile');
    } catch (error) {
      setError(error.message);
      console.error('Error during signup:', error);
    }
  };

  // Handle Google Sign-In
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      });

      if (error) {
        throw error;
      }

      console.log('Google sign-in successful:', data);
      navigate('/profile'); // Redirect to profile or home page after sign-in
    } catch (error) {
      setError(error.message);
      console.error('Error with Google sign-in:', error);
    }
  };

  const handleGoogleLoginError = () => {
    setError('Google sign-in failed. Please try again.');
    console.log('Google Login Failed');
  };

  return (
    <GoogleOAuthProvider clientId="658379694414-nbdeeuc5kavcd9l0k1e034atul49cv80.apps.googleusercontent.com">
      <div className="signup-page-background">
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
  
            <div className="googleSignIn">
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
                render={(renderProps) => (
                  <button
                    onClick={renderProps.onClick}
                    disabled={renderProps.disabled}
                    className="googleButton"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
                      alt="Google Logo"
                    />
                    Sign up with Google
                  </button>
                )}
              />
            </div>
          </div>
        </main>
  
        <footer>
          <p>&copy; 2025 Piggyback Learning. All Rights Reserved.</p>
        </footer>
      </div>
    </GoogleOAuthProvider>
  );
};
  
export default Signup;
