import React, { useState } from 'react';
import ClinicalAdministerModal from './ClinicalAdministerModal';
import AefiReportModal from './AefiReportModal';

export default function DoctorDashboardOverview() {
  const [isAdministerModalOpen, setIsAdministerModalOpen] = useState(false);
  const [isAefiModalOpen, setIsAefiModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Currently Active Patient in Consultation
  const [activePatient, setActivePatient] = useState({
    id: 3,
    token: 'T-103',
    name: 'Rohan Jayatillake',
    nic: '197612349876',
    age: 50,
    gender: 'Male',
    phone: '+94 77 234 5678',
    vaccine: 'Hepatitis B Recombinant',
    dose: 'Dose 2 of 3',
    time: '09:22 AM',
    allergy: 'Penicillin Allergy',
    vitals: {
      bp: '120/80 mmHg',
      temp: '36.6 °C',
      pulse: '72 bpm',
      spo2: '99%',
    },
    status: 'consulting',
  });

  // Patient Queue State
  const [patients, setPatients] = useState([
    {
      id: 1,
      token: 'T-101',
      name: 'Chaminda Wickramasinghe',
      nic: '198845210982',
      age: 38,
      gender: 'Male',
      vaccine: 'Pfizer-BioNTech Bivalent',
      dose: 'Booster Dose (3)',
      time: '09:15 AM',
      allergy: 'None Reported',
      status: 'completed',
    },
    {
      id: 2,
      token: 'T-102',
      name: 'Nadeeka Priyadarshani',
      nic: '199589234120',
      age: 29,
      gender: 'Female',
      vaccine: 'Influenza (Quadrivalent)',
      dose: 'Annual Routine',
      time: '09:18 AM',
      allergy: 'Dust & Pollen',
      status: 'observation',
      obsRemaining: '6 mins',
    },
    {
      id: 3,
      token: 'T-103',
      name: 'Rohan Jayatillake',
      nic: '197612349876',
      age: 50,
      gender: 'Male',
      vaccine: 'Hepatitis B Recombinant',
      dose: 'Dose 2 of 3',
      time: '09:22 AM',
      allergy: 'Penicillin Allergy',
      status: 'consulting',
    },
    {
      id: 4,
      token: 'T-104',
      name: 'Sanduni Malshani',
      nic: '200156789123',
      age: 23,
      gender: 'Female',
      vaccine: 'MMR (Measles, Mumps)',
      dose: 'Booster Dose',
      time: '09:25 AM',
      allergy: 'None Reported',
      status: 'waiting',
    },
    {
      id: 5,
      token: 'T-105',
      name: 'Kasun Bandara Herath',
      nic: '198423456789',
      age: 42,
      gender: 'Male',
      vaccine: 'Moderna Spikevax',
      dose: 'Booster Dose (4)',
      time: '09:28 AM',
      allergy: 'Asthmatic (Mild)',
      status: 'waiting',
    },
    {
      id: 6,
      token: 'T-106',
      name: 'Kumari Dissanayake',
      nic: '197945612300',
      age: 47,
      gender: 'Female',
      vaccine: 'Hepatitis B Recombinant',
      dose: 'Dose 1 (Primary)',
      time: '09:35 AM',
      allergy: 'None Reported',
      status: 'waiting',
    },
    {
      id: 7,
      token: 'T-100',
      name: 'Malini Senanayake',
      nic: '196234567890',
      age: 64,
      gender: 'Female',
      vaccine: 'Influenza (Quadrivalent)',
      dose: 'Senior High-Dose',
      time: '09:00 AM',
      allergy: 'None Reported',
      status: 'completed',
    },
  ]);

  // Observation Room List
  const [observationPatients, setObservationPatients] = useState([
    {
      id: 2,
      token: 'T-102',
      name: 'Nadeeka Priyadarshani',
      vaccine: 'Influenza (Quadrivalent)',
      administeredTime: '09:18 AM',
      minsLeft: 6,
      condition: 'Stable - Normal',
    },
    {
      id: 8,
      token: 'T-099',
      name: 'Dinesh Weerakoon',
      vaccine: 'Pfizer-BioNTech Bivalent',
      administeredTime: '09:10 AM',
      minsLeft: 2,
      condition: 'Stable - Normal',
    },
  ]);

  // Booth 01 Cold Box Stock
  const coldBoxStock = [
    { name: 'Pfizer-BioNTech Bivalent', lot: 'PF-9082', count: 12, unit: 'vials' },
    { name: 'Hepatitis B Recombinant', lot: 'HB-8821', count: 14, unit: 'vials' },
    { name: 'Moderna Spikevax', lot: 'MD-4419', count: 8, unit: 'vials' },
    { name: 'Influenza Quadrivalent', lot: 'INF-7012', count: 19, unit: 'vials' },
    { name: 'MMR Live Attenuated', lot: 'MMR-3301', count: 6, unit: 'vials' },
  ];

  // Call Next Patient Function
  const handleCallNext = () => {
    const nextWaiting = patients.find((p) => p.status === 'waiting');
    if (!nextWaiting) {
      showToast('No more waiting patients in queue.');
      return;
    }

    // Set previously active patient to completed or waiting
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === nextWaiting.id) return { ...p, status: 'consulting' };
        if (p.id === activePatient?.id && p.status === 'consulting') return { ...p, status: 'observation' };
        return p;
      })
    );

    setActivePatient({
      ...nextWaiting,
      status: 'consulting',
      vitals: {
        bp: '118/78 mmHg',
        temp: '36.5 °C',
        pulse: '70 bpm',
        spo2: '99%',
      },
    });

    showToast(`📢 Calling ${nextWaiting.name} (Token ${nextWaiting.token}) to Booth 01`);
  };

  // Select patient into spotlight
  const handleSelectPatient = (patient) => {
    setActivePatient({
      ...patient,
      vitals: activePatient?.id === patient.id && activePatient.vitals ? activePatient.vitals : {
        bp: '120/80 mmHg',
        temp: '36.6 °C',
        pulse: '72 bpm',
        spo2: '99%',
      },
    });
  };

  // Certify and complete administration
  const handleCertifyAdministration = (certifiedData) => {
    // Add to observation list
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
      ...prev,
    ]);

    // Update patient status in queue
    setPatients((prev) =>
      prev.map((p) => (p.id === certifiedData.id ? { ...p, status: 'observation' } : p))
    );

    showToast(`✅ Successfully certified & issued digital pass for ${certifiedData.name}`);
  };

  // Discharge from observation
  const handleDischargeObservation = (id, name) => {
    setObservationPatients((prev) => prev.filter((p) => p.id !== id));
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'completed' } : p))
    );
    showToast(`👍 ${name} discharged from 15-minute observation.`);
  };

  // Submit AEFI Report
  const handleAefiSubmit = (data) => {
    showToast(`⚠️ AEFI Report recorded for ${data.patientName}. MOH Surveillance Alert dispatched.`);
  };

  // Filter queue
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vaccine.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const waitingCount = patients.filter((p) => p.status === 'waiting').length;
  const completedCount = patients.filter((p) => p.status === 'completed').length;
  const alertCount = patients.filter((p) => p.allergy && p.allergy !== 'None Reported').length;

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="doctor-toast">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Hero Banner with Welcome, Station Status, and Quick Actions */}
      <section className="doctor-hero-banner">
        <div className="doctor-hero-info">
          <h1 className="doctor-hero-title">Good morning, Dr. Samantha Perera</h1>
          <p className="doctor-hero-subtitle">
            Monday, 7 September 2026 • General Outpatient &amp; Adult Immunization Clinic
          </p>
          <div className="doctor-hero-session-pill">
            <span>🏥 Booth 01 Active Station</span>
            <span>•</span>
            <span>❄️ Cold-Chain: 3.8°C Verified</span>
            <span>•</span>
            <span>👩‍⚕️ Assisting Nurse: Anoma Silva</span>
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

      {/* 2. Key Metrics Ribbon (4 Cards) */}
      <section className="doctor-stats-grid">
        <div className="doctor-stat-card">
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Today's Appointments</span>
            <span className="doctor-stat-value">24</span>
            <span className="doctor-stat-meta">
              <span style={{ color: '#059669', fontWeight: 700 }}>{completedCount} Completed</span> • {waitingCount} Remaining
            </span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-blue">
            <span>📅</span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Waiting in Queue</span>
            <span className="doctor-stat-value" style={{ color: '#d97706' }}>{waitingCount}</span>
            <span className="doctor-stat-meta">Avg wait time: ~11 mins</span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-amber">
            <span>⏳</span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Administered Today</span>
            <span className="doctor-stat-value" style={{ color: '#059669' }}>18</span>
            <span className="doctor-stat-meta">Doses certified &amp; uploaded</span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-green">
            <span>💉</span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Allergy / High-Risk Flags</span>
            <span className="doctor-stat-value" style={{ color: '#dc2626' }}>{alertCount}</span>
            <span className="doctor-stat-meta">Pre-screening flags active</span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-purple">
            <span>⚠️</span>
          </div>
        </div>
      </section>

      {/* 3. Active Consultation Spotlight Workspace */}
      {activePatient && (
        <section className="doctor-spotlight-card">
          <div className="doctor-spotlight-header">
            <div>
              <div className="doctor-spotlight-badge">
                <span className="doctor-spotlight-pulse"></span>
                Active Clinical Consultation
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
                {activePatient.time} (On Time)
              </div>
            </div>
          </div>

          <div className="doctor-spotlight-details-grid">
            {/* Bio & Details */}
            <div className="doctor-patient-bio">
              <div className="doctor-patient-avatar">
                {activePatient.gender === 'Female' ? '👩' : '👨'}
              </div>
              <div>
                <div className="doctor-patient-name">{activePatient.name}</div>
                <div className="doctor-patient-meta-text">
                  NIC: <strong>{activePatient.nic}</strong>
                </div>
                <div className="doctor-patient-meta-text">
                  Age: {activePatient.age} yrs • Gender: {activePatient.gender}
                </div>
                <div style={{ marginTop: '6px' }}>
                  <span className={`doctor-allergy-flag ${activePatient.allergy !== 'None Reported' ? 'doctor-allergy-warning' : 'doctor-allergy-none'}`}>
                    {activePatient.allergy !== 'None Reported' ? '⚠️ ' : '✅ '}
                    {activePatient.allergy}
                  </span>
                </div>
              </div>
            </div>

            {/* Pre-Screen Vitals */}
            <div className="doctor-vitals-box">
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Blood Pressure</span>
                <span className="doctor-vital-value">{activePatient.vitals?.bp || '120/80'}</span>
              </div>
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Pulse</span>
                <span className="doctor-vital-value">{activePatient.vitals?.pulse || '72 bpm'}</span>
              </div>
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Temperature</span>
                <span className="doctor-vital-value">{activePatient.vitals?.temp || '36.6 °C'}</span>
              </div>
              <div className="doctor-vital-item">
                <span className="doctor-vital-label">Oxygen (SpO2)</span>
                <span className="doctor-vital-value">{activePatient.vitals?.spo2 || '99%'}</span>
              </div>
            </div>

            {/* Vaccine to Administer */}
            <div className="doctor-vaccine-assign-box">
              <span className="doctor-vaccine-assign-title">Vaccine Prescription</span>
              <span className="doctor-vaccine-name">{activePatient.vaccine}</span>
              <span className="doctor-vaccine-lot">
                {activePatient.dose} • Cold Box Lot: <strong>HB-8821</strong>
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
            <div className="doctor-card-title">
              <span>📋</span>
              Today's Consultation Queue
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
                Observation
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
                      No patients matching your search criteria.
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
                              NIC: {p.nic} • {p.age}y/{p.gender[0]}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="doctor-vaccine-badge">{p.vaccine}</span>
                          <span className="doctor-dose-sub">{p.dose}</span>
                        </td>
                        <td>
                          <span className={`doctor-allergy-flag ${p.allergy !== 'None Reported' ? 'doctor-allergy-warning' : 'doctor-allergy-none'}`}>
                            {p.allergy !== 'None Reported' ? '⚠️ ' : '✅ '}
                            {p.allergy}
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
              <div className="doctor-obs-title">
                <span>⏱️</span>
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
                      <span className="doctor-obs-timer-pill">
                        ⏳ {obs.minsLeft} mins left
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
              <div className="doctor-coldbox-title">
                <span>❄️</span>
                Booth 01 Cold-Box Stock
              </div>
              <span className="doctor-coldbox-temp">3.8°C (Normal)</span>
            </div>

            <div className="doctor-coldbox-list">
              {coldBoxStock.map((item, idx) => (
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
              ))}
            </div>
          </div>

          {/* Today's Clinic Session Schedule */}
          <div className="doctor-coldbox-card">
            <div className="doctor-coldbox-header">
              <div className="doctor-coldbox-title">
                <span>🕒</span>
                Today's Clinic Blocks
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>08:30 - 10:30</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>Adult Boosters (Completed)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontWeight: 700, color: '#1d4ed8' }}>10:30 - 12:30</span>
                <span style={{ color: '#1d4ed8', fontWeight: 700 }}>Pediatric &amp; Routine (Active)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 600, color: '#64748b' }}>13:30 - 16:00</span>
                <span style={{ color: '#64748b' }}>Travel Clinic (Upcoming)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Administration & Certification Modal */}
      <ClinicalAdministerModal
        isOpen={isAdministerModalOpen}
        onClose={() => setIsAdministerModalOpen(false)}
        patient={activePatient}
        onCertify={handleCertifyAdministration}
      />

      {/* AEFI Report Modal */}
      <AefiReportModal
        isOpen={isAefiModalOpen}
        onClose={() => setIsAefiModalOpen(false)}
        onSubmitReport={handleAefiSubmit}
      />
    </div>
  );
}
