import React, { useState, useRef } from 'react';
import { authService } from '../services/authService';

export default function NurseSignupForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    slncNumber: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicName, setProfilePicName] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const [slncDocFile, setSlncDocFile] = useState(null);
  const [slncDocName, setSlncDocName] = useState('');

  const [supportingDocFile, setSupportingDocFile] = useState(null);
  const [supportingDocName, setSupportingDocName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const profilePicRef = useRef(null);
  const slncDocRef = useRef(null);
  const supportingDocRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleProfilePicChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicFile(file);
      setProfilePicName(file.name);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleSlncDocChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlncDocFile(file);
      setSlncDocName(file.name);
    }
  };

  const handleSupportingDocChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSupportingDocFile(file);
      setSupportingDocName(file.name);
    }
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
    if (!slncDocFile) {
      setError('Please upload your Nursing Council (SLNC) Registration Certificate/Card');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('fullName', formData.fullName);
      payload.append('slncNumber', formData.slncNumber);
      payload.append('email', formData.email);
      payload.append('password', formData.password);
      if (formData.phoneNumber) payload.append('phoneNumber', formData.phoneNumber);

      if (profilePicFile) payload.append('profilePhoto', profilePicFile);
      if (slncDocFile) payload.append('slncCertificate', slncDocFile);
      if (supportingDocFile) payload.append('supportingDocument', supportingDocFile);

      const response = await authService.signupNurse(payload);
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.(response);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Nurse registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-success-alert" role="alert">
        <h4>Nurse Application Submitted!</h4>
        <p>Your SLNC nursing credentials and documents have been securely submitted for administrative approval.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '6px', opacity: 0.8 }}>You will receive access once approved by platform administrators.</p>
      </div>
    );
  }

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
          placeholder="Full Name (e.g. Nurse K. L. Wickramasinghe) *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="text"
          name="slncNumber"
          value={formData.slncNumber}
          onChange={handleChange}
          placeholder="SLNC Registration / License Number *"
          required
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
          placeholder="Contact Number"
          disabled={loading}
          className="auth-input"
        />
      </div>

      {/* Profile Picture Upload */}
      <div className="auth-input-group">
        <label className="auth-label">Nurse Profile Picture (Optional)</label>
        <div
          className="file-upload-box"
          onClick={() => profilePicRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="file-upload-info">
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Preview" className="file-upload-thumb" />
            ) : (
              <span>👩‍⚕️</span>
            )}
            <span>{profilePicName || 'Upload Profile Photo (JPG/PNG)'}</span>
          </div>
          <span className="file-upload-btn-text">Browse</span>
        </div>
        <input
          ref={profilePicRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleProfilePicChange}
          disabled={loading}
          className="hidden-file-input"
        />
      </div>

      {/* SLNC Registration Card Upload */}
      <div className="auth-input-group">
        <label className="auth-label">Nursing Council (SLNC) Registration Card *</label>
        <div
          className="file-upload-box"
          onClick={() => slncDocRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="file-upload-info">
            <span>📑</span>
            <span>{slncDocName || 'Upload SLNC Certificate (PDF/JPG/PNG)'}</span>
          </div>
          <span className="file-upload-btn-text">Browse</span>
        </div>
        <input
          ref={slncDocRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleSlncDocChange}
          disabled={loading}
          className="hidden-file-input"
        />
      </div>

      {/* Supporting Document Upload */}
      <div className="auth-input-group">
        <label className="auth-label">Supporting Documents (Optional)</label>
        <div
          className="file-upload-box"
          onClick={() => supportingDocRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="file-upload-info">
            <span>📎</span>
            <span>{supportingDocName || 'Upload Supporting Letter (PDF/JPG)'}</span>
          </div>
          <span className="file-upload-btn-text">Browse</span>
        </div>
        <input
          ref={supportingDocRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleSupportingDocChange}
          disabled={loading}
          className="hidden-file-input"
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
        {loading ? 'Registering...' : 'Register as Nurse'}
      </button>
    </form>
  );
}
