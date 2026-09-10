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
  m.deployedSwVersion = (html.match(/SW_VERSION = '([^']+)'/) || [])[1] || null;

  // ---- what the relay has TODAY, so an empty chip list is readable ----
  m.relayGamesToday = {};
  for (const k of KEYS) {
    try {
      const d = await (await fetch(`${RELAY}/v2/games?sport=${k}`)).json();
      m.relayGamesToday[k] = d.sport === k ? d.count : 'BAD_SHAPE';
    } catch (e) { m.relayGamesToday[k] = `ERR ${e.message}`; }
  }
  m.totalEuropeanGamesToday = Object.values(m.relayGamesToday).filter(n => typeof n === 'number').reduce((a, b) => a + b, 0);

  // ---- claim 2: the rendered app ----
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(25000);   // the V2 poll cycle needs to run at least once

  m.chips = await page.evaluate(() => {
    const bar = document.querySelector('#filter-bar, .filter-bar, [class*="filter"]');
    if (!bar) return null;
    return [...bar.querySelectorAll('button, a, span')]
      .map(e => (e.textContent || '').trim()).filter(t => t && t.length < 40);
  });
  m.chipBarFound = m.chips !== null;
  const chipText = (m.chips || []).join(' | ').toUpperCase();
  m.europeanChipPresent = ['EPL','PREMIER','LA LIGA','LALIGA','SERIE A','BUNDESLIGA','LIGUE 1','EFL','LEAGUE ONE','LEAGUE TWO','CHAMPIONSHIP']
    .filter(t => chipText.includes(t));
  m.pageErrors = errors;

  await page.screenshot({ path: `outbox/eu-season-gate-live-${stamp}.png`, fullPage: false });
  await browser.close();

  // The verdict is stated so it cannot be misread in either direction.
  m.verdict = !m.allEightBound ? 'FAIL — the deployed bundle does not carry all eight bindings'
    : m.anyStillHardcodedFalse ? 'FAIL — a key is still hardcoded false in the deployed bundle'
    : m.europeanChipPresent.length ? 'PASS — gate deployed AND a European chip is rendering'
    : m.totalEuropeanGamesToday === 0
      ? 'PASS (gate) / NOT-TESTABLE-TODAY (render) — all eight bound in the deployed bundle; the relay has zero European games today (international break), so no chip can exist'
      : `PASS (gate) / NO CHIP despite ${m.totalEuropeanGamesToday} game(s) available today — investigate`;

  fs.writeFileSync(`outbox/eu-season-gate-live-manifest-${stamp}.json`, JSON.stringify(m, null, 2));
  console.log(JSON.stringify(m, null, 2));
  process.exit(m.verdict.startsWith('FAIL') ? 1 : 0);
})();
