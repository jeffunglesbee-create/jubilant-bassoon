// tests/bundesliga-matchday-url-decisive.playwright.config.js
// CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts-v2 -- decisive retest.
// Self-contained in jubilant-bassoon -- does not depend on field-playground.

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['bundesliga-matchday-url-decisive.spec.js'],
  timeout: 120000,
  workers: 1,
  retries: 0,
  reporter: process.env.CI
    ? [['github'], ['json', { outputFile: 'bundesliga-matchday-url-decisive-result.json' }]]
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
