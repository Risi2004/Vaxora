import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';

import { authService } from '../../auth';

export default function NurseNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/nurse/dashboard', label: 'Home' },
    { path: '/nurse/appointments', label: 'Appointments' },
    { path: '/nurse/patients', label: 'Patient history' },
    { path: '/nurse/feedback', label: 'Feedback' },
  ];

  const isActive = (itemPath) => {
    if (itemPath === '/nurse/dashboard') {
      return location.pathname === '/nurse/dashboard' || location.pathname === '/nurse' || location.pathname === '/nurse/';
    }
    return location.pathname.startsWith(itemPath);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="doctor-header nurse-header">
      <div className="doctor-header-inner">
        {/* Brand Logo */}
        <div className="doctor-brand-group" onClick={() => handleNavigate('/nurse/dashboard')}>
          <img src={logo} alt="Vaxora Logo" className="doctor-logo-img" />
        </div>

        {/* Center Pill Navigation (Desktop / Tablet) */}
        <nav className="doctor-nav-tabs desktop-nav-pill" aria-label="Nurse Portal Navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`doctor-nav-btn ${active ? 'active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right User Profile Avatar & Mobile Hamburger Toggle */}
        <div className="doctor-actions-area">
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="doctor-avatar-button nurse-avatar-btn"
              onClick={() => {
                setShowProfileMenu((prev) => !prev);
                setMobileMenuOpen(false);
              }}
              title="Nurse Account Profile"
              aria-label="Nurse Account Profile"
            >
              <svg
                viewBox="0 0 48 48"
                width="40"
                height="40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="24" cy="24" r="23" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="24" cy="18" r="8" fill="#0284c7" />
                <path
                  d="M10 40C10 32.268 16.268 28 24 28C31.732 28 38 32.268 38 40"
                  fill="#0284c7"
                />
              </svg>
            </button>

            {showProfileMenu && (
              <div className="doctor-profile-dropdown">
                <div className="doctor-dropdown-header">
                  <div className="doctor-dropdown-name">Nurse Anoma Silva</div>
                  <div className="doctor-dropdown-meta">Senior Immunization Nurse (RNO)</div>
                  <div className="doctor-dropdown-meta" style={{ color: '#0284c7', fontWeight: 600 }}>
                    SLNC Reg: 49201
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9', margin: '6px 0 10px' }} />

                <button
                  type="button"
                  className="doctor-dropdown-link"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/nurse/profile');
                  }}
                >
                  View Profile
                </button>

                <button
                  type="button"
                  className="doctor-dropdown-logout"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-hamburger-btn portal-hamburger-btn"
            onClick={() => {
              setMobileMenuOpen((prev) => !prev);
              setShowProfileMenu(false);
            }}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="portal-mobile-drawer">
          <nav className="portal-mobile-nav-list">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  className={`portal-mobile-nav-btn ${active ? 'active' : ''}`}
                  onClick={() => handleNavigate(item.path)}
                >
                  {item.label}
                </button>
              );
            })}
            <div style={{ height: '1px', background: '#e2e8f0', margin: '6px 0' }} />
            <button
              type="button"
              className="portal-mobile-nav-btn"
              onClick={() => handleNavigate('/nurse/profile')}
            >
              👩‍⚕️ Nurse Profile
            </button>
            <button
              type="button"
              className="portal-mobile-nav-btn text-danger"
              onClick={handleLogout}
            >
              🚪 Log Out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
