/** Normalize appointment Status from the API for patient UI comparisons. */
export function normalizePatientAppointmentStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/**
 * Patient-facing status badge for appointments (label + colors).
 */
export function getPatientAppointmentStatusDisplay(status) {
  const s = normalizePatientAppointmentStatus(status);

  switch (s) {
    case 'confirmed':
    case 'accepted':
      return { label: 'Confirmed', backgroundColor: '#dcfce7', color: '#15803d' };
    case 'pendingpayment':
      return { label: 'Awaiting payment', backgroundColor: '#fef3c7', color: '#b45309' };
    case 'pending':
      return { label: 'Pending', backgroundColor: '#fef3c7', color: '#b45309' };
    case 'administering':
    case 'insession':
      return { label: 'In session', backgroundColor: '#e0f2fe', color: '#0369a1' };
    case 'observation':
      return { label: 'Observation', backgroundColor: '#f5f3ff', color: '#6d28d9' };
    case 'completed':
      return { label: 'Completed', backgroundColor: '#dcfce7', color: '#15803d' };
    case 'cancelled':
      return { label: 'Cancelled', backgroundColor: '#fee2e2', color: '#b91c1c' };
    case 'rejected':
      return { label: 'Rejected', backgroundColor: '#fee2e2', color: '#b91c1c' };
    default:
      return {
        label: status || 'Unknown',
        backgroundColor: '#f1f5f9',
        color: '#475569',
      };
  }
}

/** Patient can only cancel before the clinical session starts. */
export function canPatientCancelByStatus(status) {
  const s = normalizePatientAppointmentStatus(status);
  return (
    s === 'confirmed' ||
    s === 'accepted' ||
    s === 'pending' ||
    s === 'pendingpayment'
  );
}
