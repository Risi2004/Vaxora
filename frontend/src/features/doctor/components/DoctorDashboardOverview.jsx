import StaffClinicalDashboard from '../../staff/components/StaffClinicalDashboard';
import ClinicalAdministerModal from './ClinicalAdministerModal';
import AefiReportModal from './AefiReportModal';
import doctorHomeHero from '../../../assets/images/doctor-home-hero.jpg';

function formatDoctorName(user) {
  const raw = (user?.name || '').trim();
  if (!raw) return 'Doctor';
  if (/^dr\.?\s/i.test(raw)) return raw;
  return `Dr. ${raw}`;
}

export default function DoctorDashboardOverview() {
  return (
    <StaffClinicalDashboard
      formatTitle={formatDoctorName}
      heroImage={doctorHomeHero}
      spotlightBadge="Active Clinical Consultation"
      allowHospitalSwitch
      AdministerModal={ClinicalAdministerModal}
      AefiModal={AefiReportModal}
    />
  );
}
