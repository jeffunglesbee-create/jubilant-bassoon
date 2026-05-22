// playwright.viewport.config.js — FIELD Viewport Geometric Invariant Suite
// Separate config from playwright.config.js (which runs against live URL).
// This suite runs against local index.html (pre-deploy).
//
// Run: npx playwright test viewport_smoke.js --config playwright.viewport.config.js
// CI:  smoke-and-verify.yml viewport-smoke job (after smoke, before browser-test)

const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testMatch: ['viewport_smoke.js'],
  timeout: 30000,          // 30s per test — layout tests are fast
  retries: 0,              // geometry is deterministic, no flake
  reporter: [
    ['list'],
    ['html', { outputFolder: 'viewport-test-results', open: 'never' }],
  ],
  use: {
    headless: true,
    screenshot: 'on',      // always capture — screenshots are Layer 2 material
    screenshotsPath: path.join(__dirname, 'viewport-screenshots'),
    video: 'off',
    // Suppress console output from FIELD's JS (failed fetches, debug logs)
    // Tests don't check console — that's field_browser.test.js's job
  },
  projects: [
    {
      name: 'chromium-viewport',
      use: {
        browserName: 'chromium',
        // Specify executable for sandbox/CI environments where Playwright's
        // bundled Chromium may differ from installed version.
        // In GitHub Actions: npx playwright install chromium provides the correct binary.
        // Locally: falls back to auto-detect if path not found.
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
            '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' ||
            undefined,
        },
        // Viewport is overridden per-test via test.use() in viewport_smoke.js
      },
    },
  ],
  // outputDir for artifacts
  outputDir: 'viewport-test-results',
});
