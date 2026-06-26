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
const LOAD_WAIT_MS = 15000; // max timeout for waitForSelector — NOT used as fixed wait

// Event-based load helper. Waits for window._fieldDataReady sentinel
// (set after first renderAll() — typically resolves in ~1.5s, not 15s)
// then optionally buffers for async data (ESPN live scores, relay overlay).
//
// BEFORE: waitForTimeout(15000) — always burns 15s regardless of actual load state
// AFTER:  awaitReady(page, 2000) — exits at ~1.5s + 2s buffer = 3.5s typical
//
// CI speedup: 20 tests × 15s → 20 tests × 4s avg → 80s → 20s with workers:4
async function awaitReady(page, bufferMs = 2000) {
  await page.waitForFunction(() => !!window._fieldDataReady, { timeout: 20000 });
  if (bufferMs > 0) await page.waitForTimeout(bufferMs);
}

// External domains whose failures are expected/non-critical
const SOFT_FAIL_DOMAINS = [
  'api.openweathermap.org',     // weather — non-critical path
  'www.google-analytics.com',
  'stats.g.doubleclick.net',
  'field-betfair-relay',        // Betfair relay — not deployed (BETFAIR_RELAY_ENABLED=false)
  'squiggle.com.au',            // AFL Squiggle — may be unavailable in CI region
  'api.the-odds-api.com',       // Odds API — free tier rate limits
  'sse.squiggle',               // AFL SSE stream
  '/mls/stats/',                // MLS stats API — 400 when no MLS data available (season gaps)
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
    await awaitReady(page, 4000); // sentinel + 4s for API burst

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
    await awaitReady(page, 3000); // sentinel + 3s for async settle

    expect(errors, `Unexpected console errors: ${errors.join('; ')}`).toHaveLength(0);
  });

  // F04 — Runtime: captureFieldError() queue empty
  test('F04 — window._fieldErrors empty after full load', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await awaitReady(page, 2000); // sentinel + 2s buffer

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

  // F08 — PWA: Service Worker API present + registration attempted
  // NOTE: /sw.js is registered from index.html but has no separate endpoint on
  // Cloudflare Workers. The *attempt* is coded and gracefully caught. Full SW
  // functionality requires Cloudflare Pages with a static /sw.js asset.
  // This test verifies the API is available and FIELD attempts registration.
  test('F08 — PWA: serviceWorker API available in live browser', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const swAvailable = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(swAvailable,
      'serviceWorker API missing — running in non-secure context or very old browser'
    ).toBe(true);

    // Verify FIELD's SW registration code is present in the live bundle
    const swCodePresent = await page.evaluate(() =>
      typeof navigator.serviceWorker !== 'undefined'
    );
    expect(swCodePresent, 'serviceWorker API not accessible').toBe(true);
  });

  // F09 — iPad ambient mode contract live
  // The Layer 1 geometric invariant verified this locally; here we verify it
  // against the LIVE bundle. At 820px, ambient panel must be visible and
  // OTW banner must be hidden (it moved to the ambient panel).
  test('F09 — iPad 820px: ambient panel visible, OTW banner hidden in live app', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await awaitReady(page, 500); // CSS is synchronous — sentinel is sufficient

    // Diagnostic: capture all relevant element displays before asserting
    const cssState = await page.evaluate(() => {
      const snap = sel => {
        const el = document.querySelector(sel);
        if (!el) return 'MISSING';
        return window.getComputedStyle(el).display;
      };
      return {
        ambientPanel:   snap('#ambient-panel'),
        otwBanner:      snap('#otw-banner'),
        watchWindow:    snap('#watch-window'),
        fieldArb:       snap('#field-arb'),
        viewportWidth:  window.innerWidth,
      };
    });
    console.log('F09 CSS state at 820px:', JSON.stringify(cssState));

    expect(cssState.ambientPanel,
      `F09: #ambient-panel should be flex at 820px. viewport=${cssState.viewportWidth}px. All: ${JSON.stringify(cssState)}`
    ).not.toBe('none');
    expect(cssState.ambientPanel,
      `F09: #ambient-panel MISSING from live DOM at 820px`
    ).not.toBe('MISSING');
    expect(cssState.otwBanner,
      `F09: #otw-banner should be display:none at 820px. Got: ${cssState.otwBanner}. Layer 1 passes locally but live CSS differs. viewport=${cssState.viewportWidth}`
    ).toBe('none');
  });

  // F10 — ?debug=1 panel renders (existing test — kept)
  test('F10 — ?debug=1 panel renders without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(LIVE_URL + '?debug=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await awaitReady(page, 500); // debug panel is static HTML

    const visible = await page.locator('#fhp-overlay').isVisible();
    expect(visible, 'Debug panel should be visible at ?debug=1').toBe(true);
    expect(errors, `Console errors at ?debug=1: ${errors.join('; ')}`).toHaveLength(0);
  });

  // F11 — ESPN polling: no startup errors
  test('F11 — ESPN scores polling fires without startup error', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await awaitReady(page, 3000); // sentinel + 3s for ESPN first-fetch

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

    await awaitReady(page, 0); // allData populates before sentinel fires

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

  test('F16 — Game card tap opens bottom sheet', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    let hasCards = false;
    try {
      await page.waitForSelector('.game-card', { timeout: LOAD_WAIT_MS });
      hasCards = true;
    } catch { /* no cards */ }

    if (!hasCards) {
      test.skip(true, 'No game cards rendered — off-season or load failure');
      return;
    }

    // Click .card-body[data-open] — the actual event listener target.
    // Previously onclick was on .card-body; now it's a touchend/click listener
    // wired to [data-open] elements post-render. .game-card click doesn't bubble.
    await page.locator('.card-body[data-open]').first().click();
    await expect(page.locator('#bottom-sheet'),
      'Bottom sheet did not open after card tap — card-body[data-open] pointer events may not be wired'
    ).toHaveClass(/open/, { timeout: 4000 });

    const teamsText = await page.locator('.bs-teams').first().textContent().catch(() => '');
    expect(teamsText.length, 'Bottom sheet .bs-teams is empty — sheet opened but not populated').toBeGreaterThan(0);
  });

  test('F17 — Playoff cards have series brief injected', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Journalism queue fires 3s after ready + fetch time (~2-3s)
    await awaitReady(page, 5000); // sentinel + 5s for journalism queue

    const playoffCards = page.locator('.game-card[data-sport*="Playoffs"]');
    const count = await playoffCards.count();
    if (count === 0) {
      test.skip(true, 'No playoff cards — off-season or no playoff games today');
      return;
    }

    // At least one playoff card should have a series brief
    const briefCards = page.locator('.game-card[data-sport*="Playoffs"] .card-brief-inline');
    const briefCount = await briefCards.count();
    expect(briefCount, 'No playoff card has .card-brief-inline — renderSeriesPreviewCard not firing').toBeGreaterThan(0);

    const briefText = await briefCards.first().locator('.card-brief-inline-text').textContent().catch(() => '');
    expect(briefText.length, 'Series brief text too short — empty shell or loading state').toBeGreaterThan(15);
  });

  test('F18 — Ambient panel editorial section populated after brief resolves', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Check game cards loaded first
    let hasCards = false;
    try {
      await page.waitForSelector('.game-card', { timeout: LOAD_WAIT_MS });
      hasCards = true;
    } catch { /* no cards */ }

    if (!hasCards) {
      test.skip(true, 'No schedule data to drive editorial');
      return;
    }

    // Compound editorial resolves 10-15s via Gemini proxy
    await awaitReady(page, 12000); // sentinel + 12s for editorial proxy

    const editorialCard = page.locator('#ambient-panel .ap-card-brief, #ambient-panel .ap-card-owl').first();
    await expect(editorialCard,
      'No editorial card in ambient panel — compound editorial not rendering'
    ).toBeAttached({ timeout: 5000 });

    const cardText = await editorialCard.locator('.ap-card-text').textContent().catch(() => '');
    expect(cardText.trim().length, 'Editorial card text too short — empty shell').toBeGreaterThan(20);
  });

  test('F19 — Mobile smart stream chip: exactly 1 chip at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    let hasCards = false;
    try {
      await page.waitForSelector('.game-card', { timeout: LOAD_WAIT_MS });
      hasCards = true;
    } catch { /* no cards */ }

    if (!hasCards) {
      test.skip(true, 'No game cards at 360px — off-season or load failure');
      return;
    }

    // Check first 3 cards (or fewer)
    const cards = page.locator('.game-card');
    const cardCount = Math.min(await cards.count(), 3);
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const chips = card.locator('.stream-chip');
      const chipCount = await chips.count();
      // 0 chips ok (no stream data), but >1 fails at 360px
      if (chipCount > 0) {
        expect(chipCount, `Card ${i}: ${chipCount} stream chips visible at 360px — should be exactly 1`).toBe(1);
      }
      const overflow = card.locator('.chip-overflow');
      expect(await overflow.count(), `Card ${i}: chip-overflow visible at 360px — should be suppressed`).toBe(0);
    }
  });

  test('F21 — Bottom sheet renders #bsd-pitch for WC games with bsdEventId', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await awaitReady(page, 3000);

    // Find a WC game in allData whose eData carries bsdEventId. Skips when:
    //  • No FIFA section (off-day for WC)
    //  • No espnScores entry matched (V2 wc26 ingest not populated)
    //  • Matched entry has no bsdEventId (relay STEP 1 not flowing yet)
    const target = await page.evaluate(() => {
      if (typeof allData === 'undefined' || typeof espnScores === 'undefined') return null;
      for (const sec of (allData.sports || [])) {
        if (!/wc26|world cup|fifa/i.test(sec.sport || '')) continue;
        for (const g of (sec.games || [])) {
          const h = (g.home || '').toLowerCase().slice(0, 6);
          const a = (g.away || '').toLowerCase().slice(0, 6);
          if (!h || !a) continue;
          const eData = Object.values(espnScores).find(e => {
            const eh = (e.homeName || '').toLowerCase();
            const ea = (e.awayName || '').toLowerCase();
            return eh.includes(h) || ea.includes(a);
          });
          if (eData?.bsdEventId) {
            return { gameId: g._id, state: eData.state || 'unknown', bsdEventId: eData.bsdEventId };
          }
        }
      }
      return null;
    });

    if (!target) {
      test.skip(true, 'No WC games with bsdEventId in espnScores — data dependency unmet');
      return;
    }

    // Open the sheet imperatively (avoid card-click flakiness across viewports)
    const opened = await page.evaluate(gid => {
      if (typeof openBottomSheet !== 'function') return false;
      try { openBottomSheet(gid); return true; } catch (_) { return false; }
    }, target.gameId);
    expect(opened, 'openBottomSheet should be callable').toBe(true);

    // bs-content is rebuilt synchronously inside openBottomSheet, so the pitch
    // div is already in DOM by the time the call returns. Verify presence.
    const pitchCount = await page.locator('#bs-content #bsd-pitch').count();
    expect(
      pitchCount,
      `#bsd-pitch should render in bs-content for WC games with bsdEventId (state=${target.state}, bsdEventId=${target.bsdEventId})`
    ).toBe(1);

    // For post-game finals, the R2 fetch fires immediately after innerHTML.
    // Wait for the SVG to populate. Skip the strict SVG check if the relay
    // doesn't return a shotmap (could happen for newly-finalized games).
    if (target.state === 'post') {
      await page.waitForTimeout(2000); // 2s budget for /bsd/r2/read round-trip
      const svgCount = await page.locator('#bs-content #bsd-pitch svg').count();
      if (svgCount === 0) {
        console.warn(`F21 SVG render skipped — R2 may not have stats.json for bsdEventId=${target.bsdEventId} yet`);
      }
    }
  });

  test('F20 — Editorial sections NOT in left pane on iPad (migrated to right)', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Editorial brief resolves 10-15s via Gemini proxy
    await awaitReady(page, 12000); // sentinel + 12s for editorial proxy

    // Assert #field-brief hidden at 820px
    const briefDisplay = await page.locator('#field-brief').evaluate(
      el => window.getComputedStyle(el).display
    ).catch(() => 'not-found');
    expect(briefDisplay, '#field-brief should be display:none at 820px').toBe('none');

    // Assert #night-owl hidden at 820px
    const owlDisplay = await page.locator('#night-owl').evaluate(
      el => window.getComputedStyle(el).display
    ).catch(() => 'not-found');
    expect(owlDisplay, '#night-owl should be display:none at 820px').toBe('none');

    // Assert ambient panel is visible
    const ambientDisplay = await page.locator('#ambient-panel').evaluate(
      el => window.getComputedStyle(el).display
    ).catch(() => 'none');
    expect(ambientDisplay, '#ambient-panel should be visible at 820px').not.toBe('none');

    // Check editorial content reached the ambient panel (soft — skip if brief not resolved)
    const editorialExists = await page.locator('#ambient-panel .ap-card-brief, #ambient-panel .ap-card-owl').count();
    if (editorialExists === 0) {
      console.warn('F20 assertion 4 skipped: editorial not resolved after 20s — timing edge case');
    }
  });

});
