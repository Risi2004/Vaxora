import React, { useState, useEffect } from 'react';

const TIME_SLOTS = [
  '09.00 am',
  '10.30 am',
  '11.30 am',
  '02.00 pm',
  '03.30 pm',
  '04.30 pm',
];

export default function AppointmentsTab() {
  const [vaccinesList, setVaccinesList] = useState([]);
  const [availableHospitals, setAvailableHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    vaccine: '',
    hospital: '',
    date: '',
    time: '',
  });

  const [appointments, setAppointments] = useState([]);
  const [notification, setNotification] = useState('');

  // Fetch live vaccines & hospital offerings strictly from database API
  useEffect(() => {
    const fetchVaccines = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('vaxora_token') || sessionStorage.getItem('vaxora_token');
        const res = await fetch('/api/inventory/vaccines-with-hospitals', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const apiVaccines = await res.json();
          if (Array.isArray(apiVaccines)) {
            const mapped = apiVaccines.map((v) => ({
              id: v.id,
              name: v.name,
              category: v.category || 'Routine',
              manufacturer: v.manufacturer || '',
              // Hospitals offering this vaccine strictly from database HospitalFormularies
              hospitals: (v.hospitals || []).map((h) => ({
                id: h.id,
                name: h.name,
                location: h.district || h.location || 'Sri Lanka',
                type: h.type || 'Approved Hospital',
              })),
            }));
            setVaccinesList(mapped);
          }
        }
      } catch (err) {
        console.error('Error fetching live vaccines from DB:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaccines();
  }, []);

  // Today's minimum selectable date (ISO format YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  // 1. Handle Vaccine Selection Change
  const handleVaccineChange = (e) => {
    const selectedName = e.target.value;
    const selectedObj = vaccinesList.find((v) => v.name === selectedName);
    
    const hospitals = selectedObj?.hospitals || [];
    setAvailableHospitals(hospitals);

    // Reset downstream fields when vaccine changes
    setFormData({
      vaccine: selectedName,
      hospital: '',
      date: '',
      time: '',
    });
  };

  // 2. Handle Hospital Selection Change
  const handleHospitalChange = (e) => {
    const selectedHospital = e.target.value;
    setFormData((prev) => ({
      ...prev,
      hospital: selectedHospital,
      date: '',
      time: '',
    }));
  };

  // 3. Handle Date & Time Changes
  const handleDateChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      date: e.target.value,
      time: '',
    }));
  };

  const handleTimeChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      time: e.target.value,
    }));
  };

  // 4. Handle Form Submission
  const handleBook = (e) => {
    e.preventDefault();
    if (!formData.vaccine || !formData.hospital || !formData.date || !formData.time) {
      alert('Please complete all steps (Vaccine, Hospital, Date, and Time).');
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
    setAvailableHospitals([]);
    setNotification('Appointment booked successfully!');
    setTimeout(() => setNotification(''), 4000);
  };

  // 5. Handle Appointment Cancellation
  const handleCancel = (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      setAppointments((prev) => prev.filter((apt) => apt.id !== id));
      setNotification('Appointment cancelled.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Dynamic step message
  const getStepGuide = () => {
    if (!formData.vaccine) {
      return {
        type: 'guide-prompt',
        icon: '👉',
        text: 'Step 1: Please select a vaccine from the list below to check which hospitals are offering it.',
      };
    }
    if (availableHospitals.length === 0) {
      return {
        type: 'guide-warning',
        icon: '⚠️',
        text: `No hospitals are currently offering "${formData.vaccine}". Please select another vaccine.`,
      };
    }
    if (!formData.hospital) {
      return {
        type: 'guide-success',
        icon: '🏥',
        text: `Step 2: ${availableHospitals.length} hospital(s) found offering ${formData.vaccine}. Choose your preferred hospital.`,
      };
    }
    if (!formData.date) {
      return {
        type: 'guide-prompt',
        icon: '📅',
        text: 'Step 3: Select your preferred appointment date.',
      };
    }
    if (!formData.time) {
      return {
        type: 'guide-prompt',
        icon: '⏰',
        text: 'Step 4: Select an available time slot.',
      };
    }
    return {
      type: 'guide-success',
      icon: '✅',
      text: 'Ready! Click "Book Appointment" to confirm your vaccination slot.',
    };
  };

  const stepInfo = getStepGuide();
  const isVaccineSelected = Boolean(formData.vaccine);
  const isHospitalSelected = Boolean(formData.hospital);
  const isDateSelected = Boolean(formData.date);
  const isFormComplete = Boolean(formData.vaccine && formData.hospital && formData.date && formData.time);

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

          {/* Dynamic Step Guidance Prompt */}
          <div className={`booking-step-guide ${stepInfo.type}`}>
            <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>{stepInfo.icon}</span>
            <span>{stepInfo.text}</span>
          </div>

          <form onSubmit={handleBook} className="book-appointment-form">
            <div className="book-form-grid">
              {/* 1. Select Vaccine (Always Enabled) */}
              <div className="book-form-group">
                <label className="book-form-label" htmlFor="select-vaccine">
                  Select Vaccine <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className="select-dropdown-wrap">
                  <select
                    id="select-vaccine"
                    name="vaccine"
                    value={formData.vaccine}
                    onChange={handleVaccineChange}
                    className="book-form-select"
                    disabled={isLoading}
                    required
                  >
                    <option value="" disabled>
                      {isLoading ? 'Loading vaccines from database...' : 'Select Vaccine'}
                    </option>
                    {vaccinesList.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name} ({v.category})
                      </option>
                    ))}
                  </select>
                </div>
                {!isVaccineSelected ? (
                  <span className="field-helper-hint hint-warning">
                    * Required: Select a vaccine to unlock hospital list
                  </span>
                ) : (
                  <span className="field-helper-hint hint-success">
                    ✓ Vaccine selected: {formData.vaccine}
                  </span>
                )}
              </div>

              {/* 2. Select Hospital (Disabled until Vaccine is chosen) */}
              <div className="book-form-group">
                <label
                  className={`book-form-label ${!isVaccineSelected ? 'disabled' : ''}`}
                  htmlFor="select-hospital"
                >
                  Select Hospital <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className={`select-dropdown-wrap ${!isVaccineSelected ? 'disabled' : ''}`}>
                  <select
                    id="select-hospital"
                    name="hospital"
                    value={formData.hospital}
                    onChange={handleHospitalChange}
                    className="book-form-select"
                    disabled={!isVaccineSelected || availableHospitals.length === 0}
                    required
                  >
                    <option value="" disabled>
                      {!isVaccineSelected
                        ? 'Select Vaccine first...'
                        : availableHospitals.length === 0
                        ? 'No hospitals offering this vaccine'
                        : 'Select Hospital'}
                    </option>
                    {availableHospitals.map((hosp) => (
                      <option key={hosp.id} value={`${hosp.name} (${hosp.location})`}>
                        {hosp.name} - {hosp.location}
                      </option>
                    ))}
                  </select>
                </div>
                {isVaccineSelected && availableHospitals.length > 0 && (
                  <span className="field-helper-hint hint-success">
                    ✓ {availableHospitals.length} hospital(s) offering this vaccine
                  </span>
                )}
                {isVaccineSelected && availableHospitals.length === 0 && (
                  <span className="field-helper-hint hint-warning">
                    ⚠️ No hospitals currently offer this vaccine
                  </span>
                )}
              </div>

              {/* 3. Date (Disabled until Hospital is chosen) */}
              <div className="book-form-group">
                <label
                  className={`book-form-label ${!isHospitalSelected ? 'disabled' : ''}`}
                  htmlFor="select-date"
                >
                  Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className={`date-input-wrap ${!isHospitalSelected ? 'disabled' : ''}`}>
                  <input
                    id="select-date"
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleDateChange}
                    min={today}
                    disabled={!isHospitalSelected}
                    className="book-form-input date-picker"
                    required
                  />
                </div>
                {!isHospitalSelected && (
                  <span className="field-helper-hint">
                    Select a hospital to enable date selection
                  </span>
                )}
              </div>

              {/* 4. Time (Disabled until Date is chosen) */}
              <div className="book-form-group">
                <label
                  className={`book-form-label ${!isDateSelected ? 'disabled' : ''}`}
                  htmlFor="select-time"
                >
                  Time <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className={`select-dropdown-wrap ${!isDateSelected ? 'disabled' : ''}`}>
                  <select
                    id="select-time"
                    name="time"
                    value={formData.time}
                    onChange={handleTimeChange}
                    className="book-form-select"
                    disabled={!isDateSelected}
                    required
                  >
                    <option value="" disabled>
                      {!isDateSelected ? 'Select Date first...' : 'Select Time'}
                    </option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                {!isDateSelected && (
                  <span className="field-helper-hint">
                    Select a date to view available time slots
                  </span>
                )}
              </div>
            </div>

            {/* Book Appointment CTA Button */}
            <div className="book-btn-wrap">
              <button
                type="submit"
                className="btn-book-appointment"
                disabled={!isFormComplete}
                title={
                  !isFormComplete
                    ? 'Please complete all steps to book your appointment'
                    : 'Click to book appointment'
                }
              >
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
