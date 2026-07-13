// tests/client-live-invariant.playwright.config.js — Playwright config
// for tests/client-live-invariant.js per
// CC-CMD-2026-07-13-client-live-invariant.
//
// Single chromium project: this checks DOM state (a class name and a
// data-* lookup), not rendering fidelity across engines, so it doesn't
// need webkit coverage the way tests/viewport-all.spec.js does.

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['client-live-invariant.js'],
  timeout: 30000,
  retries: 1,
  reporter: process.env.CI
    ? [['github'], ['list']]
    : [['list']],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
