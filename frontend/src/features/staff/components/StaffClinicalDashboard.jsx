import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getUser } from '../../auth/services/authService';
import inventoryService from '../../hospital/services/inventoryService';
import staffService from '../../hospital/services/staffService';
import clinicalPatientService from '../../doctor/services/clinicalPatientService';
import staffAppointmentService from '../services/staffAppointmentService';
import {
  IconCalendar,
  IconClipboard,
  IconClock,
  IconHospital,
  IconRefresh,
  IconShield,
  IconSyringe,
  IconUser,
} from '../../../shared/icons/AppIcons';

const OBSERVATION_WINDOW_MINUTES = 15;

/** Minutes still remaining in the observation window, or null when the start time is unknown. */
function observationMinutesLeft(administeredAt, now) {
  if (!administeredAt) return null;
  const startedAt = new Date(administeredAt).getTime();
  if (Number.isNaN(startedAt)) return null;
  const elapsedMinutes = (now - startedAt) / 60000;
  return Math.max(0, Math.ceil(OBSERVATION_WINDOW_MINUTES - elapsedMinutes));
}

function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function toDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mapDbStatusToUi(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'observation') return 'observation';
  if (s === 'administering') return 'consulting';
  if (s === 'cancelled' || s === 'rejected') return 'cancelled';
  // PendingPayment and Confirmed both show in the waiting queue;
  // paymentStatus decides "In Queue" vs "Awaiting payment".
  return 'waiting';
}

function pickDefaultHospitalId(active, preferredId) {
  const live = active.find((a) => a.isOnDutyNow);
  if (live) return live.hospitalUserId;
  if (preferredId && active.some((a) => a.hospitalUserId === preferredId)) {
    return preferredId;
  }
  return active[0]?.hospitalUserId || '';
}

function presenceLabel(affiliation) {
  if (!affiliation) return null;
  return affiliation.isOnDutyNow ? 'On duty' : 'No active shift';
}

function isPaymentSettled(patientOrStatus) {
  const value =
    typeof patientOrStatus === 'string'
      ? patientOrStatus
      : patientOrStatus?.paymentStatus;
  return String(value || '').toLowerCase() === 'paid';
}

/**
 * Shared doctor/nurse home: today's queue, observation watch, and status transitions.
 * Role-specific chrome (hero image, title, modals, labels) is passed in by the wrappers.
 */
export default function StaffClinicalDashboard({
  formatTitle,
  heroImage,
  heroClassName = '',
  spotlightBadge,
  allowHospitalSwitch = false,
  AdministerModal,
  AefiModal,
}) {
  const [isAdministerModalOpen, setIsAdministerModalOpen] = useState(false);
  const [isAefiModalOpen, setIsAefiModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);
  const [user] = useState(() => getUser());
  const [affiliations, setAffiliations] = useState([]);
  const [selectedHospitalUserId, setSelectedHospitalUserId] = useState('');
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [inventoryLots, setInventoryLots] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activePatientId, setActivePatientId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [hospitalMenuOpen, setHospitalMenuOpen] = useState(false);
  /** 'my' = assigned doctor/nurse panel; 'hospital' = full floor view */
  const [panelScope, setPanelScope] = useState('my');
  const toastTimerRef = useRef(null);
  const hospitalMenuRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4000);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    if (!hospitalMenuOpen) return undefined;
    const onPointerDown = (event) => {
      if (hospitalMenuRef.current && !hospitalMenuRef.current.contains(event.target)) {
        setHospitalMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setHospitalMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [hospitalMenuOpen]);

  const loadDashboardData = useCallback(async (hospitalOverride, scopeOverride) => {
    const listScope = scopeOverride ?? panelScope;
    setStatsLoading(true);
    setLoadError('');
    try {
      const list = await staffService.getMyAffiliations();
      const active = Array.isArray(list) ? list : [];
      setAffiliations(active);

      // Always prefer the hospital where staff are on duty now — even when the
      // switcher UI is hidden (nurses with one affiliation, or multi without switch).
      const hospitalId = pickDefaultHospitalId(
        active,
        hospitalOverride !== undefined ? hospitalOverride : selectedHospitalUserId
      );

      setSelectedHospitalUserId(hospitalId || '');

      if (!hospitalId) {
        setTodayAppointments([]);
        setInventoryLots([]);
        setActivePatientId(null);
        return;
      }

      const [appts, lots] = await Promise.all([
        staffAppointmentService.getHospitalAppointments(
          hospitalId,
          toDateInputValue(),
          listScope
        ),
        inventoryService.getInventory(hospitalId).catch(() => []),
      ]);
      const rows = Array.isArray(appts) ? appts : [];
      setTodayAppointments(rows);
      setInventoryLots(Array.isArray(lots) ? lots : []);

      const administering = rows.find((a) => mapDbStatusToUi(a.status) === 'consulting');
      setActivePatientId((prev) => {
        if (prev && rows.some((a) => a.id === prev && mapDbStatusToUi(a.status) === 'consulting')) {
          return prev;
        }
        return administering?.id || null;
      });
    } catch (err) {
      setLoadError(err?.message || 'Could not load your clinical session. Check your connection and retry.');
      setAffiliations([]);
      setTodayAppointments([]);
      setInventoryLots([]);
      setSelectedHospitalUserId('');
      setActivePatientId(null);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedHospitalUserId, panelScope]);

  useEffect(() => {
    let cancelled = false;
    // Defer so setState inside loadDashboardData is not synchronous in this effect body.
    const timer = setTimeout(() => {
      if (!cancelled) loadDashboardData();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Initial load only — hospital switches call loadDashboardData explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heroDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const primaryAffiliation =
    affiliations.find((a) => a.hospitalUserId === selectedHospitalUserId) || affiliations[0];
  const displayTitle = formatTitle(user);
  const greeting = greetingForNow();
  const dutyText = presenceLabel(primaryAffiliation);
  const isOnDuty = Boolean(primaryAffiliation?.isOnDutyNow);

  const todayTotal = todayAppointments.length;
  const todayCompleted = todayAppointments.filter((a) => a.status === 'Completed').length;
  const todayUpcoming = todayAppointments.filter((a) => {
    const s = String(a.status || '').toLowerCase();
    return s === 'confirmed' || s === 'pendingpayment';
  }).length;
  const todayNeedsDosage = todayAppointments.filter(
    (a) => a.status === 'Confirmed' && !a.prescribedDosage
  ).length;

  const patients = useMemo(() => {
    return todayAppointments.map((a) => {
      const id = a.id;
      const status = mapDbStatusToUi(a.status);
      const short = String(id).replace(/-/g, '').slice(0, 4).toUpperCase();
      return {
        id,
        token: `T-${short}`,
        name: a.patientName || 'Patient',
        nic: a.patientNic || '—',
        phone: a.patientPhone || '—',
        vaccine: a.vaccineName || '—',
        dose: a.prescribedDosage || 'Dosage not set',
        hasDosage: Boolean(a.prescribedDosage),
        prescribedBy: a.prescribedByDoctorName || null,
        paymentStatus: a.paymentStatus || '—',
        booth: a.boothLabel || null,
        time: a.timeSlot || [a.startTime, a.endTime].filter(Boolean).join(' – ') || '—',
        status,
        appointmentStatus: a.status,
        notes: a.notes || '',
        updatedAt: a.updatedAt || a.dosageUpdatedAt || null,
      };
    });
  }, [todayAppointments]);

  const observationPatients = useMemo(
    () =>
      patients
        .filter((p) => p.status === 'observation')
        .map((p) => ({
          id: p.id,
          token: p.token,
          name: p.name,
          vaccine: p.vaccine,
          administeredTime: p.updatedAt
            ? new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—',
          minsLeft: observationMinutesLeft(p.updatedAt, now),
        })),
    [patients, now]
  );

  const activePatient = useMemo(
    () => patients.find((p) => p.id === activePatientId) || null,
    [patients, activePatientId]
  );

  const activePaymentSettled = activePatient ? isPaymentSettled(activePatient) : true;

  const persistStatus = async (appointmentId, dbStatus) => {
    setStatusUpdating(true);
    try {
      await staffAppointmentService.updateAppointmentStatus(appointmentId, dbStatus);
      await loadDashboardData(selectedHospitalUserId);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCallNext = async () => {
    if (!isOnDuty) {
      showToast('You must have an active shift to call the next patient.');
      return;
    }

    const nextWaiting = patients.find(
      (p) => p.status === 'waiting' && isPaymentSettled(p)
    );
    if (!nextWaiting) {
      const unpaidWaiting = patients.some(
        (p) => p.status === 'waiting' && !isPaymentSettled(p)
      );
      showToast(
        unpaidWaiting
          ? 'No paid patients waiting. Unpaid appointments cannot be administered yet.'
          : "No more waiting patients in today's queue."
      );
      return;
    }

    const current = activePatientId
      ? patients.find((p) => p.id === activePatientId)
      : patients.find((p) => p.status === 'consulting');

    // Do not silently move consulting → Observation (that consumes inventory).
    if (current?.status === 'consulting') {
      showToast(
        `Finish ${current.name} (certify to observation) before calling the next patient.`
      );
      return;
    }

    try {
      await staffAppointmentService.updateAppointmentStatus(nextWaiting.id, 'Administering');
      setActivePatientId(nextWaiting.id);
      showToast(`Calling ${nextWaiting.name} (${nextWaiting.token})`);
      await loadDashboardData(selectedHospitalUserId);
    } catch (err) {
      showToast(err.message || 'Failed to call next patient.');
    }
  };

  const handleSelectPatient = async (patient) => {
    if (patient.status === 'waiting') {
      if (!isOnDuty) {
        showToast('You must have an active shift to start consultation.');
        return;
      }
      if (!isPaymentSettled(patient)) {
        showToast('Payment must be settled before starting consultation.');
        return;
      }
      try {
        setActivePatientId(patient.id);
        await persistStatus(patient.id, 'Administering');
      } catch (err) {
        setActivePatientId(null);
        showToast(err.message || 'Failed to start consultation.');
      }
      return;
    }

    // Spotlight only drives clinical actions for the active consulting patient.
    // Observation / completed rows can still be focused for read-only context.
    setActivePatientId(patient.id);
  };

  const handleCertifyAdministration = async (certifiedData) => {
    if (!isOnDuty) {
      showToast('You must have an active shift to record administration.');
      throw new Error('Not on duty');
    }
    if (!isPaymentSettled(certifiedData)) {
      showToast('Payment must be settled before recording administration.');
      throw new Error('Payment not settled');
    }
    const current = patients.find((p) => p.id === certifiedData.id);
    if (current && current.status !== 'consulting') {
      showToast('Only a patient in active consultation can be certified to observation.');
      throw new Error('Invalid status for certify');
    }
    const details = certifiedData.administrationDetails || {};
    try {
      setStatusUpdating(true);
      const dosage = String(details.dosage || '').trim();
      const currentDose = certifiedData.hasDosage ? String(certifiedData.dose || '').trim() : '';
      if (dosage && dosage !== currentDose) {
        try {
          await clinicalPatientService.updateDosage(certifiedData.id, dosage);
        } catch {
          // Dosage update is doctor-only; nurses keep prescribed dosage read-only.
        }
      }
      await staffAppointmentService.updateAppointmentStatus(
        certifiedData.id,
        'Observation',
        undefined,
        {
          batchId: details.batchId || undefined,
          lotNumber: details.lotNumber || undefined,
          injectionSite: details.injectionSite || undefined,
          route: details.route || undefined,
          administrationNotes: details.notes || undefined,
          consentConfirmed: details.consentConfirmed,
          vitalsConfirmed: details.vitalsConfirmed,
        }
      );
      showToast(`Recorded administration for ${certifiedData.name}`);
      await loadDashboardData(selectedHospitalUserId);
    } catch (err) {
      showToast(err.message || 'Failed to move patient to observation.');
      throw err;
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleReturnToQueue = async (patient) => {
    if (!isOnDuty) {
      showToast('You must have an active shift to return a patient to the queue.');
      return;
    }
    if (patient.status !== 'consulting') {
      showToast('Only the active consulting patient can be returned to the waiting queue.');
      return;
    }
    if (!isPaymentSettled(patient)) {
      showToast('Unpaid appointments cannot be returned as Confirmed — settle payment at the desk first.');
      return;
    }
    try {
      await persistStatus(patient.id, 'Confirmed');
      if (activePatientId === patient.id) setActivePatientId(null);
      showToast(`${patient.name} returned to the waiting queue.`);
    } catch (err) {
      showToast(err.message || 'Failed to return the patient to the queue.');
    }
  };

  const handleDischargeObservation = async (id, name) => {
    if (!isOnDuty) {
      showToast('You must have an active shift to discharge a patient.');
      return;
    }
    const patient = patients.find((p) => p.id === id);
    if (patient && !isPaymentSettled(patient)) {
      showToast('Payment must be settled before discharging the patient.');
      return;
    }
    try {
      await persistStatus(id, 'Completed');
      if (activePatientId === id) setActivePatientId(null);
      showToast(`${name} discharged from observation.`);
    } catch (err) {
      showToast(err.message || 'Failed to discharge patient.');
    }
  };

  const handleHospitalChange = (hospitalUserId) => {
    setHospitalMenuOpen(false);
    setSelectedHospitalUserId(hospitalUserId);
    setActivePatientId(null);
    setFilterStatus('all');
    setSearchQuery('');
    setPanelScope('my');
    loadDashboardData(hospitalUserId);
  };

  const handleAefiSubmit = async (data) => {
    if (!activePatient?.id) {
      showToast('Select an active patient before reporting AEFI.');
      throw new Error('No active patient');
    }
    if (!isOnDuty) {
      showToast('You must have an active shift to report AEFI.');
      throw new Error('Not on duty');
    }

    const severity = data.severity || 'Mild';

    try {
      setStatusUpdating(true);
      const result = await staffAppointmentService.reportAefi(activePatient.id, {
        ...data,
        severity,
        notifyDoctor: data.notifyDoctor !== false,
      });
      await loadDashboardData(selectedHospitalUserId);
      const bits = [];
      if (result?.documentedOnDose) bits.push('documented on dose');
      if (result?.followUpScheduled) bits.push('follow-up scheduled');
      if (result?.notifiedDoctor) bits.push('physician alerted');
      showToast(
        result?.message ||
          `AEFI (${severity}) saved for ${data.patientName || activePatient.name}${
            bits.length ? ` — ${bits.join(', ')}` : ''
          }.`
      );
    } catch (err) {
      showToast(err.message || 'Failed to submit AEFI report.');
      throw err;
    } finally {
      setStatusUpdating(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.token.toLowerCase().includes(q) ||
      String(p.nic).toLowerCase().includes(q) ||
      String(p.phone || '').toLowerCase().includes(q) ||
      p.vaccine.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    if (filterStatus === 'waiting') {
      return p.status === 'waiting' && isPaymentSettled(p);
    }
    if (filterStatus === 'awaiting_payment') {
      return p.status === 'waiting' && !isPaymentSettled(p);
    }
    return p.status === filterStatus;
  });

  const waitingCount = patients.filter(
    (p) => p.status === 'waiting' && isPaymentSettled(p)
  ).length;
  const awaitingPaymentCount = patients.filter(
    (p) =>
      p.status === 'waiting' &&
      !isPaymentSettled(p)
  ).length;
  const completedCount = patients.filter((p) => p.status === 'completed').length;
  const observationCount = patients.filter((p) => p.status === 'observation').length;
  // Show the switcher whenever staff have multiple affiliations (doctors + multi-hospital nurses).
  const showHospitalSwitch = (allowHospitalSwitch || affiliations.length > 1) && affiliations.length > 1;
  const canCertifyActive = activePatient?.status === 'consulting' && activePaymentSettled && isOnDuty;
  const canReturnActive = activePatient?.status === 'consulting' && isOnDuty;

  return (
    <div>
      {toastMessage && (
        <div className="doctor-toast" role="status">
          <span>{toastMessage}</span>
        </div>
      )}

      {loadError && (
        <div className="staff-inline-error" role="alert">
          <span>{loadError}</span>
          <button
            type="button"
            className="staff-inline-error-action"
            onClick={() => loadDashboardData(selectedHospitalUserId)}
          >
            Retry
          </button>
        </div>
      )}

      <section className={`hospital-hero-banner doctor-home-hero ${heroClassName}`.trim()}>
        <div className="hospital-hero-content doctor-home-hero-content">
          <p className="hospital-hero-eyebrow">Clinical session</p>
          <h1>
            {greeting}, {displayTitle}
          </h1>
          <p className="hospital-hero-sub">
            {heroDateLabel}
            {primaryAffiliation?.hospitalName
              ? ` · ${primaryAffiliation.hospitalName}`
              : ' · No active hospital affiliation yet'}
          </p>
          {showHospitalSwitch ? (
            <div
              className={`doctor-hero-session-switch${hospitalMenuOpen ? ' is-open' : ''}`}
              ref={hospitalMenuRef}
            >
              <button
                type="button"
                className="doctor-hero-session-pill doctor-hero-session-pill--switch"
                aria-label="Working hospital"
                aria-haspopup="listbox"
                aria-expanded={hospitalMenuOpen}
                disabled={statsLoading || statusUpdating}
                onClick={() => setHospitalMenuOpen((open) => !open)}
              >
                <span className="doctor-hero-session-pill-main">
                  <IconHospital size={14} aria-hidden="true" />
                  <span>{primaryAffiliation?.hospitalName || 'Affiliated hospital'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{dutyText}</span>
                </span>
                <span className="doctor-hero-session-pill-chevron" aria-hidden="true">
                  ▾
                </span>
              </button>
              {hospitalMenuOpen && (
                <ul className="doctor-hero-session-menu" role="listbox" aria-label="Working hospital">
                  {affiliations.map((h) => {
                    const selected = h.hospitalUserId === selectedHospitalUserId;
                    const label = presenceLabel(h);
                    return (
                      <li key={h.affiliationId || h.hospitalUserId} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`doctor-hero-session-menu-item${selected ? ' is-selected' : ''}`}
                          onClick={() => handleHospitalChange(h.hospitalUserId)}
                        >
                          <span className="doctor-hero-session-menu-name">
                            {h.hospitalName || h.hospitalUserId}
                          </span>
                          <span className="doctor-hero-session-menu-duty">{label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="doctor-hero-session-pill">
              {primaryAffiliation ? (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconHospital size={14} />{' '}
                    {primaryAffiliation.hospitalName || 'Affiliated hospital'}
                  </span>
                  <span>·</span>
                  <span>{dutyText}</span>
                </>
              ) : (
                <span>Accept a hospital invitation on Affiliations to join a roster</span>
              )}
            </div>
          )}
          <div className="doctor-hero-actions">
            <button
              type="button"
              className="doctor-btn-call-next"
              onClick={handleCallNext}
              disabled={statusUpdating || statsLoading || !selectedHospitalUserId || !isOnDuty}
              title={!isOnDuty ? 'You need an active shift to call patients' : undefined}
            >
              Call Next Patient
            </button>
            <button
              type="button"
              className="doctor-btn-report-aefi"
              onClick={() => setIsAefiModalOpen(true)}
              disabled={!activePatient || !isOnDuty || statusUpdating}
              title={
                !isOnDuty
                  ? 'You need an active shift to report AEFI'
                  : !activePatient
                    ? 'Call or select a patient first'
                    : undefined
              }
            >
              Report AEFI
            </button>
          </div>
        </div>
        <div className="hospital-hero-media" aria-hidden="true">
          <img src={heroImage} alt="" className="hospital-hero-image doctor-home-hero-image" />
        </div>
      </section>

      <section className="hospital-metrics-grid hospital-metrics-grid--4 doctor-stats-grid">
        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-blue">
            <IconCalendar size={22} />
          </div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Today&apos;s Appointments</span>
            <span className="hospital-stat-value">{statsLoading ? '—' : todayTotal}</span>
            <span className="hospital-stat-meta">
              <span className="meta-positive">
                {statsLoading ? '—' : todayCompleted} Completed
              </span>
              {' · '}
              {statsLoading ? '—' : todayUpcoming} Upcoming
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-amber">
            <IconClock size={22} />
          </div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Upcoming Today</span>
            <span className="hospital-stat-value">{statsLoading ? '—' : todayUpcoming}</span>
            <span className="hospital-stat-meta">Confirmed or awaiting payment</span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-green">
            <IconSyringe size={22} />
          </div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Completed Today</span>
            <span className="hospital-stat-value">{statsLoading ? '—' : todayCompleted}</span>
            <span className="hospital-stat-meta">Marked completed at this hospital</span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-purple">
            <IconShield size={22} />
          </div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Needs Dosage</span>
            <span className="hospital-stat-value">{statsLoading ? '—' : todayNeedsDosage}</span>
            <span className="hospital-stat-meta">Confirmed visits without prescribed dosage</span>
          </div>
        </div>
      </section>

      {activePatient && (
        <section className="doctor-spotlight-card">
          <div className="doctor-spotlight-header">
            <div>
              <div className="doctor-spotlight-badge">
                <span className="doctor-spotlight-pulse"></span>
                {spotlightBadge}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="doctor-token-pill" style={{ fontSize: '1.05rem', padding: '4px 12px' }}>
                  {activePatient.token}
                </span>
                <span className="doctor-spotlight-token">{activePatient.name}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Scheduled Slot</span>
              <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: '1rem' }}>
                {activePatient.time}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                {activePatient.appointmentStatus || '—'}
              </div>
            </div>
          </div>

          <div className="doctor-spotlight-details-grid">
            <div className="doctor-patient-bio">
              <div className="doctor-patient-avatar">
                <IconUser size={28} />
              </div>
              <div>
                <div className="doctor-patient-name">{activePatient.name}</div>
                <div className="doctor-patient-meta-text">
                  NIC: <strong>{activePatient.nic}</strong>
                </div>
                <div className="doctor-patient-meta-text">Phone: {activePatient.phone}</div>
              </div>
            </div>

            <div className="doctor-vitals-box">
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Scheduled Slot</span>
                <span className="doctor-vital-value">{activePatient.time}</span>
              </div>
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Booth</span>
                <span className="doctor-vital-value">{activePatient.booth || 'Not assigned'}</span>
              </div>
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Payment</span>
                <span className="doctor-vital-value">{activePatient.paymentStatus}</span>
              </div>
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Prescribed By</span>
                <span className="doctor-vital-value">{activePatient.prescribedBy || 'Not prescribed'}</span>
              </div>
            </div>

            <div className="doctor-vaccine-assign-box">
              <span className="doctor-vaccine-assign-title">Vaccine Prescription</span>
              <span className="doctor-vaccine-name">{activePatient.vaccine}</span>
              <span className="doctor-vaccine-lot">{activePatient.dose}</span>
            </div>
          </div>

          <div className="doctor-checklist-bar">
            <span className="doctor-checklist-heading">Pre-administration readiness</span>
            <div className="doctor-checklist-items">
              <span className={`doctor-check-pill${activePatient.hasDosage ? ' is-ok' : ' is-pending'}`}>
                {activePatient.hasDosage ? 'Dosage prescribed' : 'Dosage not set'}
              </span>
              <span className={`doctor-check-pill${activePatient.nic !== '—' ? ' is-ok' : ' is-pending'}`}>
                {activePatient.nic !== '—' ? 'Patient NIC on record' : 'NIC missing'}
              </span>
              <span className={`doctor-check-pill${isPaymentSettled(activePatient) ? ' is-ok' : ' is-pending'}`}>
                {isPaymentSettled(activePatient) ? 'Payment settled' : `Payment: ${activePatient.paymentStatus}`}
              </span>
              <span className={`doctor-check-pill${activePatient.booth ? ' is-ok' : ' is-pending'}`}>
                {activePatient.booth ? `Booth ${activePatient.booth}` : 'Booth not assigned'}
              </span>
            </div>
          </div>

          <div className="doctor-spotlight-actions">
            <button
              type="button"
              className="doctor-btn-defer"
              onClick={() => handleReturnToQueue(activePatient)}
              disabled={statusUpdating || !canReturnActive}
              title={
                !isOnDuty
                  ? 'You need an active shift to return a patient to the queue'
                  : activePatient.status !== 'consulting'
                    ? 'Only the active consulting patient can be returned to the queue'
                    : 'Send this patient back to the waiting queue'
              }
            >
              Return to Queue
            </button>
            <button
              type="button"
              className="doctor-btn-certify"
              onClick={() => setIsAdministerModalOpen(true)}
              disabled={statusUpdating || !canCertifyActive}
              title={
                !isOnDuty
                  ? 'You need an active shift to certify administration'
                  : activePatient.status !== 'consulting'
                    ? 'Select a consulting patient to certify administration'
                    : !activePaymentSettled
                      ? 'Payment must be settled first'
                      : 'Record administration details, then transfer to observation'
              }
            >
              Certify &amp; Transfer to Observation
            </button>
          </div>
          {!isOnDuty ? (
            <p className="doctor-off-duty-hint" style={{ marginTop: '10px', color: '#b45309', fontSize: '0.85rem', fontWeight: 600 }}>
              No active shift — clinical actions are disabled until your scheduled shift starts.
            </p>
          ) : activePatient.status !== 'consulting' ? (
            <p className="doctor-off-duty-hint" style={{ marginTop: '10px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
              Spotlight actions apply only while this patient is in active consultation.
            </p>
          ) : !activePaymentSettled ? (
            <p className="doctor-off-duty-hint" style={{ marginTop: '10px', color: '#b45309', fontSize: '0.85rem', fontWeight: 600 }}>
              Payment not settled — hospital desk must Mark paid at the counter before administration.
            </p>
          ) : null}
        </section>
      )}

      <div className="doctor-main-grid">
        <div className="doctor-card doctor-queue-card">
          <div className="section-card-header queue-section-header">
            <div className="section-title-group">
              <h2>
                <span className="section-title-icon icon-shade-purple">
                  <IconClipboard size={22} />
                </span>
                Today&apos;s Consultation Queue
              </h2>
              <p className="section-title-desc">
                {panelScope === 'hospital'
                  ? 'All patients booked at this hospital today'
                  : 'Patients assigned to you on today\u2019s schedule'}
              </p>
            </div>
            <div className="queue-panel-scope-switch" role="group" aria-label="Queue visibility">
              <button
                type="button"
                className={`queue-scope-btn${panelScope === 'my' ? ' active' : ''}`}
                onClick={() => {
                  if (panelScope === 'my') return;
                  setPanelScope('my');
                  loadDashboardData(selectedHospitalUserId, 'my');
                }}
                disabled={statsLoading || statusUpdating}
              >
                My patients
              </button>
              <button
                type="button"
                className={`queue-scope-btn${panelScope === 'hospital' ? ' active' : ''}`}
                onClick={() => {
                  if (panelScope === 'hospital') return;
                  setPanelScope('hospital');
                  loadDashboardData(selectedHospitalUserId, 'hospital');
                }}
                disabled={statsLoading || statusUpdating}
              >
                Whole hospital
              </button>
            </div>
          </div>

          <div className="queue-controls-bar">
            <div className="queue-controls-left">
              <div className="queue-scope-switch">
                <button
                  type="button"
                  className={`queue-scope-btn${filterStatus === 'all' ? ' active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  All ({patients.length})
                </button>
                <button
                  type="button"
                  className={`queue-scope-btn${filterStatus === 'waiting' ? ' active' : ''}`}
                  onClick={() => setFilterStatus('waiting')}
                >
                  Waiting ({waitingCount})
                </button>
                {awaitingPaymentCount > 0 ? (
                  <button
                    type="button"
                    className={`queue-scope-btn${filterStatus === 'awaiting_payment' ? ' active' : ''}`}
                    onClick={() => setFilterStatus('awaiting_payment')}
                  >
                    Awaiting payment ({awaitingPaymentCount})
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`queue-scope-btn${filterStatus === 'observation' ? ' active' : ''}`}
                  onClick={() => setFilterStatus('observation')}
                >
                  Observation ({observationCount})
                </button>
                <button
                  type="button"
                  className={`queue-scope-btn${filterStatus === 'completed' ? ' active' : ''}`}
                  onClick={() => setFilterStatus('completed')}
                >
                  Completed ({completedCount})
                </button>
              </div>

              <input
                type="text"
                className="queue-search-input"
                placeholder="Search patient, phone, token..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <button
                type="button"
                className="btn-inventory-refresh"
                onClick={() => {
                  setFilterStatus('all');
                  setSearchQuery('');
                  loadDashboardData(selectedHospitalUserId);
                }}
                disabled={statsLoading || statusUpdating}
                title="Refresh consultation queue"
              >
                {statsLoading ? '...' : <IconRefresh size={16} />}
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="hospital-queue-table">
              <colgroup>
                <col className="col-token" />
                <col className="col-patient" />
                <col className="col-vaccine" />
                <col className="col-booth" />
                <col className="col-status" />
                <col className="col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient Details</th>
                  <th>Vaccine &amp; Dose</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      {statsLoading
                        ? "Loading today's appointments..."
                        : patients.length === 0
                          ? panelScope === 'hospital'
                            ? 'No appointments for today at your affiliated hospital.'
                            : 'No patients assigned to you for today. Try whole-hospital view or check your schedule assignment.'
                          : 'No patients matching your search criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((p) => {
                    const isCurrent = activePatient?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        className={isCurrent ? 'is-current-patient' : undefined}
                      >
                        <td>
                          <span className="queue-token-pill">
                            {String(p.token || '').replace(/-/g, '\u2011')}
                          </span>
                        </td>
                        <td>
                          <div
                            className="queue-patient-name"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectPatient(p)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelectPatient(p);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {p.name}
                          </div>
                          <div className="queue-patient-meta">NIC: {p.nic}</div>
                          {p.phone && p.phone !== '—' ? (
                            <div className="queue-patient-meta">{p.phone}</div>
                          ) : null}
                        </td>
                        <td>
                          <div className="queue-vaccine-badge">{p.vaccine}</div>
                          <div className="queue-dose-meta" title={p.dose}>
                            {p.dose}
                          </div>
                        </td>
                        <td>
                          <span className="queue-booth-tag">{p.time || '—'}</span>
                        </td>
                        <td>
                          <span className={`queue-status-badge status-${p.status === 'waiting' && !isPaymentSettled(p) ? 'awaiting-payment' : p.status}`}>
                            {p.status === 'consulting'
                              ? 'Consulting'
                              : p.status === 'waiting'
                                ? isPaymentSettled(p)
                                  ? 'In Queue'
                                  : 'Awaiting payment'
                                : p.status === 'observation'
                                  ? 'Observation'
                                  : p.status === 'cancelled'
                                    ? 'Cancelled'
                                    : 'Completed'}
                          </span>
                        </td>
                        <td>
                          <div className="queue-action-btns">
                            {p.status === 'waiting' && (
                              <button
                                type="button"
                                className="btn-queue-action"
                                onClick={() => handleSelectPatient(p)}
                                disabled={!isOnDuty || !isPaymentSettled(p) || statusUpdating}
                                title={
                                  !isPaymentSettled(p)
                                    ? 'Payment must be settled first'
                                    : !isOnDuty
                                      ? 'You need an active shift'
                                      : undefined
                                }
                              >
                                Examine
                              </button>
                            )}
                            {p.status === 'consulting' && (
                              <button
                                type="button"
                                className="btn-queue-action btn-queue-action--session"
                                onClick={() => {
                                  setActivePatientId(p.id);
                                  setIsAdministerModalOpen(true);
                                }}
                                disabled={!isOnDuty || !isPaymentSettled(p) || statusUpdating}
                                title={
                                  !isPaymentSettled(p)
                                    ? 'Payment must be settled first'
                                    : !isOnDuty
                                      ? 'You need an active shift to administer'
                                      : undefined
                                }
                              >
                                Administer
                              </button>
                            )}
                            {p.status === 'observation' && (
                              <button
                                type="button"
                                className="btn-queue-action btn-queue-action--release"
                                onClick={() => handleDischargeObservation(p.id, p.name)}
                                disabled={!isOnDuty || !isPaymentSettled(p) || statusUpdating}
                                title={
                                  !isPaymentSettled(p)
                                    ? 'Payment must be settled first'
                                    : !isOnDuty
                                      ? 'You need an active shift to discharge'
                                      : undefined
                                }
                              >
                                Discharge
                              </button>
                            )}
                            {p.status === 'completed' && (
                              <span className="queue-pass-note">Certified</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="doctor-side-column">
          <div className="doctor-obs-card">
            <div className="doctor-obs-header">
              <div
                className="doctor-obs-title"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="icon-shade icon-shade-purple">
                  <IconClock size={22} />
                </span>
                15-Min Observation Watch
              </div>
              <span className="doctor-obs-count-badge">
                {observationPatients.length} Under Watch
              </span>
            </div>

            {observationPatients.length === 0 ? (
              <div className="doctor-obs-empty">
                Observation recovery room is currently clear.
              </div>
            ) : (
              <div className="doctor-obs-list">
                {observationPatients.map((obs) => (
                  <div key={obs.id} className="doctor-obs-item">
                    <div className="doctor-obs-item-info">
                      <span className="doctor-obs-item-name">{obs.name}</span>
                      <span className="doctor-obs-item-meta">
                        {obs.vaccine} • {obs.administeredTime}
                      </span>
                      <span
                        className={
                          obs.minsLeft === 0
                            ? 'doctor-obs-item-state is-clear'
                            : 'doctor-obs-item-state'
                        }
                      >
                        {obs.minsLeft === 0
                          ? 'Observation window complete'
                          : 'Under observation'}
                      </span>
                    </div>
                    <div className="doctor-obs-countdown">
                      <span
                        className="doctor-obs-timer-pill"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <IconClock size={14} />
                        {obs.minsLeft === null
                          ? 'Time unknown'
                          : obs.minsLeft === 0
                            ? 'Ready to discharge'
                            : `${obs.minsLeft} min left`}
                      </span>
                      <button
                        type="button"
                        className="doctor-obs-btn-discharge"
                        onClick={() => handleDischargeObservation(obs.id, obs.name)}
                        disabled={!isOnDuty || statusUpdating}
                        title={!isOnDuty ? 'You need an active shift to discharge' : undefined}
                      >
                        Discharge Patient
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="doctor-coldbox-card staff-today-slots">
            <div className="staff-today-slots-header">
              <div className="staff-today-slots-title">
                <span className="icon-shade icon-shade-green">
                  <IconClock size={22} />
                </span>
                <span>Today&apos;s Slots</span>
              </div>
              <span className="staff-today-slots-count">
                {todayAppointments.length}{' '}
                {todayAppointments.length === 1 ? 'slot' : 'slots'}
              </span>
            </div>

            {todayAppointments.length === 0 ? (
              <p className="staff-today-slots-empty">No slots booked for today.</p>
            ) : (
              <ul className="staff-today-slots-list">
                {todayAppointments.slice(0, 6).map((a) => {
                  const done = a.status === 'Completed';
                  return (
                    <li
                      key={a.id}
                      className={`staff-today-slot-item${done ? ' is-done' : ''}`}
                    >
                      <div className="staff-today-slot-time">
                        {a.timeSlot || a.startTime || '—'}
                      </div>
                      <div className="staff-today-slot-meta">
                        <span className="staff-today-slot-name">
                          {a.patientName || 'Patient'}
                        </span>
                        <span
                          className={`staff-today-slot-status${done ? ' is-done' : ''}`}
                        >
                          {a.status || 'Scheduled'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AdministerModal
        isOpen={isAdministerModalOpen}
        onClose={() => setIsAdministerModalOpen(false)}
        patient={activePatient}
        onCertify={handleCertifyAdministration}
        lotOptions={inventoryLots}
      />

      <AefiModal
        isOpen={isAefiModalOpen}
        onClose={() => setIsAefiModalOpen(false)}
        onSubmitReport={handleAefiSubmit}
        patient={activePatient}
      />
    </div>
  );
}
