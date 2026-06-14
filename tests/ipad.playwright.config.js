// tests/ipad.playwright.config.js — config for tests/ipad-viewport.spec.js
//
// Separate from root playwright.config.js so the existing chromium-only
// field_browser.test.js continues to run unchanged.
//
// WebKit is preferred for iPad simulation (Safari engine), with chromium
// as a fallback. Both projects are wired so the suite can run on whichever
// browser binary is available locally / in CI.

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['ipad-viewport.spec.js'],
  timeout: 60000,
  workers: 2,
  fullyParallel: true,
  retries: 1,
  reporter: process.env.CI ? [['github']] : [['list']],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
