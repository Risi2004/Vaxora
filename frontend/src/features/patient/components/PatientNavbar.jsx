import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';

export default function PatientNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    navigate('/login');
  };

  const navItems = [
    { path: '/patient/dashboard', label: 'Home' },
    { path: '/patient/appointments', label: 'Appointments' },
    { path: '/patient/vaccination-history', label: 'Vaccination history' },
    { path: '/patient/feedback', label: 'Feedback' },
  ];

  const isActive = (itemPath) => {
    if (itemPath === '/patient/dashboard') {
      return location.pathname === '/patient/dashboard' || location.pathname === '/patient' || location.pathname === '/patient/';
    }
    if (itemPath === '/patient/vaccination-history') {
      return location.pathname.includes('vaccination-history') || location.pathname.includes('history');
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <header className="patient-header">
      <div className="patient-header-inner">
        {/* Brand Logo */}
        <div
          className="patient-brand"
          onClick={() => navigate('/patient/dashboard')}
        >
          <img src={logo} alt="Vaxora Logo" className="patient-logo-img" />
        </div>

        {/* Center Pill Navigation matching screenshot */}
        <nav className="patient-nav-tabs" aria-label="Patient Portal Navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`patient-nav-btn ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Profile Avatar matching screenshot */}
        <div className="patient-user-area" style={{ position: 'relative' }}>
          <button
            type="button"
            className="patient-avatar-button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            title="Account Profile"
            aria-label="Account Profile"
          >
            <svg
              viewBox="0 0 48 48"
              width="44"
              height="44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="24" cy="24" r="23" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="24" cy="18" r="8" fill="#1e4a9e" />
              <path
                d="M10 40C10 32.268 16.268 28 24 28C31.732 28 38 32.268 38 40"
                fill="#1e4a9e"
              />
            </svg>
          </button>

          {/* Profile Dropdown Popup */}
          {showProfileMenu && (
            <div className="patient-profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="profile-dropdown-name">Kumar Sangakkara</div>
                <div className="profile-dropdown-id">ID: VP12345678</div>
              </div>
              <div className="profile-dropdown-divider" />
              <button
                type="button"
                className="profile-dropdown-link"
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/patient/profile');
                }}
              >
                View Profile
              </button>
              <button
                type="button"
                className="profile-dropdown-logout"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
