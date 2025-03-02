import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Signin.module.css';  

const Signin = () => {
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        setTimeout(() => setShowWelcome(true), 500);
    }, []);

    return (
        <div className={styles.signinPage}>
            <header className={styles.header}>
                <h1>Piggyback Learning</h1>
                <nav>
                    <ul className={styles.navList}>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/how-to-join">How to Join</Link></li>
                        <li><Link to="/signup">Sign Up</Link></li>
                        <li><Link to="/store">Store</Link></li>
                    </ul>
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

                    <form>
                        <div className={styles.inputGroup}>
                            <label>Email:</label>
                            <input type="email" required placeholder="Enter your email" />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Password:</label>
                            <input type="password" required placeholder="Enter your password" />
                        </div>
                        <button type="submit" className={styles.signinButton}>Sign In</button>
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
