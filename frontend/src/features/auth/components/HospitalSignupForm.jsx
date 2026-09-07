import React, { useState, useRef } from 'react';

export default function HospitalSignupForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    hospitalName: '',
    type: 'Government',
    operatingHoursType: '24hrs',
    openingTime: '08:00',
    closingTime: '18:00',
    officialEmail: '',
    contactNumber: '',
    address: '',
    password: '',
    confirmPassword: '',
  });

  const [hospitalLogo, setHospitalLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [registrationProof, setRegistrationProof] = useState(null);
  const [addressProof, setAddressProof] = useState(null);
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
      setHospitalLogo(file.name);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRegFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setRegistrationProof(e.target.files[0].name);
    }
  };

  const handleAddrFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAddressProof(e.target.files[0].name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!registrationProof) {
      setError('Please upload Hospital Registration Proof');
      return;
    }
    if (!addressProof) {
      setError('Please upload Hospital Address Proof');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitted(true);
    setTimeout(() => {
      onSuccess?.(formData.hospitalName);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="auth-success-alert" role="alert">
        <h4>Registration Request Submitted!</h4>
        <p>Your hospital portal access is being reviewed by the Ministry &amp; Health Authorities.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form auth-form-scrollable">
      {error && <div style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

      <div className="auth-input-group">
        <input
          type="text"
          name="hospitalName"
          value={formData.hospitalName}
          onChange={handleChange}
          placeholder="Hospital Name"
          required
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
            <span>{hospitalLogo || 'Upload Hospital Logo (JPG/PNG)'}</span>
          </div>
          <span className="file-upload-btn-text">Browse</span>
        </div>
        <input
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          onChange={handleLogoChange}
          className="hidden-file-input"
        />
      </div>

      <div className="auth-input-group">
        <label className="auth-label">Hospital Type</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="auth-select"
        >
          <option value="Government">Government Hospital</option>
          <option value="Private">Private Hospital / Clinic</option>
        </select>
      </div>

      {/* Operating Schedule */}
      <div className="auth-input-group">
        <label className="auth-label">Operating Schedule / Hours</label>
        <select
          name="operatingHoursType"
          value={formData.operatingHoursType}
          onChange={handleChange}
          className="auth-select"
        >
          <option value="24hrs">Open 24 Hours (24/7)</option>
          <option value="selected">Selected Operating Hours</option>
        </select>
      </div>

      {formData.operatingHoursType === 'selected' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="auth-input-group">
            <label className="auth-label">Start Time *</label>
            <input
              type="time"
              name="openingTime"
              value={formData.openingTime}
              onChange={handleChange}
              required
              className="auth-input"
            />
          </div>
          <div className="auth-input-group">
            <label className="auth-label">End Time *</label>
            <input
              type="time"
              name="closingTime"
              value={formData.closingTime}
              onChange={handleChange}
              required
              className="auth-input"
            />
          </div>
        </div>
      )}

      <div className="auth-input-group">
        <input
          type="email"
          name="officialEmail"
          value={formData.officialEmail}
          onChange={handleChange}
          placeholder="Email"
          required
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="tel"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={handleChange}
          placeholder="Contact Number"
          required
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Hospital Address"
          required
          className="auth-input"
        />
      </div>

      {/* Registration Proof */}
      <div className="auth-input-group">
        <label className="auth-label">Registration Proof *</label>
        <div
          className="file-upload-box"
          onClick={() => regProofRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="file-upload-info">
            <span>📑</span>
            <span>{registrationProof || 'Upload Registration Certificate (PDF/JPG)'}</span>
          </div>
          <span className="file-upload-btn-text">Browse</span>
        </div>
        <input
          ref={regProofRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleRegFileChange}
          className="hidden-file-input"
        />
      </div>

      {/* Address Proof */}
      <div className="auth-input-group">
        <label className="auth-label">Address Proof *</label>
        <div
          className="file-upload-box"
          onClick={() => addrProofRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="file-upload-info">
            <span>📍</span>
            <span>{addressProof || 'Upload Utility / Address Verification'}</span>
          </div>
          <span className="file-upload-btn-text">Browse</span>
        </div>
        <input
          ref={addrProofRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleAddrFileChange}
          className="hidden-file-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          required
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm Password"
          required
          className="auth-input"
        />
      </div>

      <button type="submit" className="btn-auth-submit">
        Register Hospital
      </button>
    </form>
  );
}
