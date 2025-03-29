import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { supabase } from './supabaseClient'; // Import Supabase client
import styles from '../styles/signup.modules.css';

const Signup = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setShowWelcome(true), 500);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Sign Up button clicked'); 
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

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      });
  
      if (error) throw error;
  
      console.log('Google sign-in successful:', data);
      const user = data.user;
  
      if (user) {
        const { data: existingProfile, error: profileFetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
  
        if (profileFetchError || !existingProfile) {
          const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            first_name: user.user_metadata?.given_name || '',
            last_name: user.user_metadata?.family_name || '',
          });
  
          if (insertError) {
            console.error('Error creating profile for Google user:', insertError);
          } else {
            console.log('Profile created for Google user.');
          }
        } else {
          console.log('Google user profile already exists.');
        }
      }
  
      navigate('/profile');
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
      <div className={styles.signupPage}>
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

              {/* Google Sign-In Button */}
            <div className={styles.googleSignIn}>
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
                render={(renderProps) => (
                  <button
                    onClick={renderProps.onClick}
                    disabled={renderProps.disabled}
                    className={styles.googleButton}
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
