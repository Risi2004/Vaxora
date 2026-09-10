import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardOverview() {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Live Hospital Quick Telemetry
  const activeHospitals = [
    { name: 'Lanka Hospital Colombo', province: 'Western', activeBooths: 6, dosesToday: 142, temp: '3.8°C', status: 'Optimal' },
    { name: 'Asiri Central Hospital', province: 'Western', activeBooths: 4, dosesToday: 98, temp: '4.1°C', status: 'Optimal' },
    { name: 'Delmon Hospital', province: 'Western', activeBooths: 3, dosesToday: 74, temp: '3.6°C', status: 'Optimal' },
    { name: 'Teaching Hospital Kandy', province: 'Central', activeBooths: 5, dosesToday: 110, temp: '4.0°C', status: 'Optimal' },
    { name: 'Karapitiya National Hospital', province: 'Southern', activeBooths: 4, dosesToday: 88, temp: '3.9°C', status: 'Optimal' },
  ];

  // National Central Vaccine Stock Reserve
  const nationalReserves = [
    { vaccine: 'Pfizer Bivalent mRNA', inStock: '42,500 doses', allocated: '28,000 doses', tempRange: '-80°C to -60°C' },
    { vaccine: 'Hepatitis B Recombinant', inStock: '58,200 doses', allocated: '34,500 doses', tempRange: '+2°C to +8°C' },
    { vaccine: 'Moderna Spikevax', inStock: '24,000 doses', allocated: '18,200 doses', tempRange: '-25°C to -15°C' },
    { vaccine: 'Influenza (Quadrivalent)', inStock: '62,000 doses', allocated: '41,000 doses', tempRange: '+2°C to +8°C' },
    { vaccine: 'MMR (Measles, Mumps)', inStock: '31,500 doses', allocated: '20,000 doses', tempRange: '+2°C to +8°C' },
  ];

  // Recent Verification Requests
  const pendingRequests = [
    { id: 'req-1', type: 'doctor', name: 'Dr. Kasun Abeysekera', regNumber: 'SLMC-42091', hospital: 'Lanka Hospital', date: 'Today, 07:45 AM' },
    { id: 'req-2', type: 'nurse', name: 'Nurse Sanduni Wijesinghe', regNumber: 'SLNC-58210', hospital: 'Asiri Central Hospital', date: 'Today, 08:12 AM' },
    { id: 'req-3', type: 'hospital', name: 'Nawaloka Medicare Center - Negombo', regNumber: 'MOH-PVT-8821', hospital: 'Gampaha District', date: 'Yesterday' },
  ];

  return (
    <div className="admin-dashboard-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="doctor-toast">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Hero Command Banner */}
      <section className="doctor-hero-banner admin-hero-banner">
        <div className="doctor-hero-info">
          <h1 className="doctor-hero-title">National Immunization Command Center</h1>
          <p className="doctor-hero-subtitle">
            Welcome, Dr. V. Ratnayake • Ministry of Health &amp; National IT Directorate
          </p>
          <div className="doctor-hero-session-pill">
            <span>🛡️ Superadmin Access Active</span>
            <span>•</span>
            <span>🏥 14 Registered Centers Live</span>
            <span>•</span>
            <span>❄️ Cold-Chain Telemetry: 100% Verified</span>
          </div>
        </div>

        <div className="doctor-hero-actions">
          <button
            type="button"
            className="doctor-btn-call-next"
            style={{ background: '#0284c7' }}
            onClick={() => navigate('/admin/approvals')}
          >
            📋 Review Approvals (3)
          </button>
          <button
            type="button"
            className="doctor-btn-report-aefi"
            style={{ background: '#0f172a', borderColor: '#334155' }}
            onClick={() => navigate('/admin/hospitals')}
          >
            🏥 Hospital Performance
          </button>
        </div>
      </section>

      {/* 2. Key Metrics Ribbon (4 Cards) */}
      <section className="doctor-stats-grid">
        <div className="doctor-stat-card" onClick={() => navigate('/admin/users')} style={{ cursor: 'pointer' }}>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Total Platform Users</span>
            <span className="doctor-stat-value">12,842</span>
            <span className="doctor-stat-meta">
              <span style={{ color: '#059669', fontWeight: 700 }}>12,180 Patients</span> • 420 Doctors • 228 Nurses • 14 Hospitals
            </span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-blue">
            <span>👥</span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Total Doses Administered</span>
            <span className="doctor-stat-value" style={{ color: '#059669' }}>184,290</span>
            <span className="doctor-stat-meta">
              <span style={{ color: '#059669', fontWeight: 700 }}>+1,420 today</span> • 94.2% on-time 2nd dose
            </span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-green">
            <span>💉</span>
          </div>
        </div>

        <div className="doctor-stat-card" onClick={() => navigate('/admin/approvals')} style={{ cursor: 'pointer' }}>
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">Pending Verification Requests</span>
            <span className="doctor-stat-value" style={{ color: '#d97706' }}>3</span>
            <span className="doctor-stat-meta">
              <span style={{ color: '#dc2626', fontWeight: 700 }}>Action needed:</span> 1 Doctor, 1 Nurse, 1 Facility
            </span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-amber">
            <span>⏳</span>
          </div>
        </div>

        <div className="doctor-stat-card">
          <div className="doctor-stat-content">
            <span className="doctor-stat-label">National Wastage Rate</span>
            <span className="doctor-stat-value" style={{ color: '#38bdf8' }}>0.48%</span>
            <span className="doctor-stat-meta">
              <span style={{ color: '#059669', fontWeight: 700 }}>Well below WHO threshold (5.0%)</span>
            </span>
          </div>
          <div className="doctor-stat-icon-wrapper doctor-icon-purple">
            <span>❄️</span>
          </div>
        </div>
      </section>

      {/* 3. Main Two-Column Layout */}
      <div className="doctor-main-grid">
        {/* Left Column: Live Hospital Telemetry & Activity */}
        <div className="doctor-card">
          <div className="doctor-card-header">
            <div className="doctor-card-title">
              <span>🏥</span>
              Real-Time Hospital Center Telemetry
            </div>
            <button
              type="button"
              className="doctor-table-btn"
              style={{ background: '#0284c7', color: '#fff', borderColor: '#0ea5e9' }}
              onClick={() => navigate('/admin/hospitals')}
            >
              View All 14 Hospitals ↗
            </button>
          </div>

          <div className="doctor-table-wrapper">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th>Hospital Center</th>
                  <th>Province</th>
                  <th>Active Booths</th>
                  <th>Doses Today</th>
                  <th>Cold Box Temp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeHospitals.map((h, i) => (
                  <tr key={i}>
                    <td>
                      <strong style={{ color: '#f8fafc' }}>{h.name}</strong>
                    </td>
                    <td>{h.province}</td>
                    <td>
                      <span className="admin-pill-badge blue">{h.activeBooths} Active</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#059669' }}>{h.dosesToday} doses</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#38bdf8' }}>{h.temp}</span>
                    </td>
                    <td>
                      <span className="doctor-status-badge status-completed">
                        ✓ {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: National Reserves & Quick Approval Queue */}
        <div className="doctor-side-column">
          {/* Urgent Approvals Widget */}
          <div className="doctor-obs-card">
            <div className="doctor-obs-header">
              <div className="doctor-obs-title">
                <span>🛡️</span>
                Pending Verification Queue
              </div>
              <span className="admin-pill-badge amber" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/approvals')}>
                {pendingRequests.length} Pending
              </span>
            </div>

            <div className="doctor-obs-list">
              {pendingRequests.map((req) => (
                <div key={req.id} className="doctor-obs-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/approvals')}>
                  <div className="doctor-obs-item-info">
                    <span className="doctor-obs-item-name">
                      {req.type === 'doctor' ? '🩺 ' : req.type === 'nurse' ? '👩‍⚕️ ' : '🏥 '}
                      {req.name}
                    </span>
                    <span className="doctor-obs-item-meta">
                      {req.regNumber} • {req.hospital}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                      Submitted: {req.date}
                    </span>
                  </div>
                  <div className="doctor-obs-countdown">
                    <button
                      type="button"
                      className="doctor-table-btn"
                      style={{ background: '#0284c7', color: '#fff', fontSize: '0.78rem', borderColor: '#0ea5e9' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/admin/approvals');
                      }}
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Central Stock Reserves */}
          <div className="doctor-coldbox-card">
            <div className="doctor-coldbox-header">
              <div className="doctor-coldbox-title">
                <span>📦</span>
                National Central Stock Reserve
              </div>
              <span className="doctor-coldbox-temp">Storage OK</span>
            </div>

            <div className="doctor-coldbox-list">
              {nationalReserves.map((res, idx) => (
                <div key={idx} className="doctor-coldbox-item">
                  <div>
                    <div className="doctor-coldbox-name">{res.vaccine}</div>
                    <div className="doctor-coldbox-lot">Allocated: {res.allocated} • {res.tempRange}</div>
                  </div>
                  <div className="doctor-coldbox-count">
                    <span className="doctor-coldbox-number" style={{ fontSize: '0.92rem' }}>{res.inStock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
