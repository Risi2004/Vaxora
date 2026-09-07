import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';

export default function HospitalNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    navigate('/login');
  };

  const navItems = [
    { path: '/hospital/dashboard', label: 'Home' },
    { path: '/hospital/appointments', label: 'Appointments' },
    { path: '/hospital/staff', label: 'Staff' },
    { path: '/hospital/feedback', label: 'Feedback' },
  ];

  const isActive = (itemPath) => {
    if (itemPath === '/hospital/dashboard') {
      return location.pathname === '/hospital/dashboard' || location.pathname === '/hospital' || location.pathname === '/hospital/';
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <header className="hospital-header">
      <div className="hospital-header-inner">
        {/* Brand & Facility Info */}
        <div className="hospital-brand-group" onClick={() => navigate('/hospital/dashboard')}>
          <img src={logo} alt="Vaxora Logo" className="hospital-logo-img" />
          <div className="hospital-badge">
            <span className="hospital-facility-name">National Healthcare General Hospital</span>
            <div className="hospital-facility-meta">
              <span className="hospital-meta-tag">MOH Certified</span>
              <span>Reg: HOSPITAL-77042 • Colombo 07</span>
            </div>
          </div>
        </div>

        {/* Center Navigation Pills */}
        <nav className="hospital-nav-tabs" aria-label="Hospital Portal Navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`hospital-nav-btn ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Status Indicator & Profile */}
        <div className="hospital-actions-area">

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="hospital-avatar-button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              title="Hospital Operations Account"
              aria-label="Hospital Account Profile"
            >
              <div className="hospital-avatar-circle">
                <span>🏥</span>
              </div>
            </button>

            {showProfileMenu && (
              <div className="hospital-profile-dropdown">
                <div className="hospital-dropdown-header">
                  <div className="hospital-dropdown-name">National Healthcare General</div>
                  <div className="hospital-dropdown-meta">Administrator Portal</div>
                  <div className="hospital-dropdown-meta" style={{ color: '#2563eb', fontWeight: 600 }}>
                    MOH-COL-77042
                  </div>
                </div>

                <button
                  type="button"
                  className="hospital-dropdown-link"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/hospital/profile');
                  }}
                >
                  View Profile
                </button>

                <div style={{ height: '1px', background: '#e2e8f0', margin: '6px 0' }} />

                <button
                  type="button"
                  className="hospital-dropdown-logout"
                  onClick={handleLogout}
                >
                  <span>🚪</span> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
