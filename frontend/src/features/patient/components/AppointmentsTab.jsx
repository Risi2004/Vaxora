import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

  // Popup calendar states
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  const calendarRef = useRef(null);

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

  // Payment integration states
  const [selectedFee, setSelectedFee] = useState(0);
  const [payHereModalData, setPayHereModalData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 5000);
  };

  // 0. Listen for PayHere return URL query parameters (success or cancel)
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paymentParam = query.get('payment');
    const aptId = query.get('apt_id');
    const orderId = query.get('order_id');

    if (paymentParam === 'success' && aptId) {
      const handleReturnSuccess = async () => {
        try {
          await appointmentService.confirmPayment(aptId, orderId || 'PAYHERE-RETURN');
          showToast('🎉 Payment successful! Your appointment is confirmed and receipts have been emailed.');
          window.history.replaceState({}, document.title, window.location.pathname);
          loadMyAppointments();
        } catch (err) {
          console.error('Failed to confirm payment on return:', err);
        }
      };
      handleReturnSuccess();
    } else if (paymentParam === 'cancelled') {
      showToast('PayHere payment was cancelled. You can complete payment anytime from your appointments list.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
            const vaccineMap = new Map();
            apiVaccines.forEach((v) => {
              const vName = (v.name || '').trim();
              if (!vName) return;
              const key = vName.toLowerCase();
              const hospList = (v.hospitals || []).map((h) => ({
                id: h.id, // Hospital user or profile ID
                userId: h.userId || h.id,
                name: h.name,
                location: h.district || h.location || 'Sri Lanka',
                type: h.type || 'Approved Hospital',
              }));

              if (!vaccineMap.has(key)) {
                vaccineMap.set(key, {
                  id: v.id,
                  name: vName,
                  category: v.category || 'Routine',
                  manufacturer: v.manufacturer || '',
                  hospitals: hospList,
                });
              } else {
                // Merge hospitals without duplicates
                const existing = vaccineMap.get(key);
                const existingHospIds = new Set(existing.hospitals.map((h) => h.id || h.userId));
                hospList.forEach((h) => {
                  if (!existingHospIds.has(h.id || h.userId)) {
                    existing.hospitals.push(h);
                    existingHospIds.add(h.id || h.userId);
                  }
                });
              }
            });

            setVaccinesList(Array.from(vaccineMap.values()));
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
    setSelectedFee(0);

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
    setSelectedFee(0);

    if (selectedHospitalUserId && formData.vaccine) {
      try {
        setLoadingDates(true);
        const dates = await appointmentService.getAvailableDates(
          selectedHospitalUserId,
          formData.vaccine
        );
        const validDates = Array.isArray(dates) ? dates : [];
        setAvailableDates(validDates);

        // Pre-read fee from first available schedule slot and set calendar view to earliest session
        if (validDates.length > 0) {
          const firstDateStr = validDates[0].date || validDates[0].Date;
          if (firstDateStr) {
            const parts = firstDateStr.split('-').map(Number);
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              setCalendarViewDate(new Date(parts[0], parts[1] - 1, 1));
            }
          }
          const fee = Number(validDates[0].price ?? validDates[0].Price ?? 0);
          setSelectedFee(fee);
        }
      } catch (err) {
        console.error('Failed to load available dates:', err);
        setAvailableDates([]);
      } finally {
        setLoadingDates(false);
      }
    }
  };

  // Available dates map for quick O(1) lookup
  const availableDatesMap = useMemo(() => {
    const map = new Map();
    availableDates.forEach((d) => {
      const dateVal = d.date || d.Date;
      if (dateVal) {
        map.set(dateVal, d);
      }
    });
    return map;
  }, [availableDates]);

  // Information about currently selected date
  const selectedDateInfo = useMemo(() => {
    if (!formData.date) return null;
    return availableDatesMap.get(formData.date) || null;
  }, [formData.date, availableDatesMap]);

  // Close calendar popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendarPopup(false);
      }
    };
    if (showCalendarPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendarPopup]);

  // Calendar month navigation
  const handlePrevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Generate days array for calendar grid
  const calendarDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr });
    }
    return days;
  }, [calendarViewDate]);

  // 5. Handle Date Selection -> Loads available 20-minute time slots
  const handleSelectDate = async (selectedDate) => {
    const selectedDateObj = availableDatesMap.get(selectedDate);

    // Update fee specifically for this date/schedule
    if (selectedDateObj) {
      const fee = Number(selectedDateObj.price ?? selectedDateObj.Price ?? 0);
      setSelectedFee(fee);
    }

    setFormData((prev) => ({
      ...prev,
      date: selectedDate,
      time: '',
      scheduleId: selectedDateObj?.scheduleId || selectedDateObj?.ScheduleId || null,
    }));

    setAvailableSlots([]);
    setShowCalendarPopup(false);

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

  // Fallback for native select change if needed
  const handleDateChange = (e) => {
    handleSelectDate(e.target.value);
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

    const isFree = selectedFee <= 0;
    const chosenMethod = isFree ? 'Free' : 'PayHere';

    const payload = {
      hospitalUserId: formData.hospitalUserId,
      vaccineName: formData.vaccine,
      vaccineId: formData.vaccineId,
      vaccineScheduleId: formData.scheduleId,
      appointmentDate: formData.date,
      timeSlot: formData.time,
      notes: formData.notes || null,
      paymentMethod: chosenMethod,
    };

    try {
      setSubmitting(true);
      const res = await appointmentService.bookAppointment(payload);

      if (isFree) {
        showToast('✓ Free appointment confirmed! Booking details sent to your email.');
        resetBookingForm();
        await loadMyAppointments();
      } else {
        // Online Card Payment via PayHere Gateway
        // Appointment is created in PendingPayment status.
        const checkoutPayload = await appointmentService.initPayHere(res.id);
        setPayHereModalData({
          ...checkoutPayload,
          appointmentId: res.id,
        });

        resetBookingForm();
        await loadMyAppointments();
      }
    } catch (err) {
      alert(`Booking failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetBookingForm = () => {
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
    setSelectedFee(0);
    setAvailableHospitals([]);
    setAvailableDates([]);
    setAvailableSlots([]);
  };

  // Initiate PayHere Checkout for pending appointments
  const handlePayNow = async (apt) => {
    try {
      setIsProcessingPayment(true);
      const checkoutPayload = await appointmentService.initPayHere(apt.id || apt.Id);
      setPayHereModalData({
        ...checkoutPayload,
        appointmentId: apt.id || apt.Id,
      });
    } catch (err) {
      alert(`Failed to initiate PayHere: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Simulate Sandbox Payment Success (instant one-click in development)
  const handleSimulatePaymentSuccess = async () => {
    if (!payHereModalData?.appointmentId) return;
    try {
      setIsProcessingPayment(true);
      const mockPaymentId = `PH-MOCK-${Date.now().toString().slice(-8)}`;
      await appointmentService.confirmPayment(payHereModalData.appointmentId, mockPaymentId);
      showToast('🎉 Payment verified! Booking confirmed. Confirmation email and payment transaction receipt have been sent.');
      setPayHereModalData(null);
      await loadMyAppointments();
    } catch (err) {
      alert(`Payment confirmation failed: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Redirect to official PayHere Sandbox Checkout Form
  const handleProceedToPayHereCheckout = () => {
    if (!payHereModalData) return;

    // Create a dynamic HTML form and submit to PayHere sandbox URL
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payHereModalData.checkoutUrl || 'https://sandbox.payhere.lk/pay/checkout';

    const fields = {
      merchant_id: payHereModalData.merchantId,
      return_url: payHereModalData.returnUrl,
      cancel_url: payHereModalData.cancelUrl,
      notify_url: payHereModalData.notifyUrl,
      first_name: payHereModalData.firstName,
      last_name: payHereModalData.lastName,
      email: payHereModalData.email,
      phone: payHereModalData.phone,
      address: payHereModalData.address,
      city: payHereModalData.city,
      country: payHereModalData.country,
      order_id: payHereModalData.orderId,
      items: payHereModalData.items,
      currency: payHereModalData.currency,
      amount: payHereModalData.formattedAmount,
      hash: payHereModalData.hash,
    };

    Object.entries(fields).forEach(([key, val]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = val ?? '';
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  // Helper: check if appointment is at least 1 day in advance
  const isEligibleForCancellation = (aptDateStr) => {
    if (!aptDateStr) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return aptDateStr > todayStr;
  };

  // 8. Handle Appointment Cancellation
  const handleCancel = async (apt) => {
    const aptDate = apt.appointmentDate || apt.date;
    if (!isEligibleForCancellation(aptDate)) {
      alert('Appointments can only be cancelled at least 1 day (24 hours) prior to the scheduled date. For same-day adjustments, please contact the hospital directly.');
      return;
    }

    if (window.confirm('Are you sure you want to cancel this appointment slot? Your 20-minute slot will be made free for other citizens and a cancellation email will be sent to you.')) {
      try {
        await appointmentService.cancelAppointment(apt.id || apt.Id);
        showToast('Appointment cancelled successfully. A confirmation email has been dispatched and the slot is now free.');
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

              {/* 3. Available Date - Interactive Popup Calendar View */}
              <div className="book-form-group" ref={calendarRef} style={{ position: 'relative' }}>
                <label
                  className={`book-form-label ${!isHospitalSelected ? 'disabled' : ''}`}
                  htmlFor="select-date-trigger"
                >
                  Date <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <div className={`select-dropdown-wrap ${!isHospitalSelected ? 'disabled' : ''}`}>
                  <button
                    id="select-date-trigger"
                    type="button"
                    className="cal-trigger-button"
                    onClick={() => {
                      if (isHospitalSelected && !loadingDates && availableDates.length > 0) {
                        setShowCalendarPopup((prev) => !prev);
                      }
                    }}
                    disabled={!isHospitalSelected || loadingDates || availableDates.length === 0}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>📅</span>
                      <span style={{ color: formData.date ? '#0f172a' : '#94a3b8', fontWeight: formData.date ? '600' : 'normal' }}>
                        {!isHospitalSelected
                          ? 'Select Hospital first...'
                          : loadingDates
                          ? 'Loading available schedule dates...'
                          : availableDates.length === 0
                          ? 'No upcoming sessions scheduled'
                          : formData.date
                          ? `${formData.date} (${selectedDateInfo?.dayOfWeek || ''})`
                          : 'Click to select available date from calendar'}
                      </span>
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {showCalendarPopup ? '▲' : '▼'}
                    </span>
                  </button>
                </div>

                {/* Calendar Popup Dropdown Card */}
                {showCalendarPopup && (
                  <div className="cal-popup-card">
                    {/* Month / Year navigation header */}
                    <div className="cal-popup-header">
                      <button
                        type="button"
                        className="cal-nav-btn"
                        onClick={handlePrevMonth}
                        title="Previous Month"
                      >
                        ◀
                      </button>
                      <span className="cal-month-title">
                        {calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        className="cal-nav-btn"
                        onClick={handleNextMonth}
                        title="Next Month"
                      >
                        ▶
                      </button>
                    </div>

                    {/* Weekday labels */}
                    <div className="cal-weekdays-row">
                      <span>Su</span>
                      <span>Mo</span>
                      <span>Tu</span>
                      <span>We</span>
                      <span>Th</span>
                      <span>Fr</span>
                      <span>Sa</span>
                    </div>

                    {/* Days Grid */}
                    <div className="cal-days-grid">
                      {calendarDays.map((cell, idx) => {
                        if (!cell) {
                          return <div key={`empty-${idx}`} className="cal-cell empty" />;
                        }

                        const isAvailable = availableDatesMap.has(cell.dateStr);
                        const isSelected = formData.date === cell.dateStr;
                        const session = availableDatesMap.get(cell.dateStr);

                        if (isAvailable) {
                          return (
                            <button
                              key={cell.dateStr}
                              type="button"
                              className={`cal-cell available ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectDate(cell.dateStr)}
                              title={`${cell.dateStr} (${session?.dayOfWeek || ''}): ${session?.startTime || '09:00'} - ${session?.endTime || '11:00'} • Dr. ${session?.doctorName || 'Physician'}`}
                            >
                              <span>{cell.day}</span>
                              <span className="cal-available-dot" />
                            </button>
                          );
                        }

                        return (
                          <div key={cell.dateStr} className="cal-cell disabled">
                            <span>{cell.day}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer / Legend */}
                    <div className="cal-popup-footer">
                      <div className="cal-legend">
                        <span className="legend-item">
                          <span className="legend-dot available" /> Available
                        </span>
                        <span className="legend-item">
                          <span className="legend-dot selected" /> Selected
                        </span>
                      </div>
                      <span className="cal-available-count">
                        {availableDates.length} date{availableDates.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Selected Date Session Details Card */}
                {formData.date && selectedDateInfo && (
                  <div className="cal-selection-detail-card">
                    <div className="cal-detail-left">
                      <div className="cal-check-badge">✓</div>
                      <div className="cal-detail-text">
                        <div className="cal-detail-date">
                          <strong>{formData.date} ({selectedDateInfo.dayOfWeek})</strong>
                          <span className="cal-time-pill">
                            {selectedDateInfo.startTime} - {selectedDateInfo.endTime}
                          </span>
                        </div>
                        {selectedDateInfo.doctorName && (
                          <div className="cal-detail-sub">
                            <span>👨‍⚕️ Dr. {selectedDateInfo.doctorName.replace(/^Dr\.\s*/i, '')}</span>
                            {selectedDateInfo.formattedPrice && (
                              <span className="cal-fee-tag">• {selectedDateInfo.formattedPrice}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cal-change-btn"
                      onClick={() => setShowCalendarPopup(true)}
                    >
                      <span>📅</span>
                      <span>Change Date</span>
                    </button>
                  </div>
                )}

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
                    ✓ {availableDates.length} upcoming session date(s) marked in calendar
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

            {/* Vaccine Fee & Payment Choice Banner */}
            {formData.vaccine && formData.hospitalUserId && (
              <div
                style={{
                  margin: '22px 0 10px 0',
                  padding: '20px',
                  borderRadius: '14px',
                  background: selectedFee > 0 ? '#f0f9ff' : '#f0fdf4',
                  border: `1.5px solid ${selectedFee > 0 ? '#38bdf8' : '#86efac'}`,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: selectedFee > 0 ? '#0369a1' : '#15803d', fontWeight: 800 }}>
                      Vaccination Fee (Configured by Hospital)
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: selectedFee > 0 ? '#0284c7' : '#16a34a', marginTop: '2px' }}>
                      {selectedFee > 0 ? `Rs. ${selectedFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Free (0 Rs - Fully Subsidized)'}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      background: selectedFee > 0 ? '#e0f2fe' : '#dcfce7',
                      color: selectedFee > 0 ? '#0369a1' : '#15803d',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    {selectedFee > 0 ? 'Payment Required' : '✓ No Gateway Required'}
                  </div>
                </div>

                {/* If fee > 0: Card payment required notice */}
                {selectedFee > 0 && (
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #bae6fd' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #bae6fd',
                        background: '#ffffff',
                      }}
                    >
                      <span style={{ fontSize: '1.4rem' }}>💳</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.92rem' }}>
                          Online Card Payment Required
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                          Payment of <strong>Rs. {selectedFee.toLocaleString()}</strong> is completed securely online via PayHere card payment to confirm your booking.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                {submitting
                  ? 'Processing Booking...'
                  : selectedFee <= 0
                  ? 'Confirm & Book Free Spot'
                  : `Pay Now (Rs. ${selectedFee.toLocaleString()})`}
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
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Fee &amp; Payment</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
                  <th className="th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingAppointments ? (
                  <tr>
                    <td colSpan="7" className="empty-appointments-cell">
                      Loading your appointments from database...
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-appointments-cell">
                      No current appointments scheduled. Select a vaccine above to book your slot.
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => {
                    const feeNum = Number(apt.fee ?? apt.Fee ?? 0);
                    const payMethod = apt.paymentMethod || apt.PaymentMethod || 'Free';
                    const payStatus = apt.paymentStatus || apt.PaymentStatus || 'Paid';
                    const isPendingPayment = (apt.status || '').toLowerCase() === 'pendingpayment' || payStatus === 'PendingOnline';

                    return (
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
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: feeNum > 0 ? '#0284c7' : '#16a34a' }}>
                            {feeNum > 0 ? `LKR ${feeNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Free'}
                          </div>
                          <div style={{ marginTop: '3px' }}>
                            {feeNum <= 0 ? (
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.74rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                                ✓ Subsidized
                              </span>
                            ) : payStatus === 'Paid' ? (
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.74rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                                ✓ Paid Online
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                                  Payment Due
                                </span>
                                {(apt.status || '').toLowerCase() !== 'cancelled' && (
                                  <button
                                    type="button"
                                    onClick={() => handlePayNow(apt)}
                                    disabled={isProcessingPayment}
                                    style={{
                                      padding: '3px 8px',
                                      backgroundColor: '#0284c7',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    💳 Pay Now
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
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
                                  : (apt.status || '').toLowerCase() === 'pendingpayment'
                                  ? '#fef3c7'
                                  : '#e0f2fe',
                              color:
                                (apt.status || '').toLowerCase() === 'confirmed'
                                  ? '#15803d'
                                  : (apt.status || '').toLowerCase() === 'cancelled'
                                  ? '#b91c1c'
                                  : (apt.status || '').toLowerCase() === 'pendingpayment'
                                  ? '#b45309'
                                  : '#0369a1',
                            }}
                          >
                            {apt.status || 'Confirmed'}
                          </span>
                        </td>
                        <td className="td-action">
                          {(apt.status || '').toLowerCase() !== 'cancelled' ? (
                            isEligibleForCancellation(apt.appointmentDate || apt.date) ? (
                              <button
                                type="button"
                                className="btn-cancel-appointment"
                                onClick={() => handleCancel(apt)}
                                title="Cancel appointment at least 1 day in advance"
                              >
                                Cancel
                              </button>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.76rem',
                                  color: '#64748b',
                                  fontStyle: 'italic',
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  background: '#f1f5f9',
                                  borderRadius: '6px',
                                }}
                                title="Appointments cannot be cancelled online within 24 hours of the session. Please contact the hospital directly."
                              >
                                Locked (Same-Day)
                              </span>
                            )
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Cancelled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PayHere Checkout Modal */}
      {payHereModalData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                padding: '24px',
                color: '#ffffff',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💳</div>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>PayHere Payment Gateway</h3>
              <p style={{ margin: '6px 0 0 0', color: '#e0f2fe', fontSize: '0.88rem' }}>
                Secure Online Payment for Vaccination Appointment
              </p>
              <button
                type="button"
                onClick={() => setPayHereModalData(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                  <span style={{ color: '#64748b' }}>Order Reference:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>{payHereModalData.orderId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                  <span style={{ color: '#64748b' }}>Service:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right', maxWidth: '60%' }}>{payHereModalData.items}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginTop: '10px' }}>
                  <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '1.05rem' }}>Total Fee:</span>
                  <span style={{ color: '#0284c7', fontWeight: 800, fontSize: '1.3rem' }}>
                    {payHereModalData.currency} {parseFloat(payHereModalData.amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#0369a1',
                  marginBottom: '20px',
                  lineHeight: 1.5,
                  background: '#f0f9ff',
                  borderLeft: '4px solid #0284c7',
                  padding: '12px 14px',
                  borderRadius: '6px',
                }}
              >
                🔒 <strong>Conditional Confirmation:</strong> Your spot will be confirmed only when the payment is completed. Two emails will be automatically sent to <strong>{payHereModalData.email}</strong>: (1) Booking Confirmation and (2) Payment Transaction Receipt.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleProceedToPayHereCheckout}
                  disabled={isProcessingPayment}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <span>Pay Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayHereModalData(null)}
                  disabled={isProcessingPayment}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
