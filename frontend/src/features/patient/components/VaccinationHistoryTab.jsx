import React, { useState } from 'react';

export default function VaccinationHistoryTab() {
  const [selectedRecord, setSelectedRecord] = useState(null);

  const historyRecords = [
    {
      id: 'REC-001',
      vaccine: 'ATD',
      date: '2025-02-24',
      location: 'Lanka hospital- colombo',
      status: 'Completed',
      batch: 'ATD-2025-881',
      doctor: 'Dr. M. F. De Silva',
    },
    {
      id: 'REC-002',
      vaccine: 'COVID-19',
      date: '2020-04-12',
      location: 'Lanka hospital- colombo',
      status: 'Completed',
      batch: 'COV-2020-019',
      doctor: 'Dr. N. Wickramasinghe',
    },
  ];

  return (
    <div className="manage-appointments-wrapper">
      {/* Outer White Card Container matching screenshot */}
      <div className="manage-appointments-card" style={{ padding: '36px 48px 44px' }}>
        {/* Left-Aligned Title */}
        <h1 className="history-page-title">
          Vaccination History
        </h1>

        {/* Custom History Table */}
        <div className="appointments-table-container">
          <table className="custom-appointments-table">
            <thead>
              <tr>
                <th className="th-vaccine" style={{ width: '22%' }}>Vaccine</th>
                <th className="th-date" style={{ width: '20%' }}>Date</th>
                <th className="th-location" style={{ width: '34%' }}>Location</th>
                <th className="th-status" style={{ width: '16%' }}>Status</th>
                <th className="th-download-header" style={{ width: '8%' }}>
                  <span className="folder-download-icon" title="Certificates">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 9l-4 4-4-4h2.5V11h3v4H14z" />
                    </svg>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {historyRecords.map((record) => (
                <tr key={record.id}>
                  <td className="td-vaccine">{record.vaccine}</td>
                  <td className="td-date">{record.date}</td>
                  <td className="td-location">{record.location}</td>
                  <td className="td-status">{record.status}</td>
                  <td className="td-download-action">
                    <button
                      type="button"
                      className="btn-download-tray-icon"
                      onClick={() => setSelectedRecord(record)}
                      title="Download Official Certificate"
                      aria-label={`Download certificate for ${record.vaccine}`}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#1d1854"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Certificate Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                  Official Digital Certificate
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedRecord(null)}
              >
                ✕
              </button>
            </div>

            {/* Certificate Body */}
            <div
              style={{
                border: '2px dashed #93c5fd',
                background: '#f8fafc',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#64748b',
                  fontWeight: 700,
                }}
              >
                Ministry of Health &amp; Healthcare • Sri Lanka
              </div>
              <h2
                style={{
                  fontSize: '1.4rem',
                  fontFamily: "'Lora', Georgia, serif",
                  fontWeight: 800,
                  color: '#19469d',
                  margin: '8px 0 16px',
                }}
              >
                VAXORA IMMUNIZATION PASS
              </h2>

              {/* QR Simulator */}
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  margin: '0 auto 16px',
                  background: '#ffffff',
                  border: '2px solid #1e1b4b',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3.5rem',
                }}
              >
                🏁
              </div>

              <div
                style={{
                  textAlign: 'left',
                  background: '#ffffff',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Beneficiary:</span>
                  <span style={{ fontWeight: 800, color: '#1e1b4b' }}>Kumar Sangakkara</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>National ID / Pass:</span>
                  <span style={{ fontWeight: 700 }}>VAX-2026-9812</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Vaccine:</span>
                  <span style={{ fontWeight: 800, color: '#19469d' }}>{selectedRecord.vaccine}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Date of Vaccination:</span>
                  <span style={{ fontWeight: 700 }}>{selectedRecord.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Batch / Lot:</span>
                  <span style={{ fontWeight: 700 }}>{selectedRecord.batch}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Facility &amp; Doctor:</span>
                  <span style={{ fontWeight: 700 }}>{selectedRecord.location}</span>
                </div>
              </div>

              <div style={{ marginTop: '14px', fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                🔒 Cryptographically signed by Vaxora Healthcare Trust Network
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn-outline-action"
                style={{ flex: 1, background: '#19469d', color: '#ffffff', borderColor: '#19469d' }}
                onClick={() => {
                  alert(`Downloading Official Certificate PDF for ${selectedRecord.vaccine}...`);
                  setSelectedRecord(null);
                }}
              >
                📥 Download Certificate PDF
              </button>
              <button
                type="button"
                className="btn-outline-action"
                onClick={() => setSelectedRecord(null)}
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
