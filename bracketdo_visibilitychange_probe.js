// bracketdo_visibilitychange_probe.js — verifies the BracketDO WebSocket
// visibilitychange guard against the live FIELD deploy.
// CC-CMD-2026-08-02-bracketdo-visibilitychange-guard TASK 3 live verification.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';
const SCRATCHPAD = 'outbox';

// Overrides document.visibilityState and dispatches a real 'visibilitychange'
// event -- Playwright has no native single-page "background tab" API, and the
// guard under test only ever reads document.visibilityState at event-fire
// time, so this is a faithful simulation of real backgrounding.
async function setVisibility(page, state) {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { value: s, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

// toggleWCView() is a real toggle, not a setter -- WC26 is currently live so
// the site may default to wc-mode already active. This forces a specific
// target state deterministically instead of assuming a blind toggle() call
// always turns wc-mode ON.
async function setWCMode(page, wantOn) {
  const before = await page.evaluate(() => document.body.classList.contains('wc-mode'));
  let toggleReturn = null;
  if (before !== wantOn) {
    toggleReturn = await page.evaluate(() => window.toggleWCView());
  }
  const after = await page.evaluate(() => document.body.classList.contains('wc-mode'));
  console.log(`  [setWCMode wantOn=${wantOn}] before=${before} toggleReturn=${JSON.stringify(toggleReturn)} after=${after}`);
  return { before, toggleReturn, after };
}

async function wsState(page) {
  return page.evaluate(() => {
    const w = window._bracketWS;
    return {
      bracketWSExists: !!w,
      wcMode: document.body.classList.contains('wc-mode'),
      // _ws itself is closed over inside the IIFE, not exposed -- use the
      // live indicator class the code already toggles on open/close as the
      // externally-observable signal (_setLiveIndicator), same contract a
      // real user's UI would show.
      liveIndicator: document.getElementById('wc-tab-bracket-btn')?.classList.contains('bracket-live') || false,
    };
  });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // Wait for the app's own boot-complete sentinel (set after the first
  // renderAll() call) rather than just "the globals exist" -- 3 prior real
  // runs showed intermittent wc-mode state races when acting before the
  // app's own initial render/class-setting had actually settled.
  await page.waitForFunction(() => !!window._fieldDataReady, { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => typeof window.toggleWCView === 'function' && !!window._bracketWS, { timeout: 15000 }).catch(() => {});

  const results = { scenarios: [] };

  // ── Scenario 1: open WC mode -> hidden -> confirm the socket closes ──────
  await setWCMode(page, true);
  await page.waitForTimeout(1500); // let the real WS connection attempt settle
  const afterOpen = await wsState(page);
  await setVisibility(page, 'hidden');
  await page.waitForTimeout(300);
  const afterHidden = await wsState(page);
  results.scenarios.push({
    name: 'open WC mode -> hidden -> socket closes',
    afterOpen, afterHidden,
    pass: afterOpen.wcMode === true && afterOpen.liveIndicator === true && afterHidden.liveIndicator === false,
  });

  // ── Scenario 2: from hidden, visible while still in wc-mode -> reopens ──
  await setVisibility(page, 'visible');
  // Poll instead of a flat sleep -- a reopen right after a recent close may
  // take longer than a cold first connect (relay-side WS accept latency).
  await page.waitForFunction(
    () => document.getElementById('wc-tab-bracket-btn')?.classList.contains('bracket-live'),
    { timeout: 8000 }
  ).catch(() => {});
  const afterVisible = await wsState(page);
  results.scenarios.push({
    name: 'hidden -> visible (still wc-mode) -> socket reopens',
    afterVisible,
    pass: afterVisible.wcMode === true && afterVisible.liveIndicator === true,
  });

  // ── Scenario 3 (the real edge case): background, navigate away from WC
  //    mode via the in-app toggle WHILE hidden, then visible -> must NOT reopen
  await setVisibility(page, 'hidden');
  await page.waitForTimeout(300);
  await setWCMode(page, false); // explicit in-app navigation away, while hidden
  const afterToggleAwayWhileHidden = await wsState(page);
  await setVisibility(page, 'visible');
  await page.waitForTimeout(1500);
  const afterVisibleNotWcMode = await wsState(page);
  results.scenarios.push({
    name: 'hidden -> navigate away from WC mode (while hidden) -> visible -> must NOT reopen',
    afterToggleAwayWhileHidden, afterVisibleNotWcMode,
    pass: afterToggleAwayWhileHidden.wcMode === false && afterVisibleNotWcMode.wcMode === false && afterVisibleNotWcMode.liveIndicator === false,
  });

  await browser.close();

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const manifestPath = `${SCRATCHPAD}/bracketdo-visibilitychange-probe-manifest-${ts}.json`;
  results.consoleErrors = errors.slice(0, 10);
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nManifest: ${manifestPath}`);

  const failures = results.scenarios.filter(s => !s.pass);
  if (failures.length) {
    console.error(`\n❌ ${failures.length}/3 scenario(s) FAILED`);
    process.exit(1);
  }
  console.log(`\n✅ 3/3 scenarios passed`);
})();
