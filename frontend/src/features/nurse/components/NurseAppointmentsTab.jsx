import React, { useState } from 'react';

export default function NurseAppointmentsTab() {
  // 1. Date Filter State (defaulted to mockup date 2025-02-24)
  const [filterDate, setFilterDate] = useState('2025-02-24');

  // 2. Appointments State
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      pName: 'Kalai',
      date: '2025-02-24',
      time: '11.30 am',
      vaccine: 'Influenza',
      status: 'pending', // 'pending' | 'accepted' | 'rejected'
    },
    {
      id: 2,
      pName: 'Nimal Perera',
      date: '2025-02-24',
      time: '02.15 pm',
      vaccine: 'COVID-19 Booster',
      status: 'pending',
    },
    {
      id: 3,
      pName: 'Sanduni Malshani',
      date: '2025-02-25',
      time: '09.45 am',
      vaccine: 'MMR Booster',
      status: 'accepted',
    },
    {
      id: 4,
      pName: 'Rohan Jayatillake',
      date: '2025-02-25',
      time: '11.00 am',
      vaccine: 'Hepatitis B',
      status: 'pending',
    },
    {
      id: 5,
      pName: 'Kasun Fernando',
      date: '2025-02-26',
      time: '10.30 am',
      vaccine: 'Influenza',
      status: 'pending',
    },
  ]);

  const [notification, setNotification] = useState('');

  const handleAcceptAppointment = (id) => {
    const target = appointments.find((a) => a.id === id);
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'accepted' } : app))
    );
    setNotification(`Appointment for ${target ? target.pName : 'patient'} checked in & confirmed for station!`);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleRejectAppointment = (id) => {
    const target = appointments.find((a) => a.id === id);
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'rejected' } : app))
    );
    setNotification(`Appointment for ${target ? target.pName : 'patient'} declined.`);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleResetAppointment = (id) => {
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'pending' } : app))
    );
    setNotification('Appointment status restored to pending.');
    setTimeout(() => setNotification(''), 2500);
  };

  // Filter appointments according to filterDate
  const filteredAppointments = filterDate
    ? appointments.filter((app) => app.date === filterDate)
    : appointments;

  return (
    <div className="doctor-manage-appointments-wrapper">
      {/* Dynamic Feedback Notification Banner */}
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ maxWidth: '1060px', width: '100%', marginBottom: '20px' }}
        >
          ✓ {notification}
        </div>
      )}

      {/* Main Outer Card Container matching mockup */}
      <div className="doctor-manage-appointments-card">
        <h1 className="doctor-manage-title">
          Manage Your Appointments
        </h1>

        {/* Inner Card Container matching mockup */}
        <div className="doctor-appointment-inner-card">
          <h2 className="doctor-inner-facility-name">
            Lanka Hospital - Nursing Station
          </h2>

          {/* Filter Date Bar */}
          <div className="doctor-appointments-filter-bar">
            <div className="doctor-filter-group">
              <label htmlFor="nurse-filter-date" className="doctor-filter-label">
                <span>📅</span> Filter Date:
              </label>
              <input
                id="nurse-filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="doctor-filter-date-input"
                aria-label="Filter appointments by date"
              />
              <button
                type="button"
                className={`doctor-filter-btn ${!filterDate ? 'active' : ''}`}
                onClick={() => setFilterDate('')}
              >
                All Dates ({appointments.length})
              </button>
              <button
                type="button"
                className={`doctor-filter-btn ${filterDate === '2025-02-24' ? 'active' : ''}`}
                onClick={() => setFilterDate('2025-02-24')}
              >
                2025-02-24 (Today)
              </button>
            </div>

            <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
              Showing {filteredAppointments.length} appointment{filteredAppointments.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Appointments Table matching Mockup */}
          <div className="doctor-appointments-table-wrapper">
            <table className="doctor-appointments-mockup-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>P-Name</th>
                  <th style={{ width: '20%' }}>Date</th>
                  <th style={{ width: '18%' }}>Time</th>
                  <th style={{ width: '24%' }}>Vaccine</th>
                  <th style={{ width: '16%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      No appointments found for date {filterDate}.{' '}
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
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.pName}</td>
                      <td>{item.date}</td>
                      <td>{item.time}</td>
                      <td>{item.vaccine}</td>
                      <td>
                        {item.status === 'pending' ? (
                          <div className="mockup-actions-cell">
                            <button
                              type="button"
                              className="btn-mockup-check"
                              title="Confirm / Check In Patient"
                              aria-label={`Confirm appointment for ${item.pName}`}
                              onClick={() => handleAcceptAppointment(item.id)}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="btn-mockup-reject"
                              title="Decline / Reject Appointment"
                              aria-label={`Decline appointment for ${item.pName}`}
                              onClick={() => handleRejectAppointment(item.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : item.status === 'accepted' ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="mockup-status-badge accepted">
                              ✓ Confirmed
                            </span>
                            <button
                              type="button"
                              className="mockup-undo-btn"
                              title="Restore appointment to pending"
                              onClick={() => handleResetAppointment(item.id)}
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="mockup-status-badge rejected">
                              ✕ Declined
                            </span>
                            <button
                              type="button"
                              className="mockup-undo-btn"
                              title="Restore appointment to pending"
                              onClick={() => handleResetAppointment(item.id)}
                            >
                              Undo
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
      </div>
    </div>
  );
}
