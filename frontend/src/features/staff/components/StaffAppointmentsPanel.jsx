import React, { useCallback, useEffect, useMemo, useState } from 'react';
import staffAppointmentService from '../services/staffAppointmentService';

function toDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Shared doctor/nurse appointments roster.
 * - Doctors can switch among affiliated hospitals.
 * - Nurses are locked to their single hospital affiliation.
 * - No Action column (view-only roster).
 */
export default function StaffAppointmentsPanel({
  allowHospitalSwitch = true,
  facilitySuffix = '',
}) {
  const today = useMemo(() => toDateInputValue(), []);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalUserId, setSelectedHospitalUserId] = useState('');
  const [filterDate, setFilterDate] = useState(today);
  const [appointments, setAppointments] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [error, setError] = useState('');

  const selectedHospital = hospitals.find((h) => h.hospitalUserId === selectedHospitalUserId);

  const loadHospitals = useCallback(async () => {
    setLoadingHospitals(true);
    setError('');
    try {
      const list = await staffAppointmentService.getMyAffiliations();
      const active = (Array.isArray(list) ? list : []).filter(
        (a) => String(a.status).toLowerCase() === 'active'
      );
      setHospitals(active);
      if (active.length > 0) {
        setSelectedHospitalUserId((prev) =>
          prev && active.some((h) => h.hospitalUserId === prev)
            ? prev
            : active[0].hospitalUserId
        );
      } else {
        setSelectedHospitalUserId('');
      }
    } catch (err) {
      setError(err.message || 'Failed to load hospital affiliations.');
      setHospitals([]);
      setSelectedHospitalUserId('');
    } finally {
      setLoadingHospitals(false);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    if (!selectedHospitalUserId) {
      setAppointments([]);
      return;
    }

    setLoadingAppointments(true);
    setError('');
    try {
      const list = await staffAppointmentService.getHospitalAppointments(
        selectedHospitalUserId,
        filterDate || undefined
      );
      setAppointments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load appointments.');
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [selectedHospitalUserId, filterDate]);

  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const facilityTitle = selectedHospital
    ? `${selectedHospital.hospitalName || 'Hospital'}${facilitySuffix}`
    : loadingHospitals
      ? 'Loading hospital...'
      : 'No affiliated hospital';

  return (
    <div className="doctor-manage-appointments-wrapper">
      {error && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{
            maxWidth: '1060px',
            width: '100%',
            marginBottom: '20px',
            background: '#fef2f2',
            color: '#b91c1c',
            borderColor: '#fecaca',
          }}
        >
          {error}
        </div>
      )}

      <div className="doctor-manage-appointments-card">
        <h1 className="doctor-manage-title">Manage Your Appointments</h1>

        <div className="doctor-appointment-inner-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <h2 className="doctor-inner-facility-name" style={{ margin: 0 }}>
              {facilityTitle}
            </h2>

            {allowHospitalSwitch && hospitals.length > 1 && (
              <select
                className="doctor-filter-date-input"
                value={selectedHospitalUserId}
                onChange={(e) => setSelectedHospitalUserId(e.target.value)}
                aria-label="Select hospital"
                style={{ minWidth: 220 }}
              >
                {hospitals.map((h) => (
                  <option key={h.affiliationId || h.hospitalUserId} value={h.hospitalUserId}>
                    {h.hospitalName || h.hospitalUserId}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="doctor-appointments-filter-bar">
            <div className="doctor-filter-group">
              <label htmlFor="staff-filter-date" className="doctor-filter-label">
                <span>📅</span> Filter Date:
              </label>
              <input
                id="staff-filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="doctor-filter-date-input"
                aria-label="Filter appointments by date"
                disabled={!selectedHospitalUserId}
              />
              <button
                type="button"
                className={`doctor-filter-btn ${!filterDate ? 'active' : ''}`}
                onClick={() => setFilterDate('')}
                disabled={!selectedHospitalUserId}
              >
                All Dates
              </button>
              <button
                type="button"
                className={`doctor-filter-btn ${filterDate === today ? 'active' : ''}`}
                onClick={() => setFilterDate(today)}
                disabled={!selectedHospitalUserId}
              >
                {today} (Today)
              </button>
              <button
                type="button"
                className="doctor-filter-btn"
                onClick={loadAppointments}
                disabled={!selectedHospitalUserId || loadingAppointments}
              >
                Refresh
              </button>
            </div>

            <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
              {loadingAppointments
                ? 'Loading...'
                : `Showing ${appointments.length} appointment${appointments.length === 1 ? '' : 's'}`}
            </div>
          </div>

          <div className="doctor-appointments-table-wrapper">
            <table className="doctor-appointments-mockup-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>P-Name</th>
                  <th style={{ width: '22%' }}>Date</th>
                  <th style={{ width: '22%' }}>Time</th>
                  <th style={{ width: '28%' }}>Vaccine</th>
                </tr>
              </thead>
              <tbody>
                {!selectedHospitalUserId ? (
                  <tr>
                    <td colSpan={4} className="empty-table-cell">
                      {loadingHospitals
                        ? 'Loading affiliations...'
                        : 'No active hospital affiliation. Accept a hospital invitation first.'}
                    </td>
                  </tr>
                ) : loadingAppointments ? (
                  <tr>
                    <td colSpan={4} className="empty-table-cell">
                      Loading appointments...
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-table-cell">
                      No appointments found{filterDate ? ` for date ${filterDate}` : ''}.{' '}
                      {filterDate && (
                        <button
                          type="button"
                          onClick={() => setFilterDate('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#19469d',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            marginLeft: '6px',
                          }}
                        >
                          Show All Dates
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  appointments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.patientName}</td>
                      <td>{item.appointmentDate}</td>
                      <td>{item.timeSlot || item.startTime || '—'}</td>
                      <td>{item.vaccineName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
