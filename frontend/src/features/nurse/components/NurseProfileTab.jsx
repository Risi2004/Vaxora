import React, { useState, useRef } from 'react';

export default function NurseProfileTab() {
  const fileInputRef = useRef(null);
  const [avatarImage, setAvatarImage] = useState(null);

  // Personal Information State
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    id: 'VN88421098',
    nic: '199276543210',
    name: 'ANOMA SILVA',
    email: 'anoma.silva@lankahosp.lk',
    phone: '071 9876 543',
    work: 'Lanka Hospital - Immunization Unit',
  });

  // Professional Details State
  const [isEditingProfessional, setIsEditingProfessional] = useState(false);
  const [professionalDetails, setProfessionalDetails] = useState({
    experience: '6 Years',
    shiftSchedule: 'Monday - Friday, 8:00 AM - 4:00 PM',
    workedHospitals: 'Lanka Hospital Colombo, National Hospital of Sri Lanka',
    degree: 'BSc in Nursing - University of Sri Jayewardenepura',
    completionYear: '2019',
    consultationHours: '08:30 AM - 12:30 PM, 1:30 PM - 3:30 PM',
    specialization: 'Certified Vaccine Administration & Cold-Chain Logistics (SLNC, 2019)',
  });

  const [notification, setNotification] = useState('');

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const handlePersonalChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfessionalChange = (e) => {
    const { name, value } = e.target;
    setProfessionalDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleTogglePersonalEdit = () => {
    if (isEditingPersonal) {
      triggerNotification('Nurse Personal Information updated successfully!');
    }
    setIsEditingPersonal((prev) => !prev);
  };

  const handleToggleProfessionalEdit = () => {
    if (isEditingProfessional) {
      triggerNotification('Nursing Professional Details updated successfully!');
    }
    setIsEditingProfessional((prev) => !prev);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarImage(reader.result);
        triggerNotification('Profile photo updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    triggerNotification('Nurse clinical profile exported successfully!');
  };

  return (
    <div className="doctor-profile-wrapper nurse-profile-wrapper">
      {/* Success Notification Banner */}
      {notification && (
        <div className="appointment-alert-pill" role="alert" style={{ maxWidth: '960px', width: '100%' }}>
          ✓ {notification}
        </div>
      )}

      {/* =========================================================================
          1. TOP CARD: Avatar & Personal Information
         ========================================================================= */}
      <div className="doctor-profile-card">
        <div className="doctor-profile-top-grid">
          {/* Left: Large Silhouette Avatar with Edit Pen Icon */}
          <div className="doctor-profile-avatar-wrap">
            {avatarImage ? (
              <img
                src={avatarImage}
                alt="Nurse Profile"
                className="doctor-profile-uploaded-img"
              />
            ) : (
              <svg
                className="doctor-profile-large-silhouette"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="100" cy="100" r="100" fill="#e0f2fe" />
                <circle cx="100" cy="80" r="38" fill="#0284c7" />
                <path
                  d="M40 174C40 140.863 66.863 118 100 118C133.137 118 160 140.863 160 174"
                  fill="#0284c7"
                />
              </svg>
            )}

            {/* Hidden file input for photo upload */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleAvatarUpload}
            />

            {/* Edit Avatar Badge Button */}
            <button
              type="button"
              className="doctor-btn-avatar-edit"
              title="Update Profile Photo"
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

          {/* Right: Personal Information Inner Box */}
          <div className="doctor-profile-info-box">
            {/* Header Row */}
            <div className="doctor-profile-info-header">
              <h2 className="doctor-profile-info-title">
                Personal Information
              </h2>
              <div className="doctor-profile-actions">
                <button
                  type="button"
                  className="doctor-btn-edit-pill"
                  onClick={handleTogglePersonalEdit}
                >
                  {isEditingPersonal ? 'Save' : 'Edit'}
                </button>

                <button
                  type="button"
                  className="doctor-btn-export-icon"
                  title="Export / Share Profile"
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

            {/* Key-Value Fields with Aligned Colons */}
            <div className="doctor-profile-fields-list">
              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">ID</span>
                <span className="doctor-profile-field-colon">:</span>
                {isEditingPersonal ? (
                  <input
                    type="text"
                    name="id"
                    value={personalInfo.id}
                    onChange={handlePersonalChange}
                    className="doctor-profile-field-input"
                  />
                ) : (
                  <span className="doctor-profile-field-value">{personalInfo.id}</span>
                )}
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">NIC</span>
                <span className="doctor-profile-field-colon">:</span>
                {isEditingPersonal ? (
                  <input
                    type="text"
                    name="nic"
                    value={personalInfo.nic}
                    onChange={handlePersonalChange}
                    className="doctor-profile-field-input"
                  />
                ) : (
                  <span className="doctor-profile-field-value">{personalInfo.nic}</span>
                )}
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">NAME</span>
                <span className="doctor-profile-field-colon">:</span>
                {isEditingPersonal ? (
                  <input
                    type="text"
                    name="name"
                    value={personalInfo.name}
                    onChange={handlePersonalChange}
                    className="doctor-profile-field-input"
                  />
                ) : (
                  <span className="doctor-profile-field-value">{personalInfo.name}</span>
                )}
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">EMAIL</span>
                <span className="doctor-profile-field-colon">:</span>
                {isEditingPersonal ? (
                  <input
                    type="email"
                    name="email"
                    value={personalInfo.email}
                    onChange={handlePersonalChange}
                    className="doctor-profile-field-input"
                  />
                ) : (
                  <span className="doctor-profile-field-value">{personalInfo.email}</span>
                )}
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">PHONE NUMBER</span>
                <span className="doctor-profile-field-colon">:</span>
                {isEditingPersonal ? (
                  <input
                    type="tel"
                    name="phone"
                    value={personalInfo.phone}
                    onChange={handlePersonalChange}
                    className="doctor-profile-field-input"
                  />
                ) : (
                  <span className="doctor-profile-field-value">{personalInfo.phone}</span>
                )}
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">WORK</span>
                <span className="doctor-profile-field-colon">:</span>
                {isEditingPersonal ? (
                  <input
                    type="text"
                    name="work"
                    value={personalInfo.work}
                    onChange={handlePersonalChange}
                    className="doctor-profile-field-input"
                  />
                ) : (
                  <span className="doctor-profile-field-value">{personalInfo.work}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. BOTTOM CARD: Professional Details
         ========================================================================= */}
      <div className="doctor-profile-card">
        {/* Centered Heading with Edit Button on Far Right */}
        <div className="doctor-prof-details-header">
          <div className="doctor-prof-details-spacer" />
          <h2 className="doctor-prof-details-title">
            Professional Details
          </h2>
          <div className="doctor-prof-details-action">
            <button
              type="button"
              className="doctor-btn-edit-pill"
              onClick={handleToggleProfessionalEdit}
            >
              {isEditingProfessional ? 'Save' : 'Edit'}
            </button>
          </div>
        </div>

        {/* Inner Rounded Box */}
        <div className="doctor-prof-inner-box">
          {isEditingProfessional ? (
            <div className="doctor-prof-input-grid">
              <div className="doctor-prof-input-group">
                <label className="doctor-prof-input-label">Experience</label>
                <input
                  type="text"
                  name="experience"
                  value={professionalDetails.experience}
                  onChange={handleProfessionalChange}
                  className="doctor-prof-input"
                />
              </div>

              <div className="doctor-prof-input-group">
                <label className="doctor-prof-input-label">Shift Schedule</label>
                <input
                  type="text"
                  name="shiftSchedule"
                  value={professionalDetails.shiftSchedule}
                  onChange={handleProfessionalChange}
                  className="doctor-prof-input"
                />
              </div>

              <div className="doctor-prof-input-group">
                <label className="doctor-prof-input-label">Worked Hospitals</label>
                <input
                  type="text"
                  name="workedHospitals"
                  value={professionalDetails.workedHospitals}
                  onChange={handleProfessionalChange}
                  className="doctor-prof-input"
                />
              </div>

              <div className="doctor-prof-input-group">
                <label className="doctor-prof-input-label">Degree / Diploma</label>
                <input
                  type="text"
                  name="degree"
                  value={professionalDetails.degree}
                  onChange={handleProfessionalChange}
                  className="doctor-prof-input"
                />
              </div>

              <div className="doctor-prof-input-group">
                <label className="doctor-prof-input-label">Degree Completion Year</label>
                <input
                  type="text"
                  name="completionYear"
                  value={professionalDetails.completionYear}
                  onChange={handleProfessionalChange}
                  className="doctor-prof-input"
                />
              </div>

              <div className="doctor-prof-input-group">
                <label className="doctor-prof-input-label">Station Duty Hours</label>
                <input
                  type="text"
                  name="consultationHours"
                  value={professionalDetails.consultationHours}
                  onChange={handleProfessionalChange}
                  className="doctor-prof-input"
                />
              </div>

              <div className="doctor-prof-input-group">
                <label className="doctor-prof-input-label">Specialization / Certification</label>
                <input
                  type="text"
                  name="specialization"
                  value={professionalDetails.specialization}
                  onChange={handleProfessionalChange}
                  className="doctor-prof-input"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="doctor-prof-row">
                <strong>Experience: </strong>
                <span>{professionalDetails.experience}</span>
              </div>

              <div className="doctor-prof-row">
                <strong>Shift Schedule: </strong>
                <span>{professionalDetails.shiftSchedule}</span>
              </div>

              <div className="doctor-prof-row">
                <strong>Worked Hospitals: </strong>
                <span>{professionalDetails.workedHospitals}</span>
              </div>

              <div className="doctor-prof-row">
                <strong>Degree: </strong>
                <span>{professionalDetails.degree}</span>
              </div>

              <div className="doctor-prof-row">
                <strong>Degree Completion Year: </strong>
                <span>{professionalDetails.completionYear}</span>
              </div>

              <div className="doctor-prof-row">
                <strong>Duty Hours: </strong>
                <span>{professionalDetails.consultationHours}</span>
              </div>

              <div className="doctor-prof-row">
                <strong>Specialization Certification: </strong>
                <span>{professionalDetails.specialization}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
