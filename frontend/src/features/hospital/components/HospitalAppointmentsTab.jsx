import React, { useState } from 'react';

export default function HospitalAppointmentsTab() {
  // 1. Create a new schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    doctor: '',
    vaccineType: '',
    date: '2025-02-24',
    time: '',
  });

  // 2. Schedules list state
  const [schedules, setSchedules] = useState([
    {
      id: 1,
      doctor: 'Dr.peter',
      vaccine: 'Influenza',
      date: '2025-02-24',
      time: '11.30 am - 12.30 pm',
    },
    {
      id: 2,
      doctor: 'Dr. Samantha Perera',
      vaccine: 'COVID-19 Bivalent',
      date: '2025-02-24',
      time: '02.00 pm - 04.00 pm',
    },
    {
      id: 3,
      doctor: 'Dr. M. F. De Silva',
      vaccine: 'Hepatitis B',
      date: '2025-02-25',
      time: '09.00 am - 11.00 am',
    },
  ]);

  // 3. Appointments list state
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

  // 4. Filter Date state (kept as explicitly requested)
  const [filterDate, setFilterDate] = useState('2025-02-24');
  const [notification, setNotification] = useState('');

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    setScheduleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSchedule = (e) => {
    e.preventDefault();
    if (!scheduleForm.doctor || !scheduleForm.vaccineType || !scheduleForm.date || !scheduleForm.time) {
      alert('Please fill all fields (Doctor, Vaccine Type, Date, Time).');
      return;
    }

    setSchedules((prev) => [
      ...prev,
      {
        id: Date.now(),
        doctor: scheduleForm.doctor,
        vaccine: scheduleForm.vaccineType,
        date: scheduleForm.date,
        time: scheduleForm.time,
      },
    ]);

    setScheduleForm({
      doctor: '',
      vaccineType: '',
      date: '2025-02-24',
      time: '',
    });

    setNotification('New schedule created successfully!');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleCancelSchedule = (id) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    setNotification('Schedule cancelled.');
    setTimeout(() => setNotification(''), 2500);
  };

  const handleAcceptAppointment = (id) => {
    const target = appointments.find((a) => a.id === id);
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'accepted' } : app))
    );
    setNotification(`Appointment for ${target ? target.pName : 'patient'} confirmed!`);
    setTimeout(() => setNotification(''), 2500);
  };

  const handleRejectAppointment = (id) => {
    const target = appointments.find((a) => a.id === id);
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'rejected' } : app))
    );
    setNotification(`Appointment for ${target ? target.pName : 'patient'} declined.`);
    setTimeout(() => setNotification(''), 2500);
  };

  // Filter appointments according to filterDate
  const filteredAppointments = filterDate
    ? appointments.filter((app) => app.date === filterDate)
    : appointments;

  return (
    <div className="hospital-manage-appointments-wrapper">
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ maxWidth: '1060px', width: '100%', marginBottom: '20px' }}
        >
          ✓ {notification}
        </div>
      )}

      {/* Main Outer Card Container */}
      <div className="hospital-manage-appointments-card">
        <h1 className="hospital-manage-title">
          Manage Your Appointments
        </h1>

        {/* 1. Create a new schedule Card */}
        <div className="schedule-create-box">
          <h2 className="schedule-create-title">
            Create a new schedule
          </h2>

          <form onSubmit={handleAddSchedule}>
            <div className="schedule-inputs-row">
              {/* Doctor */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">Doctor</label>
                <input
                  type="text"
                  name="doctor"
                  value={scheduleForm.doctor}
                  onChange={handleScheduleChange}
                  className="schedule-input-field"
                  placeholder="Dr. Name"
                />
              </div>

              {/* Vaccine Type */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">Vaccine Type</label>
                <input
                  type="text"
                  name="vaccineType"
                  value={scheduleForm.vaccineType}
                  onChange={handleScheduleChange}
                  className="schedule-input-field"
                  placeholder="Vaccine"
                />
              </div>

              {/* Date */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">Date</label>
                <input
                  type="date"
                  name="date"
                  value={scheduleForm.date}
                  onChange={handleScheduleChange}
                  className="schedule-input-field"
                />
              </div>

              {/* Time */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">Time</label>
                <input
                  type="text"
                  name="time"
                  value={scheduleForm.time}
                  onChange={handleScheduleChange}
                  className="schedule-input-field"
                  placeholder="e.g. 11.30 am - 12.30 pm"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-add-schedule">
                Add Schedule
              </button>
            </div>
          </form>
        </div>

        {/* 2. Schedules Table Section */}
        <div style={{ marginBottom: '38px' }}>
          <h2 className="schedule-section-heading">
            Schedules
          </h2>

          <div className="hospital-appointments-table-wrapper">
            <table className="hospital-appointments-mockup-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Doctor</th>
                  <th style={{ width: '25%' }}>Vaccine</th>
                  <th style={{ width: '20%' }}>Date</th>
                  <th style={{ width: '20%' }}>Time</th>
                  <th style={{ width: '10%', borderRight: 'none' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      No active schedules created yet.
                    </td>
                  </tr>
                ) : (
                  schedules.map((item) => (
                    <tr key={item.id}>
                      <td>{item.doctor}</td>
                      <td>{item.vaccine}</td>
                      <td>{item.date}</td>
                      <td>{item.time}</td>
                      <td style={{ borderRight: 'none' }}>
                        <button
                          type="button"
                          className="btn-cancel-schedule"
                          onClick={() => handleCancelSchedule(item.id)}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Appointments Table Section with Date Filter */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <h2 className="schedule-section-heading" style={{ margin: 0 }}>
              Appointments
            </h2>

            {/* Filter Date Bar */}
            <div className="hospital-filter-group">
              <label htmlFor="hospital-filter-date" className="hospital-filter-label">
                <span>📅</span> Filter Date:
              </label>
              <input
                id="hospital-filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="hospital-filter-date-input"
                aria-label="Filter appointments by date"
              />
              <button
                type="button"
                className={`hospital-filter-btn ${!filterDate ? 'active' : ''}`}
                onClick={() => setFilterDate('')}
              >
                All Dates ({appointments.length})
              </button>
              <button
                type="button"
                className={`hospital-filter-btn ${filterDate === '2025-02-24' ? 'active' : ''}`}
                onClick={() => setFilterDate('2025-02-24')}
              >
                2025-02-24
              </button>
            </div>
          </div>

          <div className="hospital-appointments-table-wrapper">
            <table className="hospital-appointments-mockup-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>P-Name</th>
                  <th style={{ width: '20%' }}>Date</th>
                  <th style={{ width: '18%' }}>Time</th>
                  <th style={{ width: '24%' }}>Vaccine</th>
                  <th style={{ width: '16%', borderRight: 'none' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      No patient appointments found for date {filterDate}.{' '}
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
                      <td style={{ borderRight: 'none' }}>
                        {item.status === 'pending' ? (
                          <div className="mockup-actions-cell">
                            <button
                              type="button"
                              className="btn-mockup-check"
                              title="Accept Appointment"
                              onClick={() => handleAcceptAppointment(item.id)}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="btn-mockup-reject"
                              title="Decline Appointment"
                              onClick={() => handleRejectAppointment(item.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : item.status === 'accepted' ? (
                          <span className="mockup-status-badge accepted">
                            Confirmed ✓
                          </span>
                        ) : (
                          <span className="mockup-status-badge rejected">
                            Cancelled ✕
                          </span>
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
