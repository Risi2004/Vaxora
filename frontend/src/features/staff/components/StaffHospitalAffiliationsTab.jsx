import React, { useCallback, useEffect, useState } from 'react';
import staffService from '../../hospital/services/staffService';

const dutyLabel = {
  Off: 'Off',
  OnDuty: 'On Duty',
  OnBreak: 'On Break',
};

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

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const today = new Date();
      const from = today.toISOString().slice(0, 10);
      const toDate = new Date(today);
      toDate.setDate(toDate.getDate() + 14);
      const to = toDate.toISOString().slice(0, 10);

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

  const handleCycleDuty = async (item) => {
    const order = ['Off', 'OnDuty', 'OnBreak'];
    const currentIndex = order.indexOf(item.dutyStatus);
    const next = order[(currentIndex + 1) % order.length];
    setActionId(`${item.affiliationId}-duty`);
    try {
      await staffService.updateDutyStatus(item.affiliationId, next);
      showToast(`Duty status set to ${dutyLabel[next] || next}.`);
      await loadData();
    } catch (err) {
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

      <section className="doctor-hero-banner" style={{ marginBottom: '24px' }}>
        <div className="doctor-hero-info">
          <h1 className="doctor-hero-title">Hospital Affiliations</h1>
          <p className="doctor-hero-subtitle">
            Review hospital invitations and manage your active {roleLabel.toLowerCase()} affiliations.
          </p>
        </div>
        <button type="button" className="doctor-filter-btn" onClick={loadData} disabled={loading}>
          Refresh
        </button>
      </section>

      <div className="doctor-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 className="doctor-card-title" style={{ marginTop: 0 }}>
          Pending Invitations ({invitations.length})
        </h2>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading invitations...</p>
        ) : invitations.length === 0 ? (
          <p style={{ color: '#64748b' }}>No pending hospital invitations.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {invitations.map((item) => (
              <div
                key={item.affiliationId}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  background: '#fffbeb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {item.hospitalName || 'Hospital invitation'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                    Invited: {item.invitedAt ? new Date(item.invitedAt).toLocaleString() : '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="doctor-table-btn"
                    disabled={actionId === `${item.affiliationId}-Reject`}
                    onClick={() => handleRespond(item.affiliationId, 'Reject')}
                    style={{ color: '#b91c1c' }}
                  >
                    {actionId === `${item.affiliationId}-Reject` ? 'Rejecting...' : 'Reject'}
                  </button>
                  <button
                    type="button"
                    className="doctor-filter-btn active"
                    disabled={actionId === `${item.affiliationId}-Accept`}
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

      <div className="doctor-card" style={{ padding: '24px' }}>
        <h2 className="doctor-card-title" style={{ marginTop: 0 }}>
          Active Affiliations ({affiliations.length})
        </h2>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading affiliations...</p>
        ) : affiliations.length === 0 ? (
          <p style={{ color: '#64748b' }}>
            You are not affiliated with any hospital yet. Accept an invitation to join a roster.
          </p>
        ) : (
          <div className="doctor-table-wrapper">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Duty Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {affiliations.map((item) => (
                  <tr key={item.affiliationId}>
                    <td>{item.hospitalName || 'Hospital'}</td>
                    <td>{dutyLabel[item.dutyStatus] || item.dutyStatus}</td>
                    <td>{item.respondedAt ? new Date(item.respondedAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="doctor-table-btn"
                        disabled={actionId === `${item.affiliationId}-duty`}
                        onClick={() => handleCycleDuty(item)}
                      >
                        {actionId === `${item.affiliationId}-duty` ? 'Updating...' : 'Cycle Duty'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="doctor-card" style={{ padding: '24px', marginTop: '24px' }}>
        <h2 className="doctor-card-title" style={{ marginTop: 0 }}>
          My Shifts (next 14 days)
        </h2>
        {loading ? (
          <p style={{ color: '#64748b' }}>Loading shifts...</p>
        ) : shifts.length === 0 ? (
          <p style={{ color: '#64748b' }}>No upcoming shifts assigned yet.</p>
        ) : (
          <div className="doctor-table-wrapper">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Booth</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.shiftId}>
                    <td>{shift.shiftDate}</td>
                    <td>
                      {String(shift.startTime).slice(0, 5)} – {String(shift.endTime).slice(0, 5)}
                    </td>
                    <td>{shift.boothOrStation || '—'}</td>
                    <td>{shift.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
