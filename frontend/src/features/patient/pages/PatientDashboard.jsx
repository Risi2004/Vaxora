import React, { useState } from 'react';
import {
  PatientNavbar,
  DashboardOverview,
  AppointmentsTab,
  VaccinationHistoryTab,
  FeedbackTab,
  BookAppointmentModal,
} from '../components';

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState('appointments');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  const handleOpenBookModal = () => {
    setIsBookModalOpen(true);
  };

  const handleCloseBookModal = () => {
    setIsBookModalOpen(false);
  };

  const handleBookSuccess = (appointmentData) => {
    // Navigate to appointments tab so user sees confirmation
    setActiveTab('appointments');
  };

  return (
    <div className="patient-dashboard-container">
      {/* 1. Patient Portal Header & Navigation */}
      <PatientNavbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 2. Main Tab Content Container */}
      <main className="patient-main-content">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            onNavigateTab={setActiveTab}
            onOpenBookModal={handleOpenBookModal}
          />
        )}

        {activeTab === 'appointments' && (
          <AppointmentsTab onOpenBookModal={handleOpenBookModal} />
        )}

        {activeTab === 'history' && <VaccinationHistoryTab />}

        {activeTab === 'feedback' && <FeedbackTab />}
      </main>

      {/* 3. Book Vaccination Modal */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={handleCloseBookModal}
        onBookSuccess={handleBookSuccess}
      />

      {/* 4. Patient Portal Footer matching screenshot */}
      <footer className="patient-portal-footer">
        <p className="patient-footer-line-1">
          Vaxora | Making Vaccination booking simple &amp; secure
        </p>
        <p className="patient-footer-line-2">
          @{new Date().getFullYear()} Vaxora. All rights reserved
        </p>
      </footer>
    </div>
  );
}
