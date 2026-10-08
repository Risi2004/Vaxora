import { expect } from '@playwright/test';

/**
 * Shared helpers for the cross-browser / cross-device compatibility suite.
 *
 * By default every /api call is answered by an in-memory mock so the suite
 * checks how the React app behaves in each browser engine, independent of
 * backend data. Set COMPAT_LIVE=1 to hit the real API instead (only roles
 * with seeded accounts are exercised in that mode).
 */

export const LIVE = process.env.COMPAT_LIVE === '1';

// Width at which every navbar swaps the pill navigation for a hamburger menu.
export const MOBILE_NAV_BREAKPOINT = 860;

export const ROLES = {
  patient: {
    user: {
      id: 'compat-patient-1',
      name: 'Kamal Perera',
      email: 'patient@compat.test',
      role: 'PATIENT',
      status: 'Active',
      registrationNumber: 'VAX-P-00001',
      nicNumber: '199512345678',
    },
    live: { email: 'patient1@vaxora.lk', password: 'Password123!' },
    navLabel: 'Patient Portal Navigation',
    pages: [
      { path: '/patient/dashboard', nav: 'Home' },
      { path: '/patient/appointments', nav: 'Appointments' },
      { path: '/patient/vaccination-history', nav: 'Patient history' },
      { path: '/patient/feedback', nav: 'Feedback' },
      { path: '/patient/profile' },
    ],
  },
  hospital: {
    user: {
      id: 'compat-hospital-1',
      name: 'Royal Hospitals',
      email: 'hospital@compat.test',
      role: 'HOSPITAL',
      status: 'Active',
      registrationNumber: 'VAX-H-00001',
    },
    live: { email: 'hospital@vaxora.local', password: 'Hospital@123' },
    navLabel: 'Hospital Portal Navigation',
    pages: [
      { path: '/hospital/dashboard', nav: 'Home' },
      { path: '/hospital/appointments', nav: 'Appointments' },
      { path: '/hospital/inventory', nav: 'Inventory' },
      { path: '/hospital/staff', nav: 'Staff' },
      { path: '/hospital/booths', nav: 'Booths' },
      { path: '/hospital/feedback', nav: 'Feedback' },
      { path: '/hospital/profile' },
    ],
  },
  doctor: {
    user: {
      id: 'compat-doctor-1',
      name: 'Dr. Nimal Silva',
      email: 'doctor@compat.test',
      role: 'DOCTOR',
      status: 'Active',
      registrationNumber: 'VAX-D-00001',
    },
    live: null,
    navLabel: 'Doctor Portal Navigation',
    pages: [
      { path: '/doctor/dashboard', nav: 'Home' },
      { path: '/doctor/appointments', nav: 'Appointments' },
      { path: '/doctor/patients', nav: 'Patient history' },
      { path: '/doctor/affiliations', nav: 'Affiliations' },
      { path: '/doctor/feedback', nav: 'Feedback' },
      { path: '/doctor/profile' },
    ],
  },
  nurse: {
    user: {
      id: 'compat-nurse-1',
      name: 'Nurse Kumari Fernando',
      email: 'nurse@compat.test',
      role: 'NURSE',
      status: 'Active',
      registrationNumber: 'VAX-N-00001',
    },
    live: null,
    navLabel: 'Nurse Portal Navigation',
    pages: [
      { path: '/nurse/dashboard', nav: 'Home' },
      { path: '/nurse/appointments', nav: 'Appointments' },
      { path: '/nurse/patients', nav: 'Patient history' },
      { path: '/nurse/affiliations', nav: 'Affiliations' },
      { path: '/nurse/feedback', nav: 'Feedback' },
      { path: '/nurse/profile' },
    ],
  },
  admin: {
    user: {
      id: 'compat-admin-1',
      name: 'System Administrator',
      email: 'admin@compat.test',
      role: 'ADMIN',
      status: 'Active',
    },
    live: { email: 'admin@vaxora.health.gov.lk', password: 'Admin@Vaxora2026' },
    // The admin portal uses a collapsible sidebar instead of the top navbar.
    navLabel: 'Admin Navigation',
    menuButton: 'Open Menu',
    mobileBreakpoint: 1024,
    drawer: '.admin-dark-sidebar',
    pages: [
      { path: '/admin/dashboard', nav: 'Dashboard' },
      { path: '/admin/users', nav: 'Users Directory' },
      { path: '/admin/approvals', nav: 'Approvals Queue' },
      { path: '/admin/feedback', nav: 'Feedback & Inquiries' },
      { path: '/admin/audit', nav: 'System Audit Logs' },
      { path: '/admin/profile', nav: 'Admin Settings' },
    ],
  },
};

// Layout defaults shared by the patient, hospital, doctor and nurse top navbars.
const NAVBAR_LAYOUT = {
  menuButton: 'Open Navigation Menu',
  mobileBreakpoint: 860,
  drawer: '.portal-mobile-drawer',
};

/** Navigation layout for a role, with navbar defaults filled in. */
export function layoutFor(role) {
  return { ...NAVBAR_LAYOUT, ...ROLES[role] };
}

export const INVALID_PASSWORD = 'WrongPassword!1';
export const MOCK_PASSWORD = 'Compat@12345';

// GET endpoints whose responses are objects rather than lists.
const OBJECT_RESPONSES = {
  '/inventory/summary': {},
  '/admin/verification/dashboard-stats': {},
  '/schedule/stock-horizon': {},
  '/staff/shift-swaps/quota': {},
  '/feedback/public/random': [],
};

function userForEmail(email) {
  return Object.values(ROLES).find((r) => r.user.email === email)?.user;
}

function json(route, status, body) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** Answer every /api request from memory. `role` is the signed-in role, if any. */
export async function mockApi(page, role) {
  if (LIVE) return;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    const currentUser = role ? ROLES[role].user : null;

    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = request.postDataJSON() || {};
      const user = userForEmail(email);
      if (!user || password !== MOCK_PASSWORD) {
        return json(route, 401, { message: 'Invalid email address or password.' });
      }
      return json(route, 200, { token: `compat-token-${user.role}`, refreshToken: 'compat-refresh', user });
    }
    if (path === '/auth/refresh-token') return json(route, 401, { message: 'Session expired.' });
    if (path === '/auth/logout') return json(route, 200, { success: true });
    if (path === '/auth/me' || (path === '/auth/profile' && method === 'GET')) {
      return currentUser ? json(route, 200, currentUser) : json(route, 401, { message: 'Unauthorized' });
    }

    if (method === 'GET') {
      const key = Object.keys(OBJECT_RESPONSES).find((p) => path.startsWith(p));
      return json(route, 200, key ? OBJECT_RESPONSES[key] : []);
    }
    return json(route, 200, { success: true });
  });
}

/** Sign in without the login form by writing the session the app reads. */
export async function seedSession(page, role) {
  if (LIVE) {
    await loginThroughForm(page, ROLES[role].live.email, ROLES[role].live.password);
    return;
  }
  const { user } = ROLES[role];
  await page.goto('/login');
  await page.evaluate((u) => {
    localStorage.setItem('vaxora_token', `compat-token-${u.role}`);
    localStorage.setItem('vaxora_refresh_token', 'compat-refresh');
    localStorage.setItem('vaxora_user', JSON.stringify(u));
  }, user);
}

export async function loginThroughForm(page, email, password) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button.btn-auth-submit').click();
}

/** Collect uncaught exceptions; console errors are kept as diagnostics only. */
export function watchErrors(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (err) => pageErrors.push(`${err.name}: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  return { pageErrors, consoleErrors };
}

export async function expectNoUncaughtErrors(errors, testInfo) {
  if (errors.consoleErrors.length) {
    await testInfo.attach('console-errors.txt', {
      body: errors.consoleErrors.join('\n'),
      contentType: 'text/plain',
    });
  }
  expect(errors.pageErrors, 'uncaught JavaScript errors').toEqual([]);
}

export function isMobileLayout(page, breakpoint = MOBILE_NAV_BREAKPOINT) {
  return (page.viewportSize()?.width ?? 1280) <= breakpoint;
}

/** Fails when content is wider than the viewport (horizontal scroll). */
export async function expectNoHorizontalOverflow(page) {
  const { scrollWidth, clientWidth, maxRightEl, overflowElements } = await page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const all = Array.from(document.querySelectorAll('*'));
    let maxR = { r: 0, tag: '', cls: '', scrollWidth: 0, text: '' };
    all.forEach((el) => {
      const r = el.getBoundingClientRect().right;
      if (r > maxR.r) {
        maxR = {
          r,
          tag: el.tagName,
          cls: (typeof el.className === 'string' ? el.className : ''),
          scrollWidth: el.scrollWidth,
          text: el.innerText ? el.innerText.slice(0, 30) : '',
        };
      }
    });
    const overflowElements = all
      .filter((el) => el.scrollWidth > cw + 1 && el.tagName !== 'HTML' && el.tagName !== 'BODY')
      .map((el) => ({
        tag: el.tagName,
        cls: (typeof el.className === 'string' ? el.className : ''),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        offsetWidth: el.offsetWidth,
        rectRight: el.getBoundingClientRect().right,
        text: el.innerText ? el.innerText.slice(0, 30) : '',
      }));
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: cw,
      maxRightEl: maxR,
      overflowElements,
    };
  });
  if (scrollWidth > clientWidth + 1) {
    console.log('[OVERFLOW ELEMENTS]:', JSON.stringify(overflowElements, null, 2));
  }
  expect(scrollWidth, `page is ${scrollWidth}px wide in a ${clientWidth}px viewport. Culprit: ${JSON.stringify(maxRightEl)}`).toBeLessThanOrEqual(
    clientWidth + 1
  );
}

export async function attachScreenshot(page, testInfo, name) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

/** Wait for the SPA to settle: network quiet and React has rendered something. */
export async function waitForApp(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('#root > *').first()).toBeVisible();
}
