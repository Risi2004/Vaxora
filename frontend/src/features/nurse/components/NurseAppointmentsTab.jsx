import React from 'react';
import StaffAppointmentsPanel from '../../staff/components/StaffAppointmentsPanel';

export default function NurseAppointmentsTab() {
  return (
    <StaffAppointmentsPanel
      allowHospitalSwitch
      facilitySuffix=" - Nursing Station"
    />
  );
}
