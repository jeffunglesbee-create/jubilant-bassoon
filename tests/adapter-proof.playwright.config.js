// tests/adapter-proof.playwright.config.js
// Runs adapter visible value proof tests against the live deployed app.

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['adapter-visible-value.spec.js'],
  timeout: 45000,
  workers: 1,           // sequential — proof tests share fixture state
  retries: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    headless: true,
    screenshot: 'on',   // always capture screenshots — they are the proof artifact
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
