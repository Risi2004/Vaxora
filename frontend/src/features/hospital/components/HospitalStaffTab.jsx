import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AddStaffRequestModal from './AddStaffRequestModal';
import staffService from '../services/staffService';

const dutyLabel = {
  Off: 'Off',
  OnDuty: 'On Duty',
  OnBreak: 'On Break',
};

const nextDutyStatus = {
  Off: 'OnDuty',
  OnDuty: 'OnBreak',
  OnBreak: 'Off',
};

function mapAffiliationToCard(item) {
  const isPending = item.status === 'Pending';
  const roleLabel = item.staffRole === 'DOCTOR' ? 'Doctor' : 'Nurse';

  return {
    id: item.affiliationId,
    name: item.staffName,
    vaxoraId: item.staffRegistrationNumber,
    role: roleLabel,
    specialty: item.specialization || (roleLabel === 'Doctor' ? 'Doctor' : 'Nursing Staff'),
    email: item.email || '—',
    phone: item.phoneNumber || '—',
    affiliationStatus: item.status,
    dutyStatus: item.dutyStatus,
    status: isPending ? 'Pending Request' : dutyLabel[item.dutyStatus] || item.dutyStatus,
    avatar: roleLabel === 'Doctor' ? '👨‍⚕️' : '👩‍⚕️',
    invitedAt: item.invitedAt,
  };
}

export default function HospitalStaffTab() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [actionId, setActionId] = useState(null);

  const showToast = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 4000);
  };

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await staffService.getHospitalStaff({ status: 'All' });
      const mapped = (Array.isArray(data) ? data : [])
        .filter((item) => item.status === 'Active' || item.status === 'Pending')
        .map(mapAffiliationToCard);
      setStaffList(mapped);
    } catch (err) {
      setError(err.message || 'Failed to load hospital staff.');
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleSendRequest = async (registrationNumber) => {
    setIsSubmitting(true);
    try {
      const invited = await staffService.inviteStaff(registrationNumber);
      showToast(`Invitation sent to ${invited.staffName} (${invited.staffRegistrationNumber}).`);
      await loadStaff();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (affiliationId) => {
    setActionId(affiliationId);
    try {
      await staffService.removeAffiliation(affiliationId);
      showToast('Staff request cancelled.');
      await loadStaff();
    } catch (err) {
      setError(err.message || 'Failed to cancel request.');
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveStaff = async (affiliationId) => {
    setActionId(affiliationId);
    try {
      await staffService.removeAffiliation(affiliationId);
      showToast('Staff removed from roster.');
      await loadStaff();
    } catch (err) {
      setError(err.message || 'Failed to remove staff.');
    } finally {
      setActionId(null);
    }
  };

  const handleCycleDuty = async (staff) => {
    if (staff.affiliationStatus !== 'Active') return;
    const next = nextDutyStatus[staff.dutyStatus] || 'Off';
    setActionId(staff.id);
    try {
      await staffService.updateDutyStatus(staff.id, next);
      showToast(`Duty status updated to ${dutyLabel[next] || next}.`);
      await loadStaff();
    } catch (err) {
      setError(err.message || 'Failed to update duty status.');
    } finally {
      setActionId(null);
    }
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const haystack = `${staff.name} ${staff.vaxoraId} ${staff.specialty} ${staff.email}`.toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (activeTab === 'doctors') return staff.role === 'Doctor';
      if (activeTab === 'nurses') return staff.role === 'Nurse';
      if (activeTab === 'pending') return staff.affiliationStatus === 'Pending';
      return true;
    });
  }, [staffList, activeTab, searchQuery]);

  const activeStaff = staffList.filter((s) => s.affiliationStatus === 'Active');
  const doctorsCount = activeStaff.filter((s) => s.role === 'Doctor').length;
  const nursesCount = activeStaff.filter((s) => s.role === 'Nurse').length;
  const pendingCount = staffList.filter((s) => s.affiliationStatus === 'Pending').length;

  return (
    <div className="hospital-dashboard-tab">
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ maxWidth: '1400px', width: '100%', marginBottom: '20px' }}
        >
          ✓ {notification}
        </div>
      )}

      {error && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{
            maxWidth: '1400px',
            width: '100%',
            marginBottom: '20px',
            background: '#fef2f2',
            color: '#b91c1c',
            borderColor: '#fecaca',
          }}
        >
          {error}
          <button
            type="button"
            onClick={() => setError('')}
            style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="hospital-section-card" style={{ marginBottom: '24px' }}>
        <div
          className="section-card-header"
          style={{
            borderBottom: 'none',
            marginBottom: 0,
            paddingBottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div className="section-title-group">
            <h2>
              <span>👨‍⚕️</span> Hospital Medical Staff &amp; Doctors
            </h2>
            <p className="section-title-desc">
              Manage affiliated doctors and nurses. Invite verified practitioners with their Vaxora ID.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-hospital-secondary"
              onClick={loadStaff}
              disabled={loading}
              style={{ padding: '10px 16px', fontSize: '0.92rem' }}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn-hospital-primary"
              onClick={() => setIsModalOpen(true)}
              style={{ padding: '10px 20px', fontSize: '0.92rem' }}
            >
              <span>+</span> Add New Staff
            </button>
          </div>
        </div>
      </div>

      <div className="hospital-metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-blue">👥</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Active Affiliated Staff</span>
            <span className="hospital-stat-value">{activeStaff.length}</span>
            <span className="hospital-stat-meta">Accepted roster members</span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-purple">👨‍⚕️</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Doctors</span>
            <span className="hospital-stat-value">{doctorsCount}</span>
            <span className="hospital-stat-meta">Active affiliations</span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-teal">👩‍⚕️</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Nurses</span>
            <span className="hospital-stat-value">{nursesCount}</span>
            <span className="hospital-stat-meta">Active affiliations</span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-amber">⏳</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Pending Requests</span>
            <span className="hospital-stat-value">{pendingCount}</span>
            <span className="hospital-stat-meta">Awaiting acceptance</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`hospital-nav-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
            style={{
              background: activeTab === 'all' ? '#19469d' : '#ffffff',
              border: '1px solid #cbd5e1',
            }}
          >
            All ({staffList.length})
          </button>

          <button
            type="button"
            className={`hospital-nav-btn ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => setActiveTab('doctors')}
            style={{
              background: activeTab === 'doctors' ? '#19469d' : '#ffffff',
              border: '1px solid #cbd5e1',
            }}
          >
            Doctors ({staffList.filter((s) => s.role === 'Doctor').length})
          </button>

          <button
            type="button"
            className={`hospital-nav-btn ${activeTab === 'nurses' ? 'active' : ''}`}
            onClick={() => setActiveTab('nurses')}
            style={{
              background: activeTab === 'nurses' ? '#19469d' : '#ffffff',
              border: '1px solid #cbd5e1',
            }}
          >
            Nurses ({staffList.filter((s) => s.role === 'Nurse').length})
          </button>

          <button
            type="button"
            className={`hospital-nav-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
            style={{
              background: activeTab === 'pending' ? '#19469d' : '#ffffff',
              border: '1px solid #cbd5e1',
            }}
          >
            Pending ({pendingCount})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search name, Vaxora ID, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="queue-search-input"
          style={{ width: '280px', padding: '8px 14px' }}
        />
      </div>

      <div className="booths-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {loading ? (
          <div
            className="hospital-section-card"
            style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}
          >
            Loading staff directory...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div
            className="hospital-section-card"
            style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}
          >
            No staff found. Invite a doctor or nurse with their Vaxora ID to get started.
          </div>
        ) : (
          filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className="booth-card"
              style={{
                padding: '22px',
                borderLeft: staff.affiliationStatus === 'Pending' ? '4px solid #f59e0b' : '4px solid #19469d',
              }}
            >
              <div className="booth-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="booth-number-tag"
                    style={{ background: staff.role === 'Doctor' ? '#19469d' : '#0d9488' }}
                  >
                    {staff.role}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      background: '#eff6ff',
                      color: '#1e40af',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    {staff.vaxoraId}
                  </span>
                </div>

                <div className="booth-status-indicator">
                  <span
                    className="telemetry-pulse"
                    style={{
                      width: '6px',
                      height: '6px',
                      background:
                        staff.status === 'On Duty'
                          ? '#22c55e'
                          : staff.affiliationStatus === 'Pending'
                            ? '#f59e0b'
                            : '#94a3b8',
                    }}
                  />
                  <span
                    style={{
                      color:
                        staff.status === 'On Duty'
                          ? '#15803d'
                          : staff.affiliationStatus === 'Pending'
                            ? '#b45309'
                            : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                    }}
                  >
                    {staff.status}
                  </span>
                </div>
              </div>

              <div className="booth-staff-info" style={{ padding: '14px', background: '#f8fafc' }}>
                <div
                  className="staff-avatar-mini"
                  style={{ width: '50px', height: '50px', fontSize: '1.6rem', background: '#e2e8f0' }}
                >
                  {staff.avatar}
                </div>
                <div className="staff-text-group" style={{ gap: '2px' }}>
                  <span className="staff-name" style={{ fontSize: '1.08rem' }}>
                    {staff.name}
                  </span>
                  <span className="staff-role-desc" style={{ color: '#2563eb', fontWeight: 600 }}>
                    {staff.specialty}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {staff.email}
                  </span>
                </div>
              </div>

              <div className="booth-stats-row" style={{ paddingTop: '10px', gap: '8px', flexWrap: 'wrap' }}>
                {staff.affiliationStatus === 'Pending' ? (
                  <button
                    type="button"
                    onClick={() => handleCancelRequest(staff.id)}
                    disabled={actionId === staff.id}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    {actionId === staff.id ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCycleDuty(staff)}
                      disabled={actionId === staff.id}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        padding: '4px 10px',
                      }}
                    >
                      {actionId === staff.id ? 'Updating...' : 'Cycle Duty'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStaff(staff.id)}
                      disabled={actionId === staff.id}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AddStaffRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSendRequest={handleSendRequest}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
