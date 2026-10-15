import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from '../testAccounts.js';

// Full staff workflow across two roles, React UI against the real API and database:
// hospital invites a doctor -> doctor accepts -> hospital rosters the doctor onto a
// posted vaccine session -> doctor sees the shift on their own shifts page.
//
// Setup the UI cannot do quickly (a new approved doctor, a booth, a posted session) is
// made through the API first. Every run creates its own doctor, booth and session, so
// run it against the isolated test API (scratch\run-staff-tests.ps1), never the shared
// database.

const API = (process.env.E2E_API_URL || 'http://localhost:5055').replace(/\/+$/, '');
const VACCINE = 'Hepatitis B Recombinant';

/** yyyy-mm-dd in hospital time (Asia/Colombo, UTC+5:30), N days from today. */
function hospitalDate(daysAhead) {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000 + daysAhead * 86400000);
  return d.toISOString().slice(0, 10);
}

async function api(request, method, path, { token, data, multipart } = {}) {
  const res = await request.fetch(`${API}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data,
    multipart,
  });
  const body = await res.text();
  if (!res.ok()) throw new Error(`${method} ${path} -> ${res.status()}: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

async function apiLogin(request, email, password) {
  const data = await api(request, 'POST', '/api/Auth/login', { data: { email, password } });
  return data.token;
}

async function uiLogin(page, email, password, landing) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(landing, { timeout: 20000 });
}

test('Hospital invites a doctor, rosters them on a session, and the doctor sees the shift', async ({ browser, request }) => {
  test.setTimeout(180000);

  const run = randomUUID().slice(0, 6).toUpperCase();
  const doctor = {
    email: `e2e.doctor.${run.toLowerCase()}@vaxora.test`,
    password: `E2e-${randomUUID()}`,
    name: `E2E Doctor ${run}`,
  };
  const booth = { code: `E${run.slice(0, 4)}`, name: `E2E Booth ${run}` };
  const sessionDate = hospitalDate(3);

  // ---------- Arrange (API): approved doctor, booth and posted session ----------
  const adminToken = await apiLogin(request, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
  const hospitalToken = await apiLogin(request, TEST_ACCOUNTS.hospital.email, TEST_ACCOUNTS.hospital.password);

  await api(request, 'POST', '/api/Auth/signup/doctor', {
    multipart: {
      Email: doctor.email,
      Password: doctor.password,
      FullName: doctor.name,
      SlmcNumber: `SLMC-E2E-${run}`,
      Specialization: 'General Practitioner',
      PhoneNumber: '0770000000',
    },
  });
  const pending = await api(request, 'GET', '/api/admin/verification/pending', { token: adminToken });
  const doctorRow = pending.find((u) => (u.email || '').toLowerCase() === doctor.email);
  expect(doctorRow, 'new doctor should be waiting for admin approval').toBeTruthy();
  await api(request, 'POST', `/api/admin/verification/decide/${doctorRow.userId}`, {
    token: adminToken,
    data: { decision: 'Approve', reason: 'E2E test account' },
  });

  const vaccines = await api(request, 'GET', '/api/Inventory/vaccines');
  const vaccine = vaccines.find((v) => v.name === VACCINE);
  expect(vaccine, `${VACCINE} should be in the national vaccine list`).toBeTruthy();

  // A session can only be posted for a vaccine on the hospital's formulary that it has in stock.
  const formulary = await api(request, 'GET', '/api/Inventory/formulary', { token: hospitalToken });
  if (!formulary.some((f) => f.vaccineName === VACCINE)) {
    await api(request, 'POST', '/api/Inventory/formulary', { token: hospitalToken, data: { vaccineName: VACCINE, price: 0 } });
  }
  await api(request, 'POST', '/api/Inventory/batches', {
    token: hospitalToken,
    data: {
      vaccineName: VACCINE,
      lotNumber: `E2E-${run}`,
      quantity: 20,
      supplier: 'E2E Supplier',
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    },
  });

  await api(request, 'POST', '/api/staff/booths', {
    token: hospitalToken,
    data: { code: booth.code, name: booth.name, vaccineIds: [vaccine.id] },
  });
  const booths = await api(request, 'GET', '/api/staff/booths', { token: hospitalToken });
  const createdBooth = booths.find((b) => b.code === booth.code);
  expect(createdBooth).toBeTruthy();

  await api(request, 'POST', '/api/Schedule', {
    token: hospitalToken,
    data: {
      boothId: createdBooth.boothId,
      vaccineId: vaccine.id,
      vaccineName: VACCINE,
      scheduleType: 'OneTime',
      specificDate: sessionDate,
      startTime: '09:00',
      endTime: '11:00',
    },
  });

  const hospitalContext = await browser.newContext();
  const doctorContext = await browser.newContext();
  const hospitalPage = await hospitalContext.newPage();
  const doctorPage = await doctorContext.newPage();

  try {
    // ---------- 1. Hospital invites the doctor (UI) ----------
    await uiLogin(hospitalPage, TEST_ACCOUNTS.hospital.email, TEST_ACCOUNTS.hospital.password, /\/hospital\//);
    await hospitalPage.goto('/hospital/staff');
    await hospitalPage.getByRole('button', { name: /add new staff/i }).click();
    await hospitalPage.getByPlaceholder(/e\.g\. Kasun/i).fill(doctor.email);
    await hospitalPage.getByRole('button', { name: new RegExp(doctor.name) }).click();
    await expect(hospitalPage.locator('strong', { hasText: doctor.name })).toBeVisible();
    await hospitalPage.getByRole('button', { name: /send request/i }).click();
    await expect(hospitalPage.getByRole('heading', { name: /add new staff/i })).toBeHidden({ timeout: 15000 });

    // ---------- 2. Doctor accepts the invitation (UI) ----------
    await uiLogin(doctorPage, doctor.email, doctor.password, /\/doctor\//);
    await doctorPage.goto('/doctor/hospitals');
    await doctorPage.getByRole('tab', { name: /pending invites/i }).click();
    await expect(doctorPage.getByText(/pending invitations \(1\)/i)).toBeVisible({ timeout: 15000 });
    const invite = doctorPage.locator('.staff-affil-item-card', { hasText: 'Test Hospital' });
    await invite.getByRole('button', { name: /^accept$/i }).click();
    await expect(doctorPage.getByText(/invitation accepted/i)).toBeVisible();
    // A doctor is asked for their availability right after joining; leaving it unset means always available.
    await doctorPage.getByRole('button', { name: /^cancel$/i }).click();

    // ---------- 3. Hospital rosters the doctor onto the posted session (UI) ----------
    await hospitalPage.goto('/hospital/roster');
    await hospitalPage.getByRole('tab', { name: /shifts/i }).click();
    await hospitalPage.getByRole('button', { name: /\+ add shift/i }).click();
    await hospitalPage.locator('#shift-filter-date').fill(sessionDate);

    const sessionSelect = hospitalPage.locator('#shift-session');
    const sessionOption = sessionSelect.locator('option', { hasText: booth.name });
    await expect(sessionOption).toHaveCount(1, { timeout: 15000 });
    await sessionSelect.selectOption(await sessionOption.getAttribute('value'));

    const doctorSelect = hospitalPage.locator('#shift-session-DOCTOR');
    const doctorOption = doctorSelect.locator('option', { hasText: doctor.name });
    await expect(doctorOption).toHaveCount(1, { timeout: 15000 });
    await doctorSelect.selectOption(await doctorOption.getAttribute('value'));

    await hospitalPage.getByRole('button', { name: /create shift/i }).click();
    await expect(hospitalPage.getByText(/shift created/i)).toBeVisible({ timeout: 15000 });

    // ---------- 4. Doctor sees the new shift on My shifts (UI) ----------
    await doctorPage.goto('/doctor/shifts');
    const shiftCard = doctorPage.locator('.staff-shift-card', { hasText: booth.name });
    for (let week = 0; week < 2 && !(await shiftCard.isVisible().catch(() => false)); week++) {
      await doctorPage.waitForLoadState('networkidle');
      if (await shiftCard.isVisible().catch(() => false)) break;
      await doctorPage.getByRole('button', { name: /next week/i }).click();
    }
    await expect(shiftCard).toBeVisible({ timeout: 15000 });
    await expect(shiftCard).toContainText('09:00');
    await expect(shiftCard).toContainText('Test Hospital');

    // ---------- Assert (API + database): the shift really was saved for this doctor ----------
    const doctorToken = await apiLogin(request, doctor.email, doctor.password);
    const mine = await api(request, 'GET', `/api/staff/shifts/mine?from=${sessionDate}&to=${sessionDate}`, { token: doctorToken });
    expect(mine).toHaveLength(1);
    expect(String(mine[0].shiftDate).slice(0, 10)).toBe(sessionDate);
    expect(String(mine[0].startTime)).toMatch(/^09:00/);
    expect(String(mine[0].endTime)).toMatch(/^11:00/);
    expect(mine[0].boothOrStation).toContain(booth.name);
  } finally {
    await hospitalContext.close();
    await doctorContext.close();
  }
});
