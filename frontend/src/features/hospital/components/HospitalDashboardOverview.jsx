import React, { useCallback, useEffect, useMemo, useState } from 'react';
import WalkInRegistrationModal from './WalkInRegistrationModal';
import RestockVaccineModal from './RestockVaccineModal';
import staffService from '../services/staffService';
import { hospitalMinutesNow, hospitalToday } from '../utils/hospitalDate';

function timeToMinutes(value) {
  const raw = String(value || '').slice(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatShiftWindow(shift) {
  const start = String(shift.startTime || '').slice(0, 5);
  const end = String(shift.endTime || '').slice(0, 5);
  return `${start}–${end}`;
}

function roleLabel(role) {
  if (role === 'DOCTOR') return 'Doctor';
  if (role === 'NURSE') return 'Nurse';
  return role || 'Staff';
}

export default function HospitalDashboardOverview() {
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mohReportNotice, setMohReportNotice] = useState(false);
  const [boothCards, setBoothCards] = useState([]);
  const [boothsLoading, setBoothsLoading] = useState(true);
  const [boothsError, setBoothsError] = useState('');
  const [onDutyCount, setOnDutyCount] = useState(0);

  // Live Queue Patients State
  const [queuePatients, setQueuePatients] = useState([
    {
      id: 1,
      token: 'T-101',
      name: 'Chaminda Wickramasinghe',
      nic: '198845210982',
      age: 38,
      gender: 'Male',
      vaccine: 'Pfizer-BioNTech Bivalent',
      dose: 'Booster Dose (3)',
      booth: 'Booth 01',
      practitioner: 'Dr. Samantha Perera',
      time: '09:15 AM',
      status: 'administering',
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
      booth: 'Booth 03',
      practitioner: 'Nurse Anoma Silva',
      time: '09:18 AM',
      status: 'observation',
    },
    {
      id: 3,
      token: 'T-103',
      name: 'Rohan Jayatillake',
      nic: '197612349876',
      age: 50,
      gender: 'Male',
      vaccine: 'Hepatitis B Recombinant',
      dose: 'Dose 2 (Primary)',
      booth: 'Booth 01',
      practitioner: 'Dr. Samantha Perera',
      time: '09:22 AM',
      status: 'waiting',
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
      booth: 'Booth 04',
      practitioner: 'Nurse Dilani Fernando',
      time: '09:25 AM',
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
      booth: 'Booth 02',
      practitioner: 'Dr. Nimal Jayawardena',
      time: '09:28 AM',
      status: 'waiting',
    },
    {
      id: 6,
      token: 'T-100',
      name: 'Malini Senanayake',
      nic: '196234567890',
      age: 64,
      gender: 'Female',
      vaccine: 'Influenza (Quadrivalent)',
      dose: 'Annual Senior Dose',
      booth: 'Booth 02',
      practitioner: 'Dr. Nimal Jayawardena',
      time: '09:00 AM',
      status: 'completed',
    },
  ]);

  // Vaccine Inventory State
  const [inventory, setInventory] = useState([
    {
      id: 1,
      name: 'Pfizer-BioNTech Bivalent (mRNA)',
      lotNumber: 'PF-9082',
      available: 1420,
      capacity: 1800,
      expiry: 'Oct 2027',
      temp: '-75°C Ultra Cold',
      statusColor: 'bar-green',
    },
    {
      id: 2,
      name: 'Moderna Spikevax',
      lotNumber: 'MD-4419',
      available: 850,
      capacity: 1200,
      expiry: 'Aug 2027',
      temp: '-20°C Freezer',
      statusColor: 'bar-blue',
    },
    {
      id: 3,
      name: 'Influenza (Fluarix Quadrivalent)',
      lotNumber: 'FL-6102',
      available: 920,
      capacity: 1000,
      expiry: 'May 2027',
      temp: '3.4°C Chiller',
      statusColor: 'bar-green',
    },
    {
      id: 4,
      name: 'Hepatitis B Recombinant',
      lotNumber: 'HB-3301',
      available: 480,
      capacity: 600,
      expiry: 'Dec 2027',
      temp: '4.1°C Chiller',
      statusColor: 'bar-blue',
    },
    {
      id: 5,
      name: 'MMR (Measles, Mumps, Rubella)',
      lotNumber: 'MM-8120',
      available: 640,
      capacity: 800,
      expiry: 'Jan 2028',
      temp: '3.8°C Chiller',
      statusColor: 'bar-green',
    },
    {
      id: 6,
      name: 'Tdap (Tetanus, Diphtheria, Pertussis)',
      lotNumber: 'TD-1904',
      available: 160,
      capacity: 800,
      expiry: 'Nov 2026',
      temp: '3.9°C Chiller',
      statusColor: 'bar-amber',
      warning: 'Low Stock Alert - Reorder Recommended',
    },
  ]);

  const loadBoothStaffing = useCallback(async () => {
    setBoothsLoading(true);
    setBoothsError('');
    const today = hospitalToday();
    const nowMinutes = hospitalMinutesNow();

    try {
      const [boothList, shiftList, staffList] = await Promise.all([
        staffService.getHospitalBooths({ activeOnly: true }),
        staffService.getHospitalShifts({ from: today, to: today }),
        staffService.getHospitalStaff({ status: 'Active' }),
      ]);

      const booths = Array.isArray(boothList) ? boothList : [];
      const shifts = Array.isArray(shiftList) ? shiftList : [];
      const staff = Array.isArray(staffList) ? staffList : [];

      setOnDutyCount(staff.filter((s) => s.dutyStatus === 'OnDuty').length);

      const dutyByAffiliation = new Map(
        staff.map((s) => [s.affiliationId, s.dutyStatus || 'Off'])
      );

      const cards = booths.map((booth, index) => {
        const boothShifts = shifts
          .filter((s) => s.boothId && s.boothId === booth.boothId)
          .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

        const liveShift = boothShifts.find((s) => {
          const start = timeToMinutes(s.startTime);
          const end = timeToMinutes(s.endTime);
          return start != null && end != null && start <= nowMinutes && nowMinutes < end;
        });

        const primary = liveShift || boothShifts[0] || null;
        const duty = primary ? dutyByAffiliation.get(primary.affiliationId) : null;
        const isLive = Boolean(liveShift);

        return {
          id: booth.boothId,
          code: booth.code || String(index + 1).padStart(2, '0'),
          boothName: booth.displayLabel || `${booth.code} · ${booth.name}`,
          staffName: primary?.staffName || 'Unassigned',
          role: primary
            ? `${roleLabel(primary.staffRole)} · ${formatShiftWindow(primary)}`
            : 'No shift scheduled today',
          avatar: primary?.staffRole === 'NURSE' ? '👩‍⚕️' : '👨‍⚕️',
          rosterLine: boothShifts.length
            ? boothShifts
                .map((s) => `${s.staffName} (${formatShiftWindow(s)})`)
                .join(' · ')
            : '',
          status: !primary ? 'Unstaffed' : isLive ? (duty === 'OnDuty' ? 'On duty' : 'In session') : 'Scheduled',
          shiftCount: boothShifts.length,
        };
      });

      setBoothCards(cards);
    } catch (err) {
      setBoothCards([]);
      setOnDutyCount(0);
      setBoothsError(err.message || 'Failed to load booth staffing.');
    } finally {
      setBoothsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoothStaffing();
  }, [loadBoothStaffing]);

  // Actions
  const handleAddWalkIn = (newPatient) => {
    setQueuePatients((prev) => [newPatient, ...prev]);
  };

  const handleAddStock = ({ vaccineName, lotNumber, quantity }) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.name.toLowerCase().includes(vaccineName.toLowerCase().slice(0, 8))) {
          const newAvail = item.available + quantity;
          return {
            ...item,
            lotNumber,
            available: newAvail,
            statusColor: newAvail / item.capacity > 0.3 ? 'bar-green' : 'bar-amber',
            warning: undefined,
          };
        }
        return item;
      })
    );
  };

  const updatePatientStatus = (id, newStatus) => {
    setQueuePatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
  };

  const handleExportMOH = () => {
    setMohReportNotice(true);
    setTimeout(() => setMohReportNotice(false), 3500);
  };

  // Filtered Queue
  const filteredQueue = queuePatients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nic.includes(searchQuery) ||
      p.token.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  const totalStock = inventory.reduce((acc, curr) => acc + curr.available, 0);
  const staffedBoothCount = useMemo(
    () => boothCards.filter((b) => b.shiftCount > 0).length,
    [boothCards]
  );

  return (
    <div className="hospital-dashboard-tab">
      {/* 1. Hospital Facility Hero Banner */}
      <div className="hospital-hero-banner">
        <div className="hospital-hero-content">
          <h1 style={{ color: '#ffffff' }}>Immunization Center Operations</h1>
          <p className="hospital-hero-sub">
            Real-time management for daily vaccinations, cold-chain telemetry monitoring,
            live patient queueing, and national MOH compliance reporting.
          </p>
          <div className="hospital-hero-tags">
            <span className="hospital-tag-item">
              <span>🏛️</span> MOH Center ID: #COL-77042
            </span>
            <span className="hospital-tag-item">
              <span>⏰</span> Daily Session: 08:00 AM – 06:00 PM
            </span>
            <span className="hospital-tag-item">
              <span>🛡️</span> Cryptographic Audit: Active
            </span>
          </div>
        </div>
      </div>

      {/* MOH Export Toast */}
      {mohReportNotice && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#166534',
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(22, 101, 52, 0.1)',
          }}
        >
          <span>
            ✅ MOH Daily Immunization Summary (CSV/PDF) generated and synced to Ministry of Health Central Server!
          </span>
          <span style={{ fontSize: '0.8rem', color: '#15803d' }}>Verification: #MOH-SYNC-OK</span>
        </div>
      )}

      {/* 2. Operations Metrics Cards Grid */}
      <div className="hospital-metrics-grid">
        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-blue">💉</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Today's Vaccinations</span>
            <span className="hospital-stat-value">142</span>
            <span className="hospital-stat-meta">
              <span className="meta-positive">↑ 78.8%</span> of 180 booked target
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-amber">⏳</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Active Queue</span>
            <span className="hospital-stat-value">
              {queuePatients.filter((p) => p.status !== 'completed').length}
            </span>
            <span className="hospital-stat-meta">
              4 in 15-min post observation
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-teal">❄️</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Cold-Chain Storage</span>
            <span className="hospital-stat-value">3.6°C</span>
            <span className="hospital-stat-meta">
              <span className="meta-positive">● Normal</span> (Target: 2°C – 8°C)
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-purple">📦</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Total Vaccine Stock</span>
            <span className="hospital-stat-value">{totalStock.toLocaleString()}</span>
            <span className="hospital-stat-meta">Vials in 6 formulations</span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-green">🛡️</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Adverse Incidents (AEFI)</span>
            <span className="hospital-stat-value">0</span>
            <span className="hospital-stat-meta">
              <span className="meta-positive">99.98%</span> safe administration
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Columns: Live Queue Table (Left) + Vaccine Inventory Tracker (Right) */}
      <div className="hospital-dashboard-columns">
        {/* Left Column: Live Queue */}
        <div className="hospital-section-card" id="queue">
          <div className="section-card-header">
            <div className="section-title-group">
              <h2>
                <span>📋</span> Today's Live Vaccination Queue
              </h2>
              <p className="section-title-desc">
                Real-time patient flow, booth assignments, and dose verification
              </p>
            </div>

            <div className="section-controls-group">
              <input
                type="text"
                placeholder="Search token, name, NIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="queue-search-input"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="queue-filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="waiting">Waiting</option>
                <option value="administering">Administering</option>
                <option value="observation">In Observation</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="hospital-queue-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient Details</th>
                  <th>Vaccine &amp; Dose</th>
                  <th>Booth Station</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No patients matching current filter or search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <span className="queue-token-pill">{patient.token}</span>
                      </td>
                      <td>
                        <div className="queue-patient-name">{patient.name}</div>
                        <div className="queue-patient-meta">
                          NIC: {patient.nic} • {patient.age ? `${patient.age}y` : ''} {patient.gender}
                        </div>
                      </td>
                      <td>
                        <div className="queue-vaccine-badge">{patient.vaccine}</div>
                        <div className="queue-dose-meta">{patient.dose}</div>
                      </td>
                      <td>
                        <span className="queue-booth-tag">
                          <span>🚪</span> {patient.booth}
                        </span>
                      </td>
                      <td>
                        <span className={`queue-status-badge status-${patient.status}`}>
                          {patient.status === 'waiting' && '● Waiting'}
                          {patient.status === 'administering' && '● In Session'}
                          {patient.status === 'observation' && '● Observation 15m'}
                          {patient.status === 'completed' && '✓ Completed'}
                        </span>
                      </td>
                      <td>
                        <div className="queue-action-btns">
                          {patient.status === 'waiting' && (
                            <button
                              type="button"
                              className="btn-queue-action"
                              onClick={() => updatePatientStatus(patient.id, 'administering')}
                              title="Call patient into booth"
                            >
                              Call Now
                            </button>
                          )}
                          {patient.status === 'administering' && (
                            <button
                              type="button"
                              className="btn-queue-action"
                              style={{ background: '#7c3aed' }}
                              onClick={() => updatePatientStatus(patient.id, 'observation')}
                              title="Move to 15-min post vaccination observation"
                            >
                              To Observation
                            </button>
                          )}
                          {patient.status === 'observation' && (
                            <button
                              type="button"
                              className="btn-queue-action"
                              style={{ background: '#16a34a' }}
                              onClick={() => updatePatientStatus(patient.id, 'completed')}
                              title="Complete and issue digital pass"
                            >
                              Release &amp; Pass
                            </button>
                          )}
                          {patient.status === 'completed' && (
                            <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>
                              Pass Generated
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Vaccine Inventory Tracker */}
        <div className="hospital-section-card" id="inventory">
          <div className="section-card-header">
            <div className="section-title-group">
              <h2>
                <span>❄️</span> Vaccine Stock &amp; Cold Vaults
              </h2>
              <p className="section-title-desc">
                Batch numbers, expiration tracking, and storage temperature
              </p>
            </div>
            <button
              type="button"
              className="btn-hospital-primary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setIsRestockOpen(true)}
            >
              + Restock
            </button>
          </div>

          {/* Cold Chain IoT Health Banner */}
          <div className="cold-chain-monitor-bar">
            <div className="cold-chain-info">
              <span className="cold-chain-icon">🌡️</span>
              <div>
                <div className="cold-chain-temp">3.6°C</div>
                <div className="cold-chain-label">Main Vaccine Vault Sensor B-2</div>
              </div>
            </div>
            <div className="cold-chain-status-ok">
              <span>●</span> WHO / MOH SAIF Compliant
            </div>
          </div>

          <div className="inventory-items-list">
            {inventory.map((item) => {
              const percent = Math.round((item.available / item.capacity) * 100);
              return (
                <div key={item.id} className="inventory-item-card">
                  <div className="inventory-item-header">
                    <span className="inventory-name">{item.name}</span>
                    <span className="inventory-count">{item.available} vials</span>
                  </div>

                  <div className="inventory-meta">
                    <span>Lot: <strong>{item.lotNumber}</strong> • Exp: {item.expiry}</span>
                    <span>{item.temp}</span>
                  </div>

                  <div className="inventory-progress-track">
                    <div
                      className={`inventory-progress-bar ${item.statusColor}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>

                  {item.warning && (
                    <div style={{ color: '#b45309', fontSize: '0.72rem', fontWeight: 700, marginTop: '6px' }}>
                      ⚠️ {item.warning}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Booth Station & Medical Staff On-Duty Allocation */}
      <div className="hospital-section-card" id="booths">
        <div className="section-card-header">
          <div className="section-title-group">
            <h2>
              <span>🚪</span> Vaccination Booths &amp; On-Duty Medical Staff
            </h2>
            <p className="section-title-desc">
              Live from Booths and today’s shift roster
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="hospital-tag-item" style={{ background: '#f1f5f9', color: '#334155' }}>
              {boothCards.length} booth{boothCards.length === 1 ? '' : 's'} · {staffedBoothCount} staffed
            </span>
            <span className="hospital-tag-item" style={{ background: '#ecfdf5', color: '#047857' }}>
              {onDutyCount} on duty now
            </span>
            <button
              type="button"
              className="btn-hospital-secondary"
              onClick={loadBoothStaffing}
              disabled={boothsLoading}
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              {boothsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {boothsError && (
          <div
            className="appointment-alert-pill"
            role="alert"
            style={{ marginBottom: '12px', background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
          >
            {boothsError}
          </div>
        )}

        {boothsLoading ? (
          <p style={{ color: '#64748b', margin: 0 }}>Loading booth staffing...</p>
        ) : boothCards.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>
            No active booths yet. Add stations under Staff → Booths, then assign shifts to them.
          </p>
        ) : (
          <div className="booths-grid">
            {boothCards.map((booth) => (
              <div key={booth.id} className="booth-card">
                <div className="booth-card-header">
                  <div className="booth-title-box">
                    <span className="booth-number-tag">{booth.code}</span>
                    <span className="booth-title">{booth.boothName}</span>
                  </div>
                  <div className="booth-status-indicator">
                    <span className="telemetry-pulse" style={{ width: '6px', height: '6px' }} />
                    <span>{booth.status}</span>
                  </div>
                </div>

                <div className="booth-staff-info">
                  <div className="staff-avatar-mini">{booth.avatar}</div>
                  <div className="staff-text-group">
                    <span className="staff-name">{booth.staffName}</span>
                    <span className="staff-role-desc">{booth.role}</span>
                  </div>
                </div>

                <div className="booth-stats-row">
                  <span>
                    Today:{' '}
                    <strong style={{ color: '#19469d' }}>
                      {booth.shiftCount} shift{booth.shiftCount === 1 ? '' : 's'}
                    </strong>
                  </span>
                </div>
                {booth.rosterLine ? (
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: '0.78rem',
                      color: '#64748b',
                      lineHeight: 1.35,
                    }}
                  >
                    {booth.rosterLine}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <WalkInRegistrationModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onAddPatient={handleAddWalkIn}
      />

      <RestockVaccineModal
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        onAddStock={handleAddStock}
      />
    </div>
  );
}
