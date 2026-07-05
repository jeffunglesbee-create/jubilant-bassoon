// nav_mode_consolidate_verify_probe.js — live verification for
// CC-CMD-2026-07-05-nav-mode-consolidate: confirms (a) the shared
// attachNavLinkOnce() helper actually prevents listener accumulation even
// after many simulated renderAll() poll cycles, for all four nav-links,
// (b) wc-mode's nav-link stays visible/clickable at desktop width after
// its own #upper-slots fix (mirroring pickem-mode's 8435247), (c)
// journalism-mode's nav-link stays visible/clickable at desktop width (it
// was never broken — this is the no-regression check on its existing,
// correct pattern), plus its mobile back-pill exit path, (d) pickem-mode's
// already-fixed round-trip still works (no regression from the
// consolidation refactor).
const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const TS = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z';
const OUT = `outbox/nav-mode-consolidate-probe-${TS}.txt`;

(async () => {
  const lines = [];
  const log = (s) => { lines.push(s); console.log(s); };
  let ok = true;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', err => log('[page error] ' + err.message));

  log(`=== Nav Mode Consolidate Verify Probe [${TS}] ===`);
  log(`URL: ${FIELD_URL}`);

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => typeof allData !== 'undefined' && allData && Array.isArray(allData.sports) && allData.sports.length > 0,
    { timeout: 20000 }
  );
  log('App booted.');

  // --- TASK 1 regression test: simulate several renderAll() poll cycles
  // BEFORE any click, then confirm a single click still toggles exactly
  // once (no accumulation). This is the exact failure mode d46f2e7/this
  // consolidation fixed -- an even accumulated listener count silently
  // cancels the toggle back to its starting state.
  await page.evaluate(() => {
    for (let i = 0; i < 5; i++) { if (typeof renderAll === 'function') renderAll(true); }
  });
  log('Simulated 5 extra renderAll() poll cycles before any nav-link click.');

  async function testModeRoundTrip(navLinkId, modeClass, sectionId, opts = {}) {
    const forceVisible = opts.forceVisible;
    if (forceVisible) {
      await page.evaluate((id) => { const el = document.getElementById(id); if (el) el.style.display = ''; }, navLinkId);
    }
    const before = await page.evaluate((id) => {
      const el = document.getElementById(id);
      const r = el ? el.getBoundingClientRect() : null;
      return { exists: !!el, w: r ? r.width : null, h: r ? r.height : null };
    }, navLinkId);
    log(`[${modeClass}] #${navLinkId} before click: ${JSON.stringify(before)}`);

    await page.click(`#${navLinkId}`, { timeout: 10000 });
    await page.waitForTimeout(300);
    const activeState = await page.evaluate((mc) => ({
      modeActive: document.body.classList.contains(mc),
      mainDisplay: document.querySelector('.main') ? getComputedStyle(document.querySelector('.main')).display : null,
    }), modeClass);
    log(`[${modeClass}] state after entering: ${JSON.stringify(activeState)}`);
    const enterOk = activeState.modeActive === true;

    // Confirm the nav-link (the exit toggle itself) is genuinely visible
    // and clickable NOW, while the mode is active -- this is exactly the
    // condition that was broken pre-fix (0x0 box due to #upper-slots).
    const navRectInMode = await page.evaluate((id) => {
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    }, navLinkId);
    log(`[${modeClass}] #${navLinkId} rect while mode active: ${JSON.stringify(navRectInMode)}`);
    const navVisibleInMode = navRectInMode.w > 0 && navRectInMode.h > 0;

    await page.click(`#${navLinkId}`, { timeout: 10000 });
    await page.waitForTimeout(300);
    const exitState = await page.evaluate((mc) => ({
      modeActive: document.body.classList.contains(mc),
      mainDisplay: document.querySelector('.main') ? getComputedStyle(document.querySelector('.main')).display : null,
    }), modeClass);
    log(`[${modeClass}] state after exit re-click: ${JSON.stringify(exitState)}`);
    const exitOk = exitState.modeActive === false && exitState.mainDisplay !== 'none';

    const pass = enterOk && navVisibleInMode && exitOk;
    log(`[${modeClass}] round-trip result: ${pass ? 'PASS' : 'FAIL'}`);
    return pass;
  }

  // --- pickem-mode: no-regression check on the already-fixed behavior ---
  ok = ok && await testModeRoundTrip('pickem-nav-link', 'pickem-mode', 'pickem-section');

  // --- wc-mode: TASK 2's own fix. #wc-nav-link is display:none until
  // in-season (initWCNav reveals it) -- forced visible here since it's
  // off-season during this probe run, same limitation the earlier
  // pickem-surface probe documented for its own back-pill check. This does
  // not affect the validity of the #upper-slots CSS fix itself, which is
  // viewport/season-independent.
  ok = ok && await testModeRoundTrip('wc-nav-link', 'wc-mode', 'wc-section', { forceVisible: true });

  // --- journalism-mode: no-regression check (desktop nav-link exit,
  // never broken) plus the mobile back-pill exit path ---
  ok = ok && await testModeRoundTrip('jrn-nav-link', 'journalism-mode', 'field-journalism-section');

  // Mobile back-pill path for journalism-mode specifically (the one place
  // journalism-mode's OWN hide-list does collapse nav.controls, by design
  // -- the back-pill is the intended exit there).
  await page.setViewportSize({ width: 500, height: 900 });
  await page.evaluate(() => { if (typeof toggleJournalismView === 'function') toggleJournalismView(); });
  await page.waitForTimeout(300);
  const mobileEnter = await page.evaluate(() => ({
    modeActive: document.body.classList.contains('journalism-mode'),
    backPillRect: (() => { const el = document.getElementById('jrn-back-pill'); const r = el ? el.getBoundingClientRect() : null; return r ? { w: r.width, h: r.height } : null; })(),
  }));
  log(`[journalism-mode mobile] state after entering at 500x900: ${JSON.stringify(mobileEnter)}`);
  const backPillVisible = !!(mobileEnter.backPillRect && mobileEnter.backPillRect.w > 0 && mobileEnter.backPillRect.h > 0);
  if (backPillVisible) {
    await page.click('#jrn-back-pill', { timeout: 10000 });
    await page.waitForTimeout(300);
  } else {
    log('[journalism-mode mobile] back-pill not visible/clickable -- clicking nav-link exit as fallback for this check only');
    await page.evaluate(() => { if (typeof toggleJournalismView === 'function') toggleJournalismView(); });
    await page.waitForTimeout(300);
  }
  const mobileExit = await page.evaluate(() => document.body.classList.contains('journalism-mode'));
  log(`[journalism-mode mobile] modeActive after back-pill exit: ${mobileExit}`);
  ok = ok && mobileEnter.modeActive === true && backPillVisible && mobileExit === false;
  await page.setViewportSize({ width: 1280, height: 800 });

  log('');
  log(ok ? 'RESULT: PASS' : 'RESULT: FAIL -- see above.');

  await browser.close();
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  console.log(`Output: ${OUT}`);
  process.exit(ok ? 0 : 1);
})();
