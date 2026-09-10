import React, { useState } from 'react';

export default function AdminUsersTab() {
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [notification, setNotification] = useState('');

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Comprehensive user directory state
  const [users, setUsers] = useState([
    {
      id: 'USR-101',
      name: 'Dr. Samantha Perera',
      role: 'doctor',
      email: 'samantha.perera@lankahosp.lk',
      phone: '077 345 6789',
      identifier: 'SLMC-38291',
      facility: 'Lanka Hospital Colombo',
      status: 'active',
      joinedDate: '2024-03-12',
      specialization: 'Consultant Vaccinologist & Immunologist',
    },
    {
      id: 'USR-102',
      name: 'Nurse Anoma Silva',
      role: 'nurse',
      email: 'anoma.silva@lankahosp.lk',
      phone: '071 987 6543',
      identifier: 'SLNC-49201',
      facility: 'Lanka Hospital Colombo',
      status: 'active',
      joinedDate: '2024-05-18',
      specialization: 'Senior Immunization Nurse (RNO)',
    },
    {
      id: 'USR-103',
      name: 'Lanka Hospital Colombo',
      role: 'hospital',
      email: 'admin@lankahospitals.com',
      phone: '011 543 0000',
      identifier: 'MOH-PVT-0042',
      facility: 'Western Province',
      status: 'active',
      joinedDate: '2023-11-01',
      specialization: 'Tertiary Care & National Vaccination Center',
    },
    {
      id: 'USR-104',
      name: 'Chaminda Wickramasinghe',
      role: 'patient',
      email: 'chaminda.w@gmail.com',
      phone: '077 452 1098',
      identifier: 'NIC: 198845210982 (VP123456783)',
      facility: 'Patient Portal User',
      status: 'active',
      joinedDate: '2024-01-10',
      specialization: 'Registered Citizen Record',
    },
    {
      id: 'USR-105',
      name: 'Dr. Kasun Abeysekera',
      role: 'doctor',
      email: 'kasun.abey@gmail.com',
      phone: '076 112 3344',
      identifier: 'SLMC-42091',
      facility: 'Lanka Hospital Colombo',
      status: 'pending',
      joinedDate: '2026-09-07',
      specialization: 'General Practitioner',
    },
    {
      id: 'USR-106',
      name: 'Nurse Sanduni Wijesinghe',
      role: 'nurse',
      email: 'sanduni.w@asiri.lk',
      phone: '070 234 5678',
      identifier: 'SLNC-58210',
      facility: 'Asiri Central Hospital',
      status: 'pending',
      joinedDate: '2026-09-07',
      specialization: 'Staff Nurse',
    },
    {
      id: 'USR-107',
      name: 'Nawaloka Medicare Center - Negombo',
      role: 'hospital',
      email: 'negombo@nawaloka.com',
      phone: '031 223 4455',
      identifier: 'MOH-PVT-8821',
      facility: 'Western Province (Gampaha)',
      status: 'pending',
      joinedDate: '2026-09-06',
      specialization: 'Satellite Medical Center',
    },
    {
      id: 'USR-108',
      name: 'Nadeeka Priyadarshani',
      role: 'patient',
      email: 'nadeeka.p@gmail.com',
      phone: '076 234 5678',
      identifier: 'NIC: 199589234120 (VP123456781)',
      facility: 'Patient Portal User',
      status: 'active',
      joinedDate: '2024-02-14',
      specialization: 'Registered Citizen Record',
    },
    {
      id: 'USR-109',
      name: 'Dr. Rohan Jayawardena',
      role: 'doctor',
      email: 'rohan.j@gmail.com',
      phone: '072 998 8776',
      identifier: 'SLMC-29401',
      facility: 'Delmon Hospital',
      status: 'suspended',
      joinedDate: '2023-08-20',
      specialization: 'Pediatric Consultant',
    },
    {
      id: 'USR-110',
      name: 'KUMAR',
      role: 'patient',
      email: 'VakaPo@gmail.com',
      phone: '074 1234 567',
      identifier: 'NIC: 1234 5678 9123 (VP12345678)',
      facility: 'Patient Portal User',
      status: 'active',
      joinedDate: '2024-06-01',
      specialization: 'Registered Citizen Record',
    },
  ]);

  // Handle status toggle
  const handleToggleStatus = (userId) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newStatus = u.status === 'active' ? 'suspended' : 'active';
        showToast(`User ${u.name} marked as ${newStatus.toUpperCase()}`);
        return { ...u, status: newStatus };
      })
    );
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    // Role filter
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    // Status filter
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.identifier.toLowerCase().includes(q) ||
        u.facility.toLowerCase().includes(q) ||
        u.phone.includes(q)
      );
    }
    return true;
  });

  const countByRole = (role) => {
    if (role === 'all') return users.length;
    return users.filter((u) => u.role === role).length;
  };

  return (
    <div className="admin-users-page">
      {/* Toast Notification */}
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ maxWidth: '1060px', margin: '0 auto 20px', width: '100%' }}
        >
          ✓ {notification}
        </div>
      )}

      {/* Main Container Card */}
      <div className="doctor-card admin-main-card">
        <div className="doctor-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="doctor-card-title">
              <span>👥</span>
              National User Directory
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Manage, filter, and inspect accounts for all registered doctors, nurses, hospitals, and citizens.
            </p>
          </div>

          {/* Role Filters */}
          <div className="doctor-filter-pills">
            <button
              type="button"
              className={`doctor-filter-btn ${roleFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRoleFilter('all')}
            >
              All Roles ({countByRole('all')})
            </button>
            <button
              type="button"
              className={`doctor-filter-btn ${roleFilter === 'doctor' ? 'active' : ''}`}
              onClick={() => setRoleFilter('doctor')}
            >
              🩺 Doctors ({countByRole('doctor')})
            </button>
            <button
              type="button"
              className={`doctor-filter-btn ${roleFilter === 'nurse' ? 'active' : ''}`}
              onClick={() => setRoleFilter('nurse')}
            >
              👩‍⚕️ Nurses ({countByRole('nurse')})
            </button>
            <button
              type="button"
              className={`doctor-filter-btn ${roleFilter === 'hospital' ? 'active' : ''}`}
              onClick={() => setRoleFilter('hospital')}
            >
              🏥 Hospitals ({countByRole('hospital')})
            </button>
            <button
              type="button"
              className={`doctor-filter-btn ${roleFilter === 'patient' ? 'active' : ''}`}
              onClick={() => setRoleFilter('patient')}
            >
              👤 Patients ({countByRole('patient')})
            </button>
          </div>
        </div>

        {/* Search & Status Filter Controls */}
        <div className="admin-controls-bar">
          <div className="doctor-search-bar" style={{ flex: 1, margin: 0 }}>
            <span className="doctor-search-icon">🔍</span>
            <input
              type="text"
              className="doctor-search-input"
              placeholder="Search by name, email, SLMC/SLNC/MOH ID, NIC, or facility..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Status:</label>
            <select
              className="doctor-filter-date-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 12px' }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active / Verified</option>
              <option value="pending">Pending Approval</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="doctor-table-wrapper">
          <table className="doctor-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Registration / License ID</th>
                <th>Contact Info</th>
                <th>Facility / Area</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="doctor-patient-cell">
                        <span
                          className="doctor-patient-name-link"
                          onClick={() => {
                            setSelectedUser(u);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          {u.name}
                        </span>
                        <span className="doctor-patient-sub" style={{ color: '#94a3b8' }}>
                          UID: {u.id} • Joined {u.joinedDate}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-role-badge ${u.role}`}>
                        {u.role === 'doctor' && '🩺 Doctor'}
                        {u.role === 'nurse' && '👩‍⚕️ Nurse'}
                        {u.role === 'hospital' && '🏥 Hospital'}
                        {u.role === 'patient' && '👤 Patient'}
                      </span>
                    </td>
                    <td>
                      <span className="admin-id-pill" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                        {u.identifier}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.84rem' }}>
                        <div style={{ color: '#ffffff', fontWeight: 600 }}>{u.email}</div>
                        <div style={{ color: '#94a3b8', marginTop: '2px' }}>{u.phone}</div>
                      </div>
                    </td>
                    <td style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>
                      {u.facility}
                    </td>
                    <td>
                      {u.status === 'active' && (
                        <span className="doctor-status-badge status-completed">
                          ✓ Verified
                        </span>
                      )}
                      {u.status === 'pending' && (
                        <span className="doctor-status-badge status-waiting">
                          ⏳ Pending Approval
                        </span>
                      )}
                      {u.status === 'suspended' && (
                        <span className="doctor-status-badge status-rejected" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                          ⛔ Suspended
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="doctor-table-btn"
                          style={{ background: '#0284c7', color: '#ffffff', borderColor: '#38bdf8' }}
                          onClick={() => {
                            setSelectedUser(u);
                            setIsDetailModalOpen(true);
                          }}
                          title="Inspect full user record"
                        >
                          Details
                        </button>
                        {u.role !== 'patient' && (
                          <button
                            type="button"
                            className="doctor-table-btn"
                            style={{
                              background: u.status === 'active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: u.status === 'active' ? '#f87171' : '#34d399',
                              borderColor: u.status === 'active' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                            }}
                            onClick={() => handleToggleStatus(u.id)}
                            title={u.status === 'active' ? 'Suspend User Access' : 'Activate User Access'}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
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

      {/* User Details Modal */}
      {isDetailModalOpen && selectedUser && (
        <div className="doctor-modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="doctor-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="doctor-modal-header" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
              <div>
                <h3 className="doctor-modal-title">Account Profile &amp; Credentials</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
                  User UID: {selectedUser.id} • Registered under National Health Directory
                </p>
              </div>
              <button type="button" className="doctor-modal-close-btn" onClick={() => setIsDetailModalOpen(false)}>
                &times;
              </button>
            </div>

            <div className="doctor-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px', background: '#111a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '2.4rem' }}>
                  {selectedUser.role === 'doctor' ? '🩺' : selectedUser.role === 'nurse' ? '👩‍⚕️' : selectedUser.role === 'hospital' ? '🏥' : '👤'}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.2rem', fontWeight: 800 }}>{selectedUser.name}</h3>
                  <span className={`admin-role-badge ${selectedUser.role}`} style={{ marginTop: '4px' }}>
                    {selectedUser.role.toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Email Address</span>
                  <span className="admin-detail-val" style={{ color: '#ffffff' }}>{selectedUser.email}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Phone Number</span>
                  <span className="admin-detail-val" style={{ color: '#ffffff' }}>{selectedUser.phone}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Official License / ID</span>
                  <span className="admin-detail-val" style={{ fontWeight: 700, color: '#38bdf8' }}>{selectedUser.identifier}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Affiliated Facility</span>
                  <span className="admin-detail-val" style={{ color: '#ffffff' }}>{selectedUser.facility}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Joined Date</span>
                  <span className="admin-detail-val" style={{ color: '#ffffff' }}>{selectedUser.joinedDate}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Account Status</span>
                  <span className="admin-detail-val" style={{ textTransform: 'capitalize', fontWeight: 700, color: selectedUser.status === 'active' ? '#34d399' : '#fbbf24' }}>
                    {selectedUser.status}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '14px', padding: '12px', background: '#111a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Role Profile / Specialization:</span>
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem', marginTop: '2px' }}>
                  {selectedUser.specialization}
                </div>
              </div>
            </div>

            <div className="doctor-modal-footer">
              <button
                type="button"
                className="doctor-btn-cancel"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </button>
              {selectedUser.role !== 'patient' && (
                <button
                  type="button"
                  className="doctor-btn-submit"
                  style={{
                    background: selectedUser.status === 'active' ? '#dc2626' : '#16a34a',
                  }}
                  onClick={() => {
                    handleToggleStatus(selectedUser.id);
                    setIsDetailModalOpen(false);
                  }}
                >
                  {selectedUser.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
