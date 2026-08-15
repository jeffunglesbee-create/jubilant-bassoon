// nfl_epa_probe.js — live DOM verification of NFL EPA wiring (P1-1/P1-2).
// Runs a real Playwright browser against the LIVE deploy, waits for nflEpaInit
// (fires ~4s, then polls /espn-summary and injects .ufl-epa-live into NFL cards),
// and records a STRUCTURED manifest — boolean/number fields, not prose (Rule 90).
//
// Verdict logic distinguishes the three real states:
//   liveNFLCards>0 && epaChipsOnNFL>0  → PASS  (feature works end-to-end)
//   liveNFLCards>0 && epaChipsOnNFL==0 → FAIL  (live game, no chip = code broken)
//   liveNFLCards==0                    → INCONCLUSIVE (no in-window game right now)

const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const OUT = 'outbox';
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 2400 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait up to 45s for an EPA chip to be injected on an NFL card. nflEpaInit fires
  // at 4s, loads the table, polls each in-window game (~500ms apart), fetches the
  // summary, computes EPA, injects. Resolve early on success; otherwise fall through.
  await page.waitForFunction(() => {
    return [...document.querySelectorAll('[data-sport="NFL"]')]
      .some(c => c.querySelector('.ufl-epa-live'));
  }, { timeout: 75000 }).catch(() => {});

  // Give a poll cycle a moment to finish injecting across all live games.
  await page.waitForTimeout(2000);

  const state = await page.evaluate(() => {
    const nflCards = [...document.querySelectorAll('[data-sport="NFL"]')];
    const liveNFL = nflCards.filter(c => c.classList.contains('espn-live'));
    const chipsOnNFL = nflCards.filter(c => c.querySelector('.ufl-epa-live'));
    const sample = chipsOnNFL[0]?.querySelector('.ufl-epa-live');
    const anyNFLGameInData = (() => {
      try {
        const sec = (window.allData?.sports || []).find(s => s.sport === 'NFL');
        const games = sec?.games || [];
        return {
          nflSectionInData: !!sec,
          nflGamesInData: games.length,
          gamesWithEpaLive: games.filter(g => g._epaLive?.lastPlay).length,
          sampleGameId: games[0]?._gameId || null,
        };
      } catch (e) { return { err: String(e) }; }
    })();
    return {
      nflSectionPresent: nflCards.length > 0,
      nflCardCount: nflCards.length,
      liveNFLCardCount: liveNFL.length,
      epaChipsOnNFLCards: chipsOnNFL.length,
      totalEpaChips: document.querySelectorAll('.ufl-epa-live').length,
      sampleChipText: sample ? sample.textContent.trim().slice(0, 120) : null,
      ...anyNFLGameInData,
    };
  });

  // PASS = the EPA chip actually rendered on an NFL card (the real E2E proof;
  // the chip shows for any game in the -10min..+5hr poll window, live or just
  // final). FAIL = the section is missing (fix didn't work) or a live game
  // produced no chip. INCONCLUSIVE = cards exist but no in-window game to
  // compute EPA from yet (all upcoming).
  let verdict;
  if (state.epaChipsOnNFLCards > 0) verdict = 'PASS';
  else if (state.nflCardCount === 0) verdict = 'FAIL_NO_NFL_SECTION';
  else if (state.liveNFLCardCount > 0) verdict = 'FAIL_LIVE_GAME_NO_CHIP';
  else verdict = 'INCONCLUSIVE_NO_INWINDOW_GAME';

  const manifest = { probe: 'nfl-epa', url: FIELD_URL, ts, verdict, ...state,
    consoleErrorCount: errors.length, consoleErrorsSample: errors.slice(0, 5) };

  console.log(JSON.stringify(manifest, null, 2));
  fs.writeFileSync(`${OUT}/nfl-epa-probe-manifest-${ts}.json`, JSON.stringify(manifest, null, 2));

  // Screenshot the first NFL card carrying a chip (or the page if none).
  try {
    const target = state.epaChipsOnNFLCards > 0
      ? await page.$('[data-sport="NFL"]:has(.ufl-epa-live)')
      : await page.$('[data-sport="NFL"]');
    if (target) await target.screenshot({ path: `${OUT}/nfl-epa-probe-${ts}.png`, timeout: 8000 });
    else await page.screenshot({ path: `${OUT}/nfl-epa-probe-${ts}.png`, fullPage: false });
  } catch (e) { console.log('screenshot failed:', e.message); }

  await browser.close();
  // Never fail the pipeline on INCONCLUSIVE; only a real code break is nonzero.
  process.exit(verdict.startsWith('FAIL') ? 1 : 0);
})();
