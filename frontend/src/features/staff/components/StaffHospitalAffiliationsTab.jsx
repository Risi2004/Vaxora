import React, { useCallback, useEffect, useRef, useState } from 'react';
import staffService from '../../hospital/services/staffService';
import { addHospitalDays, hospitalToday } from '../../hospital/utils/hospitalDate';
import { IconHospital } from '../../../shared/icons/AppIcons';

const dutyLabel = {
  Off: 'Off',
  OnDuty: 'On Duty',
  OnBreak: 'On Break',
};

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
  const [invitations, setInvitations] = useState([]);
  const [affiliations, setAffiliations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [actionId, setActionId] = useState(null);
  const toastTimerRef = useRef(null);

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
      const from = hospitalToday();
      const to = addHospitalDays(from, 14);

      const [pending, active, myShifts] = await Promise.all([
        staffService.getMyInvitations(),
        staffService.getMyAffiliations(),
        staffService.getMyShifts({ from, to }),
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
  }, []);

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

  const handleSetDuty = async (item, next) => {
    if (item.dutyStatus === next) return;
    const previous = item.dutyStatus;
    setActionId(`${item.affiliationId}-duty`);
    setAffiliations((list) =>
      list.map((a) =>
        a.affiliationId === item.affiliationId ? { ...a, dutyStatus: next } : a
      )
    );
    try {
      await staffService.updateDutyStatus(item.affiliationId, next);
      showToast(`Duty status set to ${dutyLabel[next] || next}.`);
    } catch (err) {
      setAffiliations((list) =>
        list.map((a) =>
          a.affiliationId === item.affiliationId ? { ...a, dutyStatus: previous } : a
        )
      );
      setError(err.message || 'Failed to update duty status.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="doctor-dashboard-tab">
      {toast && (
        <div className="doctor-toast" role="status">
          ✓ {toast}
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

      <section className="doctor-hero-banner staff-affil-hero" style={{ marginBottom: '24px' }}>
        <div className="doctor-hero-info">
          <h1 className="doctor-hero-title">Hospital Affiliations</h1>
          <p className="doctor-hero-subtitle">
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
              <strong>{loading ? '—' : shifts.length}</strong> Shifts (14d)
            </span>
          </div>
        </div>
        <div className="doctor-hero-actions">
          <button
            type="button"
            className="staff-affil-hero-refresh"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </section>

      <div className="doctor-card" style={{ padding: '24px', marginBottom: '24px' }}>
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
                  className="staff-affil-duty-group"
                  role="group"
                  aria-label="Duty status"
                >
                  {[
                    { value: 'Off', label: 'Off' },
                    { value: 'OnDuty', label: 'On Duty' },
                    { value: 'OnBreak', label: 'On Break' },
                  ].map((opt) => {
                    const active = item.dutyStatus === opt.value;
                    const busy = actionId === `${item.affiliationId}-duty`;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`staff-affil-duty-btn${active ? ' is-active' : ''}${opt.value === 'OnDuty' ? ' is-on' : ''}${opt.value === 'OnBreak' ? ' is-break' : ''}`}
                        disabled={busy}
                        aria-pressed={active}
                        onClick={() => handleSetDuty(item, opt.value)}
                      >
                        {busy && active ? '…' : opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="doctor-card" style={{ padding: '24px' }}>
        <h2 className="doctor-card-title" style={{ marginTop: 0, marginBottom: 18 }}>
          My Shifts (next 14 days)
        </h2>
        {loading ? (
          <p style={{ color: '#64748b' }}>Loading shifts...</p>
        ) : shifts.length === 0 ? (
          <p style={{ color: '#64748b' }}>No upcoming shifts assigned yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {shifts.map((shift) => (
              <div key={shift.shiftId} className="staff-affil-item-card">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                    {shift.shiftDate}
                    {' · '}
                    {String(shift.startTime).slice(0, 5)} – {String(shift.endTime).slice(0, 5)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 8 }}>
                    Booth: {shift.boothOrStation || '—'}
                    {shift.notes ? ` · ${shift.notes}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
