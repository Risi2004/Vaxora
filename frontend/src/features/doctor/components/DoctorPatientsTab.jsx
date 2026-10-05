import { deferEffectCallback } from '../../../shared/utils/deferEffectCallback.js';
import { useCallback, useEffect, useState } from 'react';
import clinicalPatientService from '../services/clinicalPatientService';
import staffAppointmentService from '../../staff/services/staffAppointmentService';
import { IconCheck, IconClose, IconPencil, IconSearch } from '../../../shared/icons/AppIcons';
import StaffSubpageHeader from '../../staff/components/StaffSubpageHeader';

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
      isOverdue: Boolean(pv.isOverdue) || isPastDate(pv.date),
    })),
  };
}

function isPastDate(dateStr) {
  if (!dateStr) return false;
  const day = String(dateStr).slice(0, 10);
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return day < `${y}-${m}-${d}`;
}

function statusPill(status, { overdue = false } = {}) {
  if (overdue) {
    return { label: 'Missed', tone: 'is-missed' };
  }
  const raw = String(status || 'Pending').trim();
  const key = raw.toLowerCase();
  if (key === 'completed') return { label: 'Completed', tone: 'is-completed' };
  if (key === 'confirmed') return { label: 'Confirmed', tone: 'is-confirmed' };
  if (key === 'pendingpayment' || key === 'pending payment') {
    return { label: 'Awaiting payment', tone: 'is-payment' };
  }
  if (key === 'missed') return { label: 'Missed', tone: 'is-missed' };
  if (key === 'cancelled' || key === 'rejected') {
    return { label: raw, tone: 'is-cancelled' };
  }
  return { label: raw || 'Pending', tone: 'is-pending' };
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
  const [closingMissedId, setClosingMissedId] = useState(null);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');
  const [recordFilter, setRecordFilter] = useState('all');

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

  useEffect(() => deferEffectCallback(() => {
    loadRecent();
  }), [loadRecent]);

  useEffect(() => deferEffectCallback(() => {
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
  }), [searchQuery, selectedPatient]);

  const clearSelection = () => {
    setSelectedPatient(null);
    setEditingDosageId(null);
    setDosageInput('');
    setSearchQuery('');
    setShowDropdown(false);
    setError('');
    setRecordFilter('all');
  };

  const loadPatientByVaxoraId = async (vaxoraId, displayName) => {
    setLoadingPatient(true);
    setError('');
    setEditingDosageId(null);
    setRecordFilter('all');
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
    const row = selectedPatient?.pendingVaccines?.find((pv) => pv.id === pvId);
    if (row?.isOverdue) {
      setError('Past incomplete visits cannot be prescribed. Mark them missed or ask the patient to rebook.');
      setEditingDosageId(null);
      return;
    }
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

  const handleMarkMissed = async (pv) => {
    if (!pv?.id) return;
    if (!window.confirm(`Mark ${pv.vaccine} on ${pv.date} as missed? This closes the incomplete visit.`)) {
      return;
    }
    setClosingMissedId(pv.id);
    setError('');
    try {
      await staffAppointmentService.updateAppointmentStatus(pv.id, 'Cancelled', 'Missed visit — closed by clinical staff');
      setSelectedPatient((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pendingVaccines: prev.pendingVaccines.filter((row) => row.id !== pv.id),
        };
      });
      if (editingDosageId === pv.id) setEditingDosageId(null);
      showToast(`${pv.vaccine} marked as missed.`);
    } catch (err) {
      setError(err.message || 'Failed to mark visit as missed.');
    } finally {
      setClosingMissedId(null);
    }
  };

  return (
    <div className="staff-workspace-page">
      <StaffSubpageHeader
        eyebrow="Clinical records"
        title="Patient records"
        subtitle="Find a patient to review vaccination history and manage pending dosage details."
      />
      <div className="doctor-manage-appointments-card staff-workspace-panel">

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

      {selectedPatient && (
        <>
          {loadingPatient ? (
            <div className="doctor-appointment-inner-card">
              <p className="empty-table-cell" style={{ margin: 0, padding: 24, textAlign: 'center' }}>
                Loading patient record...
              </p>
            </div>
          ) : (
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
                {selectedPatient.vaccinationHistory.length} completed ·{' '}
                {selectedPatient.pendingVaccines.filter((pv) => !pv.isOverdue).length} upcoming ·{' '}
                {selectedPatient.pendingVaccines.filter((pv) => pv.isOverdue).length} missed
              </div>
            </div>

            <div className="ph-record-header">
              <h3 className="ph-appointments-section-label">Immunization record</h3>
              <div className="ph-record-filters" role="group" aria-label="Filter immunization records">
                <button
                  type="button"
                  className={`ph-record-filter-btn${recordFilter === 'all' ? ' is-active' : ''}`}
                  onClick={() => setRecordFilter('all')}
                >
                  All ({selectedPatient.pendingVaccines.length + selectedPatient.vaccinationHistory.length})
                </button>
                <button
                  type="button"
                  className={`ph-record-filter-btn${recordFilter === 'upcoming' ? ' is-active' : ''}`}
                  onClick={() => setRecordFilter('upcoming')}
                >
                  Upcoming ({selectedPatient.pendingVaccines.filter((pv) => !pv.isOverdue).length})
                </button>
                <button
                  type="button"
                  className={`ph-record-filter-btn${recordFilter === 'missed' ? ' is-active' : ''}`}
                  onClick={() => setRecordFilter('missed')}
                >
                  Missed ({selectedPatient.pendingVaccines.filter((pv) => pv.isOverdue).length})
                </button>
                <button
                  type="button"
                  className={`ph-record-filter-btn${recordFilter === 'completed' ? ' is-active' : ''}`}
                  onClick={() => setRecordFilter('completed')}
                >
                  Completed ({selectedPatient.vaccinationHistory.length})
                </button>
              </div>
            </div>
            <div className="doctor-appointments-table-wrapper">
              <table className="doctor-appointments-mockup-table">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Vaccine</th>
                    <th style={{ width: '11%' }}>Date</th>
                    <th style={{ width: '15%' }}>Time</th>
                    <th style={{ width: '18%' }}>Location</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '24%' }}>Dosage</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const upcoming = selectedPatient.pendingVaccines.filter((pv) => !pv.isOverdue);
                    const missed = selectedPatient.pendingVaccines.filter((pv) => pv.isOverdue);
                    const showUpcoming = recordFilter === 'all' || recordFilter === 'upcoming';
                    const showMissed = recordFilter === 'all' || recordFilter === 'missed';
                    const showCompleted = recordFilter === 'all' || recordFilter === 'completed';
                    const visibleUpcoming = showUpcoming ? upcoming : [];
                    const visibleMissed = showMissed ? missed : [];
                    const visibleCompleted = showCompleted ? selectedPatient.vaccinationHistory : [];
                    const empty =
                      visibleUpcoming.length === 0 &&
                      visibleMissed.length === 0 &&
                      visibleCompleted.length === 0;

                    if (empty) {
                      return (
                        <tr>
                          <td colSpan={6} className="empty-table-cell">
                            {recordFilter === 'upcoming'
                              ? 'No upcoming immunization doses scheduled.'
                              : recordFilter === 'missed'
                                ? 'No missed incomplete visits.'
                                : recordFilter === 'completed'
                                  ? 'No completed vaccination records.'
                                  : 'No immunization records for this patient.'}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <>
                        {visibleMissed.map((pv) => {
                          const pill = statusPill(pv.status, { overdue: true });
                          return (
                          <tr key={`missed-${pv.id}`} className="ph-record-row-missed">
                            <td>{pv.vaccine}</td>
                            <td>{pv.date}</td>
                            <td>{pv.time || '—'}</td>
                            <td>{pv.location}</td>
                            <td>
                              <span className={`ph-status-pill ${pill.tone}`}>{pill.label}</span>
                            </td>
                            <td>
                              <div className="ph-appointments-dosage-edit">
                                <span>{pv.dosage || 'Not set'}</span>
                                <button
                                  type="button"
                                  className="ph-dosage-icon-btn is-missed"
                                  disabled={closingMissedId === pv.id}
                                  title="Mark missed and close this incomplete visit"
                                  aria-label="Mark missed"
                                  onClick={() => handleMarkMissed(pv)}
                                >
                                  <IconClose size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                        {visibleUpcoming.map((pv) => {
                          const pill = statusPill(pv.status);
                          return (
                          <tr key={`pending-${pv.id}`}>
                            <td>{pv.vaccine}</td>
                            <td>{pv.date}</td>
                            <td>{pv.time || '—'}</td>
                            <td>{pv.location}</td>
                            <td>
                              <span className={`ph-status-pill ${pill.tone}`}>{pill.label}</span>
                            </td>
                            <td>
                              {editingDosageId === pv.id ? (
                                <div className="ph-appointments-dosage-edit">
                                  <input
                                    type="text"
                                    className="doctor-filter-date-input ph-dosage-input"
                                    value={dosageInput}
                                    onChange={(e) => setDosageInput(e.target.value)}
                                    placeholder="e.g. 0.5ml"
                                    autoFocus
                                    disabled={savingDosage}
                                    aria-label="Dosage"
                                  />
                                  <button
                                    type="button"
                                    className="ph-dosage-icon-btn is-save"
                                    disabled={savingDosage}
                                    onClick={() => handleSaveDosage(pv.id)}
                                    title="Save dosage"
                                    aria-label="Save dosage"
                                  >
                                    <IconCheck size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="ph-dosage-icon-btn is-cancel"
                                    disabled={savingDosage}
                                    onClick={() => setEditingDosageId(null)}
                                    title="Cancel"
                                    aria-label="Cancel dosage edit"
                                  >
                                    <IconClose size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="ph-appointments-dosage-edit">
                                  <span>{pv.dosage || 'Not set'}</span>
                                  <button
                                    type="button"
                                    className="ph-dosage-icon-btn is-edit"
                                    title="Edit dosage"
                                    aria-label="Edit dosage"
                                    onClick={() => {
                                      setEditingDosageId(pv.id);
                                      setDosageInput(pv.dosage || '');
                                    }}
                                  >
                                    <IconPencil size={16} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                          );
                        })}
                        {visibleCompleted.map((item) => {
                          const pill = statusPill(item.status || 'Completed');
                          return (
                          <tr key={`done-${item.id}`}>
                            <td>{item.vaccine}</td>
                            <td>{item.date}</td>
                            <td>—</td>
                            <td>{item.location}</td>
                            <td>
                              <span className={`ph-status-pill ${pill.tone}`}>{pill.label}</span>
                            </td>
                            <td>—</td>
                          </tr>
                          );
                        })}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
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
    </div>
  );
}
