
import StaffSubpageHeader from '../../staff/components/StaffSubpageHeader';

export default function PatientSubpageHeader({ title, subtitle }) {
  return (
    <StaffSubpageHeader
      eyebrow="Patient portal"
      title={title}
      subtitle={subtitle}
    />
  );
}
