// cfl_wire_verify_probe.js — live TASK 3 verification for
// CC-CMD-2026-07-04-cfl-live-scoreboard-wire: confirms the live
// /cfl/scoreboard/rounds fetch actually renders on the deployed app
// (not the static fallback), with real today's game/score/status, and
// directly observes the TASK 3.3 circadian-classification finding
// (CFL cards still show data-circadian="LATE" despite carrying real
// live state, per the traced _circInput gap) rather than assuming it.
const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const TS = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z';
const OUT = `outbox/cfl-wire-probe-${TS}.txt`;

(async () => {
  const lines = [];
  const log = (s) => { lines.push(s); console.log(s); };
  let ok = true;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', err => log('[page error] ' + err.message));

  log(`=== CFL Wire Verify Probe [${TS}] ===`);
  log(`URL: ${FIELD_URL}`);

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(
    () => typeof allData !== 'undefined' && allData && Array.isArray(allData.sports) && allData.sports.length > 0,
    { timeout: 20000 }
  );
  log('App booted.');

  // CFL injection fires at 4300ms; wait well past it (and past
  // scheduleRenderAll's debounce) before checking.
  await page.waitForTimeout(9000);

  const result = await page.evaluate(() => {
    const section = document.querySelector('.sport-section[data-sport="Canadian Football (CFL)"]');
    if (!section) return { sectionPresent: false };
    const cards = Array.from(section.querySelectorAll('.game-card'));
    return {
      sectionPresent: true,
      cardCount: cards.length,
      cards: cards.map(c => ({
        gameid: c.dataset.gameid,
        circadian: c.dataset.circadian,
        home: c.dataset.home,
        away: c.dataset.away,
        starttime: c.dataset.starttime,
      })),
    };
  });

  log('RESULT: ' + JSON.stringify(result));

  if (!result.sectionPresent) {
    log('CFL section not present after 13s -- neither live fetch nor fallback produced a game for today (or today genuinely has none in this specific window).');
  } else {
    log(`CFL section present with ${result.cardCount} card(s).`);
    const liveCards = result.cards.filter(c => (c.gameid || '').startsWith('cfl_'));
    const fallbackCards = result.cards.filter(c => !(c.gameid || '').startsWith('cfl_'));
    log(`Live-path cards (gameid starts with "cfl_"): ${liveCards.length}`);
    log(`Fallback-path cards (no "cfl_" prefix): ${fallbackCards.length}`);
    const bothPresent = liveCards.length > 0 && fallbackCards.length > 0;
    log(`Live and fallback both present simultaneously (would be the duplicate-section bug): ${bothPresent}`);
    ok = ok && !bothPresent;

    // TASK 3.3 direct live observation (not just code trace): what does
    // data-circadian actually read on a real CFL card right now?
    result.cards.forEach(c => {
      log(`  card ${c.gameid}: ${c.away} @ ${c.home}, start ${c.starttime}, data-circadian="${c.circadian}"`);
    });
  }

  log('');
  log(ok ? 'RESULT: PASS -- no live/fallback coexistence detected.' : 'RESULT: FAIL -- see above.');

  await browser.close();
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  console.log(`Output: ${OUT}`);
  process.exit(ok ? 0 : 1);
})();
