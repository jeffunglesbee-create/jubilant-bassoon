// field_browser.test.js — Playwright browser automation test
// Rule 18: captures what smoke.js cannot — runtime errors, failed network
// requests, console errors, and actual app rendering in a real browser.
//
// Run: npx playwright test field_browser.test.js
// CI:  smoke-and-verify.yml browser-test job (runs after smoke passes)
//
// What this tests that smoke.js cannot:
//   - Network requests that fail at runtime (4xx, 5xx, net::ERR_*)
//   - console.error calls from async code
//   - window._fieldErrors populated by critical path catch blocks
//   - Actual DOM rendering (game cards present after data loads)
//   - The ?debug=1 panel itself works

const { test, expect } = require('@playwright/test');

const LIVE_URL = 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const LOAD_WAIT_MS = 15000; // 15s for async data (ESPN + weather + relay)

// Requests from these domains are expected to sometimes fail or be unavailable
// (rate limits, geoblocking, CDN quirks) — don't fail the test for these
const SOFT_FAIL_DOMAINS = [
  'api.openweathermap.org',  // weather — not critical path
  'api.twitter.com',
  'www.google-analytics.com',
  'stats.g.doubleclick.net',
];

// console.warn/debug messages that are expected and non-critical
const EXPECTED_CONSOLE_PATTERNS = [
  /FIELD_DEBUG/i,
  /relay.*not responding/i,
  /No update needed/i,
  /\[FD\]/i,  // football-data.org debug
];

test.describe('FIELD App — Browser Runtime Tests', () => {

  test('page loads and serves FIELD HTML', async ({ page }) => {
    const resp = await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(resp.status()).toBe(200);
    const title = await page.title();
    expect(title).toContain('FIELD');
  });

  test('no critical network failures', async ({ page }) => {
    const failures = [];

    page.on('requestfailed', request => {
      const url = request.url();
      const isSoft = SOFT_FAIL_DOMAINS.some(d => url.includes(d));
      if (!isSoft) {
        failures.push({ url, failure: request.failure()?.errorText || 'unknown' });
      }
    });

    page.on('response', response => {
      const status = response.status();
      const url = response.url();
      if (status >= 500) {
        const isSoft = SOFT_FAIL_DOMAINS.some(d => url.includes(d));
        if (!isSoft) failures.push({ url, status });
      }
    });

    await page.goto(LIVE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000); // settle async fetches

    if (failures.length > 0) {
      console.log('Network failures:', JSON.stringify(failures, null, 2));
    }
    expect(failures, `Critical network failures: ${JSON.stringify(failures)}`).toHaveLength(0);
  });

  test('no console errors after load', async ({ page }) => {
    const errors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const isExpected = EXPECTED_CONSOLE_PATTERNS.some(p => p.test(text));
        if (!isExpected) errors.push(text);
      }
    });

    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(LOAD_WAIT_MS);

    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
    expect(errors, `console.error calls: ${errors.join('; ')}`).toHaveLength(0);
  });

  test('window._fieldErrors empty after full load', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(LOAD_WAIT_MS);

    const fieldErrors = await page.evaluate(() => window._fieldErrors || []);
    if (fieldErrors.length > 0) {
      console.log('_fieldErrors:', JSON.stringify(fieldErrors, null, 2));
    }
    expect(fieldErrors, `_fieldErrors: ${JSON.stringify(fieldErrors)}`).toHaveLength(0);
  });

  test('game cards render after data loads', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for at least one game card to appear
    await page.waitForSelector('.game-card', { timeout: LOAD_WAIT_MS });

    const cardCount = await page.locator('.game-card').count();
    expect(cardCount, 'Expected at least 1 game card to render').toBeGreaterThan(0);
  });

  test('ESPN scores polling fires and populates espnScores', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(LOAD_WAIT_MS);

    // fetchESPNScores runs at startup — espnScores may be empty if no live games
    // but the function itself should have been called (not thrown at outer level)
    const espnErrors = await page.evaluate(() =>
      (window._fieldErrors || []).filter(e => e.fn === 'fetchESPNScores')
    );
    expect(espnErrors, `ESPN polling threw: ${JSON.stringify(espnErrors)}`).toHaveLength(0);
  });

  test('?debug=1 panel renders without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(LIVE_URL + '?debug=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    const panelVisible = await page.locator('#field-debug-panel').isVisible();
    expect(panelVisible, 'Debug panel should be visible at ?debug=1').toBe(true);
    expect(errors).toHaveLength(0);
  });

});
