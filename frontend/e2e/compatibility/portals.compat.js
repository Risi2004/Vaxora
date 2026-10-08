import { test, expect } from '@playwright/test';
import {
  LIVE,
  ROLES,
  attachScreenshot,
  expectNoHorizontalOverflow,
  expectNoUncaughtErrors,
  isMobileLayout,
  layoutFor,
  mockApi,
  seedSession,
  waitForApp,
  watchErrors,
} from './support.js';

/**
 * Every signed-in page of every portal, in every configured browser/device:
 * renders without uncaught errors, shows the right navigation for the screen
 * size, does not scroll sideways, and the menu / logout work.
 */
for (const role of Object.keys(ROLES)) {
  const cfg = layoutFor(role);

  test.describe(`${role} portal`, () => {
    test.skip(LIVE && !cfg.live, `no seeded ${role} account for live mode`);

    let errors;
    const compact = (page) => isMobileLayout(page, cfg.mobileBreakpoint);
    const nav = (page) => page.getByRole('navigation', { name: cfg.navLabel });
    const menuButton = (page) => page.getByRole('button', { name: cfg.menuButton });

    test.beforeEach(async ({ page }) => {
      errors = watchErrors(page);
      await mockApi(page, role);
      await seedSession(page, role);
    });

    test.afterEach(async ({ page }, testInfo) => {
      await expectNoUncaughtErrors(errors, testInfo);
    });

    for (const { path } of cfg.pages) {
      test(`${path} renders correctly`, async ({ page }, testInfo) => {
        await page.goto(path);
        await waitForApp(page);

        await expect(page).toHaveURL(new RegExp(`${path}$`));

        if (compact(page)) {
          await expect(menuButton(page)).toBeVisible();
          await expect(nav(page)).not.toBeInViewport();
        } else {
          await expect(nav(page)).toBeVisible();
          await expect(nav(page)).toBeInViewport();
        }

        await expectNoHorizontalOverflow(page);
        await attachScreenshot(page, testInfo, `${path.replaceAll('/', '_').slice(1)}.png`);
      });
    }

    test('navigation reaches every section', async ({ page }) => {
      await page.goto(cfg.pages[0].path);
      await waitForApp(page);

      for (const { path, nav: label } of cfg.pages.filter((p) => p.nav)) {
        if (compact(page)) {
          await menuButton(page).click();
          const drawer = page.locator(cfg.drawer);
          await expect(drawer).toBeInViewport();
          await drawer.getByRole('button', { name: label }).first().click();
        } else {
          await nav(page).getByRole('button', { name: label }).click();
        }
        await expect(page, `"${label}" should open ${path}`).toHaveURL(new RegExp(`${path}$`));
      }
    });

    test('log out returns to a public page and blocks the portal', async ({ page }) => {
      await page.goto(cfg.pages[0].path);
      await waitForApp(page);

      if (compact(page)) {
        await menuButton(page).click();
        await page.locator(cfg.drawer).getByRole('button', { name: /log out/i }).click();
      } else if (role === 'admin') {
        await page.locator(cfg.drawer).getByRole('button', { name: /log out/i }).click();
      } else {
        await page.getByRole('button', { name: /account profile/i }).click();
        await page.getByRole('button', { name: /log out/i }).click();
      }

      await expect(page).not.toHaveURL(new RegExp(`/${role}/`));
      await page.goto(cfg.pages[0].path);
      await expect(page).toHaveURL(/\/login/);
    });
  });
}

test.describe('Role isolation', () => {
  test.skip(LIVE, 'uses mocked sessions');

  test('a patient session cannot open other portals', async ({ page }) => {
    await mockApi(page, 'patient');
    await seedSession(page, 'patient');

    for (const path of ['/hospital/dashboard', '/doctor/dashboard', '/nurse/dashboard', '/admin/dashboard']) {
      await page.goto(path);
      await expect(page, `${path} must not open for a patient`).toHaveURL(/\/patient\/dashboard/);
    }
  });
});
