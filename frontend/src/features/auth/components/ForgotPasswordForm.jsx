import React, { useState } from 'react';

export default function ForgotPasswordForm({ onSwitchToLogin, onSuccess }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter code & new password, 3: Completed
  const [error, setError] = useState('');

  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setStep(2);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setStep(3);
    setTimeout(() => {
      onSuccess?.();
    }, 2500);
  };

  return (
    <>
      {step === 1 && (
        <form onSubmit={handleSendEmail} className="auth-form">
          <p style={{ fontSize: '0.92rem', color: '#475569', textAlign: 'center', marginBottom: '8px' }}>
            Enter your registered email address and we will send you a verification code to reset your password.
          </p>

          <div className="auth-input-group">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="auth-input"
            />
          </div>

          <button type="submit" className="btn-auth-submit">
            Send Reset Code
          </button>

          <div className="auth-switch-row">
            <button
              type="button"
              className="btn-auth-switch"
              onClick={onSwitchToLogin}
            >
              Remember your password? Log in
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleResetPassword} className="auth-form">
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', fontSize: '0.86rem', color: '#1e40af', textAlign: 'center' }}>
            A 6-digit verification code was sent to <strong>{email}</strong>
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

          <div className="auth-input-group">
            <input
              type="text"
              name="resetCode"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              placeholder="6-digit Verification Code"
              required
              className="auth-input"
            />
          </div>

          <div className="auth-input-group">
            <input
              type="password"
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              required
              className="auth-input"
            />
          </div>

          <div className="auth-input-group">
            <input
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm New Password"
              required
              className="auth-input"
            />
          </div>

          <button type="submit" className="btn-auth-submit">
            Reset Password
          </button>

          <div className="auth-switch-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn-auth-switch"
              onClick={() => setStep(1)}
              style={{ fontSize: '0.85rem' }}
            >
              Change email
            </button>
            <button
              type="button"
              className="btn-auth-switch"
              onClick={onSwitchToLogin}
              style={{ fontSize: '0.85rem' }}
            >
              Back to Log in
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="auth-success-alert" role="alert">
          <h4>Password Reset Successful!</h4>
          <p>Your new password has been updated. Redirecting to login...</p>
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
