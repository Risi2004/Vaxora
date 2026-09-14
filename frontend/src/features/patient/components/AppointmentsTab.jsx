import React, { useState, useEffect, useCallback } from 'react';
import { appointmentService } from '../services/appointmentService';

export default function AppointmentsTab() {
  const [vaccinesList, setVaccinesList] = useState([]);
  const [availableHospitals, setAvailableHospitals] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  const [loadingVaccines, setLoadingVaccines] = useState(true);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  const [formData, setFormData] = useState({
    vaccine: '',
    vaccineId: null,
    hospital: '',
    hospitalUserId: null,
    date: '',
    time: '',
    scheduleId: null,
    notes: '',
  });

  const [appointments, setAppointments] = useState([]);
  const [notification, setNotification] = useState('');

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // 1. Fetch available vaccines and hospitals from database
  useEffect(() => {
    const fetchVaccines = async () => {
      try {
        setLoadingVaccines(true);
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
              hospitals: (v.hospitals || []).map((h) => ({
                id: h.id, // Hospital user or profile ID
                userId: h.userId || h.id,
                name: h.name,
                location: h.district || h.location || 'Sri Lanka',
                type: h.type || 'Approved Hospital',
              })),
            }));
            setVaccinesList(mapped);
          }
        }
      } catch (err) {
        console.error('Error fetching vaccines with hospitals:', err);
      } finally {
        setLoadingVaccines(false);
      }
    };

    fetchVaccines();
  }, []);

  // 2. Fetch logged-in patient's saved appointments from database
  const loadMyAppointments = useCallback(async () => {
    try {
      setLoadingAppointments(true);
      const data = await appointmentService.getPatientAppointments();
      if (Array.isArray(data)) {
        setAppointments(data);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('Error loading patient appointments:', err);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    loadMyAppointments();
  }, [loadMyAppointments]);

  // 3. Handle Vaccine Selection Change
  const handleVaccineChange = (e) => {
    const selectedName = e.target.value;
    const selectedObj = vaccinesList.find((v) => v.name === selectedName);

    const hospitals = selectedObj?.hospitals || [];
    setAvailableHospitals(hospitals);
    setAvailableDates([]);
    setAvailableSlots([]);

    // Reset downstream fields
    setFormData({
      vaccine: selectedName,
      vaccineId: selectedObj?.id || null,
      hospital: '',
      hospitalUserId: null,
      date: '',
      time: '',
      scheduleId: null,
      notes: '',
    });
  };

  // 4. Handle Hospital Selection Change -> Loads available dates for vaccine
  const handleHospitalChange = async (e) => {
    const selectedHospitalUserId = e.target.value;
    const selectedHospitalObj = availableHospitals.find(
      (h) => String(h.userId || h.id) === String(selectedHospitalUserId)
    );

    const hospitalDisplayName = selectedHospitalObj
      ? `${selectedHospitalObj.name} (${selectedHospitalObj.location})`
      : '';

    setFormData((prev) => ({
      ...prev,
      hospital: hospitalDisplayName,
      hospitalUserId: selectedHospitalUserId,
      date: '',
      time: '',
      scheduleId: null,
    }));

    setAvailableDates([]);
    setAvailableSlots([]);

    if (selectedHospitalUserId && formData.vaccine) {
      try {
        setLoadingDates(true);
        const dates = await appointmentService.getAvailableDates(
          selectedHospitalUserId,
          formData.vaccine
        );
        setAvailableDates(Array.isArray(dates) ? dates : []);
      } catch (err) {
        console.error('Failed to load available dates:', err);
        setAvailableDates([]);
      } finally {
        setLoadingDates(false);
      }
    }
  };

  // 5. Handle Date Selection Change -> Loads available 20-minute time slots
  const handleDateChange = async (e) => {
    const selectedDate = e.target.value;
    const selectedDateObj = availableDates.find((d) => d.Date === selectedDate || d.date === selectedDate);

    setFormData((prev) => ({
      ...prev,
      date: selectedDate,
      time: '',
      scheduleId: selectedDateObj?.scheduleId || selectedDateObj?.ScheduleId || null,
    }));

    setAvailableSlots([]);

    if (formData.hospitalUserId && formData.vaccine && selectedDate) {
      try {
        setLoadingSlots(true);
        const slots = await appointmentService.getAvailableSlots(
          formData.hospitalUserId,
          formData.vaccine,
          selectedDate
        );
        setAvailableSlots(Array.isArray(slots) ? slots : []);
      } catch (err) {
        console.error('Failed to load available slots:', err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
  };

  // 6. Handle Time Slot Selection
  const handleTimeChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      time: e.target.value,
    }));
  };

  // 7. Handle Form Submission -> Persists Appointment to Database
  const handleBook = async (e) => {
    e.preventDefault();
    if (!formData.vaccine || !formData.hospitalUserId || !formData.date || !formData.time) {
      alert('Please complete all steps (Vaccine, Hospital, Date, and Time).');
      return;
    }

    const payload = {
      hospitalUserId: formData.hospitalUserId,
      vaccineName: formData.vaccine,
      vaccineId: formData.vaccineId,
      vaccineScheduleId: formData.scheduleId,
      appointmentDate: formData.date,
      timeSlot: formData.time,
      notes: formData.notes || null,
    };

    try {
      setSubmitting(true);
      await appointmentService.bookAppointment(payload);
      showToast('Appointment reserved and saved successfully in database!');

      // Reset form
      setFormData({
        vaccine: '',
        vaccineId: null,
        hospital: '',
        hospitalUserId: null,
        date: '',
        time: '',
        scheduleId: null,
        notes: '',
      });
      setAvailableHospitals([]);
      setAvailableDates([]);
      setAvailableSlots([]);

      // Reload appointments from database
      await loadMyAppointments();
    } catch (err) {
      alert(`Booking failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 8. Handle Appointment Cancellation
  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment slot?')) {
      try {
        await appointmentService.cancelAppointment(id);
        showToast('Appointment cancelled successfully.');
        await loadMyAppointments();
      } catch (err) {
        alert(`Failed to cancel appointment: ${err.message}`);
      }
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
    if (!formData.hospitalUserId) {
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
        text: availableDates.length > 0
          ? `Step 3: Choose an available session date (${availableDates.length} date(s) found).`
          : 'Step 3: Checking available schedule dates from hospital...',
      };
    }
    if (!formData.time) {
      return {
        type: 'guide-prompt',
        icon: '⏰',
        text: 'Step 4: Select an available 20-minute time slot.',
      };
    }
    return {
      type: 'guide-success',
      icon: '✅',
      text: 'Ready! Click "Book Appointment" to reserve your vaccination slot.',
    };
  };

  const stepInfo = getStepGuide();
  const isVaccineSelected = Boolean(formData.vaccine);
  const isHospitalSelected = Boolean(formData.hospitalUserId);
  const isDateSelected = Boolean(formData.date);
  const isFormComplete = Boolean(formData.vaccine && formData.hospitalUserId && formData.date && formData.time);

  return (
    <div className="manage-appointments-wrapper">
      {/* Outer White Card Container */}
      <div className="manage-appointments-card">
        {/* Main Heading */}
        <h1 className="manage-appointments-title">
          Manage Your Appointments
        </h1>

        {/* Notification Alert */}
        {notification && (
          <div className="appointment-alert-pill" role="alert">
            ✓ {notification}
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
                    disabled={loadingVaccines}
                    required
                  >
                    <option value="" disabled>
                      {loadingVaccines ? 'Loading vaccines from database...' : 'Select Vaccine'}
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
                    name="hospitalUserId"
                    value={formData.hospitalUserId || ''}
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
                      <option key={hosp.userId || hosp.id} value={hosp.userId || hosp.id}>
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

              {/* 3. Available Date Dropdown (Unlocked after Hospital is chosen) */}
              <div className="book-form-group">
                <label
                  className={`book-form-label ${!isHospitalSelected ? 'disabled' : ''}`}
                  htmlFor="select-date"
                >
                  Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className={`select-dropdown-wrap ${!isHospitalSelected ? 'disabled' : ''}`}>
                  <select
                    id="select-date"
                    name="date"
                    value={formData.date}
                    onChange={handleDateChange}
                    className="book-form-select"
                    disabled={!isHospitalSelected || loadingDates}
                    required
                  >
                    <option value="" disabled>
                      {!isHospitalSelected
                        ? 'Select Hospital first...'
                        : loadingDates
                        ? 'Loading available schedule dates...'
                        : availableDates.length === 0
                        ? 'No upcoming sessions scheduled by hospital'
                        : 'Select Available Date'}
                    </option>
                    {availableDates.map((d) => {
                      const dateVal = d.date || d.Date;
                      const display = d.displayText || d.DisplayText || `${dateVal} (${d.dayOfWeek || d.DayOfWeek})`;
                      return (
                        <option key={dateVal} value={dateVal}>
                          📅 {display}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {!isHospitalSelected ? (
                  <span className="field-helper-hint">
                    Select a hospital to enable date selection
                  </span>
                ) : loadingDates ? (
                  <span className="field-helper-hint">
                    Fetching hospital immunization schedules...
                  </span>
                ) : availableDates.length === 0 ? (
                  <span className="field-helper-hint hint-warning">
                    ⚠️ Hospital has not yet posted active schedule slots for this vaccine.
                  </span>
                ) : (
                  <span className="field-helper-hint hint-success">
                    ✓ {availableDates.length} upcoming session date(s) available
                  </span>
                )}
              </div>

              {/* 4. 20-Minute Time Slot Dropdown (Unlocked after Date is chosen) */}
              <div className="book-form-group">
                <label
                  className={`book-form-label ${!isDateSelected ? 'disabled' : ''}`}
                  htmlFor="select-time"
                >
                  Time Slot (20-Minute Sessions) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className={`select-dropdown-wrap ${!isDateSelected ? 'disabled' : ''}`}>
                  <select
                    id="select-time"
                    name="time"
                    value={formData.time}
                    onChange={handleTimeChange}
                    className="book-form-select"
                    disabled={!isDateSelected || loadingSlots}
                    required
                  >
                    <option value="" disabled>
                      {!isDateSelected
                        ? 'Select Date first...'
                        : loadingSlots
                        ? 'Loading 20-minute slots...'
                        : availableSlots.length === 0
                        ? 'No slots available'
                        : 'Select 20-Min Time Slot'}
                    </option>
                    {availableSlots.map((slotObj) => {
                      const slotText = slotObj.slot || slotObj.Slot;
                      const isBooked = slotObj.isBooked || slotObj.IsBooked;
                      return (
                        <option
                          key={slotText}
                          value={slotText}
                          disabled={isBooked}
                          style={isBooked ? { color: '#94a3b8', background: '#f1f5f9' } : { color: '#0f172a' }}
                        >
                          {isBooked ? `⛔ ${slotText} (Booked - Unavailable)` : `🟢 ${slotText} (Available)`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {!isDateSelected ? (
                  <span className="field-helper-hint">
                    Select a date to view available 20-min slots
                  </span>
                ) : loadingSlots ? (
                  <span className="field-helper-hint">
                    Calculating 20-minute intervals and checking existing bookings...
                  </span>
                ) : availableSlots.filter((s) => !s.isBooked && !s.IsBooked).length === 0 ? (
                  <span className="field-helper-hint hint-warning">
                    ⚠️ All 20-minute slots on this date are fully booked. Please select another date.
                  </span>
                ) : (
                  <span className="field-helper-hint hint-success">
                    ✓ {availableSlots.filter((s) => !s.isBooked && !s.IsBooked).length} slot(s) open for booking (each slot = 20 min)
                  </span>
                )}
              </div>
            </div>

            {/* Book Appointment CTA Button */}
            <div className="book-btn-wrap">
              <button
                type="submit"
                className="btn-book-appointment"
                disabled={!isFormComplete || submitting}
                title={
                  !isFormComplete
                    ? 'Please complete all steps to book your appointment'
                    : 'Click to book appointment'
                }
              >
                {submitting ? 'Reserving Slot...' : 'Book Appointment'}
              </button>
            </div>
          </form>
        </div>

        {/* Appointments Lower Section */}
        <div className="appointments-list-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="appointments-section-heading" style={{ margin: 0 }}>
              Appointments
            </h2>
            <button
              type="button"
              className="hospital-filter-btn"
              onClick={loadMyAppointments}
              disabled={loadingAppointments}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              🔄 Refresh
            </button>
          </div>

          <div className="appointments-table-container">
            <table className="custom-appointments-table">
              <thead>
                <tr>
                  <th className="th-vaccine">Vaccine</th>
                  <th className="th-date">Date</th>
                  <th className="th-time">Time Slot</th>
                  <th className="th-location">Hospital / Center</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
                  <th className="th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingAppointments ? (
                  <tr>
                    <td colSpan="6" className="empty-appointments-cell">
                      Loading your appointments from database...
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-appointments-cell">
                      No current appointments scheduled. Select a vaccine above to book your slot.
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt.id || apt.Id}>
                      <td className="td-vaccine">
                        <div style={{ fontWeight: 600 }}>{apt.vaccineName || apt.vaccine}</div>
                        {apt.doctorName && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Dr. {apt.doctorName}
                          </div>
                        )}
                      </td>
                      <td className="td-date">{apt.appointmentDate || apt.date}</td>
                      <td className="td-time">
                        <span style={{ fontWeight: 600, color: '#1e40af' }}>
                          {apt.timeSlot || apt.time}
                        </span>
                      </td>
                      <td className="td-location">{apt.hospitalName || apt.location}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor:
                              (apt.status || '').toLowerCase() === 'confirmed'
                                ? '#dcfce7'
                                : (apt.status || '').toLowerCase() === 'cancelled'
                                ? '#fee2e2'
                                : '#e0f2fe',
                            color:
                              (apt.status || '').toLowerCase() === 'confirmed'
                                ? '#15803d'
                                : (apt.status || '').toLowerCase() === 'cancelled'
                                ? '#b91c1c'
                                : '#0369a1',
                          }}
                        >
                          {apt.status || 'Confirmed'}
                        </span>
                      </td>
                      <td className="td-action">
                        {(apt.status || '').toLowerCase() !== 'cancelled' ? (
                          <button
                            type="button"
                            className="btn-cancel-appointment"
                            onClick={() => handleCancel(apt.id || apt.Id)}
                            title="Cancel this appointment slot"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Cancelled</span>
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
