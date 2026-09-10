import React, { useState } from 'react';
import { authService } from '../services/authService';

export default function ForgotPasswordForm({ onSwitchToLogin, onSuccess }) {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter code & new password, 3: Completed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      await authService.forgotPassword(email);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.resetPassword(email, resetCode, newPassword);
      setStep(3);
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {step === 1 && (
        <form onSubmit={handleSendEmail} className="auth-form">
          <p style={{ fontSize: '0.92rem', color: '#475569', textAlign: 'center', marginBottom: '8px' }}>
            Enter your registered email address and we will send you a verification code to reset your password.
          </p>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#dc2626', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              border: '1px solid rgba(239, 68, 68, 0.2)' 
            }}>
              {error}
            </div>
          )}

          <div className="auth-input-group">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="Registered Email Address"
              required
              disabled={loading}
              className="auth-input"
            />
          </div>

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? 'Sending Code...' : 'Send Reset Code'}
          </button>

          <div className="auth-switch-row">
            <button
              type="button"
              className="btn-auth-switch"
              onClick={onSwitchToLogin}
              disabled={loading}
            >
              Remember your password? Log in
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleResetPassword} className="auth-form">
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', fontSize: '0.86rem', color: '#1e40af', textAlign: 'center' }}>
            A 6-digit verification code was generated for <strong>{email}</strong>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#dc2626', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              border: '1px solid rgba(239, 68, 68, 0.2)' 
            }}>
              {error}
            </div>
          )}

          <div className="auth-input-group">
            <input
              type="text"
              name="resetCode"
              value={resetCode}
              onChange={(e) => { setResetCode(e.target.value); setError(''); }}
              placeholder="6-digit Verification Code"
              required
              disabled={loading}
              className="auth-input"
            />
          </div>

          <div className="auth-input-group">
            <input
              type="password"
              name="newPassword"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              placeholder="New Password (Min 6 characters)"
              required
              disabled={loading}
              className="auth-input"
            />
          </div>

          <div className="auth-input-group">
            <input
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder="Confirm New Password"
              required
              disabled={loading}
              className="auth-input"
            />
          </div>

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>

          <div className="auth-switch-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn-auth-switch"
              onClick={() => { setStep(1); setError(''); }}
              style={{ fontSize: '0.85rem' }}
              disabled={loading}
            >
              Change email
            </button>
            <button
              type="button"
              className="btn-auth-switch"
              onClick={onSwitchToLogin}
              style={{ fontSize: '0.85rem' }}
              disabled={loading}
            >
              Back to Log in
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="auth-success-alert" role="alert">
          <h4>Password Reset Successful!</h4>
          <p>Your password has been updated in Vaxora. Redirecting to login...</p>
          <div style={{ marginTop: '14px' }}>
            <button
              type="button"
              className="btn-auth-submit"
              onClick={onSwitchToLogin}
            >
              Proceed to Log in
            </button>
          </div>
        </div>
      )}
    </>
  );
}
