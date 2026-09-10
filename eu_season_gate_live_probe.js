// CC-CMD-2026-09-07-soccer-season-gates-autoroll — TASK 3.3, live verification.
//
// TWO CLAIMS, TWO KINDS OF EVIDENCE, because they are not the same kind of claim.
//
// 1. THE DEPLOYED BUNDLE CARRIES THE GATE. Text-level and decisive:
//    scripts/build-bundle.mjs sets `minify: false`, so `_euSeasonActive` and each
//    binding survive verbatim into production. Fetching the deployed HTML and
//    matching them proves the deployed state, not the repo state (Rule 48 A).
//
// 2. THE APP RENDERS EUROPEAN FOOTBALL. A rendering claim, so a real browser
//    against the live URL, a screenshot, and booleans rather than prose (Rule 90).
//
// WHY 2 MAY LEGITIMATELY FIND NOTHING TODAY: 2026-09-10 is an international
// break. The relay serves 0 games today for seven of the eight keys. `eflone` is
// the exception — one real fixture, Stevenage v Luton at 19:00Z. So the honest
// report is a chip list plus the relay's own count for today, and the manifest
// records BOTH so nobody reads an empty chip list as a failed gate.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const RELAY = 'https://field-relay-nba.jeffunglesbee.workers.dev';
const KEYS = ['epl', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'eflchamp', 'eflone', 'efltwo'];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

(async () => {
  const m = { probed_at: new Date().toISOString(), url: URL, coverage: `${KEYS.length} of ${KEYS.length} gated keys` };

  // ---- claim 1: the deployed text ----
  const html = await (await fetch(URL, { headers: { 'Cache-Control': 'no-cache' } })).text();
  m.deployedBytes = html.length;
  m.helperPresentInDeployedBundle = html.includes('function _euSeasonActive()');
  m.keysBoundInDeployedBundle = Object.fromEntries(
    KEYS.map(k => [k, new RegExp(`${k}:\\s*_euSeasonActive\\(\\)`).test(html)]));
  m.allEightBound = Object.values(m.keysBoundInDeployedBundle).every(Boolean);
  m.anyStillHardcodedFalse = KEYS.some(k => new RegExp(`${k}:\\s*false`).test(html));
  // Widened: esbuild re-emits this with its own spacing and quote style, so the
  // source's exact form is not what lands in the bundle. The first version
  // matched only `SW_VERSION = '...'` and reported null for a value that is
  // present -- a false absence, which is the failure mode this whole session
  // keeps turning up.
  m.deployedSwVersion = (html.match(/SW_VERSION\s*[=:]\s*["']([0-9]{4}-[0-9]{2}-[0-9]{2}[a-z]?)["']/) || [])[1] || null;

  // ---- what the relay has for the date the APP IS SHOWING ----
  //
  // THE FIRST WORKING VERSION COMPARED THE WRONG DAY. It asked the relay for its
  // own default "today", which is UTC, and compared that against a chip list the
  // client builds on the ET date. At 2026-09-10T01:42Z those are 09-09 and
  // 09-10, and the one EFL League One fixture (19:00Z = 15:00 EDT on the 10th)
  // is TOMORROW in ET. The probe reported "no chip despite 1 game available" and
  // pointed at the gate. The app was right; the comparison was wrong. A units
  // mismatch reads exactly like a defect.
  m.etDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  m.utcDate = new Date().toISOString().slice(0, 10);
  m.datesDiffer = m.etDate !== m.utcDate;
  m.relayGamesOnEtDate = {};
  m.relayGamesOnUtcDate = {};
  for (const k of KEYS) {
    for (const [field, date] of [['relayGamesOnEtDate', m.etDate], ['relayGamesOnUtcDate', m.utcDate]]) {
      try {
        const d = await (await fetch(`${RELAY}/v2/games?sport=${k}&date=${date}`)).json();
        m[field][k] = d.sport === k ? d.count : 'BAD_SHAPE';
      } catch (e) { m[field][k] = `ERR ${e.message}`; }
    }
  }
  const sum = o => Object.values(o).filter(n => typeof n === 'number').reduce((a, b) => a + b, 0);
  // The client renders the ET slate, so THAT is the number a chip list answers to.
  m.totalEuropeanGamesToday = sum(m.relayGamesOnEtDate);
  m.totalEuropeanGamesUtcToday = sum(m.relayGamesOnUtcDate);

  // ---- claim 2: the rendered app ----
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(25000);   // the V2 poll cycle needs to run at least once

  // THE SELECTOR WAS WRONG THE FIRST TIME AND REPORTED AN EMPTY APP.
  // `[class*="filter"]` matched `.filter-chip-skeleton` -- the loading
  // placeholder -- so the probe read zero chips of ANY kind, including MLB which
  // certainly has games today, and then blamed the gate. The real bar is
  // `#sport-filters`, read from index.html rather than guessed.
  await page.waitForFunction(
    () => (document.querySelector('#sport-filters')?.textContent || '').trim().length > 0,
    { timeout: 45000 }).catch(() => {});

  const chipInfo = await page.evaluate(() => {
    const bar = document.querySelector('#sport-filters');
    if (!bar) return { found: false, chips: [], skeletonStillUp: null };
    const chips = [...bar.querySelectorAll('button, a, span')]
      .map(e => (e.textContent || '').trim())
      .filter(t => t && t.length < 40);
    return { found: true, chips,
             skeletonStillUp: !!bar.querySelector('.filter-chip-skeleton') };
  });
  m.chipBarFound = chipInfo.found;
  m.chips = chipInfo.chips;
  // If the skeleton is still up, the bar has not rendered yet and an empty chip
  // list says nothing about any gate.
  m.chipBarSkeletonStillUp = chipInfo.skeletonStillUp;
  const chipText = (m.chips || []).join(' | ').toUpperCase();
  m.europeanChipPresent = ['EPL','PREMIER','LA LIGA','LALIGA','SERIE A','BUNDESLIGA','LIGUE 1','EFL','LEAGUE ONE','LEAGUE TWO','CHAMPIONSHIP']
    .filter(t => chipText.includes(t));
  m.pageErrors = errors;

  await page.screenshot({ path: `outbox/eu-season-gate-live-${stamp}.png`, fullPage: false });
  await browser.close();

  // The verdict is stated so it cannot be misread in either direction.
  m.verdict = !m.allEightBound ? 'FAIL — the deployed bundle does not carry all eight bindings'
    : m.anyStillHardcodedFalse ? 'FAIL — a key is still hardcoded false in the deployed bundle'
    : m.chipBarSkeletonStillUp || m.chips.length === 0
      ? 'PASS (gate) / INCONCLUSIVE (render) — the chip bar rendered no chips AT ALL, not even for sports with games today, so the probe did not reach a rendered bar. Says nothing about the gate.'
    : m.europeanChipPresent.length ? 'PASS — gate deployed AND a European chip is rendering'
    : m.totalEuropeanGamesToday === 0
      ? `PASS (gate) / NOT-TESTABLE-TODAY (render) — all eight bound in the deployed bundle, and the relay has ZERO European fixtures on the ET date the app renders (${m.etDate}), so no chip can exist and the app is correct. The bar DID render (${m.chips.length} chips), so this is a live reading. ${m.totalEuropeanGamesUtcToday} fixture(s) exist on UTC ${m.utcDate} — a different day, not this slate.`
      : `PASS (gate) / NO CHIP despite ${m.totalEuropeanGamesToday} fixture(s) on the ET date ${m.etDate} — investigate`;

  fs.writeFileSync(`outbox/eu-season-gate-live-manifest-${stamp}.json`, JSON.stringify(m, null, 2));
  console.log(JSON.stringify(m, null, 2));
  process.exit(m.verdict.startsWith('FAIL') ? 1 : 0);
})();
