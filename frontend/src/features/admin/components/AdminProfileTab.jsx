import React, { useState, useEffect } from 'react';
import { authService } from '../../auth/services/authService';

export default function AdminProfileTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    id: 'ADM-001',
    registrationNumber: 'VAX-A-0001',
    name: 'National System Administrator',
    email: 'admin@vaxora.lk',
    phone: '011 269 4033',
    designation: 'Director - Health IT & National Immunization Surveillance',
    ministry: 'Ministry of Health, Sri Lanka',
    status: 'ACTIVE',
    createdAt: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState('');
  const [notificationType, setNotificationType] = useState('success');

  // Change Password State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const showToast = (msg, type = 'success') => {
    setNotification(msg);
    setNotificationType(type);
    setTimeout(() => setNotification(''), 3500);
  };

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      const user = await authService.getMe();
      if (user) {
        setPersonalInfo({
          id: user.id || 'ADM-001',
          registrationNumber: user.registrationNumber || user.id || 'VAX-A-0001',
          name: user.name || 'System Administrator',
          email: user.email || '',
          phone: user.phoneNumber || '',
          designation: 'Director - Health IT & National Immunization Surveillance',
          ministry: 'Ministry of Health, Sri Lanka',
          status: user.status || 'ACTIVE',
          createdAt: user.createdAt || '',
        });
      }
    } catch (err) {
      console.warn('Failed to load admin profile from server, using local fallback:', err);
      const cached = authService.getUser();
      if (cached) {
        setPersonalInfo({
          id: cached.id || 'ADM-001',
          registrationNumber: cached.registrationNumber || cached.id || 'VAX-A-0001',
          name: cached.name || 'System Administrator',
          email: cached.email || '',
          phone: cached.phoneNumber || '',
          designation: 'Director - Health IT & National Immunization Surveillance',
          ministry: 'Ministry of Health, Sri Lanka',
          status: cached.status || 'ACTIVE',
          createdAt: cached.createdAt || '',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await authService.updateProfile({
        name: personalInfo.name,
        phoneNumber: personalInfo.phone,
      });
      setIsEditing(false);
      showToast('Superadmin profile information updated successfully in database!');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Password Strength Calculation
  const calculateStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  };

  const strength = calculateStrength(passwordForm.newPassword);

  const getStrengthLabel = (s) => {
    if (s <= 25) return { label: 'Weak', color: '#f87171' };
    if (s <= 50) return { label: 'Fair', color: '#fbbf24' };
    if (s <= 75) return { label: 'Good', color: '#60a5fa' };
    return { label: 'Strong', color: '#34d399' };
  };

  // Handle Password Update Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current admin password.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsPasswordModalOpen(false);
      showToast('Superadministrator password changed successfully! Next login will require the new credentials.');
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="doctor-profile-wrapper admin-profile-wrapper" style={{ maxWidth: '1060px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          className="doctor-toast"
          style={{
            borderColor: notificationType === 'error' ? '#ef4444' : '#0284c7',
            background: '#0c1b33',
          }}
        >
          <span>{notificationType === 'error' ? '⚠️' : '✓'}</span>
          <span>{notification}</span>
        </div>
      )}

      {/* 1. Identity & Governance Card */}
      <div className="doctor-profile-card" style={{ marginBottom: '24px' }}>
        <div className="doctor-profile-top-grid">
          {/* Avatar */}
          <div className="doctor-profile-avatar-wrap">
            <svg
              className="doctor-profile-large-silhouette"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="100" cy="100" r="100" fill="#0f172a" />
              <circle cx="100" cy="80" r="38" fill="#0ea5e9" />
              <path
                d="M40 174C40 140.863 66.863 118 100 118C133.137 118 160 140.863 160 174"
                fill="#0ea5e9"
              />
            </svg>
          </div>

          {/* Details */}
          <div className="doctor-profile-info-box">
            <div className="doctor-profile-info-header">
              <div>
                <h2 className="doctor-profile-info-title">
                  Superadministrator Identity &amp; Governance
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  National Command Access Level • Ministry of Health
                </p>
              </div>

              <button
                type="button"
                className="doctor-btn-edit-pill"
                style={{ background: '#0284c7', color: '#ffffff', borderColor: '#38bdf8' }}
                onClick={() => {
                  if (isEditing) handleSave();
                  else setIsEditing(true);
                }}
              >
                {isEditing ? 'Save Profile' : 'Edit Details'}
              </button>
            </div>

            <div className="doctor-profile-fields-list">
              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">VAXORA CODE</span>
                <span className="doctor-profile-field-colon">:</span>
                <span className="doctor-profile-field-value" style={{ color: '#38bdf8', fontWeight: 800, letterSpacing: '1px' }}>
                  {personalInfo.registrationNumber || personalInfo.id}
                </span>
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">SYSTEM STATUS</span>
                <span className="doctor-profile-field-colon">:</span>
                <span className="doctor-profile-field-value">
                  <span className={`admin-pill-badge ${personalInfo.status === 'ACTIVE' ? 'green' : 'amber'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    ● {personalInfo.status}
                  </span>
                </span>
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">NAME</span>
                <span className="doctor-profile-field-colon">:</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="doctor-profile-field-input"
                    value={personalInfo.name}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                  />
                ) : (
                  <span className="doctor-profile-field-value">{personalInfo.name}</span>
                )}
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">OFFICIAL EMAIL</span>
                <span className="doctor-profile-field-colon">:</span>
                {isEditing ? (
                  <input
                    type="email"
                    className="doctor-profile-field-input"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                  />
                ) : (
                  <span className="doctor-profile-field-value">{personalInfo.email}</span>
                )}
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">PHONE</span>
                <span className="doctor-profile-field-colon">:</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="doctor-profile-field-input"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                  />
                ) : (
                  <span className="doctor-profile-field-value">{personalInfo.phone}</span>
                )}
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">DESIGNATION</span>
                <span className="doctor-profile-field-colon">:</span>
                <span className="doctor-profile-field-value">{personalInfo.designation}</span>
              </div>

              <div className="doctor-profile-field-row">
                <span className="doctor-profile-field-label">GOVERNING BODY</span>
                <span className="doctor-profile-field-colon">:</span>
                <span className="doctor-profile-field-value">{personalInfo.ministry}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Security & Password Management Card */}
      <div className="doctor-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔐</span> Security &amp; Password Management
            </h3>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.84rem' }}>
              Manage master access credentials, multi-factor authentication, and security audit logs.
            </p>
          </div>

          <button
            type="button"
            className="doctor-hero-session-pill"
            style={{
              cursor: 'pointer',
              background: '#0284c7',
              color: '#ffffff',
              border: '1px solid #38bdf8',
              fontWeight: 700,
              padding: '8px 18px',
              fontSize: '0.85rem',
            }}
            onClick={() => setIsPasswordModalOpen(true)}
          >
            🔑 Change Admin Password
          </button>
        </div>

        {/* Security Overview Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {/* Card 1: Password Status */}
          <div style={{ background: '#111a2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Password Security
              </span>
              <span className="admin-pill-badge green" style={{ fontSize: '0.72rem' }}>
                Active &amp; Protected
              </span>
            </div>
            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
              ••••••••••••••••
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '6px' }}>
              Last changed: 28 days ago • Next rotation recommended in 62 days
            </div>
          </div>

          {/* Card 2: 2FA MFA Status */}
          <div style={{ background: '#111a2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                2-Factor Auth (2FA)
              </span>
              <span className="admin-pill-badge blue" style={{ fontSize: '0.72rem' }}>
                MOH Hardware OTP
              </span>
            </div>
            <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.95rem' }}>
              Enforced for National Superadmin
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '6px' }}>
              Primary method: SMS &amp; Govt Authenticator App (+94 •••• 4033)
            </div>
          </div>

          {/* Card 3: Session Security */}
          <div style={{ background: '#111a2e', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Active Session
              </span>
              <span className="admin-pill-badge blue" style={{ fontSize: '0.72rem' }}>
                TLS 1.3 Encrypted
              </span>
            </div>
            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
              Colombo, Sri Lanka (MOH IT Gateway)
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '6px' }}>
              IP: 192.248.32.14 • Browser: Chrome / Superadmin Console
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="doctor-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div
            className="doctor-modal-card"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontFamily: 'var(--font-heading, "Outfit", sans-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔑</span> Change Admin Password
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Enter your current password and create a strong new master password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {passwordError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              {/* Current Password */}
              <div style={{ marginBottom: '16px' }}>
                <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                  Current Master Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="doctor-form-input"
                    placeholder="Enter current admin password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    style={{ width: '100%', paddingRight: '42px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={{ marginBottom: '16px' }}>
                <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                  New Admin Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="doctor-form-input"
                    placeholder="Enter strong new password (min. 8 chars)"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    style={{ width: '100%', paddingRight: '42px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {passwordForm.newPassword && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', marginBottom: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>Password Strength:</span>
                      <span style={{ fontWeight: 700, color: getStrengthLabel(strength).color }}>
                        {getStrengthLabel(strength).label}
                      </span>
                    </div>
                    <div style={{ height: '5px', background: '#111a2e', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${strength}%`,
                          background: getStrengthLabel(strength).color,
                          transition: 'width 0.3s ease, background-color 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '20px' }}>
                <label className="doctor-form-label" style={{ fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="doctor-form-input"
                    placeholder="Re-enter new password to confirm"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    style={{ width: '100%', paddingRight: '42px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Password Requirement Checklist */}
              <div style={{ background: '#0a0e1a', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '10px 14px', marginBottom: '22px', fontSize: '0.76rem', color: '#94a3b8' }}>
                <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>Password Requirements:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                  <span style={{ color: passwordForm.newPassword.length >= 8 ? '#34d399' : '#64748b' }}>
                    {passwordForm.newPassword.length >= 8 ? '✓' : '•'} At least 8 characters
                  </span>
                  <span style={{ color: /[A-Z]/.test(passwordForm.newPassword) ? '#34d399' : '#64748b' }}>
                    {/[A-Z]/.test(passwordForm.newPassword) ? '✓' : '•'} 1 Uppercase letter
                  </span>
                  <span style={{ color: /[0-9]/.test(passwordForm.newPassword) ? '#34d399' : '#64748b' }}>
                    {/[0-9]/.test(passwordForm.newPassword) ? '✓' : '•'} 1 Number
                  </span>
                  <span style={{ color: /[^A-Za-z0-9]/.test(passwordForm.newPassword) ? '#34d399' : '#64748b' }}>
                    {/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? '✓' : '•'} 1 Special character
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="doctor-btn-cancel"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="doctor-hero-session-pill"
                  style={{
                    cursor: 'pointer',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: '1px solid #38bdf8',
                    fontWeight: 700,
                    padding: '8px 20px',
                  }}
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
