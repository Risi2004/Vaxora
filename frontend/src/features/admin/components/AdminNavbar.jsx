import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';
import { authService } from '../../auth';

export default function AdminNavbar({ pendingApprovalsCount = 4 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Home' },
    { path: '/admin/users', label: 'Users' },
    { path: '/admin/approvals', label: 'Approvals', badge: pendingApprovalsCount },
    { path: '/admin/hospitals', label: 'Hospitals' },
    { path: '/admin/campaigns', label: 'Campaigns' },
    { path: '/admin/feedback', label: 'Feedback' },
    { path: '/admin/audit', label: 'Audit Logs' },
  ];

  const isActive = (itemPath) => {
    if (itemPath === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard' || location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(itemPath);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="doctor-header admin-header">
      <div className="doctor-header-inner">
        {/* Brand Logo */}
        <div className="doctor-brand-group" onClick={() => handleNavigate('/admin/dashboard')}>
          <img src={logo} alt="Vaxora Logo" className="doctor-logo-img" />
        </div>

        {/* Center Pill Navigation (Desktop / Tablet) */}
        <nav className="doctor-nav-tabs desktop-nav-pill" aria-label="Admin Portal Navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`doctor-nav-btn ${active ? 'active' : ''}`}
                onClick={() => handleNavigate(item.path)}
                style={{ position: 'relative' }}
              >
                {item.label}
                {item.badge > 0 && (
                  <span className="admin-nav-counter-badge">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right User Profile Avatar & Mobile Hamburger Toggle */}
        <div className="doctor-actions-area">
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="doctor-avatar-button admin-avatar-btn"
              onClick={() => {
                setShowProfileMenu((prev) => !prev);
                setMobileMenuOpen(false);
              }}
              title="Superadmin Profile"
              aria-label="Superadmin Profile"
            >
              <svg
                viewBox="0 0 48 48"
                width="40"
                height="40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="24" cy="24" r="23" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="2" />
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
                  <div className="doctor-dropdown-name">Dr. V. Ratnayake</div>
                  <div className="doctor-dropdown-meta">National System Superadmin</div>
                  <div className="doctor-dropdown-meta" style={{ color: '#0284c7', fontWeight: 600 }}>
                    MOH IT Directorate
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9', margin: '6px 0 10px' }} />

                <button
                  type="button"
                  className="doctor-dropdown-link"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/admin/profile');
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
                  {item.label} {item.badge > 0 ? `(${item.badge})` : ''}
                </button>
              );
            })}
            <div style={{ height: '1px', background: '#e2e8f0', margin: '6px 0' }} />
            <button
              type="button"
              className="portal-mobile-nav-btn"
              onClick={() => handleNavigate('/admin/profile')}
            >
              🛡️ Admin Profile
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
