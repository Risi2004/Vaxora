import React, { useState } from 'react';

export default function VaccinationHistoryTab() {
  // 1. Patient Database
  const [patients, setPatients] = useState([
    {
      id: 1,
      vaxoraId: 'VP12345678',
      nic: '1234 5678 9123',
      name: 'KUMAR',
      email: 'VakaPo@gmail.com',
      phone: '074 1234 567',
      vaccinationHistory: [
        {
          id: 'vh-1',
          vaccine: 'ATD',
          date: '2025-02-24',
          location: 'Lanka hospital- colombo',
          status: 'Completed',
          batch: 'ATD-2025-881',
          doctor: 'Dr. M. F. De Silva',
        },
        {
          id: 'vh-2',
          vaccine: 'COVID-19',
          date: '2020-04-12',
          location: 'Lanka hospital- colombo',
          status: 'Completed',
          batch: 'COV-2020-019',
          doctor: 'Dr. N. Wickramasinghe',
        },
      ],
      pendingVaccines: [
        {
          id: 'pv-1',
          vaccine: 'Influenza',
          date: '2025-02-24',
          time: '11.30 am',
          location: 'Delmon hospital',
          dosage: '50ml',
        },
      ],
    },
    {
      id: 2,
      vaxoraId: 'VP123456783',
      nic: '198845210982',
      name: 'CHAMINDA WICKRAMASINGHE',
      email: 'chaminda.w@gmail.com',
      phone: '077 452 1098',
      vaccinationHistory: [
        {
          id: 'vh-3',
          vaccine: 'Pfizer Bivalent mRNA',
          date: '2024-11-15',
          location: 'National Hospital Colombo',
          status: 'Completed',
          batch: 'PFZ-2024-402',
          doctor: 'Dr. P. Senanayake',
        },
        {
          id: 'vh-4',
          vaccine: 'Hepatitis B',
          date: '2023-05-10',
          location: 'Lanka hospital- colombo',
          status: 'Completed',
          batch: 'HEP-2023-088',
          doctor: 'Dr. M. F. De Silva',
        },
      ],
      pendingVaccines: [
        {
          id: 'pv-2',
          vaccine: 'Tetanus Toxoid',
          date: '2025-03-01',
          time: '09.00 am',
          location: 'Lanka hospital- colombo',
          dosage: '0.5ml',
        },
      ],
    },
    {
      id: 3,
      vaxoraId: 'VP123456782',
      nic: '197612349876',
      name: 'ROHAN JAYATILLAKE',
      email: 'rohan.j@gmail.com',
      phone: '071 892 3456',
      vaccinationHistory: [
        {
          id: 'vh-5',
          vaccine: 'Sinopharm BIBP',
          date: '2021-08-19',
          location: 'Asiri Central Hospital',
          status: 'Completed',
          batch: 'SINO-2021-391',
          doctor: 'Dr. S. Perera',
        },
      ],
      pendingVaccines: [
        {
          id: 'pv-3',
          vaccine: 'COVID-19 Booster',
          date: '2025-03-10',
          time: '10.15 am',
          location: 'Delmon hospital',
          dosage: '30mcg',
        },
      ],
    },
  ]);

  const recentUpdates = [
    { id: 'r-1', vaxoraId: 'VP123456783', patientName: 'CHAMINDA WICKRAMASINGHE', time: '1 day ago' },
    { id: 'r-2', vaxoraId: 'VP12345678', patientName: 'KUMAR', time: '1 day ago' },
    { id: 'r-3', vaxoraId: 'VP123456782', patientName: 'ROHAN JAYATILLAKE', time: '2 days ago' },
  ];

  // 2. States
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(patients[0]);
  const [showDetailsCard, setShowDetailsCard] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [editingDosageId, setEditingDosageId] = useState(null);
  const [dosageInput, setDosageInput] = useState('');
  const [notification, setNotification] = useState('');

  // 3. Search Matching
  const matchingPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return false;
    return (
      p.name.toLowerCase().includes(q) ||
      p.vaxoraId.toLowerCase().includes(q) ||
      p.nic.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))
    );
  });

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setShowDetailsCard(true);
    setShowDropdown(false);
    setSearchQuery(patient.name);
    setNotification(`Record loaded: ${patient.name} (${patient.vaxoraId})`);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleRecentClick = (vaxoraId) => {
    const found = patients.find((p) => p.vaxoraId === vaxoraId);
    if (found) {
      handleSelectPatient(found);
    }
  };

  const handleSaveDosage = (pvId) => {
    if (!dosageInput.trim()) return;
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPatient.id) return p;
        return {
          ...p,
          pendingVaccines: p.pendingVaccines.map((pv) =>
            pv.id === pvId ? { ...pv, dosage: dosageInput.trim() } : pv
          ),
        };
      })
    );

    setSelectedPatient((prev) => ({
      ...prev,
      pendingVaccines: prev.pendingVaccines.map((pv) =>
        pv.id === pvId ? { ...pv, dosage: dosageInput.trim() } : pv
      ),
    }));

    setEditingDosageId(null);
    setNotification(`Dosage updated to ${dosageInput.trim()}`);
    setTimeout(() => setNotification(''), 3000);
  };

  return (
    <div className="doctor-patient-history-page">
      {/* Toast Alert */}
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ maxWidth: '820px', margin: '0 auto 20px', width: '100%' }}
        >
          ✓ {notification}
        </div>
      )}

      {/* 1. Search Bar & Recent Updates Section (Matching Mockup Top) */}
      <section className="patient-search-section">
        <div className="patient-search-card-wrapper">
          {/* Oval Search Input */}
          <div className="patient-search-input-box">
            <input
              type="text"
              className="patient-search-input"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              aria-label="Search patient with name or Vaxora ID"
            />
            <button
              type="button"
              className="patient-search-icon-btn"
              title="Search"
              aria-label="Search button"
              onClick={() => {
                if (matchingPatients.length > 0) {
                  handleSelectPatient(matchingPatients[0]);
                }
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1a164c"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
            </button>

            {/* Autocomplete / Suggestions Dropdown */}
            {showDropdown && matchingPatients.length > 0 && (
              <div className="patient-search-dropdown">
                {matchingPatients.map((p) => (
                  <div
                    key={p.id}
                    className="patient-dropdown-item"
                    onClick={() => handleSelectPatient(p)}
                  >
                    <span className="patient-dropdown-name">{p.name}</span>
                    <span className="patient-dropdown-id">{p.vaxoraId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Recent Updates List (Matching Mockup) */}
          <div className="patient-recent-updates-box">
            <div className="patient-recent-header">
              <h3 className="patient-recent-title">Recent updates</h3>
              <button
                type="button"
                className="patient-recent-see-more"
                onClick={() => {
                  if (!showDetailsCard) setShowDetailsCard(true);
                }}
              >
                see more
              </button>
            </div>

            <div className="patient-recent-list">
              {recentUpdates.map((item) => (
                <div
                  key={item.id}
                  className="patient-recent-item"
                  title={`Click to view ${item.vaxoraId}`}
                  onClick={() => handleRecentClick(item.vaxoraId)}
                >
                  <span className="patient-recent-id">{item.vaxoraId}</span>
                  <span className="patient-recent-time">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Patient Details Card (Matching Mockup Bottom Half) */}
      {showDetailsCard && selectedPatient && (
        <section className="patient-details-card-container">
          {/* Red Rounded Square Close Button [ ✕ ] */}
          <button
            type="button"
            className="btn-close-patient-details"
            title="Close patient details view"
            aria-label="Close patient details"
            onClick={() => setShowDetailsCard(false)}
          >
            ✕
          </button>

          {/* Top Profile Box: Avatar + Personal Information */}
          <div className="patient-personal-info-box">
            {/* Left Circular Silhouette Avatar */}
            <div className="patient-avatar-wrapper">
              <div className="patient-avatar-circle">
                <svg
                  className="patient-avatar-silhouette"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="50" cy="50" r="50" fill="#d8dce3" />
                  <circle cx="50" cy="38" r="18" fill="#5a5e66" />
                  <path
                    d="M20 86C20 68 34 60 50 60C66 60 80 68 80 86"
                    fill="#5a5e66"
                  />
                </svg>
              </div>

              {/* Top-Right Expand / External Link Icon [ ↗ ] */}
              <button
                type="button"
                className="patient-avatar-expand-icon"
                title="View Full National Registry Card"
                onClick={() => {
                  setNotification(`National Registry record: ${selectedPatient.name} | NIC: ${selectedPatient.nic}`);
                  setTimeout(() => setNotification(''), 3000);
                }}
              >
                ↗
              </button>
            </div>

            {/* Right: Personal Information with Colon Alignment */}
            <div className="patient-info-content">
              <h2 className="patient-info-heading">Personal Information</h2>

              <div className="patient-info-grid">
                <div className="patient-info-row">
                  <span className="patient-info-label">ID</span>
                  <span className="patient-info-colon">:</span>
                  <span className="patient-info-val">{selectedPatient.vaxoraId}</span>
                </div>

                <div className="patient-info-row">
                  <span className="patient-info-label">NIC</span>
                  <span className="patient-info-colon">:</span>
                  <span className="patient-info-val">{selectedPatient.nic}</span>
                </div>

                <div className="patient-info-row">
                  <span className="patient-info-label">NAME</span>
                  <span className="patient-info-colon">:</span>
                  <span className="patient-info-val">{selectedPatient.name}</span>
                </div>

                <div className="patient-info-row">
                  <span className="patient-info-label">EMAIL</span>
                  <span className="patient-info-colon">:</span>
                  <span className="patient-info-val">{selectedPatient.email}</span>
                </div>

                <div className="patient-info-row">
                  <span className="patient-info-label">PHONE NUMBER</span>
                  <span className="patient-info-colon">:</span>
                  <span className="patient-info-val">{selectedPatient.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Vaccination History Table */}
          <div>
            <h3 className="patient-section-heading">Vaccination History</h3>

            <div className="patient-mockup-table-wrapper">
              <table className="patient-mockup-table">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Vaccine</th>
                    <th style={{ width: '20%' }}>Date</th>
                    <th style={{ width: '38%' }}>Location</th>
                    <th style={{ width: '20%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPatient.vaccinationHistory && selectedPatient.vaccinationHistory.length > 0 ? (
                    selectedPatient.vaccinationHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.vaccine}</td>
                        <td>{item.date}</td>
                        <td>{item.location}</td>
                        <td>
                          <span
                            style={{
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              color: '#1d1854',
                              fontWeight: 700,
                            }}
                            title="Click to view digital certificate"
                            onClick={() => setSelectedCertificate(item)}
                          >
                            {item.status} 📜
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', fontStyle: 'italic' }}>
                        No completed vaccination history records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Pending Vaccine Table */}
          <div>
            <h3 className="patient-section-heading">Pending Vaccine</h3>

            <div className="patient-mockup-table-wrapper">
              <table className="patient-mockup-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Vaccine</th>
                    <th style={{ width: '20%' }}>Date</th>
                    <th style={{ width: '16%' }}>Time</th>
                    <th style={{ width: '28%' }}>Location</th>
                    <th style={{ width: '18%' }}>Dosage Level</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPatient.pendingVaccines && selectedPatient.pendingVaccines.length > 0 ? (
                    selectedPatient.pendingVaccines.map((pv) => (
                      <tr key={pv.id}>
                        <td>{pv.vaccine}</td>
                        <td>{pv.date}</td>
                        <td>{pv.time}</td>
                        <td>{pv.location}</td>
                        <td>
                          {editingDosageId === pv.id ? (
                            <div className="dosage-cell-content">
                              <input
                                type="text"
                                className="dosage-inline-input"
                                value={dosageInput}
                                onChange={(e) => setDosageInput(e.target.value)}
                                autoFocus
                              />
                              <button
                                type="button"
                                style={{
                                  background: '#22c55e',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleSaveDosage(pv.id)}
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="dosage-cell-content">
                              <span>{pv.dosage}</span>
                              <button
                                type="button"
                                className="btn-edit-dosage"
                                title="Edit Dosage Level"
                                aria-label="Edit dosage level"
                                onClick={() => {
                                  setEditingDosageId(pv.id);
                                  setDosageInput(pv.dosage);
                                }}
                              >
                                📝
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', fontStyle: 'italic' }}>
                        No pending immunization doses scheduled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* If Details Card is closed, show a quick-open button */}
      {!showDetailsCard && selectedPatient && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            type="button"
            className="btn-add-schedule"
            onClick={() => setShowDetailsCard(true)}
          >
            Open Patient Record ({selectedPatient.name})
          </button>
        </div>
      )}

      {/* Digital Certificate Modal */}
      {selectedCertificate && (
        <div className="modal-overlay" onClick={() => setSelectedCertificate(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                  Official Digital Certificate
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedCertificate(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: '12px', margin: '16px 0' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#1e1b4b' }}>
                Vaccine: {selectedCertificate.vaccine}
              </p>
              <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#475569' }}>
                Administration Date: {selectedCertificate.date}
              </p>
              <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#475569' }}>
                Facility: {selectedCertificate.location}
              </p>
              <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#475569' }}>
                Recipient: {selectedPatient.name} ({selectedPatient.vaxoraId})
              </p>
              <p style={{ margin: '0', fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
                Status: Verified by Ministry of Health (SLMC)
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setSelectedCertificate(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-modal-download"
                onClick={() => {
                  alert(`Downloading cryptographic certificate for ${selectedCertificate.vaccine}`);
                  setSelectedCertificate(null);
                }}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
