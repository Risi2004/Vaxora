import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';

export default function DoctorNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    navigate('/login');
  };

  const navItems = [
    { path: '/doctor/dashboard', label: 'Home' },
    { path: '/doctor/appointments', label: 'Appointments' },
    { path: '/doctor/patients', label: 'Patient history' },
    { path: '/doctor/feedback', label: 'Feedback' },
  ];

  const isActive = (itemPath) => {
    if (itemPath === '/doctor/dashboard') {
      return location.pathname === '/doctor/dashboard' || location.pathname === '/doctor' || location.pathname === '/doctor/';
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <header className="doctor-header">
      <div className="doctor-header-inner">
        {/* Brand Logo */}
        <div className="doctor-brand-group" onClick={() => navigate('/doctor/dashboard')}>
          <img src={logo} alt="Vaxora Logo" className="doctor-logo-img" />
        </div>

        {/* Center Pill Navigation matching Hospital & Patient */}
        <nav className="doctor-nav-tabs" aria-label="Doctor Portal Navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`doctor-nav-btn ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right User Profile Avatar matching Patient & Hospital */}
        <div className="doctor-actions-area">
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="doctor-avatar-button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              title="Doctor Account Profile"
              aria-label="Doctor Account Profile"
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

            {showProfileMenu && (
              <div className="doctor-profile-dropdown">
                <div className="doctor-dropdown-header">
                  <div className="doctor-dropdown-name">Dr. Samantha Perera</div>
                  <div className="doctor-dropdown-meta">Consultant Vaccinologist</div>
                  <div className="doctor-dropdown-meta" style={{ color: '#2563eb', fontWeight: 600 }}>
                    SLMC Reg: 38291
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9', margin: '6px 0 10px' }} />

                <button
                  type="button"
                  className="doctor-dropdown-link"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/doctor/profile');
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
        </div>
      </div>
    </header>
  );
}
