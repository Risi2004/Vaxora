import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';

import { authService } from '../../auth';

export default function HospitalNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/hospital/dashboard', label: 'Home' },
    { path: '/hospital/appointments', label: 'Appointments' },
    { path: '/hospital/inventory', label: 'Inventory' },
    { path: '/hospital/staff', label: 'Staff' },
    { path: '/hospital/feedback', label: 'Feedback' },
  ];

  const isActive = (itemPath) => {
    if (itemPath === '/hospital/dashboard') {
      return location.pathname === '/hospital/dashboard' || location.pathname === '/hospital' || location.pathname === '/hospital/';
    }
    return location.pathname.startsWith(itemPath);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="hospital-header">
      <div className="hospital-header-inner">
        {/* Brand Logo */}
        <div className="hospital-brand-group" onClick={() => handleNavigate('/hospital/dashboard')}>
          <img src={logo} alt="Vaxora Logo" className="hospital-logo-img" />
        </div>

        {/* Center Navigation Pills (Desktop / Tablet) */}
        <nav className="hospital-nav-tabs desktop-nav-pill" aria-label="Hospital Portal Navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`hospital-nav-btn ${active ? 'active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Status Indicator, Profile & Mobile Hamburger */}
        <div className="hospital-actions-area">
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="hospital-avatar-button"
              onClick={() => {
                setShowProfileMenu((prev) => !prev);
                setMobileMenuOpen(false);
              }}
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

                <div style={{ height: '1px', background: '#f1f5f9', margin: '6px 0 10px' }} />

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

                <button
                  type="button"
                  className="hospital-dropdown-logout"
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
              onClick={() => handleNavigate('/hospital/profile')}
            >
              🏥 Facility Profile
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
