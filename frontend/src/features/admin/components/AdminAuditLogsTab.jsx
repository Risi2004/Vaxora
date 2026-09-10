import React, { useState, useMemo } from 'react';

export default function AdminAuditLogsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Comprehensive System Audit Event Dataset
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'AUD-9401',
      timestamp: '2026-09-10 08:14:22',
      actor: 'Dr. V. Ratnayake',
      actorRole: 'Superadministrator',
      category: 'USER_VERIFICATION',
      action: 'APPROVE_DOCTOR_LICENSE',
      description: 'Approved credentials for Dr. Kasun Abeysekera (SLMC-42091) and issued digital credential token.',
      targetResource: 'USR-101 (Dr. Kasun Abeysekera)',
      ipAddress: '192.248.32.14',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/128.0.0.0',
      severity: 'SUCCESS',
      status: 'VERIFIED',
      integrityHash: '8f4b23c91e704a919028e3b1c67d8f5a2b09c118',
      payload: {
        licenseType: 'SLMC - Medical Practitioner',
        licenseId: 'SLMC-42091',
        facility: 'Lanka Hospital Colombo',
        approvedByUid: 'ADM-001',
        verificationMethod: 'Automated SLMC API cross-check + Manual Document Review',
      },
    },
    {
      id: 'AUD-9400',
      timestamp: '2026-09-10 07:50:11',
      actor: 'Dr. V. Ratnayake',
      actorRole: 'Superadministrator',
      category: 'SECURITY_AUTH',
      action: 'PASSWORD_ROTATION',
      description: 'Superadmin account password updated with SHA-512 salting and active session re-authentication.',
      targetResource: 'ADM-001 (Superadministrator)',
      ipAddress: '192.248.32.14',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/128.0.0.0',
      severity: 'INFO',
      status: 'VERIFIED',
      integrityHash: '4a1b98d23e5510c48731f8902a7b6c5d4e3f21a0',
      payload: {
        actionType: 'Master Password Update',
        authFactorEnforced: '2FA Hardware OTP (+94 •••• 4033)',
        activeSessionsTerminated: 2,
      },
    },
    {
      id: 'AUD-9399',
      timestamp: '2026-09-09 18:32:05',
      actor: 'Dr. V. Ratnayake',
      actorRole: 'Superadministrator',
      category: 'VACCINE_ALLOCATION',
      action: 'DISPATCH_MMR_BUFFER',
      description: 'Emergency allocation of 600 MMR vials dispatched from Central Vaccine Depot to Sri Jayewardenepura General Hospital.',
      targetResource: 'HOSP-003 (Sri Jayewardenepura Hospital)',
      ipAddress: '192.248.32.14',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/128.0.0.0',
      severity: 'SUCCESS',
      status: 'VERIFIED',
      integrityHash: '9c7e11f42a6b8801d953c4b2a8e710f65d3a9812',
      payload: {
        vaccineName: 'MMR (Measles, Mumps, Rubella)',
        batchLot: 'MMR-2026-08B',
        quantityDoses: 600,
        sourceDepot: 'Central Cold Chain Depot (MRI Colombo)',
        temperatureLock: '+4.0°C Verified',
      },
    },
    {
      id: 'AUD-9398',
      timestamp: '2026-09-09 15:10:44',
      actor: 'Dr. V. Ratnayake',
      actorRole: 'Superadministrator',
      category: 'FEEDBACK_RESOLUTION',
      action: 'RESOLVE_GRIEVANCE',
      description: 'Admin response delivered to patient Amal Perera regarding HPV booster clinic check-in.',
      targetResource: 'FB-9021 (Amal Perera)',
      ipAddress: '192.248.32.14',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/128.0.0.0',
      severity: 'SUCCESS',
      status: 'VERIFIED',
      integrityHash: '3b8f1092a7e44c519280d4f6a1b78c9e5d2a0134',
      payload: {
        ticketId: 'FB-9021',
        newStatus: 'Resolved',
        replyDeliveredToEmail: 'amal.p@gmail.com',
      },
    },
    {
      id: 'AUD-9397',
      timestamp: '2026-09-09 11:20:18',
      actor: 'Dr. V. Ratnayake',
      actorRole: 'Superadministrator',
      category: 'ACCOUNT_MODERATION',
      action: 'SUSPEND_PRACTITIONER',
      description: 'Account USR-109 (Dr. Rohan Jayawardena) placed under temporary clinical review suspension.',
      targetResource: 'USR-109 (Dr. Rohan Jayawardena)',
      ipAddress: '192.248.32.14',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/128.0.0.0',
      severity: 'CRITICAL',
      status: 'VERIFIED',
      integrityHash: '7e2a9018f3c44b551982d6b1a0e78c4f9d1a3345',
      payload: {
        previousStatus: 'Active',
        updatedStatus: 'Suspended',
        reason: 'Pending SLMC annual license renewal documentation submission',
      },
    },
    {
      id: 'AUD-9396',
      timestamp: '2026-09-08 14:05:30',
      actor: 'System Daemon (Cron)',
      actorRole: 'Automated Service',
      category: 'COLD_CHAIN_MONITOR',
      action: 'TELEMETRY_SCAN_OPTIMAL',
      description: 'Hourly national automated IoT temperature sensor sweep across 14 hospital vaults. 100% within safe range.',
      targetResource: 'National Cold Chain Grid (14 Nodes)',
      ipAddress: '10.0.0.1 (Internal Mesh)',
      userAgent: 'Vaxora-IoT-Telemetry-Daemon/3.4',
      severity: 'INFO',
      status: 'VERIFIED',
      integrityHash: '1f8b72e90a6c33148902e4d5a7b81c9f6d4a2211',
      payload: {
        nodesScanned: 14,
        averageTemp: '3.8°C',
        minTemp: '-78.2°C (Pfizer Vault, NHSL)',
        maxTemp: '+4.3°C (Kandy General)',
        anomaliesDetected: 0,
      },
    },
    {
      id: 'AUD-9395',
      timestamp: '2026-09-08 09:15:00',
      actor: 'Dr. V. Ratnayake',
      actorRole: 'Superadministrator',
      category: 'CAMPAIGN_BROADCAST',
      action: 'PUBLISH_CAMPAIGN',
      description: 'Broadcast published for National School HPV Immunization Campaign across Western & Southern provinces.',
      targetResource: 'CMP-2026-HPV (National HPV Drive)',
      ipAddress: '192.248.32.14',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/128.0.0.0',
      severity: 'SUCCESS',
      status: 'VERIFIED',
      integrityHash: '5e3a8901b2c44f771980d9a6f1b88c4e7d2a9012',
      payload: {
        campaignTitle: 'National School HPV Immunization Campaign 2026',
        targetCohort: 'Grade 6 - Grade 9 Students',
        targetProvinces: ['Western', 'Southern'],
        channels: ['Patient Dashboard Bulletin', 'SMS Gateway'],
      },
    },
  ]);

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Category filter
      if (categoryFilter !== 'ALL' && log.category !== categoryFilter) {
        return false;
      }
      // Severity filter
      if (severityFilter !== 'ALL' && log.severity !== severityFilter) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          log.id.toLowerCase().includes(q) ||
          log.actor.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q) ||
          log.targetResource.toLowerCase().includes(q) ||
          log.ipAddress.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [auditLogs, categoryFilter, severityFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const security = auditLogs.filter((l) => l.category === 'SECURITY_AUTH').length;
    const allocations = auditLogs.filter((l) => l.category === 'VACCINE_ALLOCATION').length;
    const critical = auditLogs.filter((l) => l.severity === 'CRITICAL').length;
    return { total, security, allocations, critical };
  }, [auditLogs]);

  // Render Severity Badge
  const renderSeverityBadge = (sev) => {
    switch (sev) {
      case 'SUCCESS':
        return <span className="admin-pill-badge green">Success</span>;
      case 'INFO':
        return <span className="admin-pill-badge blue">Info</span>;
      case 'WARNING':
        return <span className="admin-pill-badge amber">Warning</span>;
      case 'CRITICAL':
        return (
          <span
            className="admin-pill-badge"
            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}
          >
            Critical Action
          </span>
        );
      default:
        return <span className="admin-pill-badge blue">{sev}</span>;
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

      {/* Hero Header */}
      <section className="doctor-hero-banner" style={{ marginBottom: '24px' }}>
        <div className="doctor-hero-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className="admin-pill-badge blue">Security &amp; Governance</span>
            <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600 }}>• Immutable SHA-256 Audit Trail</span>
          </div>
          <h1 className="doctor-hero-title">System Audit &amp; Security Activity Logs</h1>
          <p className="doctor-hero-subtitle">
            Cryptographically signed event logs recording all administrative access, doctor/nurse credential approvals, vaccine batch allocations, and governance modifications across the national platform.
          </p>
        </div>

        <div className="doctor-hero-meta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="doctor-hero-session-pill"
            style={{ cursor: 'pointer', background: '#0284c7', color: '#ffffff', border: '1px solid #38bdf8', fontWeight: 700 }}
            onClick={() => showToast('Exporting official Ministry Audit Trail Report (.CSV)...')}
          >
            📥 Export Audit Report (.CSV)
          </button>
        </div>
      </section>

      {/* KPI Metrics Ribbon */}
      <div className="doctor-stats-grid" style={{ marginBottom: '28px' }}>
        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8' }}>
            📋
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Total Logged Events</span>
            <div className="doctor-stat-value">{stats.total}</div>
            <span className="doctor-stat-meta" style={{ color: '#38bdf8' }}>
              All administrative tiers
            </span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            🔐
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Security &amp; Auth</span>
            <div className="doctor-stat-value" style={{ color: '#38bdf8' }}>{stats.security}</div>
            <span className="doctor-stat-meta" style={{ color: '#94a3b8' }}>
              Password / 2FA events
            </span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            📦
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Supply Mutations</span>
            <div className="doctor-stat-value" style={{ color: '#34d399' }}>{stats.allocations}</div>
            <span className="doctor-stat-meta" style={{ color: '#34d399' }}>
              Depot dispatches tracked
            </span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            ⚠️
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Critical Actions</span>
            <div className="doctor-stat-value" style={{ color: '#f87171' }}>{stats.critical}</div>
            <span className="doctor-stat-meta" style={{ color: '#94a3b8' }}>
              Suspensions / High alerts
            </span>
          </div>
        </div>
      </div>

      {/* Main Audit Log Card */}
      <div className="doctor-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="doctor-card-title" style={{ margin: 0 }}>National Activity Stream</h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Displaying {filteredLogs.length} verified administrative audit events
            </p>
          </div>

          {/* Quick Category Filter Tabs */}
          <div className="doctor-filter-pills">
            {['ALL', 'USER_VERIFICATION', 'SECURITY_AUTH', 'VACCINE_ALLOCATION', 'ACCOUNT_MODERATION'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`doctor-filter-btn ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {/* Search */}
          <div className="doctor-search-bar" style={{ margin: 0 }}>
            <span className="doctor-search-icon">🔍</span>
            <input
              type="text"
              className="doctor-search-input"
              placeholder="Search by log ID, actor, resource, action, IP..."
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

          {/* Severity Filter */}
          <select
            className="doctor-form-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ height: '42px', fontSize: '0.85rem' }}
          >
            <option value="ALL">⚡ All Severities</option>
            <option value="SUCCESS">Success / Completed</option>
            <option value="INFO">Info / Diagnostic</option>
            <option value="CRITICAL">Critical Actions</option>
          </select>
        </div>

        {/* Audit Log Table */}
        <div className="doctor-table-wrapper">
          <table className="doctor-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Log ID</th>
                <th style={{ width: '160px' }}>Timestamp</th>
                <th style={{ width: '180px' }}>Actor &amp; Role</th>
                <th style={{ width: '150px' }}>Category</th>
                <th>Activity Description &amp; Target</th>
                <th style={{ width: '100px' }}>Severity</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Audit Detail</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No audit records match your search filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    {/* Log ID */}
                    <td>
                      <span className="admin-id-pill" style={{ color: '#38bdf8' }}>
                        {log.id}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                      {log.timestamp}
                    </td>

                    {/* Actor */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem' }}>
                        {log.actor}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#38bdf8', marginTop: '2px' }}>
                        {log.actorRole}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        IP: {log.ipAddress}
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span className="admin-pill-badge blue" style={{ fontSize: '0.72rem' }}>
                        {log.category.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Activity Description */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.86rem', marginBottom: '3px' }}>
                        {log.description}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        Target: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{log.targetResource}</span>
                      </div>
                    </td>

                    {/* Severity */}
                    <td>
                      {renderSeverityBadge(log.severity)}
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="doctor-table-btn"
                        style={{ background: '#0284c7', color: '#ffffff', borderColor: '#38bdf8', fontSize: '0.8rem' }}
                        onClick={() => setSelectedLog(log)}
                        title="View complete cryptographically signed audit payload"
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {selectedLog && (
        <div className="doctor-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div
            className="doctor-modal-card"
            style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="admin-id-pill">{selectedLog.id}</span>
                  {renderSeverityBadge(selectedLog.severity)}
                  <span className="admin-pill-badge blue">{selectedLog.category}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontFamily: 'var(--font-heading, "Outfit", sans-serif)' }}>
                  {selectedLog.action}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Event Metadata Grid */}
            <div style={{ background: '#111a2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.86rem' }}>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Initiating Actor</span>
                  <span className="admin-detail-val" style={{ color: '#ffffff', fontWeight: 700 }}>{selectedLog.actor}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Actor Role</span>
                  <span className="admin-detail-val" style={{ color: '#38bdf8' }}>{selectedLog.actorRole}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Exact Timestamp</span>
                  <span className="admin-detail-val">{selectedLog.timestamp}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Origin IP &amp; Geolocation</span>
                  <span className="admin-detail-val">{selectedLog.ipAddress} (MOH IT Gateway)</span>
                </div>
                <div className="admin-detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="admin-detail-label">Target Resource</span>
                  <span className="admin-detail-val" style={{ color: '#ffffff', fontWeight: 600 }}>{selectedLog.targetResource}</span>
                </div>
              </div>
            </div>

            {/* Cryptographic Hash */}
            <div style={{ background: '#0a0e1a', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '0.78rem' }}>
              <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: '3px' }}>SHA-256 Cryptographic Signature:</div>
              <code style={{ color: '#34d399', wordBreak: 'break-all' }}>{selectedLog.integrityHash}</code>
            </div>

            {/* Event Payload JSON */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                Event Payload &amp; Mutation State:
              </div>
              <pre
                style={{
                  background: '#090e1a',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '14px',
                  color: '#38bdf8',
                  fontSize: '0.82rem',
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
              <button
                type="button"
                className="doctor-btn-cancel"
                onClick={() => setSelectedLog(null)}
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
