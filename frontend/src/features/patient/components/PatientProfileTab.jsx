import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PatientProfileTab() {
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    id: 'VP12345678',
    nic: '1234 5678 9123',
    name: 'KUMAR',
    email: 'VakaPo@gmail.com',
    phone: '074 1234 567',
  });

  const [notification, setNotification] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      setNotification('Profile details updated successfully!');
      setTimeout(() => setNotification(''), 3000);
    }
    setIsEditing((prev) => !prev);
  };

  return (
    <div className="manage-appointments-wrapper" style={{ flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
      {notification && (
        <div className="appointment-alert-pill" role="alert" style={{ maxWidth: '960px', width: '100%' }}>
          ✓ {notification}
        </div>
      )}

      {/* =========================================================================
          1. TOP CARD: Avatar & Personal Information
         ========================================================================= */}
      <div className="manage-appointments-card profile-top-card">
        <div className="profile-top-grid">
          {/* Left: Large Avatar with Edit Icon */}
          <div className="profile-avatar-column">
            <div className="profile-avatar-wrap">
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

              {/* Edit Avatar Badge Icon */}
              <button
                type="button"
                className="btn-avatar-edit"
                title="Update Profile Photo"
                onClick={() => alert('Photo upload dialog: You can update your official profile picture.')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1854" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Personal Information Inner Card */}
          <div className="profile-info-column">
            <div className="profile-info-card">
              {/* Card Header Row */}
              <div className="profile-info-header">
                <h2 className="profile-info-title">
                  Personal Information
                </h2>
                <div className="profile-header-actions">
                  <button
                    type="button"
                    className="btn-profile-edit"
                    onClick={handleToggleEdit}
                  >
                    {isEditing ? 'Save' : 'Edit'}
                  </button>

                  <button
                    type="button"
                    className="btn-profile-export"
                    title="Export / Share Profile"
                    onClick={() => alert('Exporting patient profile data sheet...')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Personal Information Fields */}
              <div className="profile-fields-list">
                <div className="profile-field-row">
                  <span className="profile-field-label">ID</span>
                  <span className="profile-field-colon">:</span>
                  <span className="profile-field-value">{profileData.id}</span>
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">NIC</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="nic"
                      value={profileData.nic}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{profileData.nic}</span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">NAME</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{profileData.name}</span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">EMAIL</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{profileData.email}</span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">PHONE NUMBER</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{profileData.phone}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. BOTTOM CARD: Appointments & Vaccination History
         ========================================================================= */}
      <div className="manage-appointments-card profile-bottom-card">
        {/* Part 1: Appointments */}
        <div className="profile-appointments-section">
          <h2 className="appointments-section-heading" style={{ marginBottom: '16px' }}>
            Appointments
          </h2>

          <div className="appointments-table-container">
            <table className="custom-appointments-table">
              <thead>
                <tr>
                  <th className="th-vaccine">Vaccine</th>
                  <th className="th-date">Date</th>
                  <th className="th-time">Time</th>
                  <th className="th-location">Location</th>
                  <th className="th-status" style={{ borderRight: 'none' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="td-vaccine">Influenza</td>
                  <td className="td-date">2025-02-24</td>
                  <td className="td-time">11.30 am</td>
                  <td className="td-location">Delmon hospital</td>
                  <td className="td-status" style={{ borderRight: 'none' }}>Conformed</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="button"
              className="btn-book-appointment"
              style={{ padding: '9px 24px', fontSize: '0.96rem' }}
              onClick={() => navigate('/patient/appointments')}
            >
              Book Appointment
            </button>
          </div>
        </div>

        {/* Part 2: Vaccination History */}
        <div className="profile-history-section" style={{ marginTop: '36px' }}>
          <h2 className="appointments-section-heading" style={{ marginBottom: '16px' }}>
            Vaccination History
          </h2>

          <div className="appointments-table-container">
            <table className="custom-appointments-table">
              <thead>
                <tr>
                  <th className="th-vaccine">Vaccine</th>
                  <th className="th-date">Date</th>
                  <th className="th-location">Location</th>
                  <th className="th-status" style={{ borderRight: 'none' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="td-vaccine">ATD</td>
                  <td className="td-date">2025-02-24</td>
                  <td className="td-location">Lanka hospital- colombo</td>
                  <td className="td-status" style={{ borderRight: 'none' }}>Completed</td>
                </tr>
                <tr>
                  <td className="td-vaccine">COVID-19</td>
                  <td className="td-date">2020-04-12</td>
                  <td className="td-location">Lanka hospital- colombo</td>
                  <td className="td-status" style={{ borderRight: 'none' }}>Completed</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
