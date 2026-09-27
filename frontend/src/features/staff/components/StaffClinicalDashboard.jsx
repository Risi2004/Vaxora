import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getUser } from '../../auth/services/authService';
import staffService from '../../hospital/services/staffService';
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

const dutyLabel = {
  Off: 'Off duty',
  OnDuty: 'On duty',
  OnBreak: 'On break',
};

/** Post-vaccination observation window mandated before a patient may be discharged. */
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
  if (s === 'cancelled' || s === 'rejected') return 'completed';
  return 'waiting';
}

function pickDefaultHospitalId(active, preferredId) {
  if (preferredId && active.some((a) => a.hospitalUserId === preferredId)) {
    return preferredId;
  }
  const onDuty = active.find((a) => a.dutyStatus === 'OnDuty');
  return onDuty?.hospitalUserId || active[0]?.hospitalUserId || '';
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
  const [statsLoading, setStatsLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activePatientId, setActivePatientId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [hospitalMenuOpen, setHospitalMenuOpen] = useState(false);
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

  const loadDashboardData = useCallback(async (hospitalOverride) => {
    setStatsLoading(true);
    setLoadError('');
    try {
      const list = await staffService.getMyAffiliations();
      const active = Array.isArray(list) ? list : [];
      setAffiliations(active);

      const hospitalId = allowHospitalSwitch
        ? pickDefaultHospitalId(
            active,
            hospitalOverride !== undefined ? hospitalOverride : selectedHospitalUserId
          )
        : active[0]?.hospitalUserId || '';

      setSelectedHospitalUserId(hospitalId || '');

      if (!hospitalId) {
        setTodayAppointments([]);
        setActivePatientId(null);
        return;
      }

      const appts = await staffAppointmentService.getHospitalAppointments(
        hospitalId,
        toDateInputValue()
      );
      const rows = Array.isArray(appts) ? appts : [];
      setTodayAppointments(rows);

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
      setSelectedHospitalUserId('');
      setActivePatientId(null);
    } finally {
      setStatsLoading(false);
    }
  }, [allowHospitalSwitch, selectedHospitalUserId]);

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
  const dutyText = primaryAffiliation
    ? dutyLabel[primaryAffiliation.dutyStatus] || primaryAffiliation.dutyStatus
    : null;

  const todayTotal = todayAppointments.length;
  const todayCompleted = todayAppointments.filter((a) => a.status === 'Completed').length;
  const todayUpcoming = todayAppointments.filter(
    (a) => a.status === 'Confirmed' || a.status === 'PendingPayment'
  ).length;
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
    const nextWaiting = patients.find((p) => p.status === 'waiting');
    if (!nextWaiting) {
      showToast("No more waiting patients in today's queue.");
      return;
    }

    const current = activePatientId
      ? patients.find((p) => p.id === activePatientId)
      : null;

    try {
      if (current?.status === 'consulting') {
        await staffAppointmentService.updateAppointmentStatus(current.id, 'Observation');
      }
      await staffAppointmentService.updateAppointmentStatus(nextWaiting.id, 'Administering');
      setActivePatientId(nextWaiting.id);
      showToast(`Calling ${nextWaiting.name} (${nextWaiting.token})`);
      await loadDashboardData(selectedHospitalUserId);
    } catch (err) {
      showToast(err.message || 'Failed to call next patient.');
    }
  };

  const handleSelectPatient = async (patient) => {
    setActivePatientId(patient.id);
    if (patient.status === 'waiting') {
      try {
        await persistStatus(patient.id, 'Administering');
      } catch (err) {
        showToast(err.message || 'Failed to start consultation.');
      }
    }
  };

  const handleCertifyAdministration = async (certifiedData) => {
    try {
      await persistStatus(certifiedData.id, 'Observation');
      showToast(`Recorded administration for ${certifiedData.name}`);
    } catch (err) {
      showToast(err.message || 'Failed to move patient to observation.');
    }
  };

  const handleReturnToQueue = async (patient) => {
    try {
      await persistStatus(patient.id, 'Confirmed');
      if (activePatientId === patient.id) setActivePatientId(null);
      showToast(`${patient.name} returned to the waiting queue.`);
    } catch (err) {
      showToast(err.message || 'Failed to return the patient to the queue.');
    }
  };

  const handleDischargeObservation = async (id, name) => {
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
    loadDashboardData(hospitalUserId);
  };

  const handleAefiSubmit = (data) => {
    showToast(`AEFI report noted for ${data.patientName}.`);
  };

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.token.toLowerCase().includes(q) ||
      String(p.nic).toLowerCase().includes(q) ||
      p.vaccine.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const waitingCount = patients.filter((p) => p.status === 'waiting').length;
  const completedCount = patients.filter((p) => p.status === 'completed').length;
  const observationCount = patients.filter((p) => p.status === 'observation').length;
  const showHospitalSwitch = allowHospitalSwitch && affiliations.length > 1;

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
                    const label = dutyLabel[h.dutyStatus] || h.dutyStatus || 'Off duty';
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
              disabled={statusUpdating || statsLoading || !selectedHospitalUserId}
            >
              Call Next Patient
            </button>
            <button
              type="button"
              className="doctor-btn-report-aefi"
              onClick={() => setIsAefiModalOpen(true)}
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
              <span className={`doctor-check-pill${activePatient.paymentStatus === 'Paid' ? ' is-ok' : ' is-pending'}`}>
                {activePatient.paymentStatus === 'Paid' ? 'Payment settled' : `Payment: ${activePatient.paymentStatus}`}
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
              disabled={statusUpdating}
            >
              Return to Queue
            </button>
            <button
              type="button"
              className="doctor-btn-observe"
              onClick={() => {
                handleCertifyAdministration({
                  ...activePatient,
                  administeredAt: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                });
              }}
              disabled={statusUpdating}
            >
              Transfer to Observation
            </button>
            <button
              type="button"
              className="doctor-btn-certify"
              onClick={() => setIsAdministerModalOpen(true)}
              disabled={statusUpdating}
            >
              Certify &amp; Record Administration
            </button>
          </div>
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
                Live patient flow for today&apos;s session at your affiliated hospital
              </p>
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

          <div className="doctor-table-wrapper">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Vaccine &amp; Dose</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      {statsLoading
                        ? "Loading today's appointments..."
                        : patients.length === 0
                          ? 'No appointments for today at your affiliated hospital.'
                          : 'No patients matching your search criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((p) => {
                    const isCurrent = activePatient?.id === p.id;
                    return (
                      <tr key={p.id} style={{ background: isCurrent ? '#f0f7ff' : undefined }}>
                        <td>
                          <span className="doctor-token-pill">{p.token}</span>
                        </td>
                        <td>
                          <div className="doctor-patient-cell">
                            <span
                              className="doctor-patient-name-link"
                              onClick={() => handleSelectPatient(p)}
                            >
                              {p.name}
                            </span>
                            <span className="doctor-patient-sub">
                              NIC: {p.nic}
                              {p.phone && p.phone !== '—' ? ` • ${p.phone}` : ''}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="doctor-vaccine-badge">{p.vaccine}</span>
                          <span className="doctor-dose-sub">{p.dose}</span>
                        </td>
                        <td style={{ color: '#475569', fontWeight: 600 }}>{p.time}</td>
                        <td>
                          <span className={`doctor-status-badge status-${p.status}`}>
                            {p.status === 'consulting'
                              ? 'Consulting'
                              : p.status === 'waiting'
                                ? 'In Queue'
                                : p.status === 'observation'
                                  ? 'Observation'
                                  : 'Completed'}
                          </span>
                        </td>
                        <td>
                          {p.status === 'waiting' && (
                            <button
                              type="button"
                              className="doctor-table-btn"
                              onClick={() => handleSelectPatient(p)}
                            >
                              Examine
                            </button>
                          )}
                          {p.status === 'consulting' && (
                            <button
                              type="button"
                              className="doctor-table-btn"
                              style={{ background: '#19469d', color: '#ffffff' }}
                              onClick={() => setIsAdministerModalOpen(true)}
                            >
                              Administer
                            </button>
                          )}
                          {p.status === 'observation' && (
                            <button
                              type="button"
                              className="doctor-table-btn"
                              style={{ background: '#ecfdf5', color: '#047857' }}
                              onClick={() => handleDischargeObservation(p.id, p.name)}
                            >
                              Discharge
                            </button>
                          )}
                          {p.status === 'completed' && (
                            <span className="doctor-row-note">Certified</span>
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

        <div className="doctor-side-column">
          <div className="doctor-obs-card">
            <div className="doctor-obs-header">
              <div
                className="doctor-obs-title"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="icon-shade icon-shade-amber">
                  <IconClock size={22} />
                </span>
                15-Min Observation Watch
              </div>
              <span className="doctor-obs-count-badge">
                {observationPatients.length} Under Watch
              </span>
            </div>

            {observationPatients.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 10px',
                  color: '#64748b',
                  fontSize: '0.88rem',
                }}
              >
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
                      >
                        Discharge Patient
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="doctor-coldbox-card">
            <div className="doctor-coldbox-header">
              <div
                className="doctor-coldbox-title"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="icon-shade icon-shade-amber">
                  <IconClock size={22} />
                </span>
                Today&apos;s Slots
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              {todayAppointments.length === 0 ? (
                <p style={{ margin: 0, color: '#64748b' }}>No slots booked for today.</p>
              ) : (
                todayAppointments.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '8px 12px',
                      background: a.status === 'Completed' ? '#f1f5f9' : '#eff6ff',
                      borderRadius: '8px',
                      border:
                        a.status === 'Completed' ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                      {a.timeSlot || a.startTime || '—'}
                    </span>
                    <span style={{ color: '#1e40af', fontWeight: 650, textAlign: 'right' }}>
                      {a.patientName} · {a.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AdministerModal
        isOpen={isAdministerModalOpen}
        onClose={() => setIsAdministerModalOpen(false)}
        patient={activePatient}
        onCertify={handleCertifyAdministration}
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
