import React, { useState } from 'react';

export default function AppointmentsTab() {
  const [formData, setFormData] = useState({
    vaccine: '',
    hospital: '',
    date: '',
    time: '',
  });

  const [appointments, setAppointments] = useState([
    {
      id: 1,
      vaccine: 'Influenza',
      date: '2025-02-24',
      time: '11.30 am',
      location: 'Delmon hospital',
    },
  ]);

  const [notification, setNotification] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBook = (e) => {
    e.preventDefault();
    if (!formData.vaccine || !formData.hospital || !formData.date || !formData.time) {
      alert('Please select all required fields (Vaccine, Hospital, Date, and Time).');
      return;
    }

    const newApt = {
      id: Date.now(),
      vaccine: formData.vaccine,
      date: formData.date,
      time: formData.time,
      location: formData.hospital,
    };

    setAppointments((prev) => [newApt, ...prev]);
    setFormData({ vaccine: '', hospital: '', date: '', time: '' });
    setNotification('Appointment booked successfully!');
    setTimeout(() => setNotification(''), 4000);
  };

  const handleCancel = (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      setAppointments((prev) => prev.filter((apt) => apt.id !== id));
      setNotification('Appointment cancelled.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  return (
    <div className="manage-appointments-wrapper">
      {/* Outer White Card Container matching screenshot */}
      <div className="manage-appointments-card">
        {/* Main Heading */}
        <h1 className="manage-appointments-title">
          Manage Your Appointments
        </h1>

        {/* Notification Alert */}
        {notification && (
          <div className="appointment-alert-pill" role="alert">
            {notification}
          </div>
        )}

        {/* Inner Light Blue Card: Book a New Appointment */}
        <div className="book-appointment-box">
          <h2 className="book-appointment-heading">
            Book a New Appointment
          </h2>

          <form onSubmit={handleBook} className="book-appointment-form">
            <div className="book-form-grid">
              {/* Select Vaccine */}
              <div className="book-form-group">
                <label className="book-form-label" htmlFor="select-vaccine">
                  Select Vaccine
                </label>
                <div className="select-dropdown-wrap">
                  <select
                    id="select-vaccine"
                    name="vaccine"
                    value={formData.vaccine}
                    onChange={handleChange}
                    className="book-form-select"
                    required
                  >
                    <option value="" disabled>
                      Select Vaccine
                    </option>
                    <option value="Influenza">Influenza</option>
                    <option value="COVID-19 Booster">COVID-19 mRNA Booster</option>
                    <option value="Hepatitis B">Hepatitis B (Recombinant)</option>
                    <option value="Tetanus, Diphtheria (Td)">Tetanus, Diphtheria (Td)</option>
                    <option value="HPV 9-Valent">HPV 9-Valent (Gardasil)</option>
                    <option value="Yellow Fever">Yellow Fever</option>
                  </select>
                </div>
              </div>

              {/* Select Hospital */}
              <div className="book-form-group">
                <label className="book-form-label" htmlFor="select-hospital">
                  Select Hospital
                </label>
                <div className="select-dropdown-wrap">
                  <select
                    id="select-hospital"
                    name="hospital"
                    value={formData.hospital}
                    onChange={handleChange}
                    className="book-form-select"
                    required
                  >
                    <option value="" disabled>
                      Select Hospital
                    </option>
                    <option value="Delmon hospital">Delmon hospital</option>
                    <option value="National Hospital of Sri Lanka">National Hospital of Sri Lanka</option>
                    <option value="Asiri Central Hospital">Asiri Central Hospital</option>
                    <option value="The Lanka Hospitals">The Lanka Hospitals</option>
                    <option value="Durdans Hospital">Durdans Hospital</option>
                    <option value="Teaching Hospital Kandy">Teaching Hospital Kandy</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="book-form-group">
                <label className="book-form-label" htmlFor="select-date">
                  Date
                </label>
                <div className="date-input-wrap">
                  <input
                    id="select-date"
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="book-form-input date-picker"
                    required
                  />
                </div>
              </div>

              {/* Time */}
              <div className="book-form-group">
                <label className="book-form-label" htmlFor="select-time">
                  Time
                </label>
                <div className="select-dropdown-wrap">
                  <select
                    id="select-time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="book-form-select"
                    required
                  >
                    <option value="" disabled>
                      Select Time
                    </option>
                    <option value="09.00 am">09.00 am</option>
                    <option value="10.30 am">10.30 am</option>
                    <option value="11.30 am">11.30 am</option>
                    <option value="02.00 pm">02.00 pm</option>
                    <option value="03.30 pm">03.30 pm</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Book Appointment CTA Button */}
            <div className="book-btn-wrap">
              <button type="submit" className="btn-book-appointment">
                Book Appointment
              </button>
            </div>
          </form>
        </div>

        {/* Appointments Lower Section */}
        <div className="appointments-list-section">
          <h2 className="appointments-section-heading">
            Appointments
          </h2>

          <div className="appointments-table-container">
            <table className="custom-appointments-table">
              <thead>
                <tr>
                  <th className="th-vaccine">Vaccine</th>
                  <th className="th-date">Date</th>
                  <th className="th-time">Time</th>
                  <th className="th-location">Location</th>
                  <th className="th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-appointments-cell">
                      No current appointments scheduled.
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt.id}>
                      <td className="td-vaccine">{apt.vaccine}</td>
                      <td className="td-date">{apt.date}</td>
                      <td className="td-time">{apt.time}</td>
                      <td className="td-location">{apt.location}</td>
                      <td className="td-action">
                        <button
                          type="button"
                          className="btn-cancel-appointment"
                          onClick={() => handleCancel(apt.id)}
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
      </div>
    </div>
  );
}
