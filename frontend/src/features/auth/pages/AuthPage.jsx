import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';

import {
  RoleSelector,
  LoginForm,
  PatientSignupForm,
  DoctorSignupForm,
  NurseSignupForm,
  DoctorNurseSignupForm,
  HospitalSignupForm,
  ForgotPasswordForm,
} from '../components';

export default function AuthPage({ onAuthSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive mode from route pathname
  const getModeFromPath = (pathname) => {
    if (pathname.includes('signup')) return 'signup';
    if (pathname.includes('forgot')) return 'forgot_password';
    return 'login';
  };

  const mode = getModeFromPath(location.pathname);
  const [selectedRole, setSelectedRole] = useState('patient'); // 'patient' | 'doctor_nurse' | 'hospital'

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSwitchToSignup = () => {
    navigate('/signup');
  };

  const handleSwitchToLogin = () => {
    navigate('/login');
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleLoginSuccess = (userName) => {
    onAuthSuccess?.({ role: 'patient', name: userName });
    navigate('/patient/dashboard');
  };

  const handleSignupSuccess = (name) => {
    onAuthSuccess?.({ role: selectedRole, name });
    if (selectedRole === 'patient') {
      navigate('/patient/dashboard');
    } else if (selectedRole === 'hospital') {
      navigate('/hospital/dashboard');
    } else if (selectedRole === 'doctor') {
      navigate('/doctor/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Back to Home Navigation */}
      <div className="auth-back-nav">
        <button
          type="button"
          className="btn-back-home"
          onClick={handleBackToHome}
          aria-label="Back to home page"
        >
          <span>←</span> Back to Home
        </button>
      </div>

      <div className="auth-container">
        {/* =========================================================================
            1. LEFT CURVED BLUE BANNER (Matches attached mock)
           ========================================================================= */}
        <div className="auth-banner-left">
          {mode === 'login' && (
            <>
              <h1 className="auth-welcome-text">
                Welcome back
              </h1>
              <p className="auth-banner-subtext">
                Log into your Vaxora immunization portal to manage bookings and health records.
              </p>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h1 className="auth-welcome-text">
                Welcome To Vaxora
              </h1>
              <p className="auth-banner-subtext">
                Join the national vaccination network for secure appointments, verified records, and live updates.
              </p>
            </>
          )}

          {mode === 'forgot_password' && (
            <>
              <h1 className="auth-welcome-text">
                Reset Password
              </h1>
              <p className="auth-banner-subtext">
                Verify your identity and set up a new password to regain access to your Vaxora healthcare profile.
              </p>
            </>
          )}
        </div>

        {/* =========================================================================
            2. RIGHT FORM CARD
           ========================================================================= */}
        <div className="auth-form-side">
          <div className="auth-card-inner">
            <div className="auth-header">
              <img src={logo} alt="Vaxora Logo" className="auth-logo" />
              {mode === 'signup' && (
                <h2 className="auth-form-title">Create an account</h2>
              )}
              {mode === 'forgot_password' && (
                <h2 className="auth-form-title">Reset Password</h2>
              )}
            </div>

            {/* Login Mode */}
            {mode === 'login' && (
              <LoginForm
                onSwitchToSignup={handleSwitchToSignup}
                onForgotPassword={handleForgotPassword}
                onSuccess={handleLoginSuccess}
              />
            )}

            {/* Forgot Password Mode */}
            {mode === 'forgot_password' && (
              <ForgotPasswordForm
                onSwitchToLogin={handleSwitchToLogin}
                onSuccess={handleSwitchToLogin}
              />
            )}

            {/* Signup Mode */}
            {mode === 'signup' && (
              <>
                {/* Role Selector at the top (only one can be selected) */}
                <RoleSelector
                  selectedRole={selectedRole}
                  onSelectRole={setSelectedRole}
                />

                {/* Role-Specific Form Fields */}
                {selectedRole === 'patient' && (
                  <PatientSignupForm onSuccess={handleSignupSuccess} />
                )}

                {selectedRole === 'doctor' && (
                  <DoctorSignupForm onSuccess={handleSignupSuccess} />
                )}

                {selectedRole === 'nurse' && (
                  <NurseSignupForm onSuccess={handleSignupSuccess} />
                )}

                {selectedRole === 'doctor_nurse' && (
                  <DoctorSignupForm onSuccess={handleSignupSuccess} />
                )}

                {selectedRole === 'hospital' && (
                  <HospitalSignupForm onSuccess={handleSignupSuccess} />
                )}

                <div className="auth-switch-row">
                  <button
                    type="button"
                    className="btn-auth-switch"
                    onClick={handleSwitchToLogin}
                  >
                    Already have an account? Log in
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
