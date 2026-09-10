import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { authService } from '../../auth';

export default function AdminAuditLogsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authService.getAuditLogs(200);
      if (Array.isArray(data)) {
        const formatted = data.map((log) => {
          const actionUpper = (log.action || '').toUpperCase();
          const category = actionUpper.includes('VERIFICATION')
            ? 'USER_VERIFICATION'
            : actionUpper.includes('SIGNUP')
            ? 'USER_REGISTRATION'
            : actionUpper.includes('LOGIN') || actionUpper.includes('PASSWORD')
            ? 'SECURITY_AUTH'
            : 'SYSTEM_ACTIVITY';

          const severity =
            actionUpper.includes('REJECT') || actionUpper.includes('SUSPEND')
              ? 'CRITICAL'
              : actionUpper.includes('APPROVED') || actionUpper.includes('SUCCESS')
              ? 'SUCCESS'
              : 'INFO';

          return {
            id: `AUD-${(log.id || '').substring(0, 8)}`,
            rawId: log.id,
            timestamp: new Date(log.timestamp).toLocaleString(),
            rawDate: new Date(log.timestamp),
            actor: log.userEmail || log.role || 'System',
            actorRole: log.role || 'Administrator',
            category,
            action: log.action || 'EVENT',
            description: log.details || 'Administrative system operation',
            targetResource: log.userEmail || 'Platform Record',
            ipAddress: log.ipAddress || '127.0.0.1 (Internal Gateway)',
            severity,
          };
        });
        setAuditLogs(formatted);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to fetch audit log stream.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

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
    const verifications = auditLogs.filter((l) => l.category === 'USER_VERIFICATION' || l.category === 'USER_REGISTRATION').length;
    const critical = auditLogs.filter((l) => l.severity === 'CRITICAL').length;
    return { total, security, verifications, critical };
  }, [auditLogs]);

  // Export to CSV
  const handleExportCsv = () => {
    if (auditLogs.length === 0) {
      showToast('No audit records available to export.');
      return;
    }
    const headers = ['Log ID', 'Timestamp', 'Actor', 'Role', 'Category', 'Action', 'Description', 'Target', 'Severity'];
    const rows = auditLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.actor}"`,
      `"${l.actorRole}"`,
      `"${l.category}"`,
      `"${l.action}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${l.targetResource}"`,
      `"${l.severity}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vaxora_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported official Audit Trail Report (.CSV)');
  };

  // Render Severity Badge
  const renderSeverityBadge = (sev) => {
    switch (sev) {
      case 'SUCCESS':
        return <span className="admin-pill-badge green">Success</span>;
      case 'INFO':
        return <span className="admin-pill-badge blue">Info</span>;
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
            <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600 }}>• Live Audit Trail</span>
          </div>
          <h1 className="doctor-hero-title">System Audit &amp; Security Activity Logs</h1>
          <p className="doctor-hero-subtitle">
            Immutable activity event stream recording all administrative verifications, user signups, access control modifications, and authentication events.
          </p>
        </div>

        <div className="doctor-hero-meta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="doctor-filter-btn"
            onClick={loadAuditLogs}
            disabled={loading}
            style={{ fontWeight: 700 }}
          >
            🔄 Refresh
          </button>
          <button
            type="button"
            className="doctor-hero-session-pill"
            style={{ cursor: 'pointer', background: '#0284c7', color: '#ffffff', border: '1px solid #38bdf8', fontWeight: 700 }}
            onClick={handleExportCsv}
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
              All administrative operations
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
              Logins / Password resets
            </span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            👥
          </div>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Registrations &amp; Approvals</span>
            <div className="doctor-stat-value" style={{ color: '#34d399' }}>{stats.verifications}</div>
            <span className="doctor-stat-meta" style={{ color: '#34d399' }}>
              Practitioners &amp; facility events
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
              Rejections / Suspensions
            </span>
          </div>
        </div>
      </div>

      {/* Main Audit Log Card */}
      <div className="doctor-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="doctor-card-title" style={{ margin: 0 }}>Activity Stream</h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Displaying {filteredLogs.length} verified administrative audit events
            </p>
          </div>

          {/* Quick Category Filter Tabs */}
          <div className="doctor-filter-pills">
            {['ALL', 'USER_VERIFICATION', 'USER_REGISTRATION', 'SECURITY_AUTH'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`doctor-filter-btn ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat.replace(/_/g, ' ')}
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
              placeholder="Search by log ID, actor, description, action..."
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
            <option value="INFO">Info / Standard</option>
            <option value="CRITICAL">Critical Actions</option>
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Audit Log Table */}
        <div className="doctor-table-wrapper">
          <table className="doctor-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Log ID</th>
                <th style={{ width: '160px' }}>Timestamp</th>
                <th style={{ width: '180px' }}>Actor &amp; Role</th>
                <th style={{ width: '150px' }}>Category</th>
                <th>Activity Description</th>
                <th style={{ width: '100px' }}>Severity</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
                    <div>Loading live audit records from database...</div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
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
                    </td>

                    {/* Category */}
                    <td>
                      <span className="admin-pill-badge blue" style={{ fontSize: '0.72rem' }}>
                        {log.category.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Activity Description */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.86rem', marginBottom: '3px' }}>
                        {log.description}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        Action: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{log.action}</span>
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
                        style={{ background: '#0284c7', color: '#ffffff', borderColor: '#38bdf8' }}
                        onClick={() => setSelectedLog(log)}
                        title="View Full Audit Payload"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Audit Event Modal */}
      {selectedLog && (
        <div className="doctor-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="doctor-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="doctor-modal-header" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
              <div>
                <h3 className="doctor-modal-title">Audit Record: {selectedLog.id}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
                  Recorded on {selectedLog.timestamp}
                </p>
              </div>
              <button type="button" className="doctor-modal-close-btn" onClick={() => setSelectedLog(null)}>
                &times;
              </button>
            </div>

            <div className="doctor-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Event Action</span>
                  <span className="admin-detail-val" style={{ color: '#38bdf8', fontWeight: 700 }}>{selectedLog.action}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Actor / Account</span>
                  <span className="admin-detail-val" style={{ color: '#ffffff' }}>{selectedLog.actor}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Role Tier</span>
                  <span className="admin-detail-val" style={{ color: '#ffffff' }}>{selectedLog.actorRole}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Category</span>
                  <span className="admin-detail-val" style={{ color: '#ffffff' }}>{selectedLog.category}</span>
                </div>
              </div>

              <div style={{ marginTop: '14px', padding: '14px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Event Details
                </span>
                <div style={{ color: '#ffffff', fontSize: '0.92rem', marginTop: '6px', lineHeight: '1.5' }}>
                  {selectedLog.description}
                </div>
              </div>
            </div>

            <div className="doctor-modal-footer">
              <button
                type="button"
                className="doctor-btn-cancel"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
