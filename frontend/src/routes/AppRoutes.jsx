import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../features/landing';
import { AuthPage } from '../features/auth';
import {
  PatientLayout,
  DashboardOverview,
  AppointmentsTab,
  VaccinationHistoryTab,
  FeedbackTab,
} from '../features/patient';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/forgot-password" element={<AuthPage />} />

      {/* Dedicated Patient Portal Routes */}
      <Route path="/patient" element={<PatientLayout />}>
        <Route index element={<Navigate to="/patient/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardOverview />} />
        <Route path="appointments" element={<AppointmentsTab />} />
        <Route path="vaccination-history" element={<VaccinationHistoryTab />} />
        <Route path="history" element={<Navigate to="/patient/vaccination-history" replace />} />
        <Route path="feedback" element={<FeedbackTab />} />
      </Route>

      {/* Catch-All Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
