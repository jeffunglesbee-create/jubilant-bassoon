// playwright.config.js — FIELD browser test configuration
// Tests run against the LIVE deployed URL (jubilant-bassoon.jeffunglesbee.workers.dev)
// CI only: GitHub Actions has unrestricted internet access (*.workers.dev is accessible)
// Local: run manually when browser verification is needed (not on every commit)

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testMatch: ['field_browser.test.js'],
  timeout: 60000,         // 60s per test (async data loading)
  retries: 1,             // one retry on flake — CI network can be intermittent
  reporter: process.env.CI
    ? [['github'], ['json', { outputFile: '/tmp/field_browser_results.json' }]]
    : [['list'], ['json', { outputFile: '/tmp/field_browser_results.json' }]],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
