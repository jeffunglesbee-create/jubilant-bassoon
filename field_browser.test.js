// field_browser.test.js — FIELD Browser Runtime Tests (Layer 3)
// Tests the LIVE deployed app at jubilant-bassoon.jeffunglesbee.workers.dev.
//
// LAYER 3 PHILOSOPHY: Did the deployment actually work, and do FIELD's specific
// features behave correctly against real data in a real browser?
//   Layer 0 (smoke.js):          code structure in source file
//   Layer 1 (viewport_smoke.js): CSS geometry of local file
//   Layer 2 (layer2_review.js):  visual quality via Claude Vision
//   Layer 3 (this file):         live behavioral verification
//
// TWO GROUPS:
//   STRUCTURAL — always blocking. Tests that must pass every day regardless of
//     which sports are playing. Tests FIELD's deployed features, not data.
//   DATA-DEPENDENT — skips gracefully when no games are scheduled. Tests that
//     require live game data to be meaningful.
//
// Run: npx playwright test field_browser.test.js
// CI:  smoke-and-verify.yml browser-test job (needs: viewport-smoke, hard-fail)

const { test, expect } = require('@playwright/test');

const LIVE_URL    = 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const LOAD_WAIT_MS = 15000; // 15s for ESPN + weather + relay async data

// External domains whose failures are expected/non-critical
const SOFT_FAIL_DOMAINS = [
  'api.openweathermap.org',     // weather — non-critical path
  'www.google-analytics.com',
  'stats.g.doubleclick.net',
  'field-betfair-relay',        // Betfair relay — not deployed (BETFAIR_RELAY_ENABLED=false)
  'squiggle.com.au',            // AFL Squiggle — may be unavailable in CI region
  'api.the-odds-api.com',       // Odds API — free tier rate limits
  'sse.squiggle',               // AFL SSE stream
];

// Console messages that are expected and non-critical
// Add patterns for any known async errors that are handled gracefully by FIELD.
const EXPECTED_CONSOLE_PATTERNS = [
  /FIELD_DEBUG/i,
  /relay.*not responding/i,
  /No update needed/i,
  /\[FD\]/i,                    // football-data.org debug
  /BETFAIR_RELAY_ENABLED/i,     // Betfair disabled by design
  /captureFieldError/i,
  /allData.*null/i,
  /Failed to fetch/i,            // any gracefully-handled fetch failure
  /NetworkError/i,               // network error from aborted fetch
  /Load failed/i,                // Safari-style fetch failure message
  /ERR_/i,                       // Chrome network error codes
  /night.owl/i,                  // Night Owl email feature errors
  /outbox/i,                     // Outbox system errors
  /404/i,                        // 404s from optional endpoints
];

// ══════════════════════════════════════════════════════════════════════════════
// GROUP 1: STRUCTURAL — always blocking
// These pass every day regardless of game schedule.
// Tests that FIELD's deployed features exist and work correctly.
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Structural — always blocking', () => {

  // F01 — Basic: page serves FIELD HTML
  test('F01 — page loads with 200 and FIELD title', async ({ page }) => {
    const resp = await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(resp.status()).toBe(200);
    expect(await page.title()).toContain('FIELD');
  });

  // F02 — Network: no critical request failures
  test('F02 — no critical network failures', async ({ page }) => {
    const failures = [];

    page.on('requestfailed', req => {
      const url = req.url();
      if (!SOFT_FAIL_DOMAINS.some(d => url.includes(d)))
        failures.push({ url, err: req.failure()?.errorText || 'unknown' });
    });
    page.on('response', res => {
      if (res.status() >= 500 && !SOFT_FAIL_DOMAINS.some(d => res.url().includes(d)))
        failures.push({ url: res.url(), status: res.status() });
    });

    // FIELD polls ESPN/MLB/AFL APIs continuously — networkidle is never reached.
    // Use domcontentloaded + bounded 8s wait to capture the initial API burst.
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);

    expect(failures, `Critical network failures: ${JSON.stringify(failures)}`).toHaveLength(0);
  });

  // F03 — Runtime: no unexpected console errors
  test('F03 — no unexpected console errors after load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!EXPECTED_CONSOLE_PATTERNS.some(p => p.test(text))) errors.push(text);
      }
    });

    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(LOAD_WAIT_MS);

    expect(errors, `Unexpected console errors: ${errors.join('; ')}`).toHaveLength(0);
  });

  // F04 — Runtime: captureFieldError() queue empty
  test('F04 — window._fieldErrors empty after full load', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(LOAD_WAIT_MS);

    const errs = await page.evaluate(() => window._fieldErrors || []);
    expect(errs, `_fieldErrors: ${JSON.stringify(errs)}`).toHaveLength(0);
  });

  // F05 — Pipeline B deployed: resolveGameBroadcast defined
  // Verifies that Pipeline B (Stage 3 of enrichGame()) is live in the deployed bundle.
  // If this fails: the Pipeline B commit did not deploy correctly.
  test('F05 — Pipeline B deployed: resolveGameBroadcast() defined', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const defined = await page.evaluate(() => typeof resolveGameBroadcast === 'function');
    expect(defined, 'resolveGameBroadcast should be defined — Pipeline B not deployed?').toBe(true);
  });

  // F06 — Arbitrage Finder deployed: buildArbitrageReport defined + callable
  // Verifies the Arbitrage Finder is live and its core function runs without error.
  test('F06 — Arbitrage Finder deployed: buildArbitrageReport() defined and callable', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const result = await page.evaluate(() => {
      if (typeof buildArbitrageReport !== 'function') return { err: 'not defined' };
      try {
        const r = buildArbitrageReport();
        // Report may be null if allData not loaded yet — that is OK
        return { ok: true, hasStructure: r === null || typeof r === 'object' };
      } catch(e) {
        return { err: e.message };
      }
    });
    expect(result.err, `buildArbitrageReport error: ${result.err}`).toBeUndefined();
    expect(result.hasStructure, 'buildArbitrageReport should return object or null').toBe(true);
  });

  // F07 — DOM structure: key FIELD elements present
  // #otw-banner, #field-arb, #ambient-panel are hardcoded HTML — their absence
  // means the deployed HTML is corrupted or the wrong version.
  test('F07 — key FIELD elements present in deployed DOM', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await expect(page.locator('#otw-banner'),    '#otw-banner missing').toBeAttached();
    await expect(page.locator('#field-arb'),     '#field-arb missing').toBeAttached();
    await expect(page.locator('#ambient-panel'), '#ambient-panel missing').toBeAttached();
  });

  // F08 — PWA: Service Worker registered
  // Verifies that the PWA shell is functional — SW registered means FIELD is
  // installable and offline-capable. Failure = PWA build did not deploy.
  test('F08 — PWA: Service Worker registered', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000); // SW registration is async

    const registered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });
    expect(registered, 'Service Worker not registered — PWA shell not deploying correctly').toBe(true);
  });

  // F09 — iPad ambient mode contract live
  // The Layer 1 geometric invariant verified this locally; here we verify it
  // against the LIVE bundle. At 820px, ambient panel must be visible and
  // OTW banner must be hidden (it moved to the ambient panel).
  test('F09 — iPad 820px: ambient panel visible, OTW banner hidden in live app', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000); // CSS media queries are immediate but 5s allows full paint

    // Ambient panel visible at 820px
    const ambientDisplay = await page.evaluate(() => {
      const el = document.querySelector('#ambient-panel');
      return el ? window.getComputedStyle(el).display : 'missing';
    });
    expect(ambientDisplay, `Ambient panel should be flex at 820px, got: ${ambientDisplay}`)
      .not.toBe('none');
    expect(ambientDisplay, 'Ambient panel missing from live DOM').not.toBe('missing');

    // OTW banner hidden at 820px (it lives in the ambient panel)
    const otwDisplay = await page.evaluate(() => {
      const el = document.querySelector('#otw-banner');
      return el ? window.getComputedStyle(el).display : 'missing';
    });
    expect(otwDisplay,
      `OTW banner should be display:none at 820px (iPad ambient mode). Got: ${otwDisplay}. Layer 1 contract is passing but live CSS differs.`
    ).toBe('none');
  });

  // F10 — ?debug=1 panel renders (existing test — kept)
  test('F10 — ?debug=1 panel renders without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(LIVE_URL + '?debug=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    const visible = await page.locator('#field-debug-panel').isVisible();
    expect(visible, 'Debug panel should be visible at ?debug=1').toBe(true);
    expect(errors, `Console errors at ?debug=1: ${errors.join('; ')}`).toHaveLength(0);
  });

  // F11 — ESPN polling: no startup errors
  test('F11 — ESPN scores polling fires without startup error', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(LOAD_WAIT_MS);

    const espnErrors = await page.evaluate(() =>
      (window._fieldErrors || []).filter(e => e.fn === 'fetchESPNScores')
    );
    expect(espnErrors, `ESPN polling threw: ${JSON.stringify(espnErrors)}`).toHaveLength(0);
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// GROUP 2: DATA-DEPENDENT — skips gracefully when no games
// These require live game data. They skip (not fail) on off-season days.
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Data-dependent — skip if no games', () => {

  // F12 — Game cards render when games are available
  test('F12 — game cards render when games are scheduled', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    let hasCards = false;
    try {
      await page.waitForSelector('.game-card', { timeout: LOAD_WAIT_MS });
      hasCards = true;
    } catch {
      test.skip(true, 'No game cards loaded — possible off-season day, skip data tests');
    }

    if (hasCards) {
      const count = await page.locator('.game-card').count();
      expect(count, 'Expected at least 1 game card').toBeGreaterThan(0);
    }
  });

  // F13 — Stream chips populated on game cards
  // Verifies broadcast data (SR registry) is actually reaching the live DOM.
  test('F13 — game cards have broadcast stream chips', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    let hasCards = false;
    try {
      await page.waitForSelector('.game-card', { timeout: LOAD_WAIT_MS });
      hasCards = true;
    } catch { /* no games */ }

    if (!hasCards) {
      test.skip(true, 'No game cards — skip stream chip test');
      return;
    }

    const chipCount = await page.locator('.stream-chip').count();
    expect(chipCount, 'Game cards have no broadcast chips — SR registry not rendering?')
      .toBeGreaterThan(0);
  });

  // F14 — Arbitrage report has game data after load
  // After data loads, buildArbitrageReport() should return non-null with totalGames > 0.
  test('F14 — buildArbitrageReport() returns game data after schedule loads', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    let hasCards = false;
    try {
      await page.waitForSelector('.game-card', { timeout: LOAD_WAIT_MS });
      hasCards = true;
    } catch { /* no games */ }

    if (!hasCards) {
      test.skip(true, 'No game data — skip arbitrage report data test');
      return;
    }

    await page.waitForTimeout(2000); // allow allData to fully populate

    const result = await page.evaluate(() => {
      try {
        const r = buildArbitrageReport();
        if (!r) return { skipped: true, reason: 'allData not ready' };
        return { totalGames: r.totalGames, freeCount: r.freeCount };
      } catch(e) {
        return { err: e.message };
      }
    });

    if (result.skipped) {
      test.skip(true, result.reason);
      return;
    }
    expect(result.err, `buildArbitrageReport threw on real data: ${result.err}`).toBeUndefined();
    expect(result.totalGames, 'Expected totalGames > 0 when game cards are present')
      .toBeGreaterThan(0);
  });

  // F15 — FREE filter pill exists in filter bar
  // The FREE filter is a core FIELD feature (Gap 2 in gap analysis).
  // Soft-fail because on days with no games the filter bar might not render.
  test('F15 — FREE filter pill present in filter bar', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    let hasCards = false;
    try {
      await page.waitForSelector('.filter-bar, .sport-filter-bar', { timeout: 10000 });
      hasCards = true;
    } catch { /* no filter bar */ }

    if (!hasCards) {
      test.skip(true, 'Filter bar not rendered — possible empty schedule');
      return;
    }

    // The FREE pill uses text "FREE" — verify it exists
    const freeButton = page.locator('button').filter({ hasText: /^FREE/ }).first();
    await expect(freeButton,
      'FREE filter pill missing — freeOnlyFilter feature not deployed'
    ).toBeAttached();
  });

});
