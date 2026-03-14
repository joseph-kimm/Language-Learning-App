'use client';

import { useState, useEffect } from 'react';
import styles from './AccountTab.module.css';

export default function AccountTab() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/account-type')
      .then(res => res.json())
      .then(data => setHasPassword(data.hasPassword))
      .catch(() => setHasPassword(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (hasPassword === null) {
    return <div className={styles.loading}>Loading account info...</div>;
  }

  if (!hasPassword) {
    return (
      <div className={styles.container}>
        <div className={styles.oauthMessage}>
          <p>Your account uses Google Sign-In. Password management is handled by Google.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Change Password</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="currentPassword" className={styles.label}>Current Password</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className={styles.input}
            required
            autoComplete="current-password"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="newPassword" className={styles.label}>New Password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className={styles.input}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirmPassword" className={styles.label}>Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className={styles.input}
            required
            autoComplete="new-password"
          />
        </div>
        {error && <p className={styles.errorMessage}>{error}</p>}
        {success && <p className={styles.successMessage}>{success}</p>}
        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
