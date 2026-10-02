import React from 'react';
import HospitalBoothsPanel from './HospitalBoothsPanel';
import HospitalSubpageHero from './HospitalSubpageHero';

export default function HospitalBoothsTab() {
  return (
    <div className="hospital-dashboard-tab">
      <HospitalSubpageHero
        eyebrow="Clinic operations"
        title="Vaccination booths"
        subtitle="Configure booth capacity and the vaccine products each station can administer."
      />
      <HospitalBoothsPanel />
    </div>
  );
}
