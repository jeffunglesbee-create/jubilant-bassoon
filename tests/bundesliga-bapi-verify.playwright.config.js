// tests/bundesliga-bapi-verify.playwright.config.js
// CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts Task 1: fresh,
// independent re-verification + real network capture across matchdays.
// Self-contained in jubilant-bassoon -- does not depend on field-playground.

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['bundesliga-bapi-verify.spec.js'],
  timeout: 60000,
  workers: 1,
  retries: 0,
  reporter: process.env.CI
    ? [['github'], ['json', { outputFile: 'bundesliga-bapi-verify-result.json' }]]
    : [['list']],
  use: {
    headless: true,
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: process.env.PLAYWRIGHT_BROWSERS_PATH
          ? { executablePath: '/opt/pw-browsers/chromium' }
          : {},
      },
    },
  ],
});
