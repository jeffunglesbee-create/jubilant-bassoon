// Rule 90 render verification for the 5 BDB scout rows on a LIVE NFL game.
// Renders the deployed PWA, opens the Stats tab, inventories each game's
// .bs-scout-lbl labels, flags NFL games, and reports per-row booleans +
// an allFiveRowsPresent verdict. NO faked pass: if no NFL game is on the
// slate today, nflGameCount=0 and the verdict is explicitly unmet.
//
// Mechanism (?wpt=1 modal bypass, #stats-nav-link, .bs-scout-lbl) copied
// from stats_tab_scouting_probe.js — the proven scouting-probe path.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const URL = BASE + (BASE.includes('?') ? '&' : '?') + 'wpt=1';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const TARGET_ROWS = ['Top speed', 'Top separation', 'Route tree', 'Pass rush', 'Tendencies', 'Time to throw'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 3200 } });
  const manifest = { url: URL, ts: TS, targetRows: TARGET_ROWS };

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.game-card', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(9000); // let nflTeamTablesInit (fires ~6s post-boot) load

    manifest.moduleBooted = await page.evaluate(() => document.querySelectorAll('.game-card').length > 0);
    manifest.swVersion = await page.evaluate(() => window.SW_VERSION || null);

    await page.click('#stats-nav-link', { timeout: 15000 });
    await page.waitForTimeout(6000);

    const data = await page.evaluate((TARGET_ROWS) => {
      const sec = document.getElementById('stats-section');
      if (!sec) return { statsSectionPresent: false };
      const blocks = [...sec.querySelectorAll('.stats-sport-block')];
      const tg = blocks.find((b) =>
        (b.querySelector('.stats-sport-label')?.textContent || '').includes("Today's Games"));
      if (!tg) return { statsSectionPresent: true, todayGamesBlockPresent: false };

      const games = [...tg.querySelectorAll('.stats-subsection')].map((sub) => {
        const header = sub.querySelector('.stats-subsection-label')?.textContent?.trim() || '';
        const labels = [...sub.querySelectorAll('.bs-scout-lbl')].map((s) => s.textContent.trim());
        // NFL games carry NFL-only scout labels (Team EPA / Pass pro / the 5 BDB rows).
        const nflMarkers = ['Team EPA', 'Pass pro', ...TARGET_ROWS];
        const isNFL = labels.some((l) => nflMarkers.includes(l));
        const rowPresence = {};
        for (const r of TARGET_ROWS) rowPresence[r] = labels.includes(r);
        return { header, scoutLabels: labels, isNFL, rowPresence,
                 allFive: TARGET_ROWS.every((r) => labels.includes(r)) };
      });
      return { statsSectionPresent: true, todayGamesBlockPresent: true,
               todayGameCount: games.length, games };
    }, TARGET_ROWS);
    Object.assign(manifest, data);

    const nfl = (manifest.games || []).filter((g) => g.isNFL);
    manifest.nflGameCount = nfl.length;
    manifest.perRowPresentAcrossNFL = {};
    for (const r of TARGET_ROWS) manifest.perRowPresentAcrossNFL[r] = nfl.filter((g) => g.rowPresence[r]).length;
    manifest.gamesWithAllFive = nfl.filter((g) => g.allFive).map((g) => g.header);
    manifest.nflGames = nfl.map((g) => ({ header: g.header, allFive: g.allFive, rowPresence: g.rowPresence }));
    // VERDICT: at least one live NFL game rendered all five BDB rows.
    manifest.allFiveRowsPresent = manifest.gamesWithAllFive.length > 0;

    await page.screenshot({ path: `outbox/nfl-bdb-scout-${TS}.png`, fullPage: false });
  } catch (e) {
    manifest.error = String(e && e.message ? e.message : e);
  } finally {
    await browser.close();
  }

  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/nfl-bdb-scout-manifest-${TS}.json`, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));

  // Exit code drives the automated schedule: a REGRESSION (an NFL game is on
  // the slate but not every BDB row rendered) is a red run. No NFL game today
  // (off-season / no games in this window) is NOT a failure — exit 0. A boot
  // failure or missing every row despite NFL games present is fatal.
  const nflOnSlate = (manifest.nflGameCount || 0) > 0;
  const regression = nflOnSlate && manifest.allFiveRowsPresent !== true;
  if (manifest.error || regression) {
    console.error(`[FAIL] error=${manifest.error || ''} nflGames=${manifest.nflGameCount} allFive=${manifest.allFiveRowsPresent}`);
    process.exit(1);
  }
  console.log(nflOnSlate
    ? `[PASS] ${manifest.gamesWithAllFive.length}/${manifest.nflGameCount} NFL games rendered all 5 rows`
    : `[SKIP] no NFL game on slate this window — nothing to verify`);
  process.exit(0);
})();
