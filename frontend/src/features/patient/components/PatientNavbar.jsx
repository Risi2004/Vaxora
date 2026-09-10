import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';

import { authService, getUser } from '../../auth';
import DeleteAccountModal from '../../auth/components/DeleteAccountModal';

export default function PatientNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const user = typeof authService?.getUser === 'function' ? authService.getUser() : (getUser ? getUser() : null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/patient/dashboard', label: 'Home' },
    { path: '/patient/appointments', label: 'Appointments' },
    { path: '/patient/vaccination-history', label: 'Patient history' },
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

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="patient-header">
      <div className="patient-header-inner">
        {/* Brand Logo */}
        <div
          className="patient-brand"
          onClick={() => handleNavigate('/patient/dashboard')}
        >
          <img src={logo} alt="Vaxora Logo" className="patient-logo-img" />
        </div>

        {/* Center Pill Navigation (Desktop / Tablet) */}
        <nav className="patient-nav-tabs desktop-nav-pill" aria-label="Patient Portal Navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`patient-nav-btn ${active ? 'active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right User Profile Avatar & Mobile Hamburger Toggle */}
        <div className="patient-user-area">
          <div ref={profileMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="patient-avatar-button"
              onClick={() => {
                setShowProfileMenu((prev) => !prev);
                setMobileMenuOpen(false);
              }}
              title="Account Profile"
              aria-label="Account Profile"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {user?.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt={user.name || 'Patient'}
                  className="navbar-avatar-img"
                />
              ) : (
                <svg
                  viewBox="0 0 48 48"
                  width="40"
                  height="40"
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
              )}
            </button>

            {/* Profile Dropdown Popup */}
            {showProfileMenu && (
              <div className="patient-profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-name">{user?.name || 'Patient Profile'}</div>
                  <div className="profile-dropdown-id">
                    {user?.registrationNumber ? `ID: ${user.registrationNumber}` : (user?.email || '')}
                  </div>
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

                <button
                  type="button"
                  className="profile-dropdown-delete"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setIsDeleteModalOpen(true);
                  }}
                >
                  🗑️ Delete Account
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
              onClick={() => handleNavigate('/patient/profile')}
            >
              👤 View My Profile
            </button>
            <button
              type="button"
              className="portal-mobile-nav-btn text-danger"
              onClick={handleLogout}
            >
              🚪 Log Out
            </button>
            <button
              type="button"
              className="portal-mobile-nav-btn text-danger"
              onClick={() => {
                setMobileMenuOpen(false);
                setIsDeleteModalOpen(true);
              }}
            >
              🗑️ Delete Account
            </button>
          </nav>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        userName={user?.name || 'Patient Profile'}
        roleName="Patient"
      />
    </header>
  );
}
