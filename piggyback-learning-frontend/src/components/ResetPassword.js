import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import styles from '../styles/Signin.module.css';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleReset = async () => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password updated successfully!');
    }
  };

  return (
    <div className={styles.signinPage}>
      <main className={styles.main}>
        <div className={styles.formContainer}>
          <h2 className={styles.formTitle}>Reset Your Password</h2>

          <div className={styles.inputGroup}>
            <label>New Password:</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <button className={styles.signinButton} onClick={handleReset}>
            Update Password
          </button>

          {message && <p className={styles.errorMessage}>{message}</p>}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
