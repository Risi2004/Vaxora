import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import staffService from '../../hospital/services/staffService';
import { addHospitalDays, hospitalToday } from '../../hospital/utils/hospitalDate';
import { IconHospital } from '../../../shared/icons/AppIcons';
import affilHeroImage from '../../../assets/images/staff-affiliations-hero.png';

function toDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeek(dateInput) {
  const date = new Date(`${dateInput}T00:00:00`);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  return toDateInputValue(date);
}

function formatDayHeader(dateInput) {
  const date = new Date(`${dateInput}T00:00:00`);
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
    dateLabel: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  };
}

function formatShiftTime(shift) {
  return `${String(shift.startTime).slice(0, 5)} – ${String(shift.endTime).slice(0, 5)}`;
}

function formatWeekRangeLabel(weekStart, weekEnd) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${weekEnd}T00:00:00`);
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`;
}

function HospitalAvatar({ name, logoUrl }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="staff-affil-hospital-avatar"
      />
    );
  }
  return (
    <div className="staff-affil-hospital-avatar staff-affil-hospital-avatar--fallback" aria-hidden>
      <IconHospital size={18} />
    </div>
  );
}

/**
 * Shared doctor/nurse view for hospital invitations and active affiliations.
 */
export default function StaffHospitalAffiliationsTab({ roleLabel = 'Staff' }) {
  const today = useMemo(() => hospitalToday(), []);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(hospitalToday()));
  const [invitations, setInvitations] = useState([]);
  const [affiliations, setAffiliations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [actionId, setActionId] = useState(null);
  const toastTimerRef = useRef(null);

  const weekEnd = useMemo(() => addHospitalDays(weekStart, 6), [weekStart]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addHospitalDays(weekStart, i)),
    [weekStart]
  );

  const hospitalNameByAffiliation = useMemo(() => {
    const map = {};
    affiliations.forEach((a) => {
      map[a.affiliationId] = a.hospitalName || 'Hospital';
    });
    return map;
  }, [affiliations]);

  const shiftsByDay = useMemo(() => {
    const map = {};
    weekDays.forEach((day) => {
      map[day] = [];
    });
    shifts.forEach((shift) => {
      const day = String(shift.shiftDate || '').slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(shift);
    });
    Object.keys(map).forEach((day) => {
      map[day].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
    });
    return map;
  }, [shifts, weekDays]);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pending, active, myShifts] = await Promise.all([
        staffService.getMyInvitations(),
        staffService.getMyAffiliations(),
        staffService.getMyShifts({ from: weekStart, to: weekEnd }),
      ]);
      setInvitations(Array.isArray(pending) ? pending : []);
      setAffiliations(Array.isArray(active) ? active : []);
      setShifts(Array.isArray(myShifts) ? myShifts : []);
    } catch (err) {
      setError(err.message || 'Failed to load hospital affiliations.');
      setInvitations([]);
      setAffiliations([]);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRespond = async (affiliationId, decision) => {
    setActionId(`${affiliationId}-${decision}`);
    try {
      await staffService.respondToInvitation(affiliationId, decision);
      showToast(decision === 'Accept' ? 'Invitation accepted.' : 'Invitation rejected.');
      await loadData();
    } catch (err) {
      setError(err.message || `Failed to ${decision.toLowerCase()} invitation.`);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="doctor-dashboard-tab">
      {toast && (
        <div className="doctor-toast" role="status">
          {toast}
        </div>
      )}

      {error && (
        <div className="doctor-toast" role="alert" style={{ background: '#fef2f2', color: '#b91c1c' }}>
          {error}
          <button
            type="button"
            onClick={() => setError('')}
            style={{ marginLeft: 12, border: 'none', background: 'none', cursor: 'pointer', color: '#b91c1c' }}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="hospital-hero-banner staff-affil-hero">
        <div className="hospital-hero-content staff-affil-hero-content">
          <p className="hospital-hero-eyebrow">Roster &amp; invitations</p>
          <h1>Hospital Affiliations</h1>
          <p className="hospital-hero-sub">
            Invitations, roster membership, and upcoming shifts for your {roleLabel.toLowerCase()} account.
          </p>
          <div className="staff-affil-hero-pills" aria-label="Affiliation summary">
            <span className="staff-affil-hero-pill">
              <strong>{loading ? '—' : invitations.length}</strong> Pending
            </span>
            <span className="staff-affil-hero-pill">
              <strong>{loading ? '—' : affiliations.length}</strong> Active
            </span>
            <span className="staff-affil-hero-pill">
              <strong>{loading ? '—' : shifts.length}</strong> Shifts (week)
            </span>
          </div>
        </div>
        <div className="hospital-hero-media" aria-hidden="true">
          <img src={affilHeroImage} alt="" className="hospital-hero-image staff-affil-hero-image" />
        </div>
      </section>

      <div className="doctor-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 className="doctor-card-title" style={{ marginTop: 0, marginBottom: 18 }}>
          Active Affiliations ({affiliations.length})
        </h2>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading affiliations...</p>
        ) : affiliations.length === 0 ? (
          <p style={{ color: '#64748b' }}>
            You are not affiliated with any hospital yet. Accept an invitation to join a roster.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {affiliations.map((item) => (
              <div
                key={item.affiliationId}
                className="staff-affil-item-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                  <HospitalAvatar name={item.hospitalName} logoUrl={item.hospitalLogoUrl} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                      {item.hospitalName || 'Hospital'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 8 }}>
                      Joined: {item.respondedAt ? new Date(item.respondedAt).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>
                <div
                  className={`staff-affil-presence${item.isOnDutyNow ? ' is-live' : ''}`}
                  title={
                    item.isOnDutyNow
                      ? 'You have a shift covering now at this hospital'
                      : 'No shift covering now at this hospital'
                  }
                >
                  {item.isOnDutyNow ? 'On duty now' : 'No active shift'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="doctor-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div className="staff-shift-week-header">
          <h2 className="doctor-card-title" style={{ margin: 0 }}>
            My Shifts — week calendar
          </h2>
          <div className="staff-shift-week-nav">
            <button
              type="button"
              className="staff-shift-week-nav-btn"
              onClick={() => setWeekStart((prev) => addHospitalDays(prev, -7))}
            >
              Prev
            </button>
            <button
              type="button"
              className="staff-shift-week-nav-btn"
              onClick={() => setWeekStart(startOfWeek(today))}
            >
              This week
            </button>
            <button
              type="button"
              className="staff-shift-week-nav-btn"
              onClick={() => setWeekStart((prev) => addHospitalDays(prev, 7))}
            >
              Next
            </button>
          </div>
        </div>
        <p className="staff-shift-week-range">{formatWeekRangeLabel(weekStart, weekEnd)}</p>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading shifts...</p>
        ) : (
          <div className="staff-shift-week-calendar">
            <div className="staff-shift-week-calendar-scroll">
              <div className="staff-shift-week-calendar-grid">
                {weekDays.map((day) => {
                  const header = formatDayHeader(day);
                  const isToday = day === today;
                  return (
                    <div
                      key={`head-${day}`}
                      className={`staff-shift-week-day-head${isToday ? ' is-today' : ''}`}
                    >
                      <div className="staff-shift-week-day-top">
                        <span className="staff-shift-week-weekday">{header.weekday}</span>
                        {isToday ? <span className="staff-shift-week-today-pill">Today</span> : null}
                      </div>
                      <span className="staff-shift-week-date">{header.dateLabel}</span>
                    </div>
                  );
                })}

                {weekDays.map((day) => {
                  const dayShifts = shiftsByDay[day] || [];
                  const isToday = day === today;
                  return (
                    <div
                      key={`cell-${day}`}
                      className={`staff-shift-week-cell${isToday ? ' is-today' : ''}`}
                    >
                      {dayShifts.length === 0 ? (
                        <span className="staff-shift-week-empty">—</span>
                      ) : (
                        dayShifts.map((shift) => (
                          <div key={shift.shiftId} className="staff-shift-week-card">
                            <div className="staff-shift-week-card-time">{formatShiftTime(shift)}</div>
                            <div className="staff-shift-week-card-booth">
                              {shift.boothOrStation || 'Unassigned booth'}
                            </div>
                            {shift.notes ? (
                              <div className="staff-shift-week-card-notes">{shift.notes}</div>
                            ) : null}
                            <div className="staff-shift-week-card-hospital">
                              {hospitalNameByAffiliation[shift.affiliationId] || 'Hospital'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="doctor-card" style={{ padding: '24px' }}>
        <h2 className="doctor-card-title" style={{ marginTop: 0, marginBottom: 18 }}>
          Pending Invitations ({invitations.length})
        </h2>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading invitations...</p>
        ) : invitations.length === 0 ? (
          <p style={{ color: '#64748b' }}>No pending hospital invitations.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {invitations.map((item) => (
              <div key={item.affiliationId} className="staff-affil-item-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <HospitalAvatar name={item.hospitalName} logoUrl={item.hospitalLogoUrl} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                      {item.hospitalName || 'Hospital invitation'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 8 }}>
                      Invited: {item.invitedAt ? new Date(item.invitedAt).toLocaleString() : '—'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="staff-affil-reject-btn"
                    disabled={actionId != null && String(actionId).startsWith(item.affiliationId)}
                    onClick={() => handleRespond(item.affiliationId, 'Reject')}
                  >
                    {actionId === `${item.affiliationId}-Reject` ? 'Rejecting...' : 'Reject'}
                  </button>
                  <button
                    type="button"
                    className="staff-affil-accept-btn"
                    disabled={actionId != null && String(actionId).startsWith(item.affiliationId)}
                    onClick={() => handleRespond(item.affiliationId, 'Accept')}
                  >
                    {actionId === `${item.affiliationId}-Accept` ? 'Accepting...' : 'Accept'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
