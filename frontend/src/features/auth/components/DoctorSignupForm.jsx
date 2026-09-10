import React, { useState, useRef } from 'react';
import { authService } from '../services/authService';

export default function DoctorSignupForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    slmcNumber: '',
    phoneNumber: '',
    specialization: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicName, setProfilePicName] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const [slmcDocFile, setSlmcDocFile] = useState(null);
  const [slmcDocName, setSlmcDocName] = useState('');

  const [supportingDocFile, setSupportingDocFile] = useState(null);
  const [supportingDocName, setSupportingDocName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const profilePicRef = useRef(null);
  const slmcDocRef = useRef(null);
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

  const handleSlmcDocChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlmcDocFile(file);
      setSlmcDocName(file.name);
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
    if (!slmcDocFile) {
      setError('Please upload your Medical Council (SLMC) Registration Certificate/Card');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('fullName', formData.fullName);
      payload.append('slmcNumber', formData.slmcNumber);
      payload.append('email', formData.email);
      payload.append('password', formData.password);
      if (formData.phoneNumber) payload.append('phoneNumber', formData.phoneNumber);
      if (formData.specialization) payload.append('specialization', formData.specialization);

      if (profilePicFile) payload.append('profilePhoto', profilePicFile);
      if (slmcDocFile) payload.append('slmcCertificate', slmcDocFile);
      if (supportingDocFile) payload.append('supportingDocument', supportingDocFile);

      const response = await authService.signupDoctor(payload);
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.(response);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Doctor registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-success-alert" role="alert">
        <h4>Doctor Application Submitted!</h4>
        <p>Your medical credentials and SLMC verification documents have been securely submitted and are now under administrative review.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '6px', opacity: 0.8 }}>You will be notified once verified by the Health Authority.</p>
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
          placeholder="Full Name (e.g., Dr. Samantha Perera) *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="text"
          name="slmcNumber"
          value={formData.slmcNumber}
          onChange={handleChange}
          placeholder="SLMC Registration Number *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="text"
          name="specialization"
          value={formData.specialization}
          onChange={handleChange}
          placeholder="Specialization (e.g. Pediatrics, General)"
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
          placeholder="Direct Phone Number"
          disabled={loading}
          className="auth-input"
        />
      </div>

      {/* Profile Picture Upload */}
      <div className="auth-input-group">
        <label className="auth-label">Doctor Profile Picture (Optional)</label>
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
              <span>👨‍⚕️</span>
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

      {/* SLMC Registration Document Upload */}
      <div className="auth-input-group">
        <label className="auth-label">SLMC Registration Certificate / ID *</label>
        <div
          className="file-upload-box"
          onClick={() => slmcDocRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="file-upload-info">
            <span>📑</span>
            <span>{slmcDocName || 'Upload SLMC Certificate (PDF/JPG/PNG)'}</span>
          </div>
          <span className="file-upload-btn-text">Browse</span>
        </div>
        <input
          ref={slmcDocRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleSlmcDocChange}
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
            <span>{supportingDocName || 'Upload Additional Proof (PDF/JPG)'}</span>
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
          placeholder="Professional Email Address *"
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
        {loading ? 'Registering...' : 'Register as Doctor'}
      </button>
    </form>
  );
}
