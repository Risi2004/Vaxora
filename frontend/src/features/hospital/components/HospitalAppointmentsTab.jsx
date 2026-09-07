import React, { useState } from 'react';

export default function HospitalAppointmentsTab() {
  // 1. Create a new schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    doctor: '',
    vaccineType: '',
    date: '',
    time: '',
  });

  // 2. Schedules list state (initialized with mockup data)
  const [schedules, setSchedules] = useState([
    {
      id: 1,
      doctor: 'Dr.peter',
      vaccine: 'Influenza',
      date: '2025-02-24',
      time: '11.30 am - 12.30 pm',
    },
  ]);

  // 3. Appointments list state (initialized with mockup data)
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      pName: 'Kalai',
      date: '2025-02-24',
      time: '11.30 am',
      vaccine: 'Influenza',
      status: 'pending', // 'pending' | 'accepted' | 'rejected'
    },
  ]);

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
      date: '',
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
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'accepted' } : app))
    );
    setNotification('Appointment confirmed!');
    setTimeout(() => setNotification(''), 2500);
  };

  const handleRejectAppointment = (id) => {
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'rejected' } : app))
    );
    setNotification('Appointment declined.');
    setTimeout(() => setNotification(''), 2500);
  };

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

      {/* Main Outer Card Container matching mockup */}
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
                  type="text"
                  name="date"
                  value={scheduleForm.date}
                  onChange={handleScheduleChange}
                  className="schedule-input-field"
                  placeholder="DD/MM/YYYY 📅"
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

          <div className="appointments-table-container">
            <table className="custom-appointments-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Doctor</th>
                  <th style={{ width: '20%' }}>Vaccine</th>
                  <th style={{ width: '20%' }}>Date</th>
                  <th style={{ width: '25%' }}>Time</th>
                  <th style={{ width: '15%', borderRight: 'none' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-appointments-cell">
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

        {/* 3. Appointments Table Section */}
        <div>
          <h2 className="schedule-section-heading">
            Appointments
          </h2>

          <div className="appointments-table-container">
            <table className="custom-appointments-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>P-Name</th>
                  <th style={{ width: '20%' }}>Date</th>
                  <th style={{ width: '18%' }}>Time</th>
                  <th style={{ width: '25%' }}>Vaccine</th>
                  <th style={{ width: '15%', borderRight: 'none' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-appointments-cell">
                      No patient appointments booked yet.
                    </td>
                  </tr>
                ) : (
                  appointments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.pName}</td>
                      <td>{item.date}</td>
                      <td>{item.time}</td>
                      <td>{item.vaccine}</td>
                      <td style={{ borderRight: 'none' }}>
                        {item.status === 'pending' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn-action-check"
                              title="Accept Appointment"
                              onClick={() => handleAcceptAppointment(item.id)}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="btn-action-reject"
                              title="Decline Appointment"
                              onClick={() => handleRejectAppointment(item.id)}
                            >
                              ✖
                            </button>
                          </div>
                        ) : item.status === 'accepted' ? (
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803d' }}>
                            Confirmed ✓
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>
                            Cancelled ✖
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
