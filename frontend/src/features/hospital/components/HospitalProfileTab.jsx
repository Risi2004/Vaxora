import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HospitalProfileTab() {
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState('');

  const [hospitalInfo, setHospitalInfo] = useState({
    id: 'Hospital24',
    location: 'Dehiwala',
    name: 'DELMON',
    email: 'delmonhospital@gmail.com',
    hospitalNumber: '074 1234 567',
  });

  const [doctors, setDoctors] = useState([
    { id: 1, name: 'Dr.kali' },
    { id: 2, name: 'Dr.kali' },
    { id: 3, name: 'Dr.kali' },
    { id: 4, name: 'Dr.kali' },
    { id: 5, name: 'Dr.Peter' },
  ]);

  const [nurses, setNurses] = useState([
    { id: 1, name: 'Dr.kali' },
    { id: 2, name: 'Dr.kali' },
    { id: 3, name: 'Dr.kali' },
    { id: 4, name: 'Dr.kali' },
    { id: 5, name: 'Dr.Peter' },
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setHospitalInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      setNotification('Hospital details updated successfully!');
      setTimeout(() => setNotification(''), 3000);
    }
    setIsEditing((prev) => !prev);
  };

  const handleAddDoctor = () => {
    const docName = window.prompt('Enter Doctor Name:', 'Dr. Samantha');
    if (docName && docName.trim()) {
      setDoctors((prev) => [...prev, { id: Date.now(), name: docName.trim() }]);
    }
  };

  const handleAddNurse = () => {
    const nurseName = window.prompt('Enter Nurse Name:', 'Nurse Anoma');
    if (nurseName && nurseName.trim()) {
      setNurses((prev) => [...prev, { id: Date.now(), name: nurseName.trim() }]);
    }
  };

  return (
    <div className="hospital-profile-wrapper">
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ maxWidth: '960px', width: '100%' }}
        >
          ✓ {notification}
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
                title="Update Hospital Logo / Photo"
                onClick={() => alert('Logo upload dialog: You can update your official hospital avatar.')}
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
                <h2 className="profile-info-title">
                  Hospital Information
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
                    title="Export / View System Profile"
                    onClick={() => alert('Exporting hospital profile verification sheet...')}
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
                  <span className="profile-field-label">ID</span>
                  <span className="profile-field-colon">:</span>
                  <span className="profile-field-value">{hospitalInfo.id}</span>
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">LOCATION</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="location"
                      value={hospitalInfo.location}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{hospitalInfo.location}</span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">NAME</span>
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
                    <span className="profile-field-value">{hospitalInfo.name}</span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">EMAIL</span>
                  <span className="profile-field-colon">:</span>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={hospitalInfo.email}
                      onChange={handleChange}
                      className="profile-field-input"
                    />
                  ) : (
                    <span className="profile-field-value">{hospitalInfo.email}</span>
                  )}
                </div>

                <div className="profile-field-row">
                  <span className="profile-field-label">HOSPITAL NUMBER</span>
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
                    <span className="profile-field-value">{hospitalInfo.hospitalNumber}</span>
                  )}
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
          <h2 className="hospital-staff-heading">Doctors</h2>
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
              title="Add New Doctor"
              aria-label="Add New Doctor"
            >
              <span className="hospital-staff-add-icon">+</span>
            </button>
          </div>
        </div>

        {/* Nurses Section */}
        <div className="hospital-staff-section">
          <h2 className="hospital-staff-heading">Nurses</h2>
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
                    <circle cx="50" cy="50" r="50" fill="#d9dde3" />
                    <circle cx="50" cy="40" r="19" fill="#525862" />
                    <path
                      d="M20 87C20 70.431 33.431 59 50 59C66.569 59 80 70.431 80 87"
                      fill="#525862"
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
              title="Add New Nurse"
              aria-label="Add New Nurse"
            >
              <span className="hospital-staff-add-icon">+</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
