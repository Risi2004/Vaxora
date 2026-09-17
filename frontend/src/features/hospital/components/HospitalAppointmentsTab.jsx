import React, { useState, useEffect, useCallback } from 'react';
import { staffService } from '../services/staffService';
import { inventoryService } from '../services/inventoryService';
import { scheduleService } from '../services/scheduleService';
import { appointmentService } from '../../patient/services/appointmentService';

const DAYS_OF_WEEK = [
  { key: 'Monday', label: 'Mon' },
  { key: 'Tuesday', label: 'Tue' },
  { key: 'Wednesday', label: 'Wed' },
  { key: 'Thursday', label: 'Thu' },
  { key: 'Friday', label: 'Fri' },
  { key: 'Saturday', label: 'Sat' },
  { key: 'Sunday', label: 'Sun' },
];

export default function HospitalAppointmentsTab() {
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Today and 3 months ahead helper dates
  const todayStr = new Date().toISOString().split('T')[0];
  const threeMonthsAhead = new Date();
  threeMonthsAhead.setMonth(threeMonthsAhead.getMonth() + 3);
  const defaultEndDateStr = threeMonthsAhead.toISOString().split('T')[0];

  // 1. Create a new schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    scheduleType: 'OneTime', // 'OneTime' | 'Weekly'
    doctor: '',
    nurse: '',
    vaccineType: '',
    specificDate: todayStr,
    daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
    startDate: todayStr,
    endDate: defaultEndDateStr,
    startTime: '09:00',
    endTime: '11:00',
    price: '0.00',
  });

  // 2. Appointments list state (mock/live)
  const [appointments, setAppointments] = useState([]);

  // 3. Filter Date state
  const [filterDate, setFilterDate] = useState(todayStr);
  const [notification, setNotification] = useState('');

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // Fetch hospital staff (doctors and nurses) & formulary vaccines from database
  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      const [staffData, formularyData, globalVaccinesData] = await Promise.allSettled([
        staffService.getHospitalStaff({ status: 'All' }),
        inventoryService.getFormulary(),
        inventoryService.getGlobalVaccines(),
      ]);

      // Process Database Staff (Doctors & Nurses)
      if (staffData.status === 'fulfilled' && Array.isArray(staffData.value)) {
        const staffList = staffData.value;
        const docs = staffList.filter(
          (s) => String(s.staffRole).toUpperCase() === 'DOCTOR' || s.role === 'DOCTOR'
        );
        const nrs = staffList.filter(
          (s) => String(s.staffRole).toUpperCase() === 'NURSE' || s.role === 'NURSE'
        );

        setDoctors(
          docs.map((d) => ({
            id: d.staffUserId || d.id,
            name: d.staffName || d.fullName || `Dr. ${d.registrationNumber}`,
            specialization: d.specialization || 'Physician',
            registrationNumber: d.registrationNumber,
          }))
        );

        setNurses(
          nrs.map((n) => ({
            id: n.staffUserId || n.id,
            name: n.staffName || n.fullName || `Nurse ${n.registrationNumber}`,
            registrationNumber: n.registrationNumber,
          }))
        );
      } else {
        setDoctors([]);
        setNurses([]);
      }

      // Process Database Vaccines (Hospital Formulary or Global Catalog)
      const vaccineList = [];
      if (formularyData.status === 'fulfilled' && Array.isArray(formularyData.value) && formularyData.value.length > 0) {
        formularyData.value.forEach((f) => {
          vaccineList.push({
            id: f.id || f.vaccineId,
            name: f.vaccineName,
            manufacturer: f.manufacturer || '',
          });
        });
      } else if (globalVaccinesData.status === 'fulfilled' && Array.isArray(globalVaccinesData.value) && globalVaccinesData.value.length > 0) {
        globalVaccinesData.value.forEach((v) => {
          vaccineList.push({
            id: v.id,
            name: v.name,
            manufacturer: v.manufacturer || '',
          });
        });
      }

      setVaccines(vaccineList);
    } catch (err) {
      console.error('Failed to load appointment schedule options:', err);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  // Fetch saved schedules from database
  const loadSchedules = useCallback(async () => {
    try {
      setLoadingSchedules(true);
      const data = await scheduleService.getHospitalSchedules();
      if (Array.isArray(data)) {
        setSchedules(data);
      } else {
        setSchedules([]);
      }
    } catch (err) {
      console.error('Failed to load hospital schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  // Fetch appointments for this hospital from database
  const loadHospitalAppointments = useCallback(async () => {
    try {
      const data = await appointmentService.getHospitalAppointments();
      if (Array.isArray(data)) {
        setAppointments(data);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('Failed to load hospital appointments:', err);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    loadSchedules();
    loadHospitalAppointments();
  }, [loadOptions, loadSchedules, loadHospitalAppointments]);

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    setScheduleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleDay = (dayKey) => {
    setScheduleForm((prev) => {
      const exists = prev.daysOfWeek.includes(dayKey);
      const nextDays = exists
        ? prev.daysOfWeek.filter((d) => d !== dayKey)
        : [...prev.daysOfWeek, dayKey];
      return { ...prev, daysOfWeek: nextDays };
    });
  };

  const handleSelectAllDays = () => {
    setScheduleForm((prev) => ({
      ...prev,
      daysOfWeek: DAYS_OF_WEEK.map((d) => d.key),
    }));
  };

  const handleSelectWeekdays = () => {
    setScheduleForm((prev) => ({
      ...prev,
      daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    }));
  };

  // Submit and save new schedule slot to database
  const handleAddSchedule = async (e) => {
    e.preventDefault();

    if (!scheduleForm.doctor) {
      alert('Please select a Doctor for this schedule.');
      return;
    }
    if (!scheduleForm.nurse) {
      alert('Please select a Nurse for this schedule.');
      return;
    }
    if (!scheduleForm.vaccineType) {
      alert('Please select a Vaccine Type.');
      return;
    }
    if (!scheduleForm.startTime || !scheduleForm.endTime) {
      alert('Please select both Start Time and End Time.');
      return;
    }

    const isWeekly = scheduleForm.scheduleType === 'Weekly';
    if (isWeekly) {
      if (scheduleForm.daysOfWeek.length === 0) {
        alert('Please select at least one day of the week (e.g. Mon, Wed).');
        return;
      }
      if (!scheduleForm.startDate || !scheduleForm.endDate) {
        alert('Please specify the Start Date and End Date range for recurring weekly slots.');
        return;
      }
      if (scheduleForm.endDate < scheduleForm.startDate) {
        alert('End Date cannot be earlier than Start Date.');
        return;
      }
    } else {
      if (!scheduleForm.specificDate) {
        alert('Please select a Date for the one-time schedule.');
        return;
      }
    }

    // Validate price
    const parsedPrice = parseFloat(scheduleForm.price || 0);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert('Please specify a valid vaccine price (enter 0 for free / subsidized vaccinations).');
      return;
    }

    // Resolve IDs
    const selectedDoc = doctors.find((d) => d.name === scheduleForm.doctor);
    const selectedNurse = nurses.find((n) => n.name === scheduleForm.nurse);
    const selectedVac = vaccines.find((v) => v.name === scheduleForm.vaccineType);

    const payload = {
      doctorUserId: selectedDoc?.id || null,
      doctorName: scheduleForm.doctor,
      nurseUserId: selectedNurse?.id || null,
      nurseName: scheduleForm.nurse,
      vaccineId: selectedVac?.id || null,
      vaccineName: scheduleForm.vaccineType,
      scheduleType: scheduleForm.scheduleType,
      specificDate: isWeekly ? null : scheduleForm.specificDate,
      daysOfWeek: isWeekly ? scheduleForm.daysOfWeek : [],
      startDate: isWeekly ? scheduleForm.startDate : null,
      endDate: isWeekly ? scheduleForm.endDate : null,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      price: parsedPrice,
    };

    try {
      setSubmitting(true);
      await scheduleService.createSchedule(payload);
      showToast('Immunization schedule slot created and saved to database successfully!');

      // Reset form
      setScheduleForm({
        scheduleType: 'OneTime',
        doctor: '',
        nurse: '',
        vaccineType: '',
        specificDate: todayStr,
        daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
        startDate: todayStr,
        endDate: defaultEndDateStr,
        startTime: '09:00',
        endTime: '11:00',
        price: '0.00',
      });

      await loadSchedules();
    } catch (err) {
      alert(`Failed to save schedule: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel schedule in database
  const handleCancelSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this immunization schedule slot?')) {
      return;
    }

    try {
      await scheduleService.cancelSchedule(id);
      showToast('Schedule slot cancelled.');
      await loadSchedules();
    } catch (err) {
      alert(`Failed to cancel schedule: ${err.message}`);
    }
  };

  const handleAcceptAppointment = async (id) => {
    try {
      await appointmentService.updateAppointmentStatus(id, { status: 'Confirmed' });
      showToast('Patient appointment confirmed successfully!');
      await loadHospitalAppointments();
    } catch (err) {
      alert(`Failed to confirm appointment: ${err.message}`);
    }
  };

  const handleRejectAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to decline/cancel this appointment?')) return;
    try {
      await appointmentService.cancelAppointment(id);
      showToast('Appointment declined/cancelled.');
      await loadHospitalAppointments();
    } catch (err) {
      alert(`Failed to cancel appointment: ${err.message}`);
    }
  };

  // Filter appointments according to filterDate
  const filteredAppointments = filterDate
    ? appointments.filter((app) => (app.appointmentDate || app.date) === filterDate)
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
            {/* Recurrence Selector Bar */}
            <div className="schedule-recurrence-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1d1854' }}>
                  Recurrence Frequency:
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  (Choose single day or weekly repeating days)
                </span>
              </div>

              <div className="schedule-recurrence-options">
                <button
                  type="button"
                  className={`schedule-type-btn ${scheduleForm.scheduleType === 'OneTime' ? 'active' : ''}`}
                  onClick={() => setScheduleForm((prev) => ({ ...prev, scheduleType: 'OneTime' }))}
                >
                  <span>🗓️</span> Single Date Only
                </button>
                <button
                  type="button"
                  className={`schedule-type-btn ${scheduleForm.scheduleType === 'Weekly' ? 'active' : ''}`}
                  onClick={() => setScheduleForm((prev) => ({ ...prev, scheduleType: 'Weekly' }))}
                >
                  <span>🔁</span> Recurring Weekly
                </button>
              </div>
            </div>

            {/* Recurring Weekly: Days of Week Multi-Selector */}
            {scheduleForm.scheduleType === 'Weekly' && (
              <div className="schedule-days-container">
                <div className="schedule-days-label-row">
                  <label className="schedule-input-label" style={{ margin: 0 }}>
                    Select Days of the Week (1 or more days):
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="schedule-quick-btn"
                      onClick={handleSelectWeekdays}
                    >
                      Weekdays (Mon-Fri)
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      className="schedule-quick-btn"
                      onClick={handleSelectAllDays}
                    >
                      All 7 Days
                    </button>
                  </div>
                </div>

                <div className="schedule-days-pills-row">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = scheduleForm.daysOfWeek.includes(day.key);
                    return (
                      <button
                        key={day.key}
                        type="button"
                        className={`schedule-day-pill ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleDay(day.key)}
                      >
                        {isSelected ? '✓ ' : ''}{day.key} ({day.label})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="schedule-inputs-row">
              {/* Doctor Dropdown */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">Doctor</label>
                <select
                  name="doctor"
                  value={scheduleForm.doctor}
                  onChange={handleScheduleChange}
                  className="schedule-input-field schedule-select-field"
                  required
                >
                  <option value="">
                    {loadingOptions
                      ? 'Loading doctors...'
                      : doctors.length === 0
                      ? '-- No affiliated doctors found --'
                      : '-- Select Doctor --'}
                  </option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.name}>
                      {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nurse Dropdown */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">Nurse</label>
                <select
                  name="nurse"
                  value={scheduleForm.nurse}
                  onChange={handleScheduleChange}
                  className="schedule-input-field schedule-select-field"
                  required
                >
                  <option value="">
                    {loadingOptions
                      ? 'Loading nurses...'
                      : nurses.length === 0
                      ? '-- No affiliated nurses found --'
                      : '-- Select Nurse --'}
                  </option>
                  {nurses.map((nurse) => (
                    <option key={nurse.id} value={nurse.name}>
                      {nurse.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vaccine Type Dropdown */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">Vaccine Type</label>
                <select
                  name="vaccineType"
                  value={scheduleForm.vaccineType}
                  onChange={handleScheduleChange}
                  className="schedule-input-field schedule-select-field"
                  required
                >
                  <option value="">
                    {loadingOptions
                      ? 'Loading vaccines...'
                      : vaccines.length === 0
                      ? '-- No formulary vaccines found --'
                      : '-- Select Vaccine --'}
                  </option>
                  {vaccines.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name} {v.manufacturer ? `(${v.manufacturer})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Inputs based on Recurrence */}
              {scheduleForm.scheduleType === 'OneTime' ? (
                <div className="schedule-input-group">
                  <label className="schedule-input-label">Specific Date</label>
                  <input
                    type="date"
                    name="specificDate"
                    value={scheduleForm.specificDate}
                    min={todayStr}
                    onChange={handleScheduleChange}
                    className="schedule-input-field"
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="schedule-input-group">
                    <label className="schedule-input-label">Active From (Start Date)</label>
                    <input
                      type="date"
                      name="startDate"
                      value={scheduleForm.startDate}
                      min={todayStr}
                      onChange={handleScheduleChange}
                      className="schedule-input-field"
                      required
                    />
                  </div>

                  <div className="schedule-input-group">
                    <label className="schedule-input-label">Active Until (End Date)</label>
                    <input
                      type="date"
                      name="endDate"
                      value={scheduleForm.endDate}
                      min={scheduleForm.startDate || todayStr}
                      onChange={handleScheduleChange}
                      className="schedule-input-field"
                      required
                    />
                  </div>
                </>
              )}

              {/* Start Time Picker */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">Start Time</label>
                <input
                  type="time"
                  name="startTime"
                  value={scheduleForm.startTime}
                  onChange={handleScheduleChange}
                  className="schedule-input-field"
                  required
                />
              </div>

              {/* End Time Picker */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">End Time</label>
                <input
                  type="time"
                  name="endTime"
                  value={scheduleForm.endTime}
                  onChange={handleScheduleChange}
                  className="schedule-input-field"
                  required
                />
              </div>

              {/* Vaccine Fee Per Person (LKR) */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">
                  Vaccine Fee / Person (LKR)
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                    (0 = Free)
                  </span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={scheduleForm.price}
                  onChange={handleScheduleChange}
                  min="0"
                  step="1"
                  placeholder="0.00"
                  className="schedule-input-field"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="submit"
                className="btn-add-schedule"
                disabled={submitting || doctors.length === 0 || nurses.length === 0 || vaccines.length === 0}
                title={
                  doctors.length === 0 || nurses.length === 0 || vaccines.length === 0
                    ? 'Please ensure doctors, nurses, and vaccines are registered in your hospital'
                    : 'Save schedule slot to database'
                }
              >
                {submitting ? 'Saving...' : 'Add Schedule'}
              </button>
            </div>
          </form>
        </div>

        {/* 2. Schedules Table Section */}
        <div style={{ marginBottom: '38px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="schedule-section-heading" style={{ margin: 0 }}>
              Active Schedules
            </h2>
            <button
              type="button"
              className="hospital-filter-btn"
              onClick={loadSchedules}
              disabled={loadingSchedules}
              title="Refresh schedules from database"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="hospital-appointments-table-wrapper">
            <table className="hospital-appointments-mockup-table">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Doctor</th>
                  <th style={{ width: '16%' }}>Nurse</th>
                  <th style={{ width: '16%' }}>Vaccine</th>
                  <th style={{ width: '20%' }}>Schedule / Recurrence</th>
                  <th style={{ width: '12%' }}>Time Slot</th>
                  <th style={{ width: '11%' }}>Fee (Per Person)</th>
                  <th style={{ width: '7%', borderRight: 'none' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingSchedules ? (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">
                      Loading saved schedules from database...
                    </td>
                  </tr>
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">
                      No active schedules created yet. Use the form above to add one-time or weekly recurring slots.
                    </td>
                  </tr>
                ) : (
                  schedules.map((item) => (
                    <tr key={item.id}>
                      <td>{item.doctorName}</td>
                      <td>{item.nurseName}</td>
                      <td>{item.vaccineName}</td>
                      <td style={{ fontSize: '0.92rem' }}>
                        {item.scheduleType === 'Weekly' ? (
                          <div>
                            <span style={{ fontWeight: 700, color: '#1e40af' }}>🔁 Weekly: </span>
                            <span>{item.daysOfWeek?.join(', ') || 'Weekly'}</span>
                            {item.startDate && item.endDate && (
                              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                                ({item.startDate} to {item.endDate})
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 700, color: '#0f766e' }}>🗓️ One-Time: </span>
                            <span>{item.specificDate || item.date}</span>
                          </div>
                        )}
                      </td>
                      <td>{item.formattedTime || `${item.startTime} - ${item.endTime}`}</td>
                      <td>
                        {item.price && Number(item.price) > 0 ? (
                          <span style={{ fontWeight: 700, color: '#0284c7' }}>
                            LKR {Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>
                            Free (0 LKR)
                          </span>
                        )}
                      </td>
                      <td style={{ borderRight: 'none' }}>
                        <button
                          type="button"
                          className="btn-cancel-schedule"
                          onClick={() => handleCancelSchedule(item.id)}
                          title="Cancel and remove schedule slot"
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
              {filterDate && (
                <button
                  type="button"
                  className="hospital-filter-btn active"
                  onClick={() => setFilterDate(filterDate)}
                >
                  {filterDate}
                </button>
              )}
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
                      No patient appointments found for date {filterDate || 'all dates'}.{' '}
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
                  filteredAppointments.map((item) => (
                    <tr key={item.id || item.Id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.patientName || item.pName || 'Patient'}</div>
                        {(item.patientNic || item.patientPhone) && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {item.patientNic ? `NIC: ${item.patientNic}` : ''} {item.patientPhone ? `• Tel: ${item.patientPhone}` : ''}
                          </div>
                        )}
                      </td>
                      <td>{item.appointmentDate || item.date}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#1e40af' }}>
                          {item.timeSlot || item.time}
                        </span>
                      </td>
                      <td>
                        <div>{item.vaccineName || item.vaccine}</div>
                        {item.doctorName && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Dr. {item.doctorName}
                          </div>
                        )}
                      </td>
                      <td style={{ borderRight: 'none' }}>
                        {(item.status || '').toLowerCase() === 'pending' ? (
                          <div className="mockup-actions-cell">
                            <button
                              type="button"
                              className="btn-mockup-check"
                              title="Accept Appointment"
                              onClick={() => handleAcceptAppointment(item.id || item.Id)}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="btn-mockup-reject"
                              title="Decline Appointment"
                              onClick={() => handleRejectAppointment(item.id || item.Id)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (item.status || '').toLowerCase() === 'confirmed' || (item.status || '').toLowerCase() === 'accepted' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="mockup-status-badge accepted">
                              Confirmed ✓
                            </span>
                            <button
                              type="button"
                              className="btn-cancel-schedule"
                              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                              onClick={() => handleRejectAppointment(item.id || item.Id)}
                              title="Cancel appointment"
                            >
                              Cancel
                            </button>
                          </div>
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
