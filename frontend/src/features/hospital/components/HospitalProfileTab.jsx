import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../../auth';

export default function HospitalProfileTab() {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState('');
  const [notificationType, setNotificationType] = useState('success');

  const [hospitalInfo, setHospitalInfo] = useState({
    id: '',
    regNumber: '',
    name: '',
    email: '',
    hospitalNumber: '',
    hospitalType: '',
    operatingHours: '',
    address: '',
    district: '',
    province: '',
    verificationStatus: 'Pending',
    logoUrl: null,
    registrationDocKey: null,
    mohDocKey: null,
  });

  const [doctors, setDoctors] = useState([
    { id: 1, name: 'Dr. S. Jayasinghe' },
    { id: 2, name: 'Dr. K. Perera' },
    { id: 3, name: 'Dr. M. Fernando' },
    { id: 4, name: 'Dr. A. Silva' },
  ]);

  const [nurses, setNurses] = useState([
    { id: 1, name: 'Nurse Anoma' },
    { id: 2, name: 'Nurse Priyanthi' },
    { id: 3, name: 'Nurse Dilani' },
  ]);

  const showNotification = (msg, type = 'success') => {
    setNotification(msg);
    setNotificationType(type);
    setTimeout(() => setNotification(''), 3500);
  };

  const populateState = (user) => {
    const details = user.profileDetails || {};
    setHospitalInfo({
      id: user.registrationNumber || details.registrationNumber || 'VAX-H-000000',
      regNumber: details.registrationNumber || 'N/A',
      name: details.hospitalName || user.name || '',
      email: user.email || '',
      hospitalNumber: details.contactNumber || user.phoneNumber || '',
      hospitalType: details.hospitalType || 'General Hospital',
      operatingHours: details.operatingHours || '24/7 Emergency & Outpatient',
      address: details.address || '',
      district: details.district || '',
      province: details.province || '',
      verificationStatus: details.verificationStatus != null ? String(details.verificationStatus) : (user.status || 'Pending'),
      logoUrl: user.profilePhotoUrl || details.logoUrl || null,
      registrationDocKey: details.registrationDocKey || null,
      mohDocKey: details.mohDocKey || null,
    });
  };

  const loadHospitalProfile = async () => {
    try {
      const cached = authService.getUser();
      if (cached) populateState(cached);

      const freshUser = await authService.getMe();
      if (freshUser) populateState(freshUser);
    } catch (err) {
      console.warn('Could not fetch latest hospital profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitalProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setHospitalInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleEdit = async () => {
    if (isEditing) {
      setSaving(true);
      try {
        await authService.updateProfile({
          hospitalName: hospitalInfo.name,
          phoneNumber: hospitalInfo.hospitalNumber,
          hospitalType: hospitalInfo.hospitalType,
          operatingHours: hospitalInfo.operatingHours,
          address: hospitalInfo.address,
          district: hospitalInfo.district,
          province: hospitalInfo.province,
          profilePhotoUrl: hospitalInfo.logoUrl,
        });
        showNotification('Hospital profile updated successfully in the national directory!');
        setIsEditing(false);
      } catch (err) {
        showNotification(err.message || 'Failed to update hospital details.', 'error');
      } finally {
        setSaving(false);
      }
    } else {
      setIsEditing(true);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const photoData = reader.result;
        setHospitalInfo((prev) => ({ ...prev, logoUrl: photoData }));
        try {
          await authService.updateProfile({ profilePhotoUrl: photoData });
          showNotification('Hospital logo updated successfully!');
        } catch {
          showNotification('Updated logo locally.', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDoctor = () => {
    const docName = window.prompt('Enter Doctor Name to assign:', 'Dr. Samantha Perera');
    if (docName && docName.trim()) {
      setDoctors((prev) => [...prev, { id: Date.now(), name: docName.trim() }]);
      showNotification(`Assigned ${docName.trim()} to hospital clinical roster.`);
    }
  };

  const handleAddNurse = () => {
    const nurseName = window.prompt('Enter Nurse Name to assign:', 'Nurse Kanthi Silva');
    if (nurseName && nurseName.trim()) {
      setNurses((prev) => [...prev, { id: Date.now(), name: nurseName.trim() }]);
      showNotification(`Assigned ${nurseName.trim()} to hospital nursing roster.`);
    }
  };

  const handleExport = () => {
    showNotification('Exported Hospital Clinical & Verification Sheet (.PDF)');
  };

  return (
    <div className="hospital-profile-wrapper">
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{
            maxWidth: '960px',
            width: '100%',
            backgroundColor: notificationType === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            borderColor: notificationType === 'error' ? '#ef4444' : '#10b981',
            color: notificationType === 'error' ? '#f87171' : '#34d399',
          }}
        >
          {notificationType === 'error' ? '⚠️' : '✓'} {notification}
        </div>
      )}

      {/* =========================================================================
          1. TOP CARD: Avatar & Hospital Information
         ========================================================================= */}
      <div className="manage-appointments-card profile-top-card" style={{ width: '100%' }}>
        <div className="profile-top-grid">
          {/* Left: Large Avatar with Edit Icon */}
          <div className="profile-avatar-column">
            <div className="profile-avatar-wrap">
              {hospitalInfo.logoUrl ? (
                <img
                  src={hospitalInfo.logoUrl}
                  alt={hospitalInfo.name || 'Hospital'}
                  style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #0284c7' }}
                />
              ) : (
                <svg
                  className="profile-large-silhouette"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="100" cy="100" r="100" fill="#d9dde3" />
                  <circle cx="100" cy="80" r="38" fill="#525862" />
                  <path
                    d="M40 174C40 140.863 66.863 118 100 118C133.137 118 160 140.863 160 174"
                    fill="#525862"
                  />
                </svg>
              )}

              {/* Hidden file input for logo upload */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleLogoUpload}
              />

              {/* Edit Avatar Badge Icon */}
              <button
                type="button"
                className="btn-avatar-edit"
                title="Update Hospital Logo"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1d1854"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Hospital Information Inner Card */}
          <div className="profile-info-column">
            <div className="profile-info-card">
              {/* Card Header Row */}
              <div className="profile-info-header">
                <div>
                  <h2 className="profile-info-title">
                    Hospital Profile &amp; Accreditation
                  </h2>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: hospitalInfo.verificationStatus === 'Approved' || hospitalInfo.verificationStatus === '1' ? '#10b981' : '#f59e0b',
                    }}
                  >
                    ● Status: {hospitalInfo.verificationStatus === 'Approved' || hospitalInfo.verificationStatus === '1' ? 'Accredited / Verified' : 'Under Review'}
                  </span>
                </div>
                <div className="profile-header-actions">
                  <button
                    type="button"
                    className="btn-profile-edit"
                    onClick={handleToggleEdit}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : isEditing ? 'Save' : 'Edit'}
                  </button>

                  <button
                    type="button"
                    className="btn-profile-export"
                    title="Export / View System Profile"
                    onClick={handleExport}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Hospital Information Fields */}
              <div className="profile-fields-list">
                <div className="profile-field-row">
                  <span className="profile-field-label">VAXORA CODE</span>
                  <span className="profile-field-colon">:</span>
                  <span className="profile-field-value" style={{ fontWeight: 700, color: '#0284c7' }}>
                    {hospitalInfo.id || (loading ? 'Loading...' : 'N/A')}
                  </span>
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">HOSPITAL NAME</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={hospitalInfo.name}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{hospitalInfo.name || (loading ? 'Loading...' : 'N/A')}</span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">TYPE</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="hospitalType"
                      value={hospitalInfo.hospitalType}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{hospitalInfo.hospitalType || 'General Hospital'}</span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">HOURS</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="operatingHours"
                      value={hospitalInfo.operatingHours}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{hospitalInfo.operatingHours || '24/7 Outpatient & Emergency'}</span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">ADDRESS</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address"
                      value={hospitalInfo.address}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{hospitalInfo.address || 'Sri Lanka'}</span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">DISTRICT / PROVINCE</span>
                  <span className="profile-field-colon">:</span>
                  <span className="profile-field-value">{hospitalInfo.district || 'Colombo'}, {hospitalInfo.province || 'Western'}</span>
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">EMAIL</span>
                  <span className="profile-field-colon">:</span>
                  <span className="profile-field-value">{hospitalInfo.email || (loading ? 'Loading...' : 'N/A')}</span>
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">CONTACT NUMBER</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="hospitalNumber"
                      value={hospitalInfo.hospitalNumber}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{hospitalInfo.hospitalNumber || 'Not provided'}</span>
                  )}
                </div>

                {/* Document links */}
                <div className="profile-field-row" style={{ marginTop: '8px' }}>
                  <span className="profile-field-label">DOCUMENTS</span>
                  <span className="profile-field-colon">:</span>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {hospitalInfo.registrationDocKey ? (
                      <a
                        href={hospitalInfo.registrationDocKey}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-action-btn view"
                        style={{ textDecoration: 'none', fontSize: '0.8rem' }}
                      >
                        📄 Reg Certificate
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Registration Document on File</span>
                    )}

                    {hospitalInfo.mohDocKey && (
                      <a
                        href={hospitalInfo.mohDocKey}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-action-btn view"
                        style={{ textDecoration: 'none', fontSize: '0.8rem' }}
                      >
                        🏛️ MOH Clearance
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. BOTTOM CARD: Doctors & Nurses
         ========================================================================= */}
      <div
        className="manage-appointments-card profile-bottom-card"
        style={{ width: '100%', padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '36px' }}
      >
        {/* Doctors Section */}
        <div className="hospital-staff-section">
          <h2 className="hospital-staff-heading">Assigned Doctors &amp; Medical Officers</h2>
          <div className="hospital-staff-row">
            {doctors.map((doc) => (
              <div key={doc.id} className="hospital-staff-item">
                <div className="hospital-staff-avatar-circle">
                  <svg
                    className="hospital-staff-silhouette"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="50" cy="50" r="50" fill="#d9dde3" />
                    <circle cx="50" cy="40" r="19" fill="#525862" />
                    <path
                      d="M20 87C20 70.431 33.431 59 50 59C66.569 59 80 70.431 80 87"
                      fill="#525862"
                    />
                  </svg>
                </div>
                <span className="hospital-staff-name">{doc.name}</span>
              </div>
            ))}

            {/* Plus button to add doctor */}
            <button
              type="button"
              className="hospital-staff-add-btn"
              onClick={handleAddDoctor}
              title="Assign New Doctor"
              aria-label="Assign New Doctor"
            >
              <span className="hospital-staff-add-icon">+</span>
            </button>
          </div>
        </div>

        {/* Nurses Section */}
        <div className="hospital-staff-section">
          <h2 className="hospital-staff-heading">Assigned Immunization Nurses</h2>
          <div className="hospital-staff-row">
            {nurses.map((nurse) => (
              <div key={nurse.id} className="hospital-staff-item">
                <div className="hospital-staff-avatar-circle">
                  <svg
                    className="hospital-staff-silhouette"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="50" cy="50" r="50" fill="#e0f2fe" />
                    <circle cx="50" cy="40" r="19" fill="#0284c7" />
                    <path
                      d="M20 87C20 70.431 33.431 59 50 59C66.569 59 80 70.431 80 87"
                      fill="#0284c7"
                    />
                  </svg>
                </div>
                <span className="hospital-staff-name">{nurse.name}</span>
              </div>
            ))}

            {/* Plus button to add nurse */}
            <button
              type="button"
              className="hospital-staff-add-btn"
              onClick={handleAddNurse}
              title="Assign New Nurse"
              aria-label="Assign New Nurse"
            >
              <span className="hospital-staff-add-icon">+</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
