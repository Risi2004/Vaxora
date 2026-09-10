import React, { useState } from 'react';
import { authService } from '../services/authService';

export default function PatientSignupForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    nicNumber: '',
    dateOfBirth: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.signupPatient({
        fullName: formData.fullName,
        nicNumber: formData.nicNumber,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
      });

      onSuccess?.(response);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form auth-form-scrollable">
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
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Full Name *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="text"
          name="nicNumber"
          value={formData.nicNumber}
          onChange={handleChange}
          placeholder="National Identity Card (NIC) / ID *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      {/* Date of Birth Field */}
      <div className="auth-input-group">
        <label className="auth-label" style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
          Date of Birth *
        </label>
        <input
          type="date"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleChange}
          required
          max={new Date().toISOString().split('T')[0]}
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="tel"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder="Contact Number (Optional)"
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email Address *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password (Min 6 characters) *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm Password *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <button type="submit" className="btn-auth-submit" disabled={loading}>
        {loading ? 'Creating Account...' : 'Register as Citizen'}
      </button>
    </form>
  );
}
