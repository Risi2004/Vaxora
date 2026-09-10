import React, { useState, useMemo } from 'react';

export default function AdminCampaignsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // National Campaigns Dataset
  const [campaigns, setCampaigns] = useState([
    {
      id: 'CMP-2026-HPV',
      title: 'National School HPV Immunization Campaign 2026',
      vaccine: 'HPV (Human Papillomavirus)',
      targetCohort: 'Grade 6 - Grade 9 Students (Ages 11-14)',
      provinces: ['Western', 'Southern', 'Central'],
      startDate: '2026-09-01',
      endDate: '2026-10-31',
      targetDoses: 65000,
      administeredDoses: 28450,
      priority: 'HIGH',
      status: 'Active',
      participatingHospitalsCount: 14,
      publicAnnouncement:
        'Official Ministry of Health circular: Free HPV booster doses are now available across all school dental/health clinics and district hospitals.',
    },
    {
      id: 'CMP-2026-FLU',
      title: 'Senior Citizen Seasonal Influenza Booster Drive',
      vaccine: 'Influenza (Quadrivalent)',
      targetCohort: 'Adults Aged 60+ & High-Risk Cardiac Patients',
      provinces: ['Western', 'Northern', 'Eastern', 'North Western'],
      startDate: '2026-09-15',
      endDate: '2026-11-15',
      targetDoses: 80000,
      administeredDoses: 12150,
      priority: 'URGENT',
      status: 'Active',
      participatingHospitalsCount: 18,
      publicAnnouncement:
        'Senior citizens can walk in to any general hospital with their digital Vaxora QR code for expedited seasonal flu vaccination.',
    },
    {
      id: 'CMP-2026-MMR',
      title: 'Provincial Measles & Rubella Catch-Up Initiative',
      vaccine: 'MMR (Measles, Mumps, Rubella)',
      targetCohort: 'Infants & Toddlers (Ages 9 Months - 3 Years)',
      provinces: ['Western', 'Central'],
      startDate: '2026-10-01',
      endDate: '2026-12-15',
      targetDoses: 40000,
      administeredDoses: 2000,
      priority: 'NORMAL',
      status: 'Scheduled',
      participatingHospitalsCount: 12,
      publicAnnouncement: 'Maternal & Child Health clinics will open extended weekend slots for missed MMR infant immunizations.',
    },
    {
      id: 'CMP-2026-HEPB',
      title: 'National Healthcare Worker Hepatitis B Booster Round',
      vaccine: 'Hepatitis B (Recombinant)',
      targetCohort: 'Doctors, Nurses, Laboratory Technicians, & Ward Staff',
      provinces: ['All 9 Provinces'],
      startDate: '2026-07-01',
      endDate: '2026-08-31',
      targetDoses: 25000,
      administeredDoses: 24890,
      priority: 'HIGH',
      status: 'Completed',
      participatingHospitalsCount: 24,
      publicAnnouncement: 'Healthcare worker immunization target achieved with 99.5% completion rate.',
    },
  ]);

  // Form State for Creating New Campaign
  const [newCampaignForm, setNewCampaignForm] = useState({
    title: '',
    vaccine: 'Pfizer Bivalent mRNA',
    targetCohort: '',
    provinces: 'Western, Southern',
    startDate: '',
    endDate: '',
    targetDoses: 10000,
    priority: 'HIGH',
    publicAnnouncement: '',
  });

  // Broadcast Notice Form
  const [broadcastForm, setBroadcastForm] = useState({
    headline: '',
    targetAudience: 'ALL_CITIZENS',
    body: '',
    priority: 'High Alert',
  });

  // Filtered dataset
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((cmp) => {
      if (statusFilter !== 'ALL' && cmp.status.toUpperCase() !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          cmp.id.toLowerCase().includes(q) ||
          cmp.title.toLowerCase().includes(q) ||
          cmp.vaccine.toLowerCase().includes(q) ||
          cmp.targetCohort.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [campaigns, statusFilter, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === 'Active').length;
    const totalTarget = campaigns.reduce((acc, curr) => acc + curr.targetDoses, 0);
    const totalAdministered = campaigns.reduce((acc, curr) => acc + curr.administeredDoses, 0);
    const overallRate = Math.round((totalAdministered / (totalTarget || 1)) * 100);
    return { active, totalTarget, totalAdministered, overallRate };
  }, [campaigns]);

  // Handle Create Campaign
  const handleCreateCampaign = (e) => {
    e.preventDefault();
    if (!newCampaignForm.title.trim()) return;

    const newId = `CMP-2026-${newCampaignForm.vaccine.split(' ')[0].toUpperCase()}`;
    const newEntry = {
      id: newId,
      title: newCampaignForm.title,
      vaccine: newCampaignForm.vaccine,
      targetCohort: newCampaignForm.targetCohort || 'General Public',
      provinces: newCampaignForm.provinces.split(',').map((p) => p.trim()),
      startDate: newCampaignForm.startDate || '2026-09-15',
      endDate: newCampaignForm.endDate || '2026-11-30',
      targetDoses: Number(newCampaignForm.targetDoses) || 15000,
      administeredDoses: 0,
      priority: newCampaignForm.priority,
      status: 'Active',
      participatingHospitalsCount: 14,
      publicAnnouncement: newCampaignForm.publicAnnouncement || newCampaignForm.title,
    };

    setCampaigns([newEntry, ...campaigns]);
    setIsCreateModalOpen(false);
    showToast(`National Campaign "${newCampaignForm.title}" published & broadcasted successfully!`);
    setNewCampaignForm({
      title: '',
      vaccine: 'Pfizer Bivalent mRNA',
      targetCohort: '',
      provinces: 'Western, Southern',
      startDate: '',
      endDate: '',
      targetDoses: 10000,
      priority: 'HIGH',
      publicAnnouncement: '',
    });
  };

  // Handle Send Broadcast Alert
  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastForm.headline.trim()) return;

    setIsBroadcastModalOpen(false);
    showToast(`National Alert "${broadcastForm.headline}" pushed to all ${broadcastForm.targetAudience.replace('_', ' ')} portals.`);
    setBroadcastForm({
      headline: '',
      targetAudience: 'ALL_CITIZENS',
      body: '',
      priority: 'High Alert',
    });
  };

  // Toggle Campaign Status
  const handleToggleStatus = (id) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextSt = c.status === 'Active' ? 'Completed' : 'Active';
          showToast(`Campaign ${c.title} marked as ${nextSt}`);
          return { ...c, status: nextSt };
        }
        return c;
      })
    );
  };

  return (
    <div className="admin-tab-content">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="doctor-toast">
          <span style={{ fontSize: '1.1rem' }}>📢</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <section className="doctor-hero-banner" style={{ marginBottom: '24px' }}>
        <div className="doctor-hero-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className="admin-pill-badge blue">National Health Directives</span>
            <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600 }}>• Public Health Operations</span>
          </div>
          <h1 className="doctor-hero-title">National Campaigns &amp; Announcements</h1>
          <p className="doctor-hero-subtitle">
            Orchestrate nationwide public immunization drives, set demographic vaccination quotas, monitor provincial dose progress, and broadcast official health bulletins across patient and clinical portals.
          </p>
        </div>

        <div className="doctor-hero-meta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="doctor-hero-session-pill"
            style={{ cursor: 'pointer', background: '#0284c7', color: '#ffffff', border: '1px solid #38bdf8', fontWeight: 700 }}
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Create New Campaign
          </button>
          <button
            type="button"
            className="doctor-hero-session-pill"
            style={{ cursor: 'pointer', background: '#0f172a', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.15)', fontWeight: 700 }}
            onClick={() => setIsBroadcastModalOpen(true)}
          >
            📣 Broadcast Public Bulletin
          </button>
        </div>
      </section>

      {/* Metric Cards Ribbon */}
      <div className="doctor-stats-grid" style={{ marginBottom: '28px' }}>
        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8' }}>
            🎯
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Active National Drives</span>
            <div className="doctor-stat-value">{stats.active}</div>
            <span className="doctor-stat-meta" style={{ color: '#38bdf8' }}>
              Across 9 provinces
            </span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            👥
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Target Population</span>
            <div className="doctor-stat-value" style={{ color: '#ffffff' }}>
              {stats.totalTarget.toLocaleString()}
            </div>
            <span className="doctor-stat-meta" style={{ color: '#94a3b8' }}>
              Eligible citizens targeted
            </span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            💉
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Doses Administered</span>
            <div className="doctor-stat-value" style={{ color: '#34d399' }}>
              {stats.totalAdministered.toLocaleString()}
            </div>
            <span className="doctor-stat-meta" style={{ color: '#34d399' }}>
              {stats.overallRate}% overall coverage
            </span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            📢
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Portal Outreach</span>
            <div className="doctor-stat-value" style={{ color: '#fbbf24' }}>99.2%</div>
            <span className="doctor-stat-meta" style={{ color: '#94a3b8' }}>
              Broadcast delivery active
            </span>
          </div>
        </div>
      </div>

      {/* Main Campaigns Directory Card */}
      <div className="doctor-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="doctor-card-title" style={{ margin: 0 }}>Active &amp; Scheduled Campaigns</h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Managing {filteredCampaigns.length} government immunization drives
            </p>
          </div>

          {/* Quick Filter Tabs */}
          <div className="doctor-filter-pills">
            {['ALL', 'ACTIVE', 'SCHEDULED', 'COMPLETED'].map((st) => (
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {/* Search */}
          <div className="doctor-search-bar" style={{ margin: 0 }}>
            <span className="doctor-search-icon">🔍</span>
            <input
              type="text"
              className="doctor-search-input"
              placeholder="Search by campaign title, vaccine, target group..."
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
        </div>

        {/* Campaigns Table */}
        <div className="doctor-table-wrapper">
          <table className="doctor-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Campaign ID</th>
                <th>Campaign Details &amp; Target Demographic</th>
                <th style={{ width: '150px' }}>Vaccine</th>
                <th style={{ width: '170px' }}>Coverage Progress</th>
                <th style={{ width: '140px' }}>Active Period</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No vaccination campaigns match the current criteria.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((cmp) => {
                  const progressPct = Math.min(100, Math.round((cmp.administeredDoses / (cmp.targetDoses || 1)) * 100));
                  return (
                    <tr key={cmp.id}>
                      {/* ID */}
                      <td>
                        <span className="admin-id-pill" style={{ color: '#38bdf8' }}>
                          {cmp.id}
                        </span>
                        <div style={{ marginTop: '4px' }}>
                          <span
                            className="admin-pill-badge"
                            style={{
                              fontSize: '0.68rem',
                              background: cmp.priority === 'URGENT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                              color: cmp.priority === 'URGENT' ? '#f87171' : '#38bdf8',
                            }}
                          >
                            {cmp.priority} Priority
                          </span>
                        </div>
                      </td>

                      {/* Title & Target */}
                      <td>
                        <div
                          style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.92rem', cursor: 'pointer' }}
                          onClick={() => setSelectedCampaign(cmp)}
                        >
                          {cmp.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
                          🎯 Target: <span style={{ color: '#cbd5e1' }}>{cmp.targetCohort}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          🏥 {cmp.participatingHospitalsCount} Active Hospitals • {cmp.provinces.join(', ')}
                        </div>
                      </td>

                      {/* Vaccine */}
                      <td>
                        <span className="admin-pill-badge blue" style={{ fontSize: '0.75rem' }}>
                          {cmp.vaccine}
                        </span>
                      </td>

                      {/* Progress Bar */}
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: '#ffffff' }}>{cmp.administeredDoses.toLocaleString()}</span>
                          <span style={{ color: '#94a3b8' }}>/ {cmp.targetDoses.toLocaleString()}</span>
                        </div>
                        <div style={{ height: '6px', background: '#111a2e', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${progressPct}%`,
                              background: progressPct >= 80 ? '#10b981' : '#0284c7',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '3px', fontWeight: 600 }}>
                          {progressPct}% Quota Achieved
                        </div>
                      </td>

                      {/* Dates */}
                      <td>
                        <div style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: 600 }}>{cmp.startDate}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>to {cmp.endDate}</div>
                      </td>

                      {/* Status */}
                      <td>
                        {cmp.status === 'Active' && <span className="admin-pill-badge green">Active</span>}
                        {cmp.status === 'Scheduled' && <span className="admin-pill-badge amber">Scheduled</span>}
                        {cmp.status === 'Completed' && <span className="admin-pill-badge blue">Completed</span>}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="doctor-table-btn"
                            style={{ background: '#0284c7', color: '#ffffff', borderColor: '#38bdf8', fontSize: '0.8rem' }}
                            onClick={() => setSelectedCampaign(cmp)}
                          >
                            Inspect
                          </button>
                          <button
                            type="button"
                            className="doctor-table-btn"
                            style={{
                              background: cmp.status === 'Active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: cmp.status === 'Active' ? '#f87171' : '#34d399',
                              borderColor: cmp.status === 'Active' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                              fontSize: '0.8rem',
                            }}
                            onClick={() => handleToggleStatus(cmp.id)}
                            title={cmp.status === 'Active' ? 'Mark Campaign Completed' : 'Reactivate Campaign'}
                          >
                            {cmp.status === 'Active' ? 'End' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Campaign Modal */}
      {isCreateModalOpen && (
        <div className="doctor-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="doctor-modal-card"
            style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontFamily: 'var(--font-heading, "Outfit", sans-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎯</span> Launch National Immunization Campaign
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Define target demographic cohort, allocate vaccine quota, and broadcast to participating hospitals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign}>
              <div style={{ marginBottom: '16px' }}>
                <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Campaign Title</label>
                <input
                  type="text"
                  className="doctor-form-input"
                  placeholder="E.g. National School HPV Immunization Campaign 2026"
                  value={newCampaignForm.title}
                  onChange={(e) => setNewCampaignForm({ ...newCampaignForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Target Vaccine</label>
                  <select
                    className="doctor-form-select"
                    value={newCampaignForm.vaccine}
                    onChange={(e) => setNewCampaignForm({ ...newCampaignForm, vaccine: e.target.value })}
                  >
                    <option value="HPV (Human Papillomavirus)">HPV (Human Papillomavirus)</option>
                    <option value="Pfizer Bivalent mRNA">Pfizer Bivalent mRNA</option>
                    <option value="Influenza (Quadrivalent)">Influenza (Quadrivalent)</option>
                    <option value="MMR (Measles, Mumps, Rubella)">MMR (Measles, Mumps, Rubella)</option>
                    <option value="Hepatitis B (Recombinant)">Hepatitis B (Recombinant)</option>
                  </select>
                </div>

                <div>
                  <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Priority Level</label>
                  <select
                    className="doctor-form-select"
                    value={newCampaignForm.priority}
                    onChange={(e) => setNewCampaignForm({ ...newCampaignForm, priority: e.target.value })}
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent National Priority</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Target Demographic Cohort</label>
                <input
                  type="text"
                  className="doctor-form-input"
                  placeholder="E.g. Grade 6-9 Students (Ages 11-14), Adults 60+..."
                  value={newCampaignForm.targetCohort}
                  onChange={(e) => setNewCampaignForm({ ...newCampaignForm, targetCohort: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Target Doses</label>
                  <input
                    type="number"
                    className="doctor-form-input"
                    value={newCampaignForm.targetDoses}
                    onChange={(e) => setNewCampaignForm({ ...newCampaignForm, targetDoses: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Start Date</label>
                  <input
                    type="date"
                    className="doctor-form-input"
                    value={newCampaignForm.startDate}
                    onChange={(e) => setNewCampaignForm({ ...newCampaignForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>End Date</label>
                  <input
                    type="date"
                    className="doctor-form-input"
                    value={newCampaignForm.endDate}
                    onChange={(e) => setNewCampaignForm({ ...newCampaignForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Public Announcement Message (Delivered to Citizens)</label>
                <textarea
                  className="doctor-form-textarea"
                  rows="3"
                  placeholder="Write official announcement banner text shown on Patient & Doctor portals..."
                  value={newCampaignForm.publicAnnouncement}
                  onChange={(e) => setNewCampaignForm({ ...newCampaignForm, publicAnnouncement: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                <button type="button" className="doctor-btn-cancel" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="doctor-hero-session-pill"
                  style={{ cursor: 'pointer', background: '#0284c7', color: '#ffffff', border: '1px solid #38bdf8', fontWeight: 700, padding: '8px 20px' }}
                >
                  Publish Campaign Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Notice Modal */}
      {isBroadcastModalOpen && (
        <div className="doctor-modal-overlay" onClick={() => setIsBroadcastModalOpen(false)}>
          <div
            className="doctor-modal-card"
            style={{ maxWidth: '600px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontFamily: 'var(--font-heading, "Outfit", sans-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📣</span> Broadcast National Health Bulletin
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Push an instant advisory banner to Citizen, Doctor, Nurse, and Hospital portals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendBroadcast}>
              <div style={{ marginBottom: '14px' }}>
                <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Bulletin Headline</label>
                <input
                  type="text"
                  className="doctor-form-input"
                  placeholder="E.g. Ministry Health Advisory: Extended Clinic Hours in Colombo District"
                  value={broadcastForm.headline}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, headline: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Target Audience</label>
                  <select
                    className="doctor-form-select"
                    value={broadcastForm.targetAudience}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, targetAudience: e.target.value })}
                  >
                    <option value="ALL_CITIZENS">All Citizens &amp; Patients</option>
                    <option value="ALL_DOCTORS_NURSES">Doctors &amp; Nurses Only</option>
                    <option value="HOSPITALS_ONLY">Hospital Administrators</option>
                    <option value="ENTIRE_NETWORK">Entire National Network</option>
                  </select>
                </div>

                <div>
                  <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Notice Severity</label>
                  <select
                    className="doctor-form-select"
                    value={broadcastForm.priority}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
                  >
                    <option value="Information">Normal Information (Blue)</option>
                    <option value="High Alert">High Health Advisory (Amber)</option>
                    <option value="Emergency Alert">National Emergency Notice (Red)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff' }}>Announcement Body Details</label>
                <textarea
                  className="doctor-form-textarea"
                  rows="4"
                  placeholder="Enter full advisory instructions, dates, and clinic locations..."
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                <button type="button" className="doctor-btn-cancel" onClick={() => setIsBroadcastModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="doctor-hero-session-pill"
                  style={{ cursor: 'pointer', background: '#0284c7', color: '#ffffff', border: '1px solid #38bdf8', fontWeight: 700, padding: '8px 20px' }}
                >
                  🚀 Dispatch Broadcast Bulletin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Campaign Modal */}
      {selectedCampaign && (
        <div className="doctor-modal-overlay" onClick={() => setSelectedCampaign(null)}>
          <div
            className="doctor-modal-card"
            style={{ maxWidth: '680px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="admin-id-pill">{selectedCampaign.id}</span>
                  <span className="admin-pill-badge blue">{selectedCampaign.priority} Priority</span>
                  <span className="admin-pill-badge green">{selectedCampaign.status}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontFamily: 'var(--font-heading, "Outfit", sans-serif)' }}>
                  {selectedCampaign.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#111a2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.86rem' }}>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Target Vaccine</span>
                  <span className="admin-detail-val" style={{ color: '#38bdf8', fontWeight: 700 }}>{selectedCampaign.vaccine}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Target Demographic</span>
                  <span className="admin-detail-val" style={{ color: '#ffffff' }}>{selectedCampaign.targetCohort}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Active Period</span>
                  <span className="admin-detail-val">{selectedCampaign.startDate} to {selectedCampaign.endDate}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Participating Hospitals</span>
                  <span className="admin-detail-val">{selectedCampaign.participatingHospitalsCount} Accredited Centers</span>
                </div>
              </div>

              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Official Public Announcement Text:
                </span>
                <div style={{ background: '#090e1a', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '12px', color: '#f8fafc', fontSize: '0.88rem', marginTop: '6px' }}>
                  "{selectedCampaign.publicAnnouncement}"
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
              <button
                type="button"
                className="doctor-btn-cancel"
                onClick={() => setSelectedCampaign(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
