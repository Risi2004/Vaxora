/** Normalize appointment Status from the API for comparisons. */
export function normalizeAppointmentStatus(dbStatus) {
  return String(dbStatus || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/**
 * Map DB appointment status → hospital queue bucket.
 * Paid Confirmed stays in waiting. Unpaid PendingPayment is desk-held.
 */
export function mapDbStatusToQueueStatus(dbStatus) {
  const s = normalizeAppointmentStatus(dbStatus);
  if (s === 'completed') return 'completed';
  if (s === 'observation') return 'observation';
  if (s === 'administering' || s === 'insession') return 'administering';
  if (s === 'cancelled' || s === 'rejected') return 'cancelled';
  if (s === 'pendingpayment') return 'awaiting_payment';
  return 'waiting';
}

export function mapQueueStatusToDbStatus(queueStatus) {
  if (queueStatus === 'completed') return 'Completed';
  if (queueStatus === 'observation') return 'Observation';
  if (queueStatus === 'administering') return 'Administering';
  if (queueStatus === 'cancelled') return 'Cancelled';
  if (queueStatus === 'awaiting_payment') return 'PendingPayment';
  return 'Confirmed';
}

export function queueStatusLabel(status) {
  if (status === 'waiting') return 'Waiting';
  if (status === 'awaiting_payment') return 'Awaiting payment';
  if (status === 'administering') return 'In Session';
  if (status === 'observation') return 'Observation';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return status || 'Unknown';
}

/**
 * Display model for the hospital Appointments manage table Action column.
 * Returns { kind, label, tone } where kind is:
 * 'actions-pending' | 'actions-payment' | 'badge' | 'badge-cancel'
 */
export function getAppointmentActionDisplay(dbStatus) {
  const s = normalizeAppointmentStatus(dbStatus);

  // Legacy hospital-approval status (rarely used today).
  if (s === 'pending') {
    return { kind: 'actions-pending', label: 'Pending', tone: 'pending' };
  }
  // Paid bookings waiting for PayHere / desk payment — hospital can record cash payment.
  if (s === 'pendingpayment') {
    return { kind: 'actions-payment', label: 'Awaiting payment', tone: 'pending' };
  }
  if (s === 'confirmed' || s === 'accepted') {
    return { kind: 'badge-cancel', label: 'Confirmed ✓', tone: 'accepted' };
  }
  if (s === 'administering' || s === 'insession') {
    return { kind: 'badge', label: 'Administering', tone: 'info' };
  }
  if (s === 'observation') {
    return { kind: 'badge', label: 'Observation', tone: 'info' };
  }
  if (s === 'completed') {
    return { kind: 'badge', label: 'Completed', tone: 'accepted' };
  }
  if (s === 'cancelled') {
    return { kind: 'badge', label: 'Cancelled ✕', tone: 'rejected' };
  }
  if (s === 'rejected') {
    return { kind: 'badge', label: 'Rejected ✕', tone: 'rejected' };
  }

  return { kind: 'badge', label: dbStatus || 'Unknown', tone: 'pending' };
}
