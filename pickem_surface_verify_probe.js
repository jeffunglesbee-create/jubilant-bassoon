// pickem_surface_verify_probe.js — live TASK 3 + TASK 4 verification for
// CC-CMD-2026-07-05-pick-em-reconcile: confirms (a) game cards no longer
// render any pick-em UI on the deployed app, (b) the new pickem-mode
// surface actually activates/deactivates correctly in a real browser,
// (c) making a pick from the new surface still fires a real pick_made
// network request (the same _userDoRelay path, now reached from a
// different render location).
const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const TS = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z';
const OUT = `outbox/pickem-surface-probe-${TS}.txt`;

(async () => {
  const lines = [];
  const log = (s) => { lines.push(s); console.log(s); };
  let ok = true;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', err => log('[page error] ' + err.message));

  const pickMadeRequests = [];
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/user/event')) {
      const body = req.postData() || '';
      if (body.includes('pick_made')) pickMadeRequests.push(body);
    }
  });

  log(`=== Pick 'em Surface Verify Probe [${TS}] ===`);
  log(`URL: ${FIELD_URL}`);

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => typeof allData !== 'undefined' && allData && Array.isArray(allData.sports) && allData.sports.length > 0,
    { timeout: 20000 }
  );
  log('App booted.');

  // --- TASK 3: card decluttering, checked live, not just via source diff ---
  const cardPickWidgets = await page.evaluate(() => document.querySelectorAll('.game-card .pick-widget').length);
  log(`Pick widgets rendered on game cards (must be 0): ${cardPickWidgets}`);
  ok = ok && cardPickWidgets === 0;

  // --- TASK 4: the new surface activates correctly ---
  const navLinkExists = await page.evaluate(() => !!document.getElementById('pickem-nav-link'));
  log(`#pickem-nav-link exists: ${navLinkExists}`);
  ok = ok && navLinkExists;

  await page.click('#pickem-nav-link');
  await page.waitForTimeout(300); // renderPickEmSection + transition

  const modeState = await page.evaluate(() => {
    const body = document.body;
    const section = document.getElementById('pickem-section');
    const main = document.querySelector('.main');
    return {
      pickemModeActive: body.classList.contains('pickem-mode'),
      sectionHidden: section ? section.hasAttribute('hidden') : null,
      sectionComputedDisplay: section ? getComputedStyle(section).display : null,
      mainComputedDisplay: main ? getComputedStyle(main).display : null,
      navLinkActive: document.getElementById('pickem-nav-link')?.classList.contains('active'),
    };
  });
  log('Mode state after clicking #pickem-nav-link: ' + JSON.stringify(modeState));
  ok = ok && modeState.pickemModeActive === true && modeState.sectionComputedDisplay === 'block' && modeState.mainComputedDisplay === 'none';

  const contentState = await page.evaluate(() => {
    const content = document.getElementById('pickem-content');
    return {
      hasContent: !!(content && content.innerHTML.trim()),
      widgetCount: document.querySelectorAll('#pickem-content .pick-widget').length,
      rowCount: document.querySelectorAll('#pickem-content .pickem-row').length,
      isEmptyState: !!document.querySelector('#pickem-content .pickem-empty'),
    };
  });
  log('#pickem-content state: ' + JSON.stringify(contentState));
  ok = ok && contentState.hasContent;

  // --- If there's at least one unpicked widget, make a real pick and confirm the network call ---
  if (contentState.widgetCount > 0) {
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('#pickem-content .pick-widget .pick-btn');
      if (!btn) return false;
      btn.click();
      return true;
    });
    log(`Clicked a pick-btn inside the new surface: ${clicked}`);
    if (clicked) {
      await page.waitForTimeout(500);
      log(`pick_made network requests captured: ${pickMadeRequests.length}`);
      if (pickMadeRequests.length) log('First pick_made body: ' + pickMadeRequests[0]);
      ok = ok && pickMadeRequests.length > 0;
    }
  } else {
    log('No unpicked widget available this run (all PREVIEW games already picked, or none upcoming) — pick_made click test skipped, not a failure.');
  }

  // --- Confirm exiting the mode restores the main feed ---
  // #pickem-back-pill is display:none by default, only shown via
  // @media(max-width:1199px) -- mirrors WC/Journalism's own established
  // mobile-only back-pill convention exactly (verified: .jrn-back-pill and
  // .wc-back-pill are both gated the same way), so it's correctly
  // invisible on this runner's desktop viewport. The universally-correct
  // exit path at any viewport is re-clicking the nav-link (a true toggle).
  await page.click('#pickem-nav-link');
  await page.waitForTimeout(300);
  const afterExit = await page.evaluate(() => ({
    pickemModeActive: document.body.classList.contains('pickem-mode'),
    mainComputedDisplay: document.querySelector('.main') ? getComputedStyle(document.querySelector('.main')).display : null,
  }));
  log('State after exiting via nav-link toggle: ' + JSON.stringify(afterExit));
  ok = ok && afterExit.pickemModeActive === false && afterExit.mainComputedDisplay !== 'none';

  log('');
  log(ok ? 'RESULT: PASS' : 'RESULT: FAIL -- see above.');

  await browser.close();
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  console.log(`Output: ${OUT}`);
  process.exit(ok ? 0 : 1);
})();
