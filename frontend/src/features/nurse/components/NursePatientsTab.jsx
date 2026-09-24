import React, { useCallback, useEffect, useState } from 'react';
import clinicalPatientService from '../services/clinicalPatientService';

function mapPatientDetail(detail) {
  if (!detail) return null;
  return {
    id: detail.patientProfileId || detail.patientUserId,
    patientProfileId: detail.patientProfileId,
    patientUserId: detail.patientUserId,
    vaxoraId: detail.vaxoraId,
    nic: detail.nic,
    name: detail.name,
    email: detail.email,
    phone: detail.phone || '—',
    vaccinationHistory: (detail.vaccinationHistory || []).map((item) => ({
      id: item.id,
      vaccine: item.vaccine,
      date: item.date,
      location: item.location,
      status: item.status,
    })),
    pendingVaccines: (detail.pendingVaccines || []).map((pv) => ({
      id: pv.id,
      vaccine: pv.vaccine,
      date: pv.date,
      time: pv.time,
      location: pv.location,
      dosage: pv.dosage || '',
      prescribedBy: pv.prescribedBy || null,
      status: pv.status,
    })),
  };
}

export default function NursePatientsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailsCard, setShowDetailsCard] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');

  const showToast = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const loadRecent = useCallback(async () => {
    try {
      const data = await clinicalPatientService.getRecentUpdates(10);
      setRecentUpdates(Array.isArray(data) ? data : []);
    } catch {
      setRecentUpdates([]);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await clinicalPatientService.searchPatients(q, 10);
        if (!cancelled) {
          setSearchResults(Array.isArray(results) ? results : []);
        }
      } catch (err) {
        if (!cancelled) {
          setSearchResults([]);
          setError(err.message || 'Search failed.');
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const loadPatientByVaxoraId = async (vaxoraId, displayName) => {
    setLoadingPatient(true);
    setError('');
    try {
      const detail = await clinicalPatientService.getPatientByVaxoraId(vaxoraId);
      const mapped = mapPatientDetail(detail);
      setSelectedPatient(mapped);
      setShowDetailsCard(true);
      setShowDropdown(false);
      setSearchQuery(mapped.name || displayName || vaxoraId);
      showToast(`Patient record loaded: ${mapped.name} (${mapped.vaxoraId})`);
    } catch (err) {
      setError(err.message || 'Failed to load patient.');
    } finally {
      setLoadingPatient(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    loadPatientByVaxoraId(result.vaxoraId, result.name);
  };

  const handleRecentClick = (vaxoraId) => {
    if (!vaxoraId) return;
    loadPatientByVaxoraId(vaxoraId);
  };

  return (
    <div className="doctor-patient-history-page">
      {notification && (
        <div
          className="appointment-alert-pill"
          role="status"
          style={{ maxWidth: '820px', margin: '0 auto 20px', width: '100%' }}
        >
          ✓ {notification}
        </div>
      )}

      {error && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{
            maxWidth: '820px',
            margin: '0 auto 20px',
            width: '100%',
            background: '#fef2f2',
            color: '#b91c1c',
            borderColor: '#fecaca',
          }}
        >
          {error}
        </div>
      )}

      <section className="patient-search-section">
        <div className="patient-search-card-wrapper">
          <div className="patient-search-input-box">
            <input
              type="text"
              className="patient-search-input"
              placeholder="Search by Vaxora ID, name, or NIC"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                setError('');
              }}
              onFocus={() => setShowDropdown(true)}
              aria-label="Search patient with name or Vaxora ID"
            />
            <button
              type="button"
              className="patient-search-icon-btn"
              title="Search"
              aria-label="Search button"
              disabled={searching || loadingPatient}
              onClick={() => {
                if (searchResults.length > 0) {
                  handleSelectSearchResult(searchResults[0]);
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

            {showDropdown && searchQuery.trim().length >= 2 && (
              <div className="patient-search-dropdown">
                {searching && (
                  <div className="patient-dropdown-item" style={{ cursor: 'default' }}>
                    <span className="patient-dropdown-name">Searching...</span>
                  </div>
                )}
                {!searching && searchResults.length === 0 && (
                  <div className="patient-dropdown-item" style={{ cursor: 'default' }}>
                    <span className="patient-dropdown-name">No patients found</span>
                  </div>
                )}
                {!searching &&
                  searchResults.map((p) => (
                    <div
                      key={p.patientUserId || p.vaxoraId}
                      className="patient-dropdown-item"
                      onClick={() => handleSelectSearchResult(p)}
                    >
                      <span className="patient-dropdown-name">{p.name}</span>
                      <span className="patient-dropdown-id">{p.vaxoraId}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="patient-recent-updates-box">
            <div className="patient-recent-header">
              <h3 className="patient-recent-title">Recent updates</h3>
              <button type="button" className="patient-recent-see-more" onClick={loadRecent}>
                refresh
              </button>
            </div>

            <div className="patient-recent-list">
              {recentUpdates.length === 0 ? (
                <div className="patient-recent-item" style={{ cursor: 'default' }}>
                  <span className="patient-recent-id">No dosage updates yet</span>
                  <span className="patient-recent-time">—</span>
                </div>
              ) : (
                recentUpdates.map((item) => (
                  <div
                    key={item.appointmentId}
                    className="patient-recent-item"
                    title={`Click to view ${item.vaxoraId}`}
                    onClick={() => handleRecentClick(item.vaxoraId)}
                  >
                    <span className="patient-recent-id">{item.vaxoraId}</span>
                    <span className="patient-recent-time">{item.relativeTime}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {loadingPatient && (
        <p style={{ textAlign: 'center', color: '#64748b', marginTop: 16 }}>Loading patient record...</p>
      )}

      {showDetailsCard && selectedPatient && !loadingPatient && (
        <section className="patient-details-card-container">
          <button
            type="button"
            className="btn-close-patient-details"
            title="Close patient details view"
            aria-label="Close patient details"
            onClick={() => setShowDetailsCard(false)}
          >
            ✕
          </button>

          <div className="patient-personal-info-box">
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
                  <path d="M20 86C20 68 34 60 50 60C66 60 80 68 80 86" fill="#5a5e66" />
                </svg>
              </div>
            </div>

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
                  {selectedPatient.vaccinationHistory.length > 0 ? (
                    selectedPatient.vaccinationHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.vaccine}</td>
                        <td>{item.date}</td>
                        <td>{item.location}</td>
                        <td>{item.status}</td>
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

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <h3 className="patient-section-heading" style={{ margin: 0 }}>
                Pending Vaccine
              </h3>
              <span className="nurse-readonly-notice">
                🔒 Dosage levels are locked (Prescribed by Physician)
              </span>
            </div>

            <div className="patient-mockup-table-wrapper">
              <table className="patient-mockup-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Vaccine</th>
                    <th style={{ width: '20%' }}>Date</th>
                    <th style={{ width: '16%' }}>Time</th>
                    <th style={{ width: '26%' }}>Location</th>
                    <th style={{ width: '20%' }}>Dosage Level</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPatient.pendingVaccines.length > 0 ? (
                    selectedPatient.pendingVaccines.map((pv) => (
                      <tr key={pv.id}>
                        <td>{pv.vaccine}</td>
                        <td>{pv.date}</td>
                        <td>{pv.time}</td>
                        <td>{pv.location}</td>
                        <td>
                          <div
                            className="nurse-dosage-cell"
                            title={
                              pv.dosage
                                ? `Dosage prescribed by physician${pv.prescribedBy ? `: ${pv.prescribedBy}` : ''}: ${pv.dosage}`
                                : 'No dosage prescribed yet'
                            }
                          >
                            <span className="nurse-dosage-badge">{pv.dosage || 'Not set'}</span>
                            {pv.dosage ? (
                              <span className="nurse-prescribed-tag">🔒 Prescribed</span>
                            ) : (
                              <span className="nurse-prescribed-tag">Awaiting doctor</span>
                            )}
                          </div>
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

      {!showDetailsCard && selectedPatient && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button type="button" className="btn-add-schedule" onClick={() => setShowDetailsCard(true)}>
            Open Patient Record ({selectedPatient.name})
          </button>
        </div>
      )}
    </div>
  );
}
