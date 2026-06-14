// tests/viewport.playwright.config.js — Playwright config for
// tests/viewport-all.spec.js per docs/PLAYWRIGHT-VIEWPORT-SPEC.md.
//
// Projects: webkit (preferred for iPad/Safari fidelity) + chromium.
// Base URL: deployed app with ?wpt to skip the My Services modal.

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['viewport-all.spec.js'],
  timeout: 30000,
  workers: 2,
  fullyParallel: true,
  retries: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: 'https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'webkit',   use: { browserName: 'webkit'   } },
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
