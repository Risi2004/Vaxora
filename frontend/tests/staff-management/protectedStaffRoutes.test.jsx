import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../src/routes/ProtectedRoute';

describe('Staff Management - Protected Staff Routes', () => {
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
            path="/hospital/staff"
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                <div data-testid="hospital-staff-content">Hospital Staff Page</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/affiliations"
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                <div data-testid="doctor-affiliations-content">Doctor Affiliations Page</div>
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

  it('redirects unauthenticated user attempting to access /hospital/staff to /login', () => {
    renderWithRouter('/hospital/staff', ['HOSPITAL', 'ADMIN']);

    expect(screen.queryByTestId('hospital-staff-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('prevents a PATIENT from accessing hospital staff routes and redirects to patient dashboard', () => {
    localStorage.setItem('vaxora_token', 'valid-patient-jwt');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'pat-1',
        role: 'PATIENT',
        status: 'Active',
      })
    );

    renderWithRouter('/hospital/staff', ['HOSPITAL', 'ADMIN']);

    expect(screen.queryByTestId('hospital-staff-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('patient-dashboard')).toBeInTheDocument();
  });

  it('prevents a DOCTOR from accessing hospital staff routes and redirects to doctor dashboard', () => {
    localStorage.setItem('vaxora_token', 'valid-doctor-jwt');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'doc-1',
        role: 'DOCTOR',
        status: 'Active',
      })
    );

    renderWithRouter('/hospital/staff', ['HOSPITAL', 'ADMIN']);

    expect(screen.queryByTestId('hospital-staff-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('doctor-dashboard')).toBeInTheDocument();
  });

  it('allows an Active HOSPITAL user to access /hospital/staff', () => {
    localStorage.setItem('vaxora_token', 'valid-hospital-jwt');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'hosp-1',
        role: 'HOSPITAL',
        status: 'Active',
      })
    );

    renderWithRouter('/hospital/staff', ['HOSPITAL', 'ADMIN']);

    expect(screen.getByTestId('hospital-staff-content')).toBeInTheDocument();
  });

  it('blocks pending HOSPITAL accounts from staff routes and sends them to login', () => {
    localStorage.setItem('vaxora_token', 'pending-hosp-jwt');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'hosp-pending',
        role: 'HOSPITAL',
        status: 'Pending',
      })
    );

    renderWithRouter('/hospital/staff', ['HOSPITAL', 'ADMIN']);

    expect(screen.queryByTestId('hospital-staff-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('allows an Active DOCTOR to access affiliations route', () => {
    localStorage.setItem('vaxora_token', 'valid-doctor-jwt');
    localStorage.setItem(
      'vaxora_user',
      JSON.stringify({
        id: 'doc-1',
        role: 'DOCTOR',
        status: 'Active',
      })
    );

    renderWithRouter('/doctor/affiliations', ['DOCTOR', 'NURSE']);

    expect(screen.getByTestId('doctor-affiliations-content')).toBeInTheDocument();
  });
});
