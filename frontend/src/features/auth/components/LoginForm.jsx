import React, { useState } from 'react';

export default function LoginForm({ onSwitchToSignup, onForgotPassword, onSuccess }) {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) return;
    setSubmitted(true);
    setTimeout(() => {
      onSuccess?.(credentials.email);
    }, 1500);
  };

  return (
    <>
      {submitted ? (
        <div className="auth-success-alert" role="alert">
          <h4>Welcome back!</h4>
          <p>Logging into Vaxora Portal...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <input
              type="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              placeholder="Email"
              required
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
              className="auth-input"
            />
          </div>

          <div className="forgot-password-row">
            <button
              type="button"
              className="btn-forgot-password"
              onClick={onForgotPassword}
            >
              Forgot password
            </button>
          </div>

          <button type="submit" className="btn-auth-submit">
            Submit
          </button>

          <div className="auth-switch-row">
            <button
              type="button"
              className="btn-auth-switch"
              onClick={onSwitchToSignup}
            >
              Create a new account signup
            </button>
          </div>
        </form>
      )}
    </>
  );
}
