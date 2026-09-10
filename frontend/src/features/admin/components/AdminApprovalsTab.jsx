import React, { useState } from 'react';

export default function AdminApprovalsTab() {
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notification, setNotification] = useState('');

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // Initial pending approval applications
  const [requests, setRequests] = useState([
    {
      id: 'APP-801',
      type: 'doctor',
      name: 'Dr. Kasun Abeysekera',
      email: 'kasun.abey@gmail.com',
      phone: '076 112 3344',
      nic: '198923456789',
      licenseId: 'SLMC-42091',
      facility: 'Lanka Hospital Colombo',
      appliedAt: '2026-09-07 07:45 AM',
      documentName: 'SLMC_Registration_Card_Kasun.pdf',
      documentType: 'Sri Lanka Medical Council (SLMC) Practitioner License',
      degree: 'MBBS - University of Kelaniya (2018)',
      status: 'pending',
    },
    {
      id: 'APP-802',
      type: 'nurse',
      name: 'Nurse Sanduni Wijesinghe',
      email: 'sanduni.w@asiri.lk',
      phone: '070 234 5678',
      nic: '199689234120',
      licenseId: 'SLNC-58210',
      facility: 'Asiri Central Hospital',
      appliedAt: '2026-09-07 08:12 AM',
      documentName: 'SLNC_Nursing_License_Sanduni.jpg',
      documentType: 'Sri Lanka Nursing Council (SLNC) Registration Card',
      degree: 'BSc Nursing - University of Peradeniya (2020)',
      status: 'pending',
    },
    {
      id: 'APP-803',
      type: 'hospital',
      name: 'Nawaloka Medicare Center - Negombo',
      email: 'negombo@nawaloka.com',
      phone: '031 223 4455',
      nic: 'BR: PV-198421',
      licenseId: 'MOH-PVT-8821',
      facility: 'Main Street, Negombo (Gampaha District)',
      appliedAt: '2026-09-06 04:30 PM',
      documentName: 'MOH_Private_Hospital_Accreditation_2026.pdf',
      documentType: 'MOH Facility Accreditation & Cold-Chain Certification',
      degree: 'Category A Vaccination Center (4 Cold Storage Units)',
      status: 'pending',
    },
    {
      id: 'APP-804',
      type: 'doctor',
      name: 'Dr. Imalka Wickramasinghe',
      email: 'imalka.w@gmail.com',
      phone: '077 889 9001',
      nic: '198432109876',
      licenseId: 'SLMC-31204',
      facility: 'Teaching Hospital Kandy',
      appliedAt: '2026-09-05 11:20 AM',
      documentName: 'SLMC_Certification_Imalka.pdf',
      documentType: 'Sri Lanka Medical Council Full Registration',
      degree: 'MBBS, MD (Pediatrics) - Colombo (2015)',
      status: 'approved',
      decisionNote: 'Verified with SLMC database register on 2026-09-06.',
    },
  ]);

  // Approve Request
  const handleApprove = (req) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? { ...r, status: 'approved', decisionNote: 'Approved by Superadmin.' }
          : r
      )
    );
    showToast(`✅ Approved ${req.type.toUpperCase()}: ${req.name} (${req.licenseId}). Verified access activated.`);
    setIsInspectModalOpen(false);
  };

  // Reject Request
  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    const reason = rejectionReason.trim() || 'Incomplete or unverified credential submission.';
    setRequests((prev) =>
      prev.map((r) =>
        r.id === selectedRequest.id
          ? { ...r, status: 'rejected', decisionNote: reason }
          : r
      )
    );
    showToast(`❌ Application ${selectedRequest.id} (${selectedRequest.name}) rejected.`);
    setIsRejectModalOpen(false);
    setIsInspectModalOpen(false);
    setRejectionReason('');
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (filterType === 'pending' && r.status !== 'pending') return false;
    if (filterType === 'approved' && r.status !== 'approved') return false;
    if (filterType === 'doctor' && r.type !== 'doctor') return false;
    if (filterType === 'nurse' && r.type !== 'nurse') return false;
    if (filterType === 'hospital' && r.type !== 'hospital') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.licenseId.toLowerCase().includes(q) ||
        r.facility.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="admin-approvals-page">
      {/* Toast Notification */}
      {notification && (
        <div
          className="appointment-alert-pill"
          role="alert"
          style={{ maxWidth: '1060px', margin: '0 auto 20px', width: '100%' }}
        >
          {notification}
        </div>
      )}

      {/* Main Approvals Card */}
      <div className="doctor-card admin-main-card">
        <div className="doctor-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="doctor-card-title">
              <span>🛡️</span>
              Practitioner &amp; Facility Approval Queue
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Except citizens/patients, all Doctors, Nurses, and Healthcare Facilities must be verified and approved before accessing clinical tools.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="doctor-filter-pills">
            <button
              type="button"
              className={`doctor-filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All Requests ({requests.length})
            </button>
            <button
              type="button"
              className={`doctor-filter-btn ${filterType === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterType('pending')}
            >
              ⏳ Pending ({pendingCount})
            </button>
            <button
              type="button"
              className={`doctor-filter-btn ${filterType === 'doctor' ? 'active' : ''}`}
              onClick={() => setFilterType('doctor')}
            >
              🩺 Doctors
            </button>
            <button
              type="button"
              className={`doctor-filter-btn ${filterType === 'nurse' ? 'active' : ''}`}
              onClick={() => setFilterType('nurse')}
            >
              👩‍⚕️ Nurses
            </button>
            <button
              type="button"
              className={`doctor-filter-btn ${filterType === 'hospital' ? 'active' : ''}`}
              onClick={() => setFilterType('hospital')}
            >
              🏥 Facilities
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="doctor-search-bar">
          <span className="doctor-search-icon">🔍</span>
          <input
            type="text"
            className="doctor-search-input"
            placeholder="Search pending applications by name, SLMC/SLNC/MOH license, or facility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Applications Table */}
        <div className="doctor-table-wrapper">
          <table className="doctor-table">
            <thead>
              <tr>
                <th>Applicant / Organization</th>
                <th>Category</th>
                <th>Licensing Code</th>
                <th>Target Facility / Location</th>
                <th>Submitted File</th>
                <th>Submission Time</th>
                <th>Status</th>
                <th>Approval Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No applications matching this filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div className="doctor-patient-cell">
                        <span
                          className="doctor-patient-name-link"
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsInspectModalOpen(true);
                          }}
                        >
                          {req.name}
                        </span>
                        <span className="doctor-patient-sub" style={{ color: '#94a3b8' }}>
                          {req.email} • {req.phone}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-role-badge ${req.type}`}>
                        {req.type === 'doctor' && '🩺 Doctor'}
                        {req.type === 'nurse' && '👩‍⚕️ Nurse'}
                        {req.type === 'hospital' && '🏥 Hospital'}
                      </span>
                    </td>
                    <td>
                      <span className="admin-id-pill" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                        {req.licenseId}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.84rem', color: '#e2e8f0', fontWeight: 600 }}>
                      {req.facility}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-doc-link-btn"
                        onClick={() => {
                          setSelectedRequest(req);
                          setIsInspectModalOpen(true);
                        }}
                        title={req.documentName}
                      >
                        📄 {req.documentName}
                      </button>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {req.appliedAt}
                    </td>
                    <td>
                      {req.status === 'pending' && (
                        <span className="doctor-status-badge status-waiting">
                          ⏳ Pending
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="doctor-status-badge status-completed">
                          ✓ Approved
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="doctor-status-badge status-rejected">
                          ✕ Rejected
                        </span>
                      )}
                    </td>
                    <td>
                      {req.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="doctor-table-btn"
                            style={{ background: '#0284c7', color: '#ffffff', borderColor: '#38bdf8' }}
                            onClick={() => handleApprove(req)}
                            title="Approve and activate credentials"
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            className="doctor-table-btn"
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                            onClick={() => {
                              setSelectedRequest(req);
                              setIsRejectModalOpen(true);
                            }}
                            title="Reject application"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="doctor-table-btn"
                          style={{ background: '#1e293b', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.12)' }}
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsInspectModalOpen(true);
                          }}
                        >
                          View Record
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Credentials & Decision Modal */}
      {isInspectModalOpen && selectedRequest && (
        <div className="doctor-modal-overlay" onClick={() => setIsInspectModalOpen(false)}>
          <div className="doctor-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="doctor-modal-header" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
              <div>
                <h3 className="doctor-modal-title">Verification Review: {selectedRequest.name}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
                  Application ID: {selectedRequest.id} • Submitted on {selectedRequest.appliedAt}
                </p>
              </div>
              <button type="button" className="doctor-modal-close-btn" onClick={() => setIsInspectModalOpen(false)}>
                &times;
              </button>
            </div>

            <div className="doctor-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem' }}>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Applicant Name</span>
                  <span className="admin-detail-val" style={{ fontWeight: 800, color: '#f8fafc' }}>{selectedRequest.name}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Role Type</span>
                  <span className="admin-detail-val" style={{ textTransform: 'capitalize', fontWeight: 700, color: '#38bdf8' }}>
                    {selectedRequest.type}
                  </span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Licensing Code / Reg Number</span>
                  <span className="admin-detail-val" style={{ fontWeight: 800, color: '#38bdf8' }}>{selectedRequest.licenseId}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">National ID / Business Reg</span>
                  <span className="admin-detail-val">{selectedRequest.nic}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Email Address</span>
                  <span className="admin-detail-val">{selectedRequest.email}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Phone Number</span>
                  <span className="admin-detail-val">{selectedRequest.phone}</span>
                </div>
              </div>

              {/* Document Certificate Preview Box */}
              <div style={{ marginTop: '16px', background: '#111a2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Uploaded Credential Document:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                      📄 {selectedRequest.documentName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '2px' }}>
                      {selectedRequest.documentType}
                    </div>
                  </div>
                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 700, fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px' }}>
                    Digitally Signed
                  </span>
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.84rem', color: '#cbd5e1' }}>
                  <strong style={{ color: '#ffffff' }}>Educational &amp; Clinical Background:</strong> {selectedRequest.degree}
                </div>
              </div>

              {selectedRequest.decisionNote && (
                <div style={{ marginTop: '14px', padding: '10px 14px', background: '#111a2e', borderRadius: '8px', borderLeft: '4px solid #0284c7', border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.85rem', color: '#ffffff' }}>
                  <strong style={{ color: '#38bdf8' }}>Review Notes:</strong> {selectedRequest.decisionNote}
                </div>
              )}
            </div>

            <div className="doctor-modal-footer">
              <button
                type="button"
                className="doctor-btn-cancel"
                onClick={() => setIsInspectModalOpen(false)}
              >
                Close
              </button>

              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="doctor-btn-defer"
                    style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => setIsRejectModalOpen(true)}
                  >
                    ✕ Reject Application
                  </button>
                  <button
                    type="button"
                    className="doctor-btn-submit"
                    style={{ background: '#059669' }}
                    onClick={() => handleApprove(selectedRequest)}
                  >
                    ✓ Verify &amp; Issue Official Badge
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Application Reason Modal */}
      {isRejectModalOpen && selectedRequest && (
        <div className="doctor-modal-overlay" onClick={() => setIsRejectModalOpen(false)}>
          <div className="doctor-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="doctor-modal-header" style={{ background: '#dc2626' }}>
              <div>
                <h3 className="doctor-modal-title">Reject Application</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)' }}>
                  Provide feedback to {selectedRequest.name}
                </p>
              </div>
              <button type="button" className="doctor-modal-close-btn" onClick={() => setIsRejectModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div className="doctor-modal-body">
                <div className="doctor-form-group">
                  <label className="doctor-form-label">Reason for Rejection / Required Action</label>
                  <textarea
                    className="doctor-form-textarea"
                    rows={4}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. SLMC registration card image is illegible or expired. Please re-apply with an updated certificate."
                  />
                </div>
              </div>

              <div className="doctor-modal-footer">
                <button
                  type="button"
                  className="doctor-btn-cancel"
                  onClick={() => setIsRejectModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="doctor-btn-submit danger"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
