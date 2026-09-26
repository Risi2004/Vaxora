import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, getUser } from '../../auth';
import { IconCalendar, IconClock, IconDoctor, IconShield, IconSyringe } from '../../../shared/icons/AppIcons';

export default function DashboardOverview({ onNavigateTab, onOpenBookModal }) {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(() => {
    const cached = typeof authService?.getUser === 'function' ? authService.getUser() : (getUser ? getUser() : null);
    return cached?.name || cached?.profileDetails?.fullName || '';
  });

  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        if (typeof authService?.getMe === 'function') {
          const fresh = await authService.getMe();
          const name = fresh?.name || fresh?.profileDetails?.fullName;
          if (name) {
            setDisplayName(name);
          }
        }
      } catch (err) {
        console.warn('Could not fetch latest user profile for dashboard banner:', err);
      }
    };

    fetchLatestProfile();
  }, []);

  const scheduleItems = [
    {
      id: 1,
      name: 'COVID-19 mRNA Booster',
      target: 'Dose 3 • Annual Protection',
      status: 'Scheduled',
      statusClass: 'status-scheduled',
      date: 'Oct 12, 2026',
      Icon: IconSyringe,
    },
    {
      id: 2,
      name: 'Influenza (Quadrivalent)',
      target: 'Seasonal Influenza',
      status: 'Due Soon',
      statusClass: 'status-due',
      date: 'Nov 2026',
      Icon: IconShield,
    },
    {
      id: 3,
      name: 'Hepatitis B Booster',
      target: 'Dose 3 Completed',
      status: 'Completed',
      statusClass: 'status-completed',
      date: 'Jan 15, 2026',
      Icon: IconShield,
    },
    {
      id: 4,
      name: 'Tetanus, Diphtheria (Td)',
      target: '10-Year Routine Booster',
      status: 'Completed',
      statusClass: 'status-completed',
      date: 'Aug 04, 2025',
      Icon: IconShield,
    },
  ];

  return (
    <div className="dashboard-overview-tab">
      {/* 1. Welcome Banner */}
      <div className="patient-welcome-banner">
        <div className="welcome-text-group">
          <h1>Welcome back{displayName ? `, ${displayName}` : ''}! 👋</h1>
          <p className="welcome-subtitle">
            Your Vaxora immunization pass is cryptographically verified and up-to-date.
            Your next booster dose is confirmed for October 12, 2026.
          </p>
        </div>
        <button
          type="button"
          className="btn-banner-action"
          onClick={() => (onOpenBookModal ? onOpenBookModal() : navigate('/patient/appointments'))}
        >
          + Book Vaccination
        </button>
      </div>

      {/* 2. Stat Metric Cards */}
      <div className="patient-stats-grid">
        <div className="patient-stat-card">
          <div className="stat-card-icon-box icon-blue">
            <IconCalendar size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Upcoming Dose</span>
            <span className="stat-card-value">12 Oct 2026</span>
            <span className="stat-card-note">COVID-19 Booster</span>
          </div>
        </div>

        <div className="patient-stat-card">
          <div className="stat-card-icon-box icon-green">
            <IconSyringe size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Doses Received</span>
            <span className="stat-card-value">4 Completed</span>
            <span className="stat-card-note">100% Up to date</span>
          </div>
        </div>

        <div className="patient-stat-card">
          <div className="stat-card-icon-box icon-purple">
            <IconShield size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Health Pass Status</span>
            <span className="stat-card-value">Verified</span>
            <span className="stat-card-note">QR Valid Internationally</span>
          </div>
        </div>

        <div className="patient-stat-card">
          <div className="stat-card-icon-box icon-amber">
            <IconClock size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Next Due</span>
            <span className="stat-card-value">Influenza</span>
            <span className="stat-card-note">Recommended in 60 days</span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Columns */}
      <div className="dashboard-columns-grid">
        {/* Left Column: Spotlight Upcoming Appointment & Advisories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="patient-panel-card">
            <div className="panel-header-row">
              <h2 className="panel-title">Next Confirmed Appointment</h2>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigateTab('appointments')}
              >
                View all →
              </button>
            </div>

            <div className="spotlight-appointment">
              <div className="appointment-meta-top">
                <span className="vaccine-badge-pill">COVID-19 Booster (Moderna)</span>
                <span className="status-badge-confirmed">● Confirmed</span>
              </div>

              <div className="appointment-main-details">
                <h3>National Hospital of Sri Lanka</h3>
                <div className="appointment-hospital-line">
                  <span>📍 Unit 4, Vaccination Clinic Wing B, Colombo 10</span>
                </div>
              </div>

              <div className="appointment-date-time-bar">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconCalendar size={14} /> Monday, Oct 12, 2026
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconClock size={14} /> 10:30 AM - 11:00 AM
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconDoctor size={14} /> Dr. N. Wickramasinghe
                </span>
              </div>

              <div className="appointment-actions-row">
                <button
                  type="button"
                  className="btn-outline-action"
                  onClick={() => navigate('/patient/appointments')}
                >
                  Manage / Reschedule
                </button>
                <button
                  type="button"
                  className="btn-outline-action"
                  style={{ background: '#19469d', color: '#ffffff', borderColor: '#19469d' }}
                  onClick={() => alert('Appointment Slip #VX-88349 sent to your registered email.')}
                >
                  Download Appointment Slip
                </button>
              </div>
            </div>
          </div>

          {/* Health & Travel Advisory Notice */}
          <div
            className="patient-panel-card"
            style={{
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div
                style={{
                  fontSize: '1.8rem',
                  background: '#eff6ff',
                  padding: '10px',
                  borderRadius: '12px',
                }}
              >
                ✈️
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '4px' }}>
                  International Travel Immunization Advisory
                </h4>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  Planning international travel in 2026? Ensure your Yellow Fever and Meningococcal
                  vaccine certificates are renewed at least 14 days before departure.
                </p>
                <button
                  type="button"
                  className="panel-link-btn"
                  style={{ marginTop: '8px', display: 'inline-block' }}
                  onClick={() => navigate('/patient/vaccination-history')}
                >
                  Check Vaccination Certifications →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Immunization Schedule & Timeline */}
        <div className="patient-panel-card">
          <div className="panel-header-row">
            <h2 className="panel-title">Immunization Tracker</h2>
            <button
              type="button"
              className="panel-link-btn"
              onClick={() => navigate('/patient/vaccination-history')}
            >
              Full History →
            </button>
          </div>

          <div className="schedule-checklist">
            {scheduleItems.map((item) => {
              const ItemIcon = item.Icon;
              return (
                <div key={item.id} className="schedule-item">
                  <div className="schedule-left">
                    <div className="schedule-icon-circle" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ItemIcon size={18} />
                    </div>
                    <div>
                      <div className="schedule-name">{item.name}</div>
                      <div className="schedule-target">{item.target}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`schedule-status-tag ${item.statusClass}`}>
                      {item.status}
                    </span>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                      {item.date}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <button
              type="button"
              className="btn-outline-action"
              style={{ width: '100%', borderColor: '#19469d', color: '#19469d' }}
              onClick={() => navigate('/patient/appointments')}
            >
              + Schedule Recommended Dose
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
