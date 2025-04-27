import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { supabase } from './supabaseClient'; 
import styles from '../styles/Signin.module.css';

const Signin = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setShowWelcome(true), 500);
  }, []);

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      console.log('Signed in successfully:', data);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.warn('Profile not found:', profileError.message);
      } else {
        console.log('User profile:', profile);
      }

      navigate('/profile');
    } catch (err) {
      setError(err.message);
      console.error('Error signing in:', err);
    }
  };

  //Forgot password handler
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email first.');
      return;
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setError(error.message);
    } else {
      alert('Check your email for the password reset link.');
    }
  };

  // Google Sign-In handlers
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      });

      if (error) throw error;

      console.log('Google sign-in successful:', data);

      const user = data.user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Profile:', profile);

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
      <div className={styles.signinPage}>
        <header className={styles.header}>
          <h1>Piggyback Learning</h1>
          <nav>
            <ul className={styles.navList}>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/signup">Sign Up</Link></li>
n               </ul>
          </nav>
        </header>

        <main className={styles.main}>
          <div className={styles.formContainer}>
            {showWelcome && (
              <div className={styles.welcomeBox}>
                <h2>Welcome Back!</h2>
                <p>Sign in to continue your learning adventure.</p>
              </div>
            )}
            <h2 className={styles.formTitle}>Sign In</h2>

            {error && (
                <p className={styles.highlightMessage}>{error}</p>
              )}
            <form onSubmit={handleEmailSignIn}>
              <div className={styles.inputGroup}>
                <label>Email:</label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Password:</label>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className={styles.signinButton}>
                Sign In
              </button>
            </form>

            <p className={styles.forgotPassword}>
              <Link to="#" onClick={handleForgotPassword}>Forgot your password?</Link>
            </p>

            <p>
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </p>

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
                    Sign in with Google
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

export default Signin;
