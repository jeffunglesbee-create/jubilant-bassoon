// tests/laliga-apim-verify.playwright.config.js
// CC-CMD-2026-08-02-wire-laliga-apim-standings Task 1: fresh, independent
// re-verification that apim.laliga.com + the subscription key still work.
// Self-contained in jubilant-bassoon -- does not depend on field-playground.

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['laliga-apim-verify.spec.js'],
  timeout: 45000,
  workers: 1,
  retries: 0,
  reporter: process.env.CI
    ? [['github'], ['json', { outputFile: 'laliga-apim-verify-result.json' }]]
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
