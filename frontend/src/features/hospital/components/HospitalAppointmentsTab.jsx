import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { inventoryService } from '../services/inventoryService';
import { scheduleService } from '../services/scheduleService';
import { staffService } from '../services/staffService';
import { appointmentService } from '../../patient/services/appointmentService';
import HospitalSubpageHero from './HospitalSubpageHero';

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
  const [vaccines, setVaccines] = useState([]);
  const [booths, setBooths] = useState([]);
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
    vaccineType: '',
    boothId: '',
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

  // Fetch formulary vaccines and active booths
  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      const [formularyData, globalVaccinesData, boothData] = await Promise.allSettled([
        inventoryService.getFormulary(),
        inventoryService.getGlobalVaccines(),
        staffService.getHospitalBooths({ activeOnly: true }),
      ]);

      const vaccineMap = new Map();
      if (formularyData.status === 'fulfilled' && Array.isArray(formularyData.value) && formularyData.value.length > 0) {
        formularyData.value.forEach((f) => {
          const vName = (f.vaccineName || f.name || '').trim();
          // Prefer catalog VaccineId — never the formulary row Id (that breaks booth matching).
          const vId = f.vaccineId || f.VaccineId || null;
          if (vName && !vaccineMap.has(vName.toLowerCase())) {
            vaccineMap.set(vName.toLowerCase(), {
              id: vId,
              name: vName,
              manufacturer: f.manufacturer || '',
            });
          }
        });
      } else if (globalVaccinesData.status === 'fulfilled' && Array.isArray(globalVaccinesData.value) && globalVaccinesData.value.length > 0) {
        globalVaccinesData.value.forEach((v) => {
          const vName = (v.name || '').trim();
          if (vName && !vaccineMap.has(vName.toLowerCase())) {
            vaccineMap.set(vName.toLowerCase(), {
              id: v.id,
              name: vName,
              manufacturer: v.manufacturer || '',
            });
          }
        });
      }

      setVaccines(Array.from(vaccineMap.values()));
      setBooths(
        boothData.status === 'fulfilled' && Array.isArray(boothData.value)
          ? boothData.value.filter((b) => b.isActive !== false)
          : []
      );
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

  const selectedVaccine = useMemo(
    () => vaccines.find((v) => v.name === scheduleForm.vaccineType) || null,
    [vaccines, scheduleForm.vaccineType]
  );

  const matchingBooths = useMemo(() => {
    if (!selectedVaccine) return [];
    const vaccineId = selectedVaccine.id ? String(selectedVaccine.id) : '';
    const vaccineName = (selectedVaccine.name || '').toLowerCase();

    return booths.filter((b) => {
      const ids = Array.isArray(b.vaccineIds) ? b.vaccineIds.map(String) : [];
      const names = Array.isArray(b.vaccineNames)
        ? b.vaccineNames.map((n) => String(n).toLowerCase())
        : [];
      // Only booths that explicitly offer this vaccine (no "show all" fallback —
      // that let users pick B02 and then get blocked by the API).
      if (vaccineId && ids.includes(vaccineId)) return true;
      return names.includes(vaccineName);
    });
  }, [booths, selectedVaccine]);

  useEffect(() => {
    if (!scheduleForm.vaccineType) {
      if (scheduleForm.boothId) {
        setScheduleForm((prev) => ({ ...prev, boothId: '' }));
      }
      return;
    }

    const stillValid = matchingBooths.some(
      (b) => String(b.boothId || b.id) === String(scheduleForm.boothId)
    );
    if (stillValid) return;

    const autoId =
      matchingBooths.length === 1
        ? String(matchingBooths[0].boothId || matchingBooths[0].id)
        : '';
    setScheduleForm((prev) => ({ ...prev, boothId: autoId }));
  }, [scheduleForm.vaccineType, scheduleForm.boothId, matchingBooths]);

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    setScheduleForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'vaccineType' ? { boothId: '' } : {}),
    }));
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

    if (!scheduleForm.vaccineType) {
      alert('Please select a Vaccine Type.');
      return;
    }
    if (!scheduleForm.boothId) {
      alert('Please select a Booth for this schedule.');
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

    const selectedVac = vaccines.find((v) => v.name === scheduleForm.vaccineType);

    const payload = {
      doctorUserId: null,
      doctorName: '',
      nurseUserId: null,
      nurseName: '',
      boothId: scheduleForm.boothId,
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
        vaccineType: '',
        boothId: '',
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
      <HospitalSubpageHero
        eyebrow="Appointment operations"
        title="Schedules & appointments"
        subtitle="Publish vaccination sessions, manage recurring availability, and monitor today’s hospital appointments."
      />
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ maxWidth: '1060px', width: '100%', marginBottom: '20px' }}
        >
          {notification}
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
                        {day.key} ({day.label})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="schedule-inputs-row">
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

              {/* Booth Dropdown — filtered to booths that offer the selected vaccine */}
              <div className="schedule-input-group">
                <label className="schedule-input-label">Booth</label>
                <select
                  name="boothId"
                  value={scheduleForm.boothId}
                  onChange={handleScheduleChange}
                  className="schedule-input-field schedule-select-field"
                  required
                  disabled={!scheduleForm.vaccineType}
                >
                  <option value="">
                    {!scheduleForm.vaccineType
                      ? '-- Select vaccine first --'
                      : loadingOptions
                      ? 'Loading booths...'
                      : matchingBooths.length === 0
                      ? '-- No booth offers this vaccine --'
                      : '-- Select Booth --'}
                  </option>
                  {matchingBooths.map((b) => {
                    const id = b.boothId || b.id;
                    return (
                      <option key={id} value={id}>
                        {b.displayLabel || `${b.code} · ${b.name}`}
                      </option>
                    );
                  })}
                </select>
                {scheduleForm.vaccineType && !loadingOptions && matchingBooths.length === 0 ? (
                  <p className="schedule-field-hint" style={{ margin: '6px 0 0', color: '#b45309', fontSize: '0.82rem' }}>
                    Add this vaccine to a booth under Staff → Booths, then come back to post the schedule.
                  </p>
                ) : null}
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
                disabled={
                  submitting ||
                  vaccines.length === 0 ||
                  booths.length === 0 ||
                  (Boolean(scheduleForm.vaccineType) && matchingBooths.length === 0)
                }
                title={
                  vaccines.length === 0
                    ? 'Please ensure vaccines are registered in your hospital formulary'
                    : booths.length === 0
                    ? 'Please configure at least one active booth under Booths'
                    : scheduleForm.vaccineType && matchingBooths.length === 0
                    ? 'No booth offers this vaccine yet — assign it on a booth first'
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
                  <th style={{ width: '20%' }}>Vaccine</th>
                  <th style={{ width: '18%' }}>Booth</th>
                  <th style={{ width: '28%' }}>Schedule / Recurrence</th>
                  <th style={{ width: '14%' }}>Time Slot</th>
                  <th style={{ width: '12%' }}>Fee (Per Person)</th>
                  <th style={{ width: '8%', borderRight: 'none' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingSchedules ? (
                  <tr>
                    <td colSpan={6} className="empty-table-cell">
                      Loading saved schedules from database...
                    </td>
                  </tr>
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-table-cell">
                      No active schedules created yet. Use the form above to add one-time or weekly recurring slots.
                    </td>
                  </tr>
                ) : (
                  schedules.map((item) => (
                    <tr key={item.id}>
                      <td>{item.vaccineName}</td>
                      <td>{item.boothLabel || '—'}</td>
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
                  <th style={{ width: '18%' }}>Date</th>
                  <th style={{ width: '18%' }}>Time</th>
                  <th style={{ width: '22%' }}>Vaccine</th>
                  <th style={{ width: '20%', borderRight: 'none', textAlign: 'center' }}>Action</th>
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
                        <div style={{ fontWeight: 600, color: '#1d1854' }}>{item.patientName || item.pName || 'Patient'}</div>
                        {item.patientPhone && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                            Tel: {item.patientPhone}
                          </div>
                        )}
                      </td>
                      <td>{item.appointmentDate || item.date}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#1e40af' }}>
                          {item.timeSlot || item.time}
                        </span>
                      </td>
                      <td>{item.vaccineName || item.vaccine}</td>
                      <td style={{ borderRight: 'none', textAlign: 'center' }}>
                        {(item.status || '').toLowerCase() === 'pending' ? (
                          <div className="hospital-action-buttons-wrapper">
                            <button
                              type="button"
                              className="btn-hospital-confirm-action"
                              title="Accept and Confirm Appointment"
                              onClick={() => handleAcceptAppointment(item.id || item.Id)}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="btn-hospital-cancel-action"
                              title="Decline Appointment"
                              onClick={() => handleRejectAppointment(item.id || item.Id)}
                            >
                              ✕ Decline
                            </button>
                          </div>
                        ) : (item.status || '').toLowerCase() === 'confirmed' || (item.status || '').toLowerCase() === 'accepted' ? (
                          <div className="hospital-action-buttons-wrapper">
                            <span className="mockup-status-badge accepted">
                              Confirmed ✓
                            </span>
                            <button
                              type="button"
                              className="btn-hospital-cancel-action"
                              onClick={() => handleRejectAppointment(item.id || item.Id)}
                              title="Cancel appointment"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="hospital-action-buttons-wrapper">
                            <span className="mockup-status-badge rejected">
                              Cancelled ✕
                            </span>
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
