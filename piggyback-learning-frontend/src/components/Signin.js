import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Signin.module.css'; 

const Signin = () => {
  return (
    <div className={styles.signinPage}>
      <header className={styles.header}>
        <h1>Piggyback Learning</h1>
        <nav>
          <ul className={styles.navList}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/how-to-join">How to Join</Link></li>
            <li><Link to="/store">Store</Link></li>
          </ul>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.formContainer}>
          <h2>Sign In</h2>
          <form>
            <div className={styles.inputGroup}>
              <label>Email:</label>
              <input type="email" placeholder="Enter your email" required />
            </div>
            <div className={styles.inputGroup}>
              <label>Password:</label>
              <input type="password" placeholder="Enter your password" required />
            </div>
            <button type="submit" className={styles.submitButton}>Sign In</button>
          </form>
          <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2025 Piggyback Learning. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Signin;
