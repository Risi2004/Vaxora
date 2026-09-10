import React, { useState } from 'react';
import { authService } from '../services/authService';

export default function LoginForm({ onSwitchToSignup, onForgotPassword, onSuccess }) {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) return;

    setLoading(true);
    setError('');

    try {
      const response = await authService.login(credentials.email, credentials.password);
      // Immediately transition to dashboard without any intermediate delay or success screen
      onSuccess?.(response);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
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
          value={credentials.email}
          onChange={handleChange}
          placeholder="Email address"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="password"
          name="password"
          value={credentials.password}
          onChange={handleChange}
          placeholder="Password"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="forgot-password-row">
        <button
          type="button"
          className="btn-forgot-password"
          onClick={onForgotPassword}
          disabled={loading}
        >
          Forgot password?
        </button>
      </div>

      <button type="submit" className="btn-auth-submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className="auth-switch-row">
        <button
          type="button"
          className="btn-auth-switch"
          onClick={onSwitchToSignup}
          disabled={loading}
        >
          Create a new account signup
        </button>
      </div>
    </form>
  );
}
