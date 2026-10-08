import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-browser and cross-device compatibility suite.
 *
 *   npm run test:compat                         all browsers/devices
 *   npm run test:compat -- --project=firefox     one project
 *   COMPAT_LIVE=1 npm run test:compat            against the real API (seeded accounts)
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e/compatibility',
  testMatch: '**/*.compat.js',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report-compat', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    // Desktop browsers (rendering engines: Blink, Gecko, WebKit)
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'safari', use: { ...devices['Desktop Safari'] } },

    // Mobile browsers
    { name: 'android-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'android-small', use: { ...devices['Galaxy S9+'] } },
    { name: 'ios-safari', use: { ...devices['iPhone 14'] } },
    { name: 'ios-safari-small', use: { ...devices['iPhone SE'] } },

    // Tablets
    { name: 'ipad', use: { ...devices['iPad Pro 11'] } },
    { name: 'ipad-landscape', use: { ...devices['iPad Pro 11 landscape'] } },
  ],
});
