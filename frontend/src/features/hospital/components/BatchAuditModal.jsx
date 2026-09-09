import React from 'react';

export default function BatchAuditModal({ isOpen, onClose, vaccine }) {
  if (!isOpen || !vaccine) return null;

  // Mock audit trail entries
  const auditEntries = [
    {
      id: 1,
      timestamp: '2026-09-08 08:30 AM',
      event: 'Daily Cold Chain Temperature Verification: -75.8°C (Compliant)',
      actor: 'Automated IoT Sensor #VAULT-A1',
      type: 'sensor',
    },
    {
      id: 2,
      timestamp: '2026-09-07 02:15 PM',
      event: 'Dispensed 30 vials to Vaccination Station Booth 01 & Booth 02',
      actor: 'Dr. Samantha Perera (Clinician Lead)',
      type: 'dispense',
    },
    {
      id: 3,
      timestamp: '2026-09-05 10:45 AM',
      event: 'Routine QA Inspection Passed — Seal integrity verified',
      actor: 'MOH Quality Auditor K. Fernando',
      type: 'qa',
    },
    {
      id: 4,
      timestamp: '2026-08-28 09:00 AM',
      event: `Batch Shipment ${vaccine.lotNumber} Logged into Inventory (+${vaccine.capacity} vials)`,
      actor: 'Hospital Operations Supply Dispatch',
      type: 'restock',
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="hospital-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>📦</span>
              <h3 style={{ margin: 0 }}>Batch Audit &amp; Traceability Ledger</h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#64748b' }}>
              Lot Tracking &bull; <strong style={{ color: '#1d1854' }}>{vaccine.lotNumber}</strong> &bull; {vaccine.name}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Quick Stats Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              marginBottom: '20px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                Current In-Stock
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d1854' }}>
                {vaccine.available} <small style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>/ {vaccine.capacity} vials</small>
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                Storage Vault
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2563eb' }}>
                {vaccine.storageUnit || 'Cold Vault A'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                Expiration Date
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669' }}>
                {vaccine.expiry}
              </span>
            </div>
          </div>

          {/* Technical Specifications */}
          <h4 style={{ margin: '0 0 10px', fontSize: '0.98rem', color: '#1d1854', fontWeight: 700 }}>
            Technical Product Metadata
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              fontSize: '0.88rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '24px',
            }}
          >
            <div>
              <strong style={{ color: '#475569' }}>Manufacturer:</strong>{' '}
              <span style={{ color: '#0f172a' }}>{vaccine.manufacturer || 'BioPharma Global'}</span>
            </div>
            <div>
              <strong style={{ color: '#475569' }}>Dosage per Vial:</strong>{' '}
              <span style={{ color: '#0f172a' }}>{vaccine.dosesPerVial ? `${vaccine.dosesPerVial} Doses` : '5 Doses (Multi-dose)'}</span>
            </div>
            <div>
              <strong style={{ color: '#475569' }}>Required Temperature:</strong>{' '}
              <span style={{ color: '#0f172a' }}>{vaccine.temp || '2°C to 8°C'}</span>
            </div>
            <div>
              <strong style={{ color: '#475569' }}>NDDA / MOH Reg:</strong>{' '}
              <span style={{ color: '#0f172a' }}>MOH-VAC-{vaccine.id}8831</span>
            </div>
          </div>

          {/* Chronological Audit Timeline */}
          <h4 style={{ margin: '0 0 14px', fontSize: '0.98rem', color: '#1d1854', fontWeight: 700 }}>
            Traceability &amp; Custody Events
          </h4>
          <div className="audit-timeline">
            {auditEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  position: 'relative',
                  paddingLeft: '28px',
                  paddingBottom: '18px',
                  borderLeft: '2px solid #cbd5e1',
                  marginLeft: '8px',
                }}
              >
                {/* Node icon / dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-7px',
                    top: '0px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: entry.type === 'restock' ? '#2563eb' : entry.type === 'sensor' ? '#10b981' : '#6366f1',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 0 2px #e2e8f0',
                  }}
                />
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  {entry.timestamp}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600, margin: '2px 0 3px' }}>
                  {entry.event}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  Authorized: <em>{entry.actor}</em>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={() => alert(`Exporting audit log for Lot ${vaccine.lotNumber} as cryptographically signed PDF...`)}
            style={{ marginRight: 'auto', background: '#f1f5f9', color: '#1e293b' }}
          >
            📄 Export Lot Audit PDF
          </button>
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
