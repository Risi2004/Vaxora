import React, { useCallback, useEffect, useState } from 'react';
import clinicalPatientService from '../services/clinicalPatientService';
import { IconSearch } from '../../../shared/icons/AppIcons';

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

export default function DoctorPatientsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [editingDosageId, setEditingDosageId] = useState(null);
  const [dosageInput, setDosageInput] = useState('');
  const [savingDosage, setSavingDosage] = useState(false);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');

  const showToast = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const data = await clinicalPatientService.getRecentUpdates(10);
      setRecentUpdates(Array.isArray(data) ? data : []);
    } catch {
      setRecentUpdates([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (selectedPatient || q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await clinicalPatientService.searchPatients(q, 10);
        if (!cancelled) setSearchResults(Array.isArray(results) ? results : []);
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
  }, [searchQuery, selectedPatient]);

  const clearSelection = () => {
    setSelectedPatient(null);
    setEditingDosageId(null);
    setDosageInput('');
    setSearchQuery('');
    setShowDropdown(false);
    setError('');
  };

  const loadPatientByVaxoraId = async (vaxoraId, displayName) => {
    setLoadingPatient(true);
    setError('');
    setEditingDosageId(null);
    try {
      const detail = await clinicalPatientService.getPatientByVaxoraId(vaxoraId);
      const mapped = mapPatientDetail(detail);
      setSelectedPatient(mapped);
      setShowDropdown(false);
      setSearchQuery(mapped.name || displayName || vaxoraId);
      showToast(`Record loaded: ${mapped.name} (${mapped.vaxoraId})`);
    } catch (err) {
      setError(err.message || 'Failed to load patient.');
    } finally {
      setLoadingPatient(false);
    }
  };

  const handleSaveDosage = async (pvId) => {
    if (!dosageInput.trim()) {
      setError('Enter a dosage before saving.');
      return;
    }
    setSavingDosage(true);
    setError('');
    try {
      const updated = await clinicalPatientService.updateDosage(pvId, dosageInput.trim());
      setSelectedPatient((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pendingVaccines: prev.pendingVaccines.map((pv) =>
            pv.id === pvId
              ? {
                  ...pv,
                  dosage: updated.dosage || dosageInput.trim(),
                  prescribedBy: updated.prescribedBy || pv.prescribedBy,
                }
              : pv
          ),
        };
      });
      setEditingDosageId(null);
      showToast(`Dosage updated to ${dosageInput.trim()}`);
      await loadRecent();
    } catch (err) {
      setError(err.message || 'Failed to update dosage.');
    } finally {
      setSavingDosage(false);
    }
  };

  return (
    <div className="doctor-manage-appointments-card" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="doctor-manage-title">Patient History</h1>

      {notification && (
        <div className="appointment-alert-pill" role="status">
          {notification}
        </div>
      )}
      {error && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
        >
          {error}
        </div>
      )}

      {!selectedPatient && (
        <div className="doctor-appointment-inner-card">
          <h2 className="doctor-inner-facility-name">Find a Patient</h2>

          <div className="doctor-appointments-filter-bar">
            <div className="doctor-filter-group" style={{ flex: 1, position: 'relative' }}>
              <label className="doctor-filter-label" htmlFor="ph-search" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IconSearch size={16} /> Search:
              </label>
              <input
                id="ph-search"
                type="text"
                className="doctor-filter-date-input"
                style={{ minWidth: 260, flex: 1 }}
                placeholder="Vaxora ID, name, or NIC"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  setError('');
                }}
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
              />
              <button type="button" className="doctor-filter-btn" onClick={loadRecent} disabled={recentLoading}>
                Refresh
              </button>

              {showDropdown && searchQuery.trim().length >= 2 && (
                <div className="ph-appointments-search-dropdown">
                  {searching && <div className="ph-appointments-search-empty">Searching…</div>}
                  {!searching && searchResults.length === 0 && (
                    <div className="ph-appointments-search-empty">No patients found</div>
                  )}
                  {!searching &&
                    searchResults.map((p) => (
                      <button
                        key={p.patientUserId || p.vaxoraId}
                        type="button"
                        className="ph-appointments-search-option"
                        onClick={() => loadPatientByVaxoraId(p.vaxoraId, p.name)}
                      >
                        <strong>{p.name}</strong>
                        <span>
                          {p.vaxoraId}
                          {p.nic ? ` · ${p.nic}` : ''}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
              {recentLoading
                ? 'Loading...'
                : `${recentUpdates.length} recent update${recentUpdates.length === 1 ? '' : 's'}`}
            </div>
          </div>

          <div className="doctor-appointments-table-wrapper">
            <table className="doctor-appointments-mockup-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Patient</th>
                  <th style={{ width: '18%' }}>Vaxora ID</th>
                  <th style={{ width: '26%' }}>Vaccine</th>
                  <th style={{ width: '14%' }}>Dosage</th>
                  <th style={{ width: '14%' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {loadingPatient ? (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      Loading patient record...
                    </td>
                  </tr>
                ) : recentLoading ? (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      Loading recent dosage updates...
                    </td>
                  </tr>
                ) : recentUpdates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      No dosage updates yet. Search by Vaxora ID, name, or NIC above to open a patient record.
                    </td>
                  </tr>
                ) : (
                  recentUpdates.map((item) => (
                    <tr
                      key={item.appointmentId}
                      className="ph-appointments-click-row"
                      onClick={() => loadPatientByVaxoraId(item.vaxoraId, item.patientName)}
                    >
                      <td>{item.patientName || 'Patient'}</td>
                      <td>{item.vaxoraId}</td>
                      <td>{item.vaccine || '—'}</td>
                      <td>{item.dosage || '—'}</td>
                      <td>{item.relativeTime || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPatient && !loadingPatient && (
        <>
          <div className="doctor-appointment-inner-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <button type="button" className="doctor-filter-btn" onClick={clearSelection}>
                ← Back to search
              </button>
              <button
                type="button"
                className="doctor-filter-btn"
                onClick={() => loadPatientByVaxoraId(selectedPatient.vaxoraId)}
              >
                Refresh
              </button>
            </div>

            <h2 className="doctor-inner-facility-name">{selectedPatient.name}</h2>

            <div className="doctor-appointments-filter-bar">
              <div className="doctor-filter-group" style={{ gap: 16, flexWrap: 'wrap' }}>
                <span className="doctor-filter-label">ID: {selectedPatient.vaxoraId}</span>
                <span className="doctor-filter-label">NIC: {selectedPatient.nic || '—'}</span>
                <span className="doctor-filter-label">Phone: {selectedPatient.phone || '—'}</span>
                <span className="doctor-filter-label">Email: {selectedPatient.email || '—'}</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
                {selectedPatient.vaccinationHistory.length} completed · {selectedPatient.pendingVaccines.length} pending
              </div>
            </div>

            <h3 className="ph-appointments-section-label">Vaccination History</h3>
            <div className="doctor-appointments-table-wrapper">
              <table className="doctor-appointments-mockup-table">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Vaccine</th>
                    <th style={{ width: '22%' }}>Date</th>
                    <th style={{ width: '32%' }}>Location</th>
                    <th style={{ width: '18%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPatient.vaccinationHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-table-cell">
                        No completed vaccination records.
                      </td>
                    </tr>
                  ) : (
                    selectedPatient.vaccinationHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.vaccine}</td>
                        <td>{item.date}</td>
                        <td>{item.location}</td>
                        <td>{item.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="doctor-appointment-inner-card" style={{ marginBottom: 0 }}>
            <h3 className="ph-appointments-section-label" style={{ marginTop: 0 }}>
              Pending Vaccines
            </h3>
            <div className="doctor-appointments-table-wrapper">
              <table className="doctor-appointments-mockup-table">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Vaccine</th>
                    <th style={{ width: '16%' }}>Date</th>
                    <th style={{ width: '14%' }}>Time</th>
                    <th style={{ width: '24%' }}>Location</th>
                    <th style={{ width: '26%' }}>Dosage</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPatient.pendingVaccines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-table-cell">
                        No pending immunization doses scheduled.
                      </td>
                    </tr>
                  ) : (
                    selectedPatient.pendingVaccines.map((pv) => (
                      <tr key={pv.id}>
                        <td>{pv.vaccine}</td>
                        <td>{pv.date}</td>
                        <td>{pv.time}</td>
                        <td>{pv.location}</td>
                        <td>
                          {editingDosageId === pv.id ? (
                            <div className="ph-appointments-dosage-edit">
                              <input
                                type="text"
                                className="doctor-filter-date-input"
                                value={dosageInput}
                                onChange={(e) => setDosageInput(e.target.value)}
                                placeholder="e.g. 0.5ml"
                                autoFocus
                                disabled={savingDosage}
                              />
                              <button
                                type="button"
                                className="doctor-filter-btn active"
                                disabled={savingDosage}
                                onClick={() => handleSaveDosage(pv.id)}
                              >
                                {savingDosage ? '…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="doctor-filter-btn"
                                disabled={savingDosage}
                                onClick={() => setEditingDosageId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="ph-appointments-dosage-edit">
                              <span>{pv.dosage || 'Not set'}</span>
                              <button
                                type="button"
                                className="doctor-filter-btn"
                                onClick={() => {
                                  setEditingDosageId(pv.id);
                                  setDosageInput(pv.dosage || '');
                                }}
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {loadingPatient && selectedPatient === null && (
        <div className="doctor-appointment-inner-card">
          <p className="empty-table-cell" style={{ margin: 0, padding: 24, textAlign: 'center' }}>
            Loading patient record...
          </p>
        </div>
      )}
    </div>
  );
}
