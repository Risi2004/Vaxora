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
  PatientProfileTab,
} from '../features/patient';

import {
  HospitalLayout,
  HospitalDashboardOverview,
  HospitalAppointmentsTab,
  HospitalInventoryTab,
  HospitalStaffTab,
  HospitalProfileTab,
  FeedbackTab as HospitalFeedbackTab,
} from '../features/hospital';

import {
  DoctorLayout,
  DoctorDashboardOverview,
  DoctorAppointmentsTab,
  DoctorPatientsTab,
  DoctorProfileTab,
  FeedbackTab as DoctorFeedbackTab,
} from '../features/doctor';

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
        <Route path="profile" element={<PatientProfileTab />} />
      </Route>

      {/* Dedicated Hospital Portal Routes */}
      <Route path="/hospital" element={<HospitalLayout />}>
        <Route index element={<Navigate to="/hospital/dashboard" replace />} />
        <Route path="dashboard" element={<HospitalDashboardOverview />} />
        <Route path="appointments" element={<HospitalAppointmentsTab />} />
        <Route path="inventory" element={<HospitalInventoryTab />} />
        <Route path="staff" element={<HospitalStaffTab />} />
        <Route path="feedback" element={<HospitalFeedbackTab />} />
        <Route path="profile" element={<HospitalProfileTab />} />
      </Route>

      {/* Dedicated Doctor Portal Routes */}
      <Route path="/doctor" element={<DoctorLayout />}>
        <Route index element={<Navigate to="/doctor/dashboard" replace />} />
        <Route path="dashboard" element={<DoctorDashboardOverview />} />
        <Route path="appointments" element={<DoctorAppointmentsTab />} />
        <Route path="patients" element={<DoctorPatientsTab />} />
        <Route path="patient-history" element={<Navigate to="/doctor/patients" replace />} />
        <Route path="history" element={<Navigate to="/doctor/patients" replace />} />
        <Route path="feedback" element={<DoctorFeedbackTab />} />
        <Route path="profile" element={<DoctorProfileTab />} />
      </Route>

      {/* Catch-All Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
