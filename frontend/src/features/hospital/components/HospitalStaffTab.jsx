import React, { useState } from 'react';
import AddStaffRequestModal from './AddStaffRequestModal';

export default function HospitalStaffTab() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'doctors' | 'nurses' | 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState('');

  const [staffList, setStaffList] = useState([
    {
      id: 1,
      name: 'Dr. Samantha Perera',
      vaxoraId: 'VX-DOC-49210',
      role: 'Doctor',
      specialty: 'General Medicine & Vaccination',
      license: 'SLMC-49210',
      booth: 'Booth 01 (Adult OPD)',
      status: 'On Duty',
      administeredToday: 38,
      avatar: '👨‍⚕️',
      email: 'samantha.perera@vaxora.health',
    },
    {
      id: 2,
      name: 'Dr. Nimal Jayawardena',
      vaxoraId: 'VX-DOC-33108',
      role: 'Doctor',
      specialty: 'Immunology Specialist',
      license: 'SLMC-33108',
      booth: 'Booth 02 (Senior & Allergy)',
      status: 'On Duty',
      administeredToday: 41,
      avatar: '👨‍⚕️',
      email: 'nimal.jayawardena@vaxora.health',
    },
    {
      id: 3,
      name: 'Nurse Anoma Silva',
      vaxoraId: 'VX-NUR-88120',
      role: 'Nurse',
      specialty: 'Senior Vaccination Officer',
      license: 'SLNC-8812',
      booth: 'Booth 03 (Fast-Track Routine)',
      status: 'On Duty',
      administeredToday: 34,
      avatar: '👩‍⚕️',
      email: 'anoma.silva@vaxora.health',
    },
    {
      id: 4,
      name: 'Nurse Dilani Fernando',
      vaxoraId: 'VX-NUR-94210',
      role: 'Nurse',
      specialty: 'Pediatric Care & Maternal Health',
      license: 'SLNC-9421',
      booth: 'Booth 04 (Pediatric Room)',
      status: 'On Duty',
      administeredToday: 29,
      avatar: '👩‍⚕️',
      email: 'dilani.fernando@vaxora.health',
    },
    {
      id: 5,
      name: 'Dr. Peter Alwis',
      vaxoraId: 'VX-DOC-51004',
      role: 'Doctor',
      specialty: 'Infectious Diseases',
      license: 'SLMC-51004',
      booth: 'Relief / Consultation',
      status: 'On Break',
      administeredToday: 18,
      avatar: '👨‍⚕️',
      email: 'peter.alwis@vaxora.health',
    },
    {
      id: 6,
      name: 'Dr. Kalai Selvan',
      vaxoraId: 'VX-DOC-62190',
      role: 'Doctor',
      specialty: 'Consultant Epidemiologist',
      license: 'SLMC-62190',
      booth: 'Unassigned (Pending Verification)',
      status: 'Pending Request',
      administeredToday: 0,
      avatar: '👨‍⚕️',
      email: 'kalai.selvan@vaxora.health',
      dateSent: 'Yesterday',
    },
  ]);

  const handleSendRequest = (newStaffRequest) => {
    setStaffList((prev) => [newStaffRequest, ...prev]);
    setNotification(
      `Affiliation request sent to ${newStaffRequest.name} (Vaxora ID: ${newStaffRequest.vaxoraId})!`
    );
    setTimeout(() => setNotification(''), 4000);
  };

  const handleCancelRequest = (id) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    setNotification('Staff request cancelled.');
    setTimeout(() => setNotification(''), 2500);
  };

  // Filtering
  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.vaxoraId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.license.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'doctors') return matchesSearch && staff.role === 'Doctor';
    if (activeTab === 'nurses') return matchesSearch && staff.role === 'Nurse';
    if (activeTab === 'pending') return matchesSearch && staff.status === 'Pending Request';
    return matchesSearch;
  });

  const doctorsCount = staffList.filter((s) => s.role === 'Doctor' && s.status !== 'Pending Request').length;
  const nursesCount = staffList.filter((s) => s.role === 'Nurse' && s.status !== 'Pending Request').length;
  const pendingCount = staffList.filter((s) => s.status === 'Pending Request').length;

  return (
    <div className="hospital-dashboard-tab">
      {/* Toast Notification */}
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ maxWidth: '1400px', width: '100%', marginBottom: '20px' }}
        >
          ✓ {notification}
        </div>
      )}

      {/* Header Banner */}
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
              All doctors and nurses affiliated with National Healthcare General Hospital.
              Invite and connect verified healthcare practitioners using their Vaxora ID.
            </p>
          </div>

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

      {/* Staff Metrics Summary Cards */}
      <div className="hospital-metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-blue">👥</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Total Affiliated Staff</span>
            <span className="hospital-stat-value">{staffList.length}</span>
            <span className="hospital-stat-meta">Verified Healthcare Practitioners</span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-purple">👨‍⚕️</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Doctors</span>
            <span className="hospital-stat-value">{doctorsCount}</span>
            <span className="hospital-stat-meta">SLMC Registered</span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-teal">👩‍⚕️</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Nurses</span>
            <span className="hospital-stat-value">{nursesCount}</span>
            <span className="hospital-stat-meta">SLNC Registered</span>
          </div>
        </div>

        <div className="hospital-stat-card">
          <div className="hospital-stat-icon stat-icon-amber">⏳</div>
          <div className="hospital-stat-info">
            <span className="hospital-stat-label">Pending Requests</span>
            <span className="hospital-stat-value">{pendingCount}</span>
            <span className="hospital-stat-meta">Awaiting doctor/nurse acceptance</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
            All Staff ({staffList.length})
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
            Pending Requests ({pendingCount})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search staff name, Vaxora ID, specialty..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="queue-search-input"
          style={{ width: '280px', padding: '8px 14px' }}
        />
      </div>

      {/* Staff Cards Grid */}
      <div className="booths-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {filteredStaff.length === 0 ? (
          <div
            className="hospital-section-card"
            style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}
          >
            No staff found matching your current filter or search criteria.
          </div>
        ) : (
          filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className="booth-card"
              style={{
                padding: '22px',
                borderLeft: staff.status === 'Pending Request' ? '4px solid #f59e0b' : '4px solid #19469d',
              }}
            >
              {/* Header */}
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
                          : staff.status === 'Pending Request'
                          ? '#f59e0b'
                          : '#94a3b8',
                    }}
                  />
                  <span
                    style={{
                      color:
                        staff.status === 'On Duty'
                          ? '#15803d'
                          : staff.status === 'Pending Request'
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

              {/* Staff Main Info */}
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
                    License: <strong>{staff.license}</strong>
                  </span>
                </div>
              </div>

              {/* Station Allocation / Stats */}
              <div className="booth-stats-row" style={{ paddingTop: '10px' }}>
                <span>
                  Station: <strong>{staff.booth}</strong>
                </span>
                {staff.status === 'Pending Request' ? (
                  <button
                    type="button"
                    onClick={() => handleCancelRequest(staff.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel Request
                  </button>
                ) : (
                  <span>
                    Vaccinated: <span className="booth-stat-bold">{staff.administeredToday}</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Staff / Send Request Modal */}
      <AddStaffRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSendRequest={handleSendRequest}
      />
    </div>
  );
}
