import { test, expect } from '@playwright/test';

const TEST_PATIENT = {
  email: 'patient1@vaxora.lk',
  password: 'Password123!',
  name: 'Kamal Perera',
};

test.describe('Vaxora E2E Testing Suite', () => {
  // Always ensure a clean dialog handler and stub PayHere so payment modal doesn't block automated flow
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      console.log(`[Dialog ${dialog.type()}]: ${dialog.message()}`);
      await dialog.accept();
    });

    await page.addInitScript(() => {
      window.payhere = {
        startPayment: (payment) => {
          console.log('[Mock PayHere SDK] startPayment initiated with payload:', payment);
        },
      };
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Successful Login
  // ---------------------------------------------------------------------------
  test('1. Successful login with valid patient credentials', async ({ page }) => {
    await page.goto('/login');

    // Verify login page loaded
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Fill credentials
    await page.fill('input[name="email"]', TEST_PATIENT.email);
    await page.fill('input[name="password"]', TEST_PATIENT.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Verify redirection to patient dashboard
    await expect(page).toHaveURL(/\/patient\/dashboard/);

    // Verify patient dashboard heading or user name is visible
    await expect(page.locator('.navbar-user-name')).toContainText('Kamal Perera');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 2. Invalid Login
  // ---------------------------------------------------------------------------
  test('2. Invalid login with incorrect password displays error message', async ({ page }) => {
    await page.goto('/login');

    // Fill invalid credentials
    await page.fill('input[name="email"]', TEST_PATIENT.email);
    await page.fill('input[name="password"]', 'WrongPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify error message is rendered
    const errorAlert = page.getByText(/invalid email address or password/i);
    await expect(errorAlert).toBeVisible();

    // Verify user remains on /login
    await expect(page).toHaveURL(/\/login/);
  });

  // ---------------------------------------------------------------------------
  // 3. Successful Vaccine Booking
  // ---------------------------------------------------------------------------
  test('3. Successful vaccine booking workflow', async ({ page }) => {
    // Step 1: Login
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_PATIENT.email);
    await page.fill('input[name="password"]', TEST_PATIENT.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/patient\/dashboard/);

    // Step 2: Open Booking Management
    await page.goto('/patient/appointments');
    await expect(page).toHaveURL(/\/patient\/appointments/);

    // Verify Appointments page structure
    await expect(page.locator('.book-appointment-heading')).toHaveText('Book a New Appointment');
    await expect(page.locator('.appointments-section-heading')).toHaveText('Appointments');

    // Step 3: Select Vaccine
    const vaccineSelect = page.locator('#select-vaccine');
    await expect(vaccineSelect).toBeEnabled();
    // Wait for options to load from API
    await expect(vaccineSelect.locator('option')).not.toHaveCount(1, { timeout: 15000 });
    await vaccineSelect.selectOption({ label: 'AstraZeneca (routine)' });

    // Step 4: Select Hospital
    const hospitalSelect = page.locator('#select-hospital');
    await expect(hospitalSelect).toBeEnabled({ timeout: 10000 });
    // Select the first available hospital
    const hospitalOptions = hospitalSelect.locator('option:not([disabled])');
    await expect(hospitalOptions.first()).toBeAttached();
    const hospitalValue = await hospitalOptions.first().getAttribute('value');
    if (hospitalValue) {
      await hospitalSelect.selectOption(hospitalValue);
    }

    // Step 5: Select Date from interactive calendar
    const dateTrigger = page.locator('#select-date-trigger');
    await expect(dateTrigger).toBeEnabled({ timeout: 10000 });
    await dateTrigger.click();

    // Verify calendar popup opens
    const calPopup = page.locator('.cal-popup-card');
    await expect(calPopup).toBeVisible();

    // Select the first available date in the calendar
    const availableDateCell = calPopup.locator('.cal-cell.available').first();
    await expect(availableDateCell).toBeVisible();
    await availableDateCell.click();

    // Verify date is selected (selected detail card or trigger text updated)
    await expect(page.locator('.cal-selection-detail-card')).toBeVisible();

    // Step 6: Select 20-minute Time Slot
    const slotSelect = page.locator('#select-time');
    await expect(slotSelect).toBeEnabled({ timeout: 10000 });
    const availableSlotOption = slotSelect.locator('option:not([disabled])').first();
    await expect(availableSlotOption).toBeAttached();
    const slotValue = await availableSlotOption.getAttribute('value');
    if (slotValue) {
      await slotSelect.selectOption(slotValue);
    }

    // Step 7: Submit Booking
    const bookButton = page.locator('button.btn-book-appointment');
    await expect(bookButton).toBeEnabled();
    await bookButton.click();

    // Step 8: Verify the booking appears in the Appointments table
    const table = page.locator('.custom-appointments-table');
    await expect(table).toBeVisible();

    // Look for row matching AstraZeneca
    const bookingRow = table.locator('tbody tr').filter({ hasText: 'AstraZeneca' }).first();
    await expect(bookingRow).toBeVisible({ timeout: 15000 });
    await expect(bookingRow.locator('.td-vaccine')).toContainText('AstraZeneca');
    await expect(bookingRow.locator('.td-location')).toContainText('Royal Hospitals');
  });

  // ---------------------------------------------------------------------------
  // 4. Booking Cancellation
  // ---------------------------------------------------------------------------
  test('4. Booking cancellation workflow', async ({ page }) => {
    // Step 1: Login
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_PATIENT.email);
    await page.fill('input[name="password"]', TEST_PATIENT.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/patient\/dashboard/);

    // Step 2: Open Booking Management
    await page.goto('/patient/appointments');
    await expect(page).toHaveURL(/\/patient\/appointments/);

    // Step 3: Find existing booking with Cancel button
    const table = page.locator('.custom-appointments-table');
    await expect(table).toBeVisible();

    const bookingRow = table.locator('tbody tr').filter({ hasText: 'AstraZeneca' }).first();
    await expect(bookingRow).toBeVisible({ timeout: 15000 });

    const cancelButton = bookingRow.locator('.btn-cancel-appointment');
    await expect(cancelButton).toBeVisible();

    // Step 4: Click Cancel (window.confirm handled in beforeEach)
    await cancelButton.click();

    // Step 5: Verify cancellation toast / notification appears
    const alertPill = page.locator('.appointment-alert-pill');
    await expect(alertPill).toBeVisible({ timeout: 10000 });
    await expect(alertPill).toContainText(/cancelled successfully/i);

    // Step 6: Verify booking row status is updated or cancelled
    await expect(
      bookingRow.locator('.td-action').filter({ hasText: /cancelled/i })
    ).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // 5. Protected Page Access
  // ---------------------------------------------------------------------------
  test('5. Protected page access redirects unauthenticated users to login', async ({ browser }) => {
    // Create an isolated fresh browser context without any stored auth credentials
    const freshContext = await browser.newContext();
    const unauthPage = await freshContext.newPage();

    // Attempt to access protected Booking Management page directly
    await unauthPage.goto('/patient/appointments');

    // Verify redirected to /login
    await expect(unauthPage).toHaveURL(/\/login/);

    // Verify login form is visible
    await expect(unauthPage.locator('input[name="email"]')).toBeVisible();
    await expect(unauthPage.locator('input[name="password"]')).toBeVisible();
    await expect(unauthPage.locator('.btn-auth-submit')).toBeVisible();

    await freshContext.close();
  });
});
