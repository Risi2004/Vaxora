import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../src/routes/ProtectedRoute';
import * as authModule from '../../src/features/auth';

describe('Booking Management - Protected Booking Routes (Scenario 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  const renderWithRouter = (initialRoute, allowedRoles) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                <div data-testid="patient-booking-content">Patient Appointments Page</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/appointments"
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                <div data-testid="hospital-booking-content">Hospital Appointments Page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          <Route path="/patient/dashboard" element={<div data-testid="patient-dashboard">Patient Dashboard</div>} />
          <Route path="/doctor/dashboard" element={<div data-testid="doctor-dashboard">Doctor Dashboard</div>} />
          <Route path="/hospital/dashboard" element={<div data-testid="hospital-dashboard">Hospital Dashboard</div>} />
          <Route path="/admin/dashboard" element={<div data-testid="admin-dashboard">Admin Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  // 10a. Unauthenticated users cannot access booking routes
  it('redirects unauthenticated user attempting to access /patient/appointments to /login', () => {
    // No token in storage
    renderWithRouter('/patient/appointments', ['PATIENT', 'ADMIN']);

    expect(screen.queryByTestId('patient-booking-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('redirects unauthenticated user attempting to access /hospital/appointments to /login', () => {
    renderWithRouter('/hospital/appointments', ['HOSPITAL', 'ADMIN']);

    expect(screen.queryByTestId('hospital-booking-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  // 10b. Role mismatch protection
  it('prevents a DOCTOR from accessing patient booking routes and redirects to doctor dashboard', () => {
    localStorage.setItem('vaxora_token', 'valid-doctor-jwt');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'doc-1',
        role: 'DOCTOR',
        status: 'Active',
      })
    );

    renderWithRouter('/patient/appointments', ['PATIENT', 'ADMIN']);

    expect(screen.queryByTestId('patient-booking-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('doctor-dashboard')).toBeInTheDocument();
  });

  it('prevents a PATIENT from accessing hospital booking routes and redirects to patient dashboard', () => {
    localStorage.setItem('vaxora_token', 'valid-patient-jwt');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'pat-1',
        role: 'PATIENT',
        status: 'Active',
      })
    );

    renderWithRouter('/hospital/appointments', ['HOSPITAL', 'ADMIN']);

    expect(screen.queryByTestId('hospital-booking-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('patient-dashboard')).toBeInTheDocument();
  });

  // 10c. Account status protection (pending / suspended)
  it('blocks users with pending verification from hospital booking routes and logs them out', () => {
    localStorage.setItem('vaxora_token', 'pending-hosp-jwt');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'hosp-unverified',
        role: 'HOSPITAL',
        status: 'Pending',
      })
    );

    renderWithRouter('/hospital/appointments', ['HOSPITAL', 'ADMIN']);

    expect(screen.queryByTestId('hospital-booking-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    // Auth should be cleared
    expect(localStorage.getItem('vaxora_token')).toBeNull();
  });

  it('blocks suspended users from accessing booking routes', () => {
    localStorage.setItem('vaxora_token', 'suspended-jwt');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'hosp-suspended',
        role: 'HOSPITAL',
        status: 'Suspended',
      })
    );

    renderWithRouter('/hospital/appointments', ['HOSPITAL', 'ADMIN']);

    expect(screen.queryByTestId('hospital-booking-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(localStorage.getItem('vaxora_token')).toBeNull();
  });

  // 10d. Authorized users access granted
  it('allows authorized PATIENT with active status to access patient booking route', () => {
    localStorage.setItem('vaxora_token', 'valid-patient-token');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'pat-ok',
        role: 'PATIENT',
        status: 'Active',
      })
    );

    renderWithRouter('/patient/appointments', ['PATIENT', 'ADMIN']);

    expect(screen.getByTestId('patient-booking-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('allows authorized HOSPITAL with active status to access hospital booking route', () => {
    localStorage.setItem('vaxora_token', 'valid-hospital-token');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'hosp-ok',
        role: 'HOSPITAL',
        status: 'Active',
      })
    );

    renderWithRouter('/hospital/appointments', ['HOSPITAL', 'ADMIN']);

    expect(screen.getByTestId('hospital-booking-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });
});
