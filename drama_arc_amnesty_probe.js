// drama_arc_amnesty_probe.js — proves the bottom-sheet Drama Arc sparkline is
// gated to the ADR-002 amnesty zone (post-game only).
//
// CC-CMD-2026-09-04-bottom-sheet-drama-arc-amnesty TASK 4b.
//
// It does not wait for a real live game. It seeds a real game's drama history
// in localStorage and injects an espnScores entry with the state under test, so
// both branches are exercised deterministically against the LIVE deploy.
//
// Pass condition: liveSparklinePresent === false AND postSparklinePresent === true.
// Both false is a FAIL — it means the sheet never mounted and the probe measured
// nothing. That case is asserted explicitly, not left to a reader.

const { chromium } = require('@playwright/test');
const fs = require('fs');

// ?pl-verify is the established test hook: field.js exposes window._plVerify
// (openBottomSheet, setEspnScore, pushAllDataSport) only when it is present.
// allData and espnScores are module-level, not globals — this API is the only
// supported way in. Probing without it reads undefined and measures nothing.
const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const FIELD_URL = BASE + (BASE.includes('?') ? '&' : '?') + 'pl-verify';
const PROBE_ID = '__amnesty_probe_game__';
const OUT = 'outbox';
const RUN_ID = process.env.GITHUB_RUN_ID || String(Date.now());
const PEAK = 88;

// 6 samples, ~30s apart, peaking at PEAK. buildDramaSparklineSVG needs >= 3.
const HISTORY = (() => {
  const now = Date.now();
  return [41, 55, 62, PEAK, 74, 69].map((s, i) => ({ t: now - (6 - i) * 30000, s }));
})();

async function runCase(page, state) {
  return page.evaluate(async ({ state, history, gameId }) => {
    const out = { state, seeded: false, gameId, sheetRendered: false,
                  sparklinePresent: false, peakTextPresent: false,
                  bsContentChildCount: 0, error: null };
    try {
      const V = window._plVerify;
      if (!V) { out.error = '_plVerify absent — ?pl-verify not honoured by this build'; return out; }

      // A synthetic game, so the probe does not depend on today's slate.
      // Single-word team names so teamNick(home) is a substring of homeName,
      // which is what openBottomSheet's espnScores .find() tests.
      V.pushAllDataSport({ sport: 'AmnestyProbe', games: [
        { _id: gameId, home: 'Probehome', away: 'Probeaway', start_time: new Date().toISOString(), venue: 'Probe Field' },
      ]});

      localStorage.setItem('field_drama_history_' + gameId, JSON.stringify(history));

      V.setEspnScore('__amnesty_probe__', {
        homeName: 'Probehome', home: 'Probehome',
        awayName: 'Probeaway', away: 'Probeaway',
        homeScore: 4, awayScore: 3,
        state, period: 0,
      });

      out.seeded = true;
      V.openBottomSheet(gameId);

      const content = document.getElementById('bs-content');
      out.bsContentChildCount = content ? content.children.length : 0;
      out.sheetRendered = out.bsContentChildCount > 0;
      const spark = content && content.querySelector('.drama-sparkline');
      out.sparklinePresent = !!spark;
      out.peakTextPresent = !!(spark && /\d/.test(
        Array.from(spark.querySelectorAll('text')).map(t => t.textContent).join('')));
      return out;
    } catch (e) { out.error = String(e && e.message || e); return out; }
  }, { state, history: HISTORY, gameId: PROBE_ID });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the test API, not for a live slate — the probe supplies its own game.
  const haveData = await page.waitForFunction(
    () => !!(window._plVerify && window._plVerify.openBottomSheet && document.getElementById('bs-content')),
    { timeout: 30000 }).then(() => true).catch(() => false);

  const live = haveData ? await runCase(page, 'in')   : { error: '_plVerify / #bs-content never appeared' };
  // Close the sheet between cases so the second render starts clean.
  await page.evaluate(() => { try { closeBottomSheet && closeBottomSheet(); } catch (e) {} });
  const post = haveData ? await runCase(page, 'post') : { error: '_plVerify / #bs-content never appeared' };

  let screenshot = null;
  try {
    screenshot = `${OUT}/drama-arc-amnesty-post-${RUN_ID}.png`;
    await page.locator('#bs-content').screenshot({ path: screenshot, timeout: 10000 });
  } catch (e) { screenshot = null; }

  const manifest = {
    url: FIELD_URL,
    runId: RUN_ID,
    commit: process.env.GITHUB_SHA || null,
    timestamp: new Date().toISOString(),
    historySamples: HISTORY.length,
    peakSeeded: PEAK,
    testApiReady: haveData,
    gameId: PROBE_ID,
    liveSparklinePresent: live.sparklinePresent === true,
    postSparklinePresent: post.sparklinePresent === true,
    livePeakTextPresent: live.peakTextPresent === true,
    postPeakTextPresent: post.peakTextPresent === true,
    liveSheetRendered: live.sheetRendered === true,
    postSheetRendered: post.sheetRendered === true,
    liveBsContentChildCount: live.bsContentChildCount || 0,
    postBsContentChildCount: post.bsContentChildCount || 0,
    screenshot,
    consoleErrors: errors.slice(0, 10),
    liveError: live.error || null,
    postError: post.error || null,
  };

  fs.mkdirSync(OUT, { recursive: true });
  const path = `${OUT}/drama-arc-amnesty-manifest-${RUN_ID}.json`;
  fs.writeFileSync(path, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));

  await browser.close();

  // ── Pass conditions, asserted here so a silent no-op cannot read as a pass ──
  const problems = [];
  if (!manifest.testApiReady)      problems.push('_plVerify never appeared — probe measured nothing');
  if (!manifest.postSheetRendered)  problems.push('post case: #bs-content empty — the sheet never rendered');
  if (!manifest.liveSheetRendered)  problems.push('live case: #bs-content empty — the sheet never rendered');
  if (manifest.liveSparklinePresent)  problems.push('live case: sparkline PRESENT — the amnesty gate is not holding');
  if (!manifest.postSparklinePresent) problems.push('post case: sparkline ABSENT — the gate is over-blocking');
  if (manifest.livePeakTextPresent)   problems.push('live case: peak number rendered as text');

  if (problems.length) {
    console.error('\nFAIL:\n  - ' + problems.join('\n  - '));
    process.exit(1);
  }
  console.log('\nPASS: live sparkline absent, post sparkline present, both sheets rendered.');
})().catch(e => { console.error(e); process.exit(1); });
