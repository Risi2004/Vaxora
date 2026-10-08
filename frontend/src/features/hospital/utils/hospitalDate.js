/** Same offset as StaffManagementService.HospitalUtcOffset (Sri Lanka). */
const HOSPITAL_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function hospitalClock() {
  return new Date(Date.now() + HOSPITAL_OFFSET_MS);
}

export function hospitalToday() {
  const date = hospitalClock();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hospitalMinutesNow() {
  const date = hospitalClock();
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function addHospitalDays(dateInput, days) {
  const [year, month, day] = String(dateInput).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}
