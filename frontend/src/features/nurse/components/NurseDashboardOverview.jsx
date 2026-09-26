import React, { useEffect, useMemo, useState } from 'react';
import { getUser } from '../../auth/services/authService';
import staffService from '../../hospital/services/staffService';
import { inventoryService } from '../../hospital/services/inventoryService';
import staffAppointmentService from '../../staff/services/staffAppointmentService';
import NurseClinicalAdministerModal from './NurseClinicalAdministerModal';
import NurseAefiReportModal from './NurseAefiReportModal';
import { IconCalendar, IconClipboard, IconClock, IconHospital, IconShield, IconSnowflake, IconSyringe, IconUser } from '../../../shared/icons/AppIcons';

const dutyLabel = {
  Off: 'Off duty',
  OnDuty: 'On duty',
  OnBreak: 'On break',
};

function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatNurseName(user) {
  const raw = (user?.name || '').trim();
  if (!raw) return 'Nurse';
  if (/^nurse\s/i.test(raw)) return raw;
  return `Nurse ${raw}`;
}

function toDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function NurseDashboardOverview() {
  const [isAdministerModalOpen, setIsAdministerModalOpen] = useState(false);
  const [isAefiModalOpen, setIsAefiModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);
  const [user] = useState(() => getUser());
  const [affiliations, setAffiliations] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [coldBoxStock, setColdBoxStock] = useState([]);
  const [coldBoxLoading, setColdBoxLoading] = useState(true);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      setColdBoxLoading(true);
      try {
        const list = await staffService.getMyAffiliations();
        const active = Array.isArray(list) ? list : [];
        if (cancelled) return;
        setAffiliations(active);

        const hospitalId = active[0]?.hospitalUserId;
        if (!hospitalId) {
          setTodayAppointments([]);
          setColdBoxStock([]);
          return;
        }

        const [appts, batches] = await Promise.all([
          staffAppointmentService.getHospitalAppointments(hospitalId, toDateInputValue()),
          inventoryService.getInventory().catch(() => []),
        ]);
        if (cancelled) return;

        setTodayAppointments(Array.isArray(appts) ? appts : []);
        const stock = (Array.isArray(batches) ? batches : [])
          .filter((b) => Number(b.available ?? 0) > 0)
          .slice(0, 8)
          .map((b) => ({
            name: b.name || 'Vaccine',
            lot: b.lotNumber || '—',
            count: Number(b.available ?? 0),
            unit: 'vials',
          }));
        setColdBoxStock(stock);
      } catch {
        if (!cancelled) {
          setAffiliations([]);
          setTodayAppointments([]);
          setColdBoxStock([]);
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
          setColdBoxLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const primaryAffiliation = affiliations[0];
  const nurseTitle = formatNurseName(user);
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

  // Local UI status for today's live appointments (consulting / observation)
  const [activePatientId, setActivePatientId] = useState(null);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [observationPatients, setObservationPatients] = useState([]);

  const patients = useMemo(() => {
    return todayAppointments.map((a) => {
      const id = a.id;
      let status = 'waiting';
      if (a.status === 'Completed') status = 'completed';
      else if (a.status === 'Confirmed' || a.status === 'PendingPayment') status = 'waiting';
      if (statusOverrides[id]) status = statusOverrides[id];

      const short = String(id).replace(/-/g, '').slice(0, 4).toUpperCase();
      return {
        id,
        token: `T-${short}`,
        name: a.patientName || 'Patient',
        nic: a.patientNic || '—',
        age: null,
        gender: null,
        phone: a.patientPhone || '—',
        vaccine: a.vaccineName || '—',
        dose: a.prescribedDosage || 'Dosage not set',
        time: a.timeSlot || [a.startTime, a.endTime].filter(Boolean).join(' – ') || '—',
        allergy: null,
        status,
        appointmentStatus: a.status,
        notes: a.notes || '',
        vitals: null,
      };
    });
  }, [todayAppointments, statusOverrides]);

  const activePatient = useMemo(
    () => patients.find((p) => p.id === activePatientId) || null,
    [patients, activePatientId]
  );

  const handleCallNext = () => {
    const nextWaiting = patients.find((p) => p.status === 'waiting');
    if (!nextWaiting) {
      showToast('No more waiting patients in today\'s queue.');
      return;
    }

    const current = activePatientId
      ? patients.find((p) => p.id === activePatientId)
      : null;

    if (current?.status === 'consulting') {
      setObservationPatients((obs) => {
        if (obs.some((o) => o.id === current.id)) return obs;
        return [
          {
            id: current.id,
            token: current.token,
            name: current.name,
            vaccine: current.vaccine,
            administeredTime: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            minsLeft: 15,
            condition: 'In observation',
          },
          ...obs,
        ];
      });
    }

    setStatusOverrides((prev) => {
      const next = { ...prev };
      if (current?.status === 'consulting') next[current.id] = 'observation';
      next[nextWaiting.id] = 'consulting';
      return next;
    });
    setActivePatientId(nextWaiting.id);
    showToast(`📢 Calling ${nextWaiting.name} (${nextWaiting.token})`);
  };

  const handleSelectPatient = (patient) => {
    setActivePatientId(patient.id);
    if (patient.status === 'waiting') {
      setStatusOverrides((prev) => ({ ...prev, [patient.id]: 'consulting' }));
    }
  };

  const handleCertifyAdministration = (certifiedData) => {
    setObservationPatients((prev) => [
      {
        id: certifiedData.id,
        token: certifiedData.token,
        name: certifiedData.name,
        vaccine: certifiedData.vaccine,
        administeredTime: certifiedData.administeredAt,
        minsLeft: 15,
        condition: 'Stable - Normal',
      },
      ...prev.filter((p) => p.id !== certifiedData.id),
    ]);
    setStatusOverrides((prev) => ({ ...prev, [certifiedData.id]: 'observation' }));
    showToast(`✅ Recorded administration for ${certifiedData.name}`);
  };

  const handleDischargeObservation = (id, name) => {
    setObservationPatients((prev) => prev.filter((p) => p.id !== id));
    setStatusOverrides((prev) => ({ ...prev, [id]: 'completed' }));
    if (activePatientId === id) setActivePatientId(null);
    showToast(`👍 ${name} discharged from observation.`);
  };

  const handleAefiSubmit = (data) => {
    showToast(`⚠️ AEFI report noted for ${data.patientName}.`);
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

  return (
    <div className="nurse-dashboard-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="doctor-toast">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Hero Banner with Welcome, Station Status, and Quick Actions */}
      <section className="doctor-hero-banner nurse-hero-banner">
        <div className="doctor-hero-info">
          <h1 className="doctor-hero-title">
            {greeting}, {nurseTitle}
          </h1>
          <p className="doctor-hero-subtitle">
            {heroDateLabel}
            {primaryAffiliation?.hospitalName
              ? ` • ${primaryAffiliation.hospitalName}`
              : ' • No active hospital affiliation yet'}
          </p>
          <div className="doctor-hero-session-pill">
            {primaryAffiliation ? (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconHospital size={14} /> {primaryAffiliation.hospitalName || 'Affiliated hospital'}
                </span>
                <span>•</span>
                <span>{dutyText}</span>
                {affiliations.length > 1 && (
                  <>
                    <span>•</span>
                    <span>{affiliations.length} hospitals</span>
                  </>
                )}
              </>
            ) : (
              <span>Accept a hospital invitation on Affiliations to join a roster</span>
            )}
          </div>
        </div>

        <div className="doctor-hero-actions">
          <button
            type="button"
            className="doctor-btn-call-next"
            onClick={handleCallNext}
          >
            📢 Call Next Patient
          </button>
          <button
            type="button"
            className="doctor-btn-report-aefi"
            onClick={() => setIsAefiModalOpen(true)}
          >
            ⚠️ Report AEFI
          </button>
        </div>
      </section>

      {/* 2. Key Metrics Ribbon (4 Cards) — live hospital appointments for today */}
      <section className="doctor-stats-grid">
        <div className="doctor-stat-card">
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Today&apos;s Appointments</span>
            <span className="doctor-stat-value">{statsLoading ? '—' : todayTotal}</span>
            <span className="doctor-stat-meta">
              <span style={{ color: '#059669', fontWeight: 700 }}>
                {statsLoading ? '—' : todayCompleted} Completed
              </span>
              {' • '}
              {statsLoading ? '—' : todayUpcoming} Upcoming
            </span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-blue">
            <IconCalendar size={22} />
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Upcoming Today</span>
            <span className="doctor-stat-value" style={{ color: '#d97706' }}>
              {statsLoading ? '—' : todayUpcoming}
            </span>
            <span className="doctor-stat-meta">Confirmed or awaiting payment</span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-amber">
            <IconClock size={22} />
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Completed Today</span>
            <span className="doctor-stat-value" style={{ color: '#059669' }}>
              {statsLoading ? '—' : todayCompleted}
            </span>
            <span className="doctor-stat-meta">Marked completed at this hospital</span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-green">
            <IconSyringe size={22} />
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Needs Dosage</span>
            <span className="doctor-stat-value" style={{ color: '#dc2626' }}>
              {statsLoading ? '—' : todayNeedsDosage}
            </span>
            <span className="doctor-stat-meta">Confirmed visits without prescribed dosage</span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-purple">
            <IconShield size={22} />
          </div>
        </div>
      </section>

      {/* 3. Active Consultation Spotlight Workspace */}
      {activePatient && (
        <section className="doctor-spotlight-card nurse-spotlight-card">
          <div className="doctor-spotlight-header">
            <div>
              <div className="doctor-spotlight-badge">
                <span className="doctor-spotlight-pulse"></span>
                Active Immunization Station
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
            {/* Bio & Details */}
            <div className="doctor-patient-bio">
              <div className="doctor-patient-avatar"><IconUser size={28} /></div>
              <div>
                <div className="doctor-patient-name">{activePatient.name}</div>
                <div className="doctor-patient-meta-text">
                  NIC: <strong>{activePatient.nic}</strong>
                </div>
                <div className="doctor-patient-meta-text">
                  Phone: {activePatient.phone}
                </div>
                <div style={{ marginTop: '6px' }}>
                  <span className="doctor-allergy-flag doctor-allergy-none">
                    Allergy data not linked yet
                  </span>
                </div>
              </div>
            </div>

            {/* Pre-Screen Vitals */}
            <div className="doctor-vitals-box">
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Blood Pressure</span>
                <span className="doctor-vital-value">{activePatient.vitals?.bp || '—'}</span>
              </div>
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Pulse</span>
                <span className="doctor-vital-value">{activePatient.vitals?.pulse || '—'}</span>
              </div>
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Temperature</span>
                <span className="doctor-vital-value">{activePatient.vitals?.temp || '—'}</span>
              </div>
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Oxygen (SpO2)</span>
                <span className="doctor-vital-value">{activePatient.vitals?.spo2 || '—'}</span>
              </div>
            </div>

            {/* Vaccine to Administer */}
            <div className="doctor-vaccine-assign-box">
              <span className="doctor-vaccine-assign-title">Vaccine Prescription</span>
              <span className="doctor-vaccine-name">{activePatient.vaccine}</span>
              <span className="doctor-vaccine-lot">
                {activePatient.dose}
              </span>
            </div>
          </div>

          {/* Pre-Screen Checklist */}
          <div className="doctor-checklist-bar">
            <span style={{ fontWeight: 700, color: '#334155' }}>Clinical Safety Screen:</span>
            <div className="doctor-checklist-items">
              <span className="doctor-check-pill">
                <span className="doctor-check-icon-ok">✓</span> No Acute Fever / Illness
              </span>
              <span className="doctor-check-pill">
                <span className="doctor-check-icon-ok">✓</span> No Prior Anaphylaxis
              </span>
              <span className="doctor-check-pill">
                <span className="doctor-check-icon-ok">✓</span> Informed Consent Signed
              </span>
              <span className="doctor-check-pill">
                <span className="doctor-check-icon-ok">✓</span> Dose Interval Compliant
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="doctor-spotlight-actions">
            <button
              type="button"
              className="doctor-btn-defer"
              onClick={() => showToast(`Consultation deferred for ${activePatient.name}.`)}
            >
              Postpone / Reassign
            </button>
            <button
              type="button"
              className="doctor-btn-observe"
              onClick={() => {
                handleCertifyAdministration({
                  ...activePatient,
                  administeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });
              }}
            >
              ⏱️ Transfer to Observation
            </button>
            <button
              type="button"
              className="doctor-btn-certify"
              onClick={() => setIsAdministerModalOpen(true)}
            >
              💉 Certify &amp; Record Administration
            </button>
          </div>
        </section>
      )}

      {/* 4. Main Two-Column Layout (Queue + Side Panels) */}
      <div className="doctor-main-grid">
        {/* Left Column: Today's Patient Queue Table */}
        <div className="doctor-card">
          <div className="doctor-card-header">
            <div className="doctor-card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="icon-shade icon-shade-blue"><IconClipboard size={22} /></span>
              Today's Nursing Clinic Queue
            </div>

            <div className="doctor-filter-pills">
              <button
                type="button"
                className={`doctor-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All ({patients.length})
              </button>
              <button
                type="button"
                className={`doctor-filter-btn ${filterStatus === 'waiting' ? 'active' : ''}`}
                onClick={() => setFilterStatus('waiting')}
              >
                Waiting ({waitingCount})
              </button>
              <button
                type="button"
                className={`doctor-filter-btn ${filterStatus === 'observation' ? 'active' : ''}`}
                onClick={() => setFilterStatus('observation')}
              >
                Observation ({observationCount})
              </button>
              <button
                type="button"
                className={`doctor-filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
                onClick={() => setFilterStatus('completed')}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="doctor-search-bar">
            <span className="doctor-search-icon">🔍</span>
            <input
              type="text"
              className="doctor-search-input"
              placeholder="Search by patient name, NIC, token, or vaccine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Queue Table */}
          <div className="doctor-table-wrapper">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Vaccine &amp; Dose</th>
                  <th>Allergy / Risk</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      {statsLoading
                        ? 'Loading today\'s appointments...'
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
                        <td>
                          <span className="doctor-allergy-flag doctor-allergy-none">
                            —
                          </span>
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
                            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                              ✓ Certified
                            </span>
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

        {/* Right Column: Observation Room Watch & Station Cold Box Stock */}
        <div className="doctor-side-column">
          {/* Observation Watch Widget */}
          <div className="doctor-obs-card">
            <div className="doctor-obs-header">
              <div className="doctor-obs-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="icon-shade icon-shade-amber"><IconClock size={22} /></span>
                15-Min Observation Watch
              </div>
              <span className="doctor-obs-count-badge">
                {observationPatients.length} Under Watch
              </span>
            </div>

            {observationPatients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b', fontSize: '0.88rem' }}>
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
                      <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                        ✓ {obs.condition}
                      </span>
                    </div>
                    <div className="doctor-obs-countdown">
                      <span className="doctor-obs-timer-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IconClock size={14} /> {obs.minsLeft} mins left
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

          {/* Booth Cold Box Vaccine Inventory */}
          <div className="doctor-coldbox-card">
            <div className="doctor-coldbox-header">
              <div className="doctor-coldbox-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="icon-shade icon-shade-teal"><IconSnowflake size={22} /></span>
                Cold-Box Stock
              </div>
            </div>

            <div className="doctor-coldbox-list">
              {coldBoxLoading ? (
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                  Loading stock…
                </p>
              ) : !primaryAffiliation ? (
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                  Join a hospital to see booth stock.
                </p>
              ) : coldBoxStock.length === 0 ? (
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                  No vials in stock for this hospital.
                </p>
              ) : (
                coldBoxStock.map((item, idx) => (
                  <div key={idx} className="doctor-coldbox-item">
                    <div>
                      <div className="doctor-coldbox-name">{item.name}</div>
                      <div className="doctor-coldbox-lot">Lot: {item.lot}</div>
                    </div>
                    <div className="doctor-coldbox-count">
                      <span className="doctor-coldbox-number">{item.count}</span>
                      <span className="doctor-coldbox-unit">{item.unit}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today's appointment slots */}
          <div className="doctor-coldbox-card">
            <div className="doctor-coldbox-header">
              <div className="doctor-coldbox-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="icon-shade icon-shade-amber"><IconClock size={22} /></span>
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
                      border: a.status === 'Completed' ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
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

      {/* Clinical Administration & Certification Modal */}
      <NurseClinicalAdministerModal
        isOpen={isAdministerModalOpen}
        onClose={() => setIsAdministerModalOpen(false)}
        patient={activePatient}
        onCertify={handleCertifyAdministration}
      />

      {/* AEFI Report Modal */}
      <NurseAefiReportModal
        isOpen={isAefiModalOpen}
        onClose={() => setIsAefiModalOpen(false)}
        onSubmitReport={handleAefiSubmit}
      />
    </div>
  );
}
