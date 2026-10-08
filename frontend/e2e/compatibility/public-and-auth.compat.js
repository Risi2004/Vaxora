import { test, expect } from '@playwright/test';
import {
  INVALID_PASSWORD,
  LIVE,
  MOCK_PASSWORD,
  ROLES,
  attachScreenshot,
  expectNoHorizontalOverflow,
  expectNoUncaughtErrors,
  isMobileLayout,
  loginThroughForm,
  mockApi,
  waitForApp,
  watchErrors,
} from './support.js';

test.describe('Public pages', () => {
  let errors;

  test.beforeEach(async ({ page }) => {
    errors = watchErrors(page);
    await mockApi(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await expectNoUncaughtErrors(errors, testInfo);
  });

  test('landing page renders and fits the screen', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForApp(page);

    await expect(page.locator('#home').first()).toBeAttached();
    await expectNoHorizontalOverflow(page);
    await attachScreenshot(page, testInfo, 'landing.png');
  });

  test('landing navigation works with pill nav (desktop) or hamburger (mobile)', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    if (isMobileLayout(page)) {
      const hamburger = page.getByRole('button', { name: 'Open Navigation Menu' });
      await expect(hamburger).toBeVisible();
      await expect(page.locator('.desktop-nav-pill')).toBeHidden();

      await hamburger.click();
      await expect(page.locator('.mobile-nav-drawer')).toBeVisible();
      await page.locator('.mobile-nav-drawer').getByRole('button', { name: 'About' }).click();
    } else {
      const nav = page.getByRole('navigation', { name: 'Main Navigation' });
      await expect(nav).toBeVisible();
      await nav.getByRole('button', { name: 'About' }).click();
      await expect(nav.getByRole('button', { name: 'About' })).toHaveClass(/active/);
    }
  });

  test('landing Log in link opens the login page', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    if (isMobileLayout(page)) {
      await page.getByRole('button', { name: 'Open Navigation Menu' }).click();
      await page.locator('.mobile-nav-drawer').getByRole('link', { name: /log in/i }).click();
    } else {
      await page.locator('.desktop-header-actions').getByRole('link', { name: /log in/i }).click();
    }

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  for (const path of ['/login', '/signup', '/forgot-password']) {
    test(`auth page ${path} renders and fits the screen`, async ({ page }, testInfo) => {
      await page.goto(path);
      await waitForApp(page);

      await expect(page.locator('.auth-container')).toBeVisible();
      await expect(page.locator('.auth-logo')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, `${path.slice(1)}.png`);
    });
  }

  test('signup role tabs switch the form', async ({ page }) => {
    await page.goto('/signup');
    await waitForApp(page);

    const tabs = page.getByRole('tablist', { name: 'Select role' });
    for (const role of ['Doctor', 'Nurse', 'Hospital', 'Patient']) {
      const tab = tabs.getByRole('tab', { name: role });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('unknown routes fall back to the landing page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Authentication', () => {
  let errors;

  test.beforeEach(async ({ page }) => {
    errors = watchErrors(page);
    await mockApi(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await expectNoUncaughtErrors(errors, testInfo);
  });

  test('login form accepts typing and toggles password visibility', async ({ page }) => {
    await page.goto('/login');
    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');

    await email.fill('someone@example.com');
    await password.fill('secret-value');
    await expect(email).toHaveValue('someone@example.com');
    await expect(password).toHaveValue('secret-value');
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('invalid credentials show an error and stay on login', async ({ page }) => {
    await loginThroughForm(page, ROLES.patient.live?.email || ROLES.patient.user.email, INVALID_PASSWORD);

    await expect(page.getByText(/invalid email address or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  const loginRoles = Object.entries(ROLES).filter(([, cfg]) => !LIVE || cfg.live);
  for (const [role, cfg] of loginRoles) {
    test(`${role} login redirects to the ${role} dashboard`, async ({ page }) => {
      const creds = LIVE ? cfg.live : { email: cfg.user.email, password: MOCK_PASSWORD };
      await loginThroughForm(page, creds.email, creds.password);

      await expect(page).toHaveURL(new RegExp(`/${role}/dashboard`), { timeout: 20000 });
    });
  }

  test('protected pages redirect signed-out users to login', async ({ page }) => {
    for (const path of ['/patient/appointments', '/hospital/staff', '/doctor/patients', '/nurse/dashboard', '/admin/users']) {
      await page.goto(path);
      await expect(page, `${path} should require login`).toHaveURL(/\/login/);
    }
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});
