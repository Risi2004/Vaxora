import React, { useState, useMemo } from 'react';

export default function AdminFeedbackTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');

  // Selected feedback for inspection & reply modal
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminInternalNotes, setAdminInternalNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState('In Review');
  const [toastMessage, setToastMessage] = useState(null);

  // Initial Comprehensive Feedback Dataset
  const [feedbacks, setFeedbacks] = useState([
    {
      id: 'FB-9021',
      date: '2026-09-09 14:32',
      userName: 'Amal Perera',
      userRole: 'Patient',
      userEmail: 'amal.p@gmail.com',
      userPhone: '+94 77 123 4567',
      hospital: 'National Hospital of Sri Lanka, Colombo',
      category: 'Vaccination Service',
      subject: 'Extremely efficient booster vaccination experience',
      rating: 5,
      status: 'Resolved',
      message:
        'I received my HPV booster at the Colombo National clinic today. The digital QR check-in on Vaxora was instantaneous, and Nurse Chamari handled the procedure with great care. No waiting time at all!',
      adminResponse:
        'Thank you for your valuable feedback Amal! We have forwarded your appreciation to the NHSL immunization team.',
      repliedAt: '2026-09-09 16:10',
      internalNotes: 'Positive review sent to Regional MOH directorate.',
    },
    {
      id: 'FB-9020',
      date: '2026-09-09 11:15',
      userName: 'Dr. Priyantha Jayasuriya',
      userRole: 'Doctor',
      userEmail: 'p.jayasuriya@nhsl.health.gov.lk',
      userPhone: '+94 71 889 2233',
      hospital: 'Colombo South Teaching Hospital (Kalubowila)',
      category: 'System / Bug',
      subject: 'Batch lot QR scanner latency on mobile safari',
      rating: 3,
      status: 'New',
      message:
        'When scanning Pfizer BNT-162b2 2D barcodes on iPad Safari during peak clinic hours, the camera feed takes 4-5 seconds to decode. Requesting WebAssembly camera engine optimization in the next portal patch.',
      adminResponse: null,
      repliedAt: null,
      internalNotes: 'Forwarded to frontend engineering sprint for BarcodeDetector Web API upgrade.',
    },
    {
      id: 'FB-9019',
      date: '2026-09-08 17:40',
      userName: 'Sanduni De Silva, RN',
      userRole: 'Nurse',
      userEmail: 'sanduni.nurse@kandygen.lk',
      userPhone: '+94 76 554 1122',
      hospital: 'Kandy General Hospital',
      category: 'Vaccine Adverse Event',
      subject: 'Rapid AEFI telemetry submission query',
      rating: 4,
      status: 'In Review',
      message:
        'The newly introduced 1-click AEFI report modal in the Nurse portal is fantastic. Could we also have an automated SMS alert dispatched to the supervising Pediatrician whenever Grade 2 fever is flagged?',
      adminResponse: null,
      repliedAt: null,
      internalNotes: 'Reviewing SMS gateway quota with Dialog Axiata enterprise contract.',
    },
    {
      id: 'FB-9018',
      date: '2026-09-08 10:05',
      userName: 'Sri Jayewardenepura Admin Office',
      userRole: 'Hospital',
      userEmail: 'immunize@sjp-hospital.lk',
      userPhone: '+94 11 277 8610',
      hospital: 'Sri Jayewardenepura General Hospital',
      category: 'Facility Supply',
      subject: 'Urgent need for additional MMR cold-chain buffer stock',
      rating: 3,
      status: 'Escalated',
      message:
        'Due to an upcoming provincial school immunization drive, our MMR stock is projected to deplete within 4 days. We requested 600 doses via the allocation tab yesterday.',
      adminResponse: null,
      repliedAt: null,
      internalNotes: 'Escalated to Central Vaccine Depot (MRI Colombo) for emergency dispatch.',
    },
    {
      id: 'FB-9017',
      date: '2026-09-07 15:20',
      userName: 'Fathima Rizna',
      userRole: 'Patient',
      userEmail: 'f.rizna92@yahoo.com',
      userPhone: '+94 77 445 9988',
      hospital: 'Negombo District General Hospital',
      category: 'Scheduling / Booking',
      subject: 'Rescheduling feature was super smooth',
      rating: 5,
      status: 'Resolved',
      message:
        'I had to reschedule my daughter’s MMR second dose due to fever. The calendar picked up available morning slots immediately without re-entering demographic details.',
      adminResponse:
        'We are thrilled to hear that the digital booking experience helped your family, Fathima. Wishing your daughter a speedy recovery!',
      repliedAt: '2026-09-07 16:45',
      internalNotes: 'Standard satisfaction response provided.',
    },
    {
      id: 'FB-9016',
      date: '2026-09-06 09:50',
      userName: 'Dr. Anura Bandara',
      userRole: 'Doctor',
      userEmail: 'anura.b@gallemch.lk',
      userPhone: '+94 70 334 7711',
      hospital: 'Karapitiya Teaching Hospital, Galle',
      category: 'Vaccination Service',
      subject: 'Request for custom lot-expiry alert thresholds',
      rating: 4,
      status: 'Resolved',
      message:
        'Can admins allow clinic heads to customize the expiry warning threshold from 30 days to 60 days for rare travel vaccines (e.g. Yellow Fever)?',
      adminResponse:
        'Thank you Dr. Bandara. Threshold customizer will be shipped in the upcoming Q4 institutional settings update.',
      repliedAt: '2026-09-06 14:12',
      internalNotes: 'Feature ticket #VAX-1188 filed.',
    },
    {
      id: 'FB-9015',
      date: '2026-09-05 13:10',
      userName: 'Kasun Wickramasinghe',
      userRole: 'Patient',
      userEmail: 'kasun.w@outlook.com',
      userPhone: '+94 71 229 0044',
      hospital: 'Kurunegala Teaching Hospital',
      category: 'System / Bug',
      subject: 'Vaccination certificate PDF download formatting on Android',
      rating: 2,
      status: 'In Review',
      message:
        'When downloading the official digital immunization card PDF onto my Samsung phone, the MOH crest was slightly cut off on the top margin.',
      adminResponse: null,
      repliedAt: null,
      internalNotes: 'CSS print media viewport padding adjustment in progress.',
    },
  ]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered dataset
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      // Role filter
      if (roleFilter !== 'ALL' && item.userRole.toUpperCase() !== roleFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && item.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      // Rating filter
      if (ratingFilter !== 'ALL') {
        if (ratingFilter === '5' && item.rating !== 5) return false;
        if (ratingFilter === '4' && item.rating !== 4) return false;
        if (ratingFilter === '3' && item.rating !== 3) return false;
        if (ratingFilter === 'LOW' && item.rating > 2) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.id.toLowerCase().includes(q) ||
          item.userName.toLowerCase().includes(q) ||
          item.userEmail.toLowerCase().includes(q) ||
          item.hospital.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [feedbacks, roleFilter, statusFilter, categoryFilter, ratingFilter, searchQuery]);

  // Key KPI stats
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const resolved = feedbacks.filter((f) => f.status === 'Resolved').length;
    const pending = feedbacks.filter((f) => f.status === 'New' || f.status === 'In Review').length;
    const escalated = feedbacks.filter((f) => f.status === 'Escalated').length;
    const avgRating = (
      feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / (total || 1)
    ).toFixed(1);

    return { total, resolved, pending, escalated, avgRating };
  }, [feedbacks]);

  // Open modal
  const handleOpenReviewModal = (feedback) => {
    setSelectedFeedback(feedback);
    setAdminReplyText(feedback.adminResponse || '');
    setAdminInternalNotes(feedback.internalNotes || '');
    setResolutionStatus(feedback.status);
  };

  // Quick reply snippet
  const handleApplyTemplate = (template) => {
    setAdminReplyText(template);
  };

  // Submit admin response
  const handleSaveResolution = (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    setFeedbacks((prev) =>
      prev.map((f) => {
        if (f.id === selectedFeedback.id) {
          return {
            ...f,
            status: resolutionStatus,
            adminResponse: adminReplyText.trim() || f.adminResponse,
            repliedAt: adminReplyText.trim() ? nowStr : f.repliedAt,
            internalNotes: adminInternalNotes.trim(),
          };
        }
        return f;
      })
    );

    showToast(`Feedback ${selectedFeedback.id} successfully updated to "${resolutionStatus}"`);
    setSelectedFeedback(null);
  };

  // Quick Resolve trigger from table
  const handleQuickResolve = (id) => {
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'Resolved' } : f))
    );
    showToast(`Ticket ${id} marked as Resolved.`);
  };

  // Render Star Icons
  const renderStars = (rating) => {
    return (
      <div style={{ display: 'inline-flex', gap: '2px', color: '#fbbf24', fontSize: '0.9rem' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>{star <= rating ? '★' : '☆'}</span>
        ))}
      </div>
    );
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return (
          <span className="admin-status-badge-new">
            <span className="admin-status-dot-blue" />
            New
          </span>
        );
      case 'In Review':
        return (
          <span className="admin-pill-badge amber">
            In Review
          </span>
        );
      case 'Resolved':
        return (
          <span className="admin-pill-badge green">
            Resolved
          </span>
        );
      case 'Escalated':
        return (
          <span className="admin-pill-badge" style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            Escalated
          </span>
        );
      default:
        return <span className="admin-pill-badge blue">{status}</span>;
    }
  };

  return (
    <div className="admin-tab-content">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="doctor-toast">
          <span style={{ fontSize: '1.1rem' }}>🛡️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Hero Banner */}
      <section className="doctor-hero-banner" style={{ marginBottom: '24px' }}>
        <div className="doctor-hero-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className="admin-pill-badge blue">National Feedback Inbox</span>
            <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600 }}>• Real-time Grievance Stream</span>
          </div>
          <h1 className="doctor-hero-title">Incoming Feedback & Inquiries</h1>
          <p className="doctor-hero-subtitle">
            Central repository of user experiences, clinical issue reports, and system inquiries submitted by Patients, Doctors, Nurses, and Healthcare Facilities across Sri Lanka.
          </p>
        </div>

        <div className="doctor-hero-meta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="doctor-hero-session-pill"
            style={{ cursor: 'pointer', background: '#0284c7', color: '#ffffff', border: '1px solid #38bdf8', fontWeight: 700 }}
            onClick={() => showToast('Exporting comprehensive Feedback Audit Report (.CSV)...')}
          >
            📥 Export CSV Report
          </button>
        </div>
      </section>

      {/* Metric Cards Bar */}
      <div className="doctor-stats-grid" style={{ marginBottom: '28px' }}>
        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8' }}>
            💬
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Total Received</span>
            <div className="doctor-stat-value">{stats.total}</div>
            <span className="doctor-stat-meta" style={{ color: '#38bdf8' }}>
              All stakeholder tiers
            </span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            ⭐
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Average Rating</span>
            <div className="doctor-stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              {stats.avgRating} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/ 5.0</span>
            </div>
            <span className="doctor-stat-meta" style={{ color: '#fbbf24' }}>
              {renderStars(Math.round(stats.avgRating))}
            </span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            ⏳
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Pending Review</span>
            <div className="doctor-stat-value" style={{ color: '#38bdf8' }}>{stats.pending}</div>
            <span className="doctor-stat-meta" style={{ color: '#94a3b8' }}>
              Requires admin reply
            </span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            ✅
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Resolved Tickets</span>
            <div className="doctor-stat-value" style={{ color: '#34d399' }}>{stats.resolved}</div>
            <span className="doctor-stat-meta" style={{ color: '#34d399' }}>
              {Math.round((stats.resolved / (stats.total || 1)) * 100)}% resolution rate
            </span>
          </div>
        </div>
      </div>

      {/* Main Feedback Directory Card */}
      <div className="doctor-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="doctor-card-title" style={{ margin: 0 }}>Incoming Feedback Stream</h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Showing {filteredFeedbacks.length} of {feedbacks.length} total submissions
            </p>
          </div>

          {/* Quick Status Filter Tabs */}
          <div className="doctor-filter-pills">
            {['ALL', 'NEW', 'IN REVIEW', 'RESOLVED', 'ESCALATED'].map((st) => (
              <button
                key={st}
                type="button"
                className={`doctor-filter-btn ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {/* Search */}
          <div className="doctor-search-bar" style={{ margin: 0 }}>
            <span className="doctor-search-icon">🔍</span>
            <input
              type="text"
              className="doctor-search-input"
              placeholder="Search by ticket ID, user, hospital, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 8px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter */}
          <select
            className="doctor-form-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ height: '42px', fontSize: '0.85rem' }}
          >
            <option value="ALL">👤 All Stakeholder Roles</option>
            <option value="PATIENT">Patient</option>
            <option value="DOCTOR">Doctor</option>
            <option value="NURSE">Nurse</option>
            <option value="HOSPITAL">Hospital / Facility</option>
          </select>

          {/* Category Filter */}
          <select
            className="doctor-form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ height: '42px', fontSize: '0.85rem' }}
          >
            <option value="ALL">📂 All Categories</option>
            <option value="Vaccination Service">Vaccination Service</option>
            <option value="System / Bug">System / Bug</option>
            <option value="Vaccine Adverse Event">Vaccine Adverse Event</option>
            <option value="Facility Supply">Facility Supply</option>
            <option value="Scheduling / Booking">Scheduling / Booking</option>
          </select>

          {/* Rating Filter */}
          <select
            className="doctor-form-select"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{ height: '42px', fontSize: '0.85rem' }}
          >
            <option value="ALL">⭐ All Ratings</option>
            <option value="5">5 Stars (Excellent)</option>
            <option value="4">4 Stars (Good)</option>
            <option value="3">3 Stars (Neutral)</option>
            <option value="LOW">1 - 2 Stars (Needs Attention)</option>
          </select>
        </div>

        {/* Feedback Table */}
        {filteredFeedbacks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
            <h3 style={{ color: '#ffffff', margin: '0 0 6px' }}>No Feedback Found</h3>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>
              No feedback submissions match the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="doctor-table-container">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Ticket</th>
                  <th style={{ width: '180px' }}>Submitter</th>
                  <th style={{ width: '220px' }}>Hospital / Location</th>
                  <th>Feedback Details</th>
                  <th style={{ width: '100px' }}>Rating</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.map((item) => (
                  <tr key={item.id}>
                    {/* Ticket & Date */}
                    <td>
                      <div className="admin-id-pill" style={{ display: 'inline-block', marginBottom: '4px' }}>
                        {item.id}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {item.date}
                      </div>
                    </td>

                    {/* Submitter */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>
                        {item.userName}
                      </div>
                      <div style={{ marginTop: '3px' }}>
                        <span className={`admin-role-badge ${item.userRole.toLowerCase()}`}>
                          {item.userRole}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                        {item.userEmail}
                      </div>
                    </td>

                    {/* Hospital */}
                    <td>
                      <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600 }}>
                        {item.hospital}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span className="admin-pill-badge blue" style={{ fontSize: '0.7rem' }}>
                          {item.category}
                        </span>
                      </div>
                    </td>

                    {/* Subject & Snippet */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.88rem', marginBottom: '3px' }}>
                        {item.subject}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.message}
                      </div>
                      {item.adminResponse && (
                        <div style={{ marginTop: '5px', fontSize: '0.73rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>↩️ Replied on {item.repliedAt}</span>
                        </div>
                      )}
                    </td>

                    {/* Rating */}
                    <td>
                      {renderStars(item.rating)}
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        {item.rating} / 5
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="doctor-table-btn"
                          style={{ background: '#0284c7', color: '#ffffff', borderColor: '#38bdf8' }}
                          onClick={() => handleOpenReviewModal(item)}
                          title="Review feedback and send reply"
                        >
                          Review & Reply
                        </button>
                        {item.status !== 'Resolved' && (
                          <button
                            type="button"
                            className="doctor-table-btn"
                            style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                            onClick={() => handleQuickResolve(item.id)}
                            title="Quick mark as resolved"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Reply Modal */}
      {selectedFeedback && (
        <div className="doctor-modal-overlay" onClick={() => setSelectedFeedback(null)}>
          <div
            className="doctor-modal-card"
            style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="admin-id-pill">{selectedFeedback.id}</span>
                  <span className={`admin-role-badge ${selectedFeedback.userRole.toLowerCase()}`}>
                    {selectedFeedback.userRole}
                  </span>
                  <span className="admin-pill-badge blue">{selectedFeedback.category}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontFamily: 'var(--font-heading, "Outfit", sans-serif)' }}>
                  {selectedFeedback.subject}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Submitter & Context Card */}
            <div style={{ background: '#111a2e', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Submitter</div>
                  <div style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>{selectedFeedback.userName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{selectedFeedback.userEmail}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedFeedback.userPhone}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Facility / Clinic</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginTop: '2px' }}>{selectedFeedback.hospital}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Submitted on {selectedFeedback.date}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>User Rating</div>
                  <div style={{ marginTop: '2px' }}>{renderStars(selectedFeedback.rating)}</div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginTop: '2px' }}>
                    {selectedFeedback.rating} out of 5 Stars
                  </div>
                </div>
              </div>

              {/* Feedback Content Box */}
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                  Submitted Feedback / Grievance Message
                </div>
                <div style={{ background: '#0a0e1a', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '14px', color: '#f8fafc', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  "{selectedFeedback.message}"
                </div>
              </div>
            </div>

            {/* Admin Response & Action Form */}
            <form onSubmit={handleSaveResolution}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="doctor-form-label" style={{ margin: 0, fontWeight: 700, color: '#ffffff' }}>
                    Official Admin Reply to Submitter
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                    Will be delivered to {selectedFeedback.userName}'s notifications & email
                  </span>
                </div>

                {/* Quick Reply Snippet Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <button
                    type="button"
                    className="admin-doc-link-btn"
                    style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px' }}
                    onClick={() =>
                      handleApplyTemplate(
                        `Dear ${selectedFeedback.userName},\n\nThank you for reaching out to the National Vaxora Administration. We have reviewed your inquiry regarding ${selectedFeedback.hospital} and our technical/clinical operations team is actively addressing it.\n\nBest regards,\nNational Immunization IT Directorate`
                      )
                    }
                  >
                    + Standard Acknowledgment
                  </button>
                  <button
                    type="button"
                    className="admin-doc-link-btn"
                    style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px' }}
                    onClick={() =>
                      handleApplyTemplate(
                        `Dear ${selectedFeedback.userName},\n\nWe are pleased to inform you that your reported issue has been verified and fully resolved in our latest system update.\n\nThank you for supporting digital healthcare,\nVaxora Admin Team`
                      )
                    }
                  >
                    + Issue Resolved Notice
                  </button>
                  <button
                    type="button"
                    className="admin-doc-link-btn"
                    style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px' }}
                    onClick={() =>
                      handleApplyTemplate(
                        `Dear ${selectedFeedback.userName},\n\nThank you for the kind compliments on the vaccination drive at ${selectedFeedback.hospital}. Your appreciation has been conveyed to the nursing and medical staff.\n\nWarm regards,\nVaxora National Operations`
                      )
                    }
                  >
                    + Appreciation Response
                  </button>
                </div>

                <textarea
                  className="doctor-form-textarea"
                  rows="4"
                  placeholder="Type official response to submitter..."
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Status Selector & Internal Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>
                    Update Status
                  </label>
                  <select
                    className="doctor-form-select"
                    value={resolutionStatus}
                    onChange={(e) => setResolutionStatus(e.target.value)}
                  >
                    <option value="New">New / Unread</option>
                    <option value="In Review">In Review</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Escalated">Escalated to Ministry</option>
                  </select>
                </div>

                <div>
                  <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>
                    Internal Admin Notes (Private)
                  </label>
                  <input
                    type="text"
                    className="doctor-form-input"
                    placeholder="E.g. Escalated to developer sprint, forwarded to MOH..."
                    value={adminInternalNotes}
                    onChange={(e) => setAdminInternalNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="doctor-btn-cancel"
                  onClick={() => setSelectedFeedback(null)}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="doctor-hero-session-pill"
                  style={{ cursor: 'pointer', background: '#0284c7', color: '#ffffff', border: '1px solid #38bdf8', fontWeight: 700, padding: '8px 20px' }}
                >
                  Save & Update Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
