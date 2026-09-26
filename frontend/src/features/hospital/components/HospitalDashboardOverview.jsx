import React, { useCallback, useEffect, useMemo, useState } from 'react';
import WalkInRegistrationModal from './WalkInRegistrationModal';
import RestockVaccineModal from './RestockVaccineModal';
import staffService from '../services/staffService';
import { inventoryService } from '../services/inventoryService';
import { appointmentService } from '../../patient/services/appointmentService';
import { authService } from '../../auth';
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

function mapDbStatusToQueueStatus(dbStatus) {
  const s = String(dbStatus || '').trim().toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'observation') return 'observation';
  if (s === 'administering' || s === 'insession' || s === 'in session') return 'administering';
  if (s === 'cancelled' || s === 'rejected') return 'cancelled';
  return 'waiting';
}

function mapQueueStatusToDbStatus(queueStatus) {
  if (queueStatus === 'completed') return 'Completed';
  if (queueStatus === 'observation') return 'Observation';
  if (queueStatus === 'administering') return 'Administering';
  if (queueStatus === 'cancelled') return 'Cancelled';
  return 'Confirmed';
}

function formatVaultTemp(temp) {
  const raw = String(temp || '').trim();
  if (!raw) return null;
  return /°\s*c/i.test(raw) ? raw.replace(/\s+/g, '') : `${raw}°C`;
}

function normalizePersonName(value) {
  return String(value || '')
    .replace(/^(dr\.|doctor|nurse)\s+/i, '')
    .trim()
    .toLowerCase();
}

function resolveQueueBooth(appointment, boothCards) {
  if (appointment.boothLabel) return appointment.boothLabel;

  const practitioner = normalizePersonName(appointment.doctorName || appointment.nurseName);
  if (practitioner && boothCards.length > 0) {
    const match = boothCards.find((booth) => {
      const staff = normalizePersonName(booth.staffName);
      return staff && (practitioner.includes(staff) || staff.includes(practitioner));
    });
    if (match?.boothName) return match.boothName;
  }

  return 'Unassigned';
}

export default function HospitalDashboardOverview() {
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewScope, setViewScope] = useState('today'); // 'today' | 'all'
  const [toastMessage, setToastMessage] = useState('');

  // 1. Logged in Hospital Profile Context
  const [hospitalUser, setHospitalUser] = useState(() => authService.getUser());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fresh = await authService.getMe();
        if (!cancelled && fresh) setHospitalUser(fresh);
      } catch (_) {
        /* keep cached user */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hospitalDetails = hospitalUser?.profileDetails || {};
  const hospitalCenterName =
    hospitalDetails.hospitalName || hospitalUser?.name || 'Immunization Center Operations';
  const hospitalCenterCode = hospitalUser?.registrationNumber
    ? `Center ID: ${hospitalUser.registrationNumber}`
    : null;
  const hospitalSessionHours = hospitalDetails.operatingHours || null;
  const hospitalType = hospitalDetails.hospitalType || null;

  // 2. Booths & On-Duty Staff State
  const [boothCards, setBoothCards] = useState([]);
  const [boothsLoading, setBoothsLoading] = useState(true);
  const [boothsError, setBoothsError] = useState('');
  const [onDutyCount, setOnDutyCount] = useState(0);

  // 3. Database Inventory State
  const [inventory, setInventory] = useState([]);
  const [formularyVaccines, setFormularyVaccines] = useState([]);
  const [coldVaults, setColdVaults] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');

  // 4. Live Queue Appointments State (from Database)
  const [queuePatients, setQueuePatients] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // ==================== FETCH INVENTORY (BATCHES & FORMULARY) ====================
  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    setInventoryError('');
    try {
      const [batchesRes, formularyRes, vaultsRes] = await Promise.allSettled([
        inventoryService.getInventory(),
        inventoryService.getFormulary(),
        inventoryService.getColdVaults(),
      ]);

      const batches = batchesRes.status === 'fulfilled' && Array.isArray(batchesRes.value) ? batchesRes.value : [];
      const formulary = formularyRes.status === 'fulfilled' && Array.isArray(formularyRes.value) ? formularyRes.value : [];
      const vaults = vaultsRes.status === 'fulfilled' && Array.isArray(vaultsRes.value) ? vaultsRes.value : [];

      setFormularyVaccines(formulary);
      setColdVaults(vaults);

      // Map DB batches to inventory cards
      const mappedBatches = batches.map((b) => {
        const available = Number(b.available ?? b.quantity ?? 0);
        const capacity = Number(b.capacity ?? Math.max(available * 1.5, 400));
        const minThreshold = Number(b.minThreshold ?? 50);
        const isLow = available <= minThreshold;

        return {
          id: b.id,
          name: b.name || b.vaccineName || 'Vaccine Formulation',
          lotNumber: b.lotNumber || 'LT-' + (b.id ? b.id.substring(0, 6).toUpperCase() : '001'),
          available,
          capacity,
          expiry: b.expiry || b.expiryDate || 'N/A',
          temp: b.temp || (b.storageUnit ? b.storageUnit : '2°C to 8°C Chiller'),
          statusColor: isLow ? 'bar-amber' : 'bar-green',
          warning: isLow ? `Low Stock Alert (${available} vials remaining)` : undefined,
        };
      });

      // Also include any formulary vaccines that have 0 batches registered yet
      const existingNames = new Set(mappedBatches.map((m) => m.name.toLowerCase()));
      formulary.forEach((f) => {
        const fName = f.vaccineName || f.name;
        if (fName && !existingNames.has(fName.toLowerCase())) {
          mappedBatches.push({
            id: 'formulary-' + (f.id || fName),
            name: fName,
            lotNumber: 'Not Stocked',
            available: 0,
            capacity: 500,
            expiry: 'Restock Required',
            temp: 'Requires Storage Allocation',
            statusColor: 'bar-amber',
            warning: 'Out of Stock - Restock Recommended',
          });
        }
      });

      setInventory(mappedBatches);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setInventoryError(err.message || 'Failed to load vaccine inventory.');
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  // ==================== FETCH APPOINTMENTS QUEUE (FROM DATABASE) ====================
  const loadAppointmentsQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError('');
    try {
      const todayStr = hospitalToday();
      const data = await appointmentService.getHospitalAppointments();
      const rawList = Array.isArray(data) ? data : [];

      // Filter out rejected/cancelled if looking at active session
      const mapped = rawList
        .filter((a) => String(a.status || '').toLowerCase() !== 'rejected')
        .map((a, idx) => {
          const rawId = a.id || a.Id || String(idx);
          const shortRef = a.referenceNumber || (rawId.length > 6 ? `T-${rawId.substring(0, 4).toUpperCase()}` : `T-10${idx + 1}`);
          const rawStatus = a.status || 'Pending';
          const queueStatus = mapDbStatusToQueueStatus(rawStatus);

          return {
            id: rawId,
            token: shortRef,
            name: a.patientName || a.pName || 'Patient',
            phone: a.patientPhone || '',
            nic: a.patientNic || '',
            date: a.appointmentDate || todayStr,
            vaccine: a.vaccineName || 'Vaccine',
            dose: a.prescribedDosage || 'Primary / Booster Dose',
            booth: resolveQueueBooth(a, boothCards),
            practitioner: a.doctorName ? `Dr. ${a.doctorName.replace(/^Dr\.\s*/i, '')}` : (a.nurseName ? `Nurse ${a.nurseName}` : 'Staff Duty Officer'),
            time: a.timeSlot || '09:00 AM - 09:20 AM',
            status: queueStatus,
            dbStatus: rawStatus,
          };
        });

      setQueuePatients(mapped);
    } catch (err) {
      console.error('Failed to load appointments queue:', err);
      setQueueError(err.message || 'Failed to load live appointments queue.');
    } finally {
      setQueueLoading(false);
    }
  }, [boothCards]);

  // ==================== FETCH BOOTH STAFFING ====================
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
    loadInventory();
  }, [loadBoothStaffing, loadInventory]);

  useEffect(() => {
    loadAppointmentsQueue();
  }, [loadAppointmentsQueue]);

  // ==================== ACTIONS ====================

  // 1. Walk-in Registration (persisted appointment for registered patient NIC)
  const handleAddWalkIn = async (payload) => {
    await appointmentService.createWalkIn({
      patientNic: payload.patientNic,
      patientName: payload.patientName,
      vaccineName: payload.vaccineName,
      dose: payload.dose,
      boothLabel: payload.boothLabel,
      age: payload.age,
      gender: payload.gender,
    });
    await loadAppointmentsQueue();
    showToast(`Walk-in patient ${payload.patientName} added to the active queue.`);
  };

  // 2. Real Database Restock Batch
  const handleAddStock = async ({ vaccineName, lotNumber, quantity, storageUnit, expiryDate, supplier }) => {
    try {
      await inventoryService.restockBatch({
        vaccineName,
        lotNumber,
        quantity: Number(quantity),
        storageUnit,
        expiryDate,
        supplier,
      });
      await loadInventory();
      showToast(`Logged restock shipment for ${vaccineName} (${quantity} vials).`);
    } catch (err) {
      console.error('Failed to restock batch:', err);
      alert('Failed to log restock shipment: ' + err.message);
    }
  };

  // 3. Status Transition with Database Sync
  const updatePatientStatus = async (id, newStatus) => {
    const previousPatients = [...queuePatients];

    // Optimistically update UI
    setQueuePatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );

    try {
      const dbStatus = mapQueueStatusToDbStatus(newStatus);
      await appointmentService.updateAppointmentStatus(id, { status: dbStatus });
      showToast(`Updated patient status to "${newStatus.toUpperCase()}".`);
    } catch (err) {
      console.error('Failed to persist appointment status update:', err);
      // Revert on failure
      setQueuePatients(previousPatients);
      alert('Failed to update status in database: ' + err.message);
    }
  };

  // ==================== FILTERING & COMPUTED STATS ====================
  const todayStr = hospitalToday();

  const filteredQueue = useMemo(() => {
    return queuePatients.filter((p) => {
      // Scope filter (Today vs All)
      if (viewScope === 'today' && p.date && p.date !== todayStr) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        p.token.toLowerCase().includes(q) ||
        p.vaccine.toLowerCase().includes(q)
      );
    });
  }, [queuePatients, viewScope, statusFilter, searchQuery, todayStr]);

  const totalStock = useMemo(() => {
    return inventory.reduce((acc, curr) => acc + (curr.available || 0), 0);
  }, [inventory]);

  const completedTodayCount = useMemo(() => {
    return queuePatients.filter((p) => p.status === 'completed').length;
  }, [queuePatients]);

  const activeQueueCount = useMemo(() => {
    return queuePatients.filter((p) => p.status !== 'completed' && p.status !== 'cancelled').length;
  }, [queuePatients]);

  const staffedBoothCount = useMemo(
    () => boothCards.filter((b) => b.shiftCount > 0).length,
    [boothCards]
  );

  const primaryColdVault = useMemo(() => {
    if (!coldVaults.length) return null;
    return coldVaults.find((v) => formatVaultTemp(v.temp)) || coldVaults[0];
  }, [coldVaults]);

  const coldChainTemp = primaryColdVault ? formatVaultTemp(primaryColdVault.temp) : null;
  const coldChainLabel = primaryColdVault
    ? [primaryColdVault.name, primaryColdVault.type].filter(Boolean).join(' · ')
    : null;
  const coldChainOk = !primaryColdVault?.status
    || /optimal|ok|normal|safe/i.test(String(primaryColdVault.status));

  return (
    <div className="hospital-dashboard-tab">
      {/* 1. Hospital Facility Hero Banner */}
      <div className="hospital-hero-banner">
        <div className="hospital-hero-content">
          <h1 style={{ color: '#ffffff' }}>{hospitalCenterName}</h1>
          <p className="hospital-hero-sub">
            Real-time management for daily vaccinations, cold-chain monitoring,
            and live patient queueing.
          </p>
          <div className="hospital-hero-tags">
            {hospitalCenterCode && (
              <span className="hospital-tag-item">
                <span>🏛️</span> {hospitalCenterCode}
              </span>
            )}
            {hospitalSessionHours && (
              <span className="hospital-tag-item">
                <span>⏰</span> Hours: {hospitalSessionHours}
              </span>
            )}
            {hospitalType && (
              <span className="hospital-tag-item">
                <span>🏥</span> {hospitalType}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notice */}
      {toastMessage && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #6ee7b7',
            color: '#065f46',
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(6, 95, 70, 0.1)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span>✓ {toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Operations Metrics Cards Grid */}
      <div className="hospital-metrics-grid">
        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-blue">💉</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Administered Vaccinations</span>
            <span className="hospital-stat-value">{completedTodayCount}</span>
            <span className="hospital-stat-meta">
              <span className="meta-positive">● Live Record</span> across registered patients
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-amber">⏳</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Active Patient Queue</span>
            <span className="hospital-stat-value">{activeQueueCount}</span>
            <span className="hospital-stat-meta">
              <span>{queuePatients.filter((p) => p.status === 'observation').length} in observation</span>
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-teal">❄️</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Cold-Chain Storage</span>
            <span className="hospital-stat-value">
              {inventoryLoading ? '...' : (coldChainTemp || '—')}
            </span>
            <span className="hospital-stat-meta">
              {primaryColdVault ? (
                <span className={coldChainOk ? 'meta-positive' : 'meta-warning'}>
                  ● {primaryColdVault.status || 'Monitored'}
                </span>
              ) : (
                <span>No vault telemetry</span>
              )}
              {primaryColdVault?.target ? ` (Target ${primaryColdVault.target})` : ''}
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-purple">📦</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Total Vaccine Stock</span>
            <span className="hospital-stat-value">
              {inventoryLoading ? '...' : totalStock.toLocaleString()}
            </span>
            <span className="hospital-stat-meta">
              Vials in {inventory.length} formulations
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-green">🛡️</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">On-Duty Medical Staff</span>
            <span className="hospital-stat-value">{onDutyCount}</span>
            <span className="hospital-stat-meta">
              Across {staffedBoothCount} active booths
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
                <span>📋</span> Live Vaccination Queue
              </h2>
              <p className="section-title-desc">
                Real-time patient flow, booth assignments, and dose verification from database
              </p>
            </div>

            <div className="section-controls-group">
              {/* Scope Switch: Today vs All */}
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewScope('today')}
                  style={{
                    border: 'none',
                    background: viewScope === 'today' ? '#ffffff' : 'transparent',
                    color: viewScope === 'today' ? '#1d1854' : '#64748b',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: viewScope === 'today' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Today ({queuePatients.filter((p) => p.date === todayStr).length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope('all')}
                  style={{
                    border: 'none',
                    background: viewScope === 'all' ? '#ffffff' : 'transparent',
                    color: viewScope === 'all' ? '#1d1854' : '#64748b',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: viewScope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  All ({queuePatients.length})
                </button>
              </div>

              <input
                type="text"
                placeholder="Search patient, phone, token..."
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

              <button
                type="button"
                className="btn-hospital-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={loadAppointmentsQueue}
                disabled={queueLoading}
                title="Refresh live queue from database"
              >
                {queueLoading ? '...' : '🔄'}
              </button>

              <button
                type="button"
                className="btn-hospital-primary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => setIsWalkInOpen(true)}
              >
                + Walk-In
              </button>
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
                {queueLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      Loading live queue from database...
                    </td>
                  </tr>
                ) : queueError ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#dc2626' }}>
                      {queueError}
                    </td>
                  </tr>
                ) : filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No patients in queue for {viewScope === 'today' ? "today's session" : 'selected filters'}.
                      {viewScope === 'today' && (
                        <button
                          type="button"
                          onClick={() => setViewScope('all')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#1e40af',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            marginLeft: '8px',
                          }}
                        >
                          View All ({queuePatients.length})
                        </button>
                      )}
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
                          {patient.phone ? `Tel: ${patient.phone}` : patient.date} • {patient.time}
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
                          {patient.status === 'cancelled' && '✕ Cancelled'}
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
                Live batch numbers, expiration tracking, and cold-chain storage from database
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-hospital-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={loadInventory}
                disabled={inventoryLoading}
                title="Refresh inventory from database"
              >
                {inventoryLoading ? '...' : '🔄'}
              </button>
              <button
                type="button"
                className="btn-hospital-primary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => setIsRestockOpen(true)}
              >
                + Restock
              </button>
            </div>
          </div>

          {/* Cold Chain IoT Health Banner */}
          <div className="cold-chain-monitor-bar">
            <div className="cold-chain-info">
              <span className="cold-chain-icon">🌡️</span>
              <div>
                <div className="cold-chain-temp">{coldChainTemp || '—'}</div>
                <div className="cold-chain-label">
                  {coldChainLabel || 'No cold vault registered'}
                </div>
              </div>
            </div>
            <div className="cold-chain-status-ok" style={!coldChainOk ? { color: '#b45309' } : undefined}>
              <span>●</span>{' '}
              {primaryColdVault
                ? `${primaryColdVault.status || 'Monitored'}${primaryColdVault.sensorStatus ? ` · ${primaryColdVault.sensorStatus}` : ''}`
                : 'Vault offline'}
            </div>
          </div>

          <div className="inventory-items-list">
            {inventoryLoading ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>
                Loading live inventory batches...
              </p>
            ) : inventoryError ? (
              <p style={{ color: '#dc2626', textAlign: 'center', padding: '24px' }}>
                {inventoryError}
              </p>
            ) : inventory.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>
                No vaccine batches logged in database. Click "+ Restock" to register a batch.
              </p>
            ) : (
              inventory.map((item) => {
                const percent = Math.round(((item.available || 0) / (item.capacity || 1)) * 100);
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
                        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
                      />
                    </div>

                    {item.warning && (
                      <div style={{ color: '#b45309', fontSize: '0.72rem', fontWeight: 700, marginTop: '6px' }}>
                        ⚠️ {item.warning}
                      </div>
                    )}
                  </div>
                );
              })
            )}
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
        vaccines={formularyVaccines.map((f) => f.vaccineName || f.name).filter(Boolean)}
        booths={boothCards.map((b) => ({ id: b.id, label: b.boothName }))}
      />

      <RestockVaccineModal
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        onAddStock={handleAddStock}
        registeredVaccines={formularyVaccines.map((f) => f.vaccineName || f.name)}
      />
    </div>
  );
}
