import React, { useCallback, useEffect, useMemo, useState } from 'react';
import WalkInRegistrationModal from './WalkInRegistrationModal';
import RestockVaccineModal from './RestockVaccineModal';
import staffService from '../services/staffService';
import { inventoryService } from '../services/inventoryService';
import { appointmentService } from '../../patient/services/appointmentService';
import { authService } from '../../auth';
import { hospitalMinutesNow, hospitalToday } from '../utils/hospitalDate';
import hospitalHeroImage from '../../../assets/images/hospital-hero-vaccine.webp';
import {
  IconClipboard,
  IconClock,
  IconClose,
  IconDoor,
  IconPackage,
  IconRefresh,
  IconShield,
  IconSnowflake,
  IconSyringe,
  IconThermometer,
  RoleAvatarIcon,
} from './HospitalIcons';

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

function boothStatusClass(status) {
  if (status === 'Unstaffed') return 'is-unstaffed';
  if (status === 'On duty') return 'is-on-duty';
  if (status === 'In session') return 'is-in-session';
  return 'is-scheduled';
}

function queueStatusLabel(status) {
  if (status === 'waiting') return 'Waiting';
  if (status === 'administering') return 'In Session';
  if (status === 'observation') return 'Observation';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return status || 'Unknown';
}

function queueTimeSortKey(time) {
  const match = String(time || '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function mapDbStatusToQueueStatus(dbStatus) {
  const s = String(dbStatus || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (s === 'completed') return 'completed';
  if (s === 'observation') return 'observation';
  if (s === 'administering' || s === 'insession') return 'administering';
  if (s === 'cancelled' || s === 'rejected') return 'cancelled';
  // Confirmed / Pending / PendingPayment / CheckedIn → still in queue
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
          const rawId = String(a.id || a.Id || idx);
          const shortRef = a.referenceNumber || (rawId.length > 6 ? `T-${rawId.substring(0, 4).toUpperCase()}` : `T-10${idx + 1}`);
          const rawStatus = a.status || a.Status || 'Pending';
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
      const photoByAffiliation = new Map(
        staff.map((s) => [s.affiliationId, s.staffProfilePhotoUrl || null])
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
          roleKey: primary?.staffRole === 'NURSE' ? 'Nurse' : 'Doctor',
          photoUrl: primary ? (photoByAffiliation.get(primary.affiliationId) || null) : null,
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
    const targetId = String(id);

    // Optimistically update UI
    setQueuePatients((prev) =>
      prev.map((p) => (String(p.id) === targetId ? { ...p, status: newStatus } : p))
    );

    try {
      const dbStatus = mapQueueStatusToDbStatus(newStatus);
      await appointmentService.updateAppointmentStatus(id, { status: dbStatus });
      showToast(`Updated patient status to "${newStatus.toUpperCase()}".`);
      // Re-fetch so refresh / other clients stay in sync with DB
      await loadAppointmentsQueue();
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
    const list = queuePatients.filter((p) => {
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

    return list.sort((a, b) => {
      const byTime = queueTimeSortKey(a.time) - queueTimeSortKey(b.time);
      if (byTime !== 0) return byTime;
      return String(a.token || '').localeCompare(String(b.token || ''));
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
          <p className="hospital-hero-eyebrow">Hospital operations</p>
          <h1>{hospitalCenterName}</h1>
          <p className="hospital-hero-sub">
            Real-time management for daily vaccinations, cold-chain monitoring,
            and live patient queueing.
          </p>
          <div className="hospital-hero-tags">
            {hospitalCenterCode && (
              <span className="hospital-tag-item">{hospitalCenterCode}</span>
            )}
            {hospitalSessionHours && (
              <span className="hospital-tag-item">Hours: {hospitalSessionHours}</span>
            )}
            {hospitalType && (
              <span className="hospital-tag-item">{hospitalType}</span>
            )}
          </div>
        </div>
        <div className="hospital-hero-media" aria-hidden="true">
          <img src={hospitalHeroImage} alt="" className="hospital-hero-image" />
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
            <IconClose size={14} />
          </button>
        </div>
      )}

      {/* 2. Operations Metrics Cards Grid */}
      <div className="hospital-metrics-grid">
        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-blue">
            <IconSyringe size={22} />
          </div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Administered Vaccinations</span>
            <span className="hospital-stat-value">{completedTodayCount}</span>
            <span className="hospital-stat-meta">Completed today</span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-amber">
            <IconClock size={22} />
          </div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Active Patient Queue</span>
            <span className="hospital-stat-value">{activeQueueCount}</span>
            <span className="hospital-stat-meta">
              {queuePatients.filter((p) => p.status === 'observation').length} in observation
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-teal">
            <IconSnowflake size={22} />
          </div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Cold-Chain Storage</span>
            <span className="hospital-stat-value">
              {inventoryLoading ? '...' : (coldChainTemp || '—')}
            </span>
            <span className="hospital-stat-meta">
              {primaryColdVault ? (
                <>
                  <span className={coldChainOk ? 'meta-positive' : 'meta-warning'}>
                    {primaryColdVault.status || 'Monitored'}
                  </span>
                  {primaryColdVault.target ? ` · Target ${primaryColdVault.target}` : ''}
                </>
              ) : (
                'No vault telemetry'
              )}
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-purple">
            <IconPackage size={22} />
          </div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Total Vaccine Stock</span>
            <span className="hospital-stat-value">
              {inventoryLoading ? '...' : totalStock.toLocaleString()}
            </span>
            <span className="hospital-stat-meta">
              {inventory.length} formulation{inventory.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-green">
            <IconShield size={22} />
          </div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">On-Duty Medical Staff</span>
            <span className="hospital-stat-value">{onDutyCount}</span>
            <span className="hospital-stat-meta">
              {staffedBoothCount} active booth{staffedBoothCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Columns: Live Queue Table (Left) + Vaccine Inventory Tracker (Right) */}
      <div className="hospital-dashboard-columns">
        {/* Left Column: Live Queue */}
        <div className="hospital-section-card" id="queue">
          <div className="section-card-header queue-section-header">
            <div className="section-title-group">
              <h2>
                <span className="section-title-icon icon-shade-purple"><IconClipboard size={22} /></span> Live Vaccination Queue
              </h2>
              <p className="section-title-desc">
                Real-time patient flow, booth assignments, and dose verification from database
              </p>
            </div>
          </div>

          <div className="queue-controls-bar">
            <div className="queue-controls-left">
              <div className="queue-scope-switch">
                <button
                  type="button"
                  className={`queue-scope-btn${viewScope === 'today' ? ' active' : ''}`}
                  onClick={() => setViewScope('today')}
                >
                  Today ({queuePatients.filter((p) => p.date === todayStr).length})
                </button>
                <button
                  type="button"
                  className={`queue-scope-btn${viewScope === 'all' ? ' active' : ''}`}
                  onClick={() => setViewScope('all')}
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
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                type="button"
                className="btn-inventory-refresh"
                onClick={() => {
                  setStatusFilter('all');
                  loadAppointmentsQueue();
                }}
                disabled={queueLoading}
                title="Refresh live queue from database"
              >
                {queueLoading ? '...' : <IconRefresh size={16} />}
              </button>
            </div>

            <button
              type="button"
              className="btn-queue-walkin"
              onClick={() => setIsWalkInOpen(true)}
            >
              + Walk-In
            </button>
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
                        <span className="queue-token-pill">{String(patient.token || '').replace(/-/g, '\u2011')}</span>
                      </td>
                      <td>
                        <div className="queue-patient-name">{patient.name}</div>
                        <div className="queue-patient-meta">
                          {patient.phone ? patient.phone : patient.date}
                        </div>
                        {patient.time ? (
                          <div className="queue-patient-meta queue-patient-time">{patient.time}</div>
                        ) : null}
                      </td>
                      <td>
                        <div className="queue-vaccine-badge">{patient.vaccine}</div>
                        <div className="queue-dose-meta" title={patient.dose}>{patient.dose}</div>
                      </td>
                      <td>
                        <span className={`queue-booth-tag${patient.booth === 'Unassigned' ? ' is-unassigned' : ''}`}>
                          {patient.booth}
                        </span>
                      </td>
                      <td>
                        <span className={`queue-status-badge status-${patient.status}`}>
                          {queueStatusLabel(patient.status)}
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
                              className="btn-queue-action btn-queue-action--session"
                              onClick={() => updatePatientStatus(patient.id, 'observation')}
                              title="Move to 15-min post vaccination observation"
                            >
                              To Observation
                            </button>
                          )}
                          {patient.status === 'observation' && (
                            <button
                              type="button"
                              className="btn-queue-action btn-queue-action--release"
                              onClick={() => updatePatientStatus(patient.id, 'completed')}
                              title="Complete and issue digital pass"
                            >
                              Release &amp; Pass
                            </button>
                          )}
                          {patient.status === 'completed' && (
                            <span className="queue-pass-note">Pass generated</span>
                          )}
                          {patient.status === 'cancelled' && (
                            <span className="queue-action-empty">—</span>
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
          <div className="section-card-header inventory-section-header">
            <div className="inventory-section-title-row">
              <h2>
                <span className="section-title-icon section-title-icon--teal"><IconSnowflake size={22} /></span> Vaccine Stock &amp; Cold Vaults
              </h2>
              <div className="inventory-section-actions">
                <button
                  type="button"
                  className="btn-inventory-refresh"
                  onClick={loadInventory}
                  disabled={inventoryLoading}
                  title="Refresh inventory from database"
                >
                  {inventoryLoading ? '...' : <IconRefresh size={16} />}
                </button>
                <button
                  type="button"
                  className="btn-inventory-restock"
                  onClick={() => setIsRestockOpen(true)}
                >
                  + Restock
                </button>
              </div>
            </div>
            <p className="section-title-desc inventory-section-desc">
              Live batch numbers, expiration tracking, and cold-chain storage from database
            </p>
          </div>

          {/* Cold Chain IoT Health Banner */}
          <div className="cold-chain-monitor-bar">
            <div className="cold-chain-info">
              <span className="cold-chain-icon"><IconThermometer size={22} /></span>
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
        <div className="section-card-header booths-section-header">
          <div className="section-title-group">
            <h2>
              <span className="section-title-icon section-title-icon--teal"><IconDoor size={22} /></span> Vaccination Booths &amp; On-Duty Medical Staff
            </h2>
            <p className="section-title-desc">
              Live from Booths and today’s shift roster
            </p>
          </div>
          <div className="booths-header-actions">
            <span
              className={`booth-stat-pill ${staffedBoothCount > 0 ? 'is-ok' : 'is-warn'}`}
              title={staffedBoothCount > 0 ? 'Booths with shifts today' : 'No booths have shifts today'}
            >
              {boothCards.length} booth{boothCards.length === 1 ? '' : 's'} · {staffedBoothCount} staffed
            </span>
            <span
              className={`booth-stat-pill ${onDutyCount > 0 ? 'is-live' : 'is-idle'}`}
              title={onDutyCount > 0 ? 'Staff marked on duty now' : 'No staff currently on duty'}
            >
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
                <div className={`booth-status-indicator ${boothStatusClass(booth.status)}`}>
                  <span className="booth-status-dot" aria-hidden="true" />
                  <span>{booth.status}</span>
                </div>
              </div>

              <div className="booth-staff-info">
                <div className="staff-avatar-mini">
                  {booth.photoUrl ? (
                    <img src={booth.photoUrl} alt="" />
                  ) : (
                    <RoleAvatarIcon role={booth.roleKey} size={18} />
                  )}
                </div>
                <div className="staff-text-group">
                  <span className="staff-name">{booth.staffName}</span>
                  <span className="staff-role-desc">{booth.role}</span>
                </div>
              </div>

              <div className="booth-stats-row">
                <span>
                    Today:{' '}
                    <strong className="booth-stat-bold">
                      {booth.shiftCount} shift{booth.shiftCount === 1 ? '' : 's'}
                    </strong>
                </span>
                </div>
                {booth.rosterLine ? (
                  <p className="booth-roster-line">
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
