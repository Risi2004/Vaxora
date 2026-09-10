import React, { useState, useRef } from 'react';
import { authService } from '../services/authService';

export default function HospitalSignupForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    hospitalName: '',
    registrationNumber: '',
    type: 'Government',
    operatingHoursType: '24hrs',
    openingTime: '08:00',
    closingTime: '18:00',
    officialEmail: '',
    contactNumber: '',
    address: '',
    district: '',
    province: '',
    password: '',
    confirmPassword: '',
  });

  const [hospitalLogoFile, setHospitalLogoFile] = useState(null);
  const [logoName, setLogoName] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);

  const [registrationProofFile, setRegistrationProofFile] = useState(null);
  const [regProofName, setRegProofName] = useState('');

  const [addressProofFile, setAddressProofFile] = useState(null);
  const [addrProofName, setAddrProofName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const logoRef = useRef(null);
  const regProofRef = useRef(null);
  const addrProofRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setHospitalLogoFile(file);
      setLogoName(file.name);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRegFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRegistrationProofFile(file);
      setRegProofName(file.name);
    }
  };

  const handleAddrFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAddressProofFile(file);
      setAddrProofName(file.name);
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
    if (!registrationProofFile) {
      setError('Please upload Hospital Registration Proof');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('hospitalName', formData.hospitalName);
      payload.append('registrationNumber', formData.registrationNumber || `HOSP-${Date.now().toString().slice(-6)}`);
      payload.append('hospitalType', formData.type);
      payload.append('address', formData.address);
      payload.append('district', formData.district || 'Western');
      payload.append('province', formData.province || 'Western Province');
      payload.append('contactNumber', formData.contactNumber);
      payload.append('email', formData.officialEmail);
      payload.append('password', formData.password);

      if (hospitalLogoFile) payload.append('logo', hospitalLogoFile);
      if (registrationProofFile) payload.append('registrationCertificate', registrationProofFile);
      if (addressProofFile) payload.append('mohDocument', addressProofFile);

      const response = await authService.signupHospital(payload);
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.(response);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Hospital registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-success-alert" role="alert">
        <h4>Registration Request Submitted!</h4>
        <p>Your hospital facility registration documents have been securely submitted and are currently under verification by the Ministry of Health.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '6px', opacity: 0.8 }}>Administrative clearance will be granted shortly.</p>
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
          name="hospitalName"
          value={formData.hospitalName}
          onChange={handleChange}
          placeholder="Hospital / Medical Institution Name *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="text"
          name="registrationNumber"
          value={formData.registrationNumber}
          onChange={handleChange}
          placeholder="MOH / PHSRC Registration Number *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      {/* Hospital Logo Upload Field */}
      <div className="auth-input-group">
        <label className="auth-label">Hospital Logo (Optional)</label>
        <div
          className="file-upload-box"
          onClick={() => logoRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="file-upload-info">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo preview"
                className="file-upload-thumb"
                style={{ borderRadius: '6px' }}
              />
            ) : (
              <span>🏥</span>
            )}
            <span>{logoName || 'Upload Hospital Logo (JPG/PNG)'}</span>
          </div>
          <span className="file-upload-btn-text">Browse</span>
        </div>
        <input
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          onChange={handleLogoChange}
          disabled={loading}
          className="hidden-file-input"
        />
      </div>

      <div className="auth-input-group">
        <label className="auth-label">Hospital Type</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          disabled={loading}
          className="auth-select"
        >
          <option value="Government">Government / Base Hospital</option>
          <option value="Private">Private Hospital / Center</option>
          <option value="MOH">MOH Office / Immunization Clinic</option>
        </select>
      </div>

      <div className="auth-input-group">
        <input
          type="email"
          name="officialEmail"
          value={formData.officialEmail}
          onChange={handleChange}
          placeholder="Official Administration Email *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="tel"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={handleChange}
          placeholder="Official Contact Phone Number *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Complete Facility Address *"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="auth-input-group">
          <input
            type="text"
            name="district"
            value={formData.district}
            onChange={handleChange}
            placeholder="District (e.g. Colombo)"
            disabled={loading}
            className="auth-input"
          />
        </div>
        <div className="auth-input-group">
          <input
            type="text"
            name="province"
            value={formData.province}
            onChange={handleChange}
            placeholder="Province"
            disabled={loading}
            className="auth-input"
          />
        </div>
      </div>

      {/* Registration Proof */}
      <div className="auth-input-group">
        <label className="auth-label">Hospital Registration Certificate *</label>
        <div
          className="file-upload-box"
          onClick={() => regProofRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="file-upload-info">
            <span>📑</span>
            <span>{regProofName || 'Upload Registration Certificate (PDF/JPG)'}</span>
          </div>
          <span className="file-upload-btn-text">Browse</span>
        </div>
        <input
          ref={regProofRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleRegFileChange}
          disabled={loading}
          className="hidden-file-input"
        />
      </div>

      {/* Address Proof / MOH Document */}
      <div className="auth-input-group">
        <label className="auth-label">MOH Affiliation / Facility Document (Optional)</label>
        <div
          className="file-upload-box"
          onClick={() => addrProofRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="file-upload-info">
            <span>📍</span>
            <span>{addrProofName || 'Upload MOH / Facility Letter (PDF/JPG)'}</span>
          </div>
          <span className="file-upload-btn-text">Browse</span>
        </div>
        <input
          ref={addrProofRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleAddrFileChange}
          disabled={loading}
          className="hidden-file-input"
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
        {loading ? 'Registering...' : 'Register as Hospital'}
      </button>
    </form>
  );
}
