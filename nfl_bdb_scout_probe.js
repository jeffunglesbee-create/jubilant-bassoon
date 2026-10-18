// Rule 90 render verification for the BDB scout rows on a LIVE NFL game.
// Renders the deployed PWA, opens the Stats tab, inventories each game's
// .bs-scout-lbl labels, flags NFL games, and reports a verdict. NO faked pass:
// if no NFL game is on the slate, nflGameCount=0 and nothing is verified.
//
// THE CONTRACT CHANGED 2026-10-17 (docs/CC-CMD-2026-10-16-bdb-vintage-retrofit.md,
// owner ruling). BDB tracking is the 2022 season. The four PLAYER-keyed rows must
// be ABSENT; the two TEAM-keyed rows must be present AND labelled with a season,
// "Tendencies (2022)" / "Time to throw (2022)". An unlabelled "Tendencies" is a
// failure, not a pass. Each NFL game's total scout-row count is recorded too, so
// whether the panel reads thin without the four is measured, not guessed.
//
// Mechanism (?wpt=1 modal bypass, #stats-nav-link, .bs-scout-lbl) copied
// from stats_tab_scouting_probe.js — the proven scouting-probe path.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const URL = BASE + (BASE.includes('?') ? '&' : '?') + 'wpt=1';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const DROPPED_ROWS = ['Top speed', 'Top separation', 'Route tree', 'Pass rush'];
const KEPT_ROWS = ['Tendencies', 'Time to throw'];          // base label; must carry "(YYYY)"
// Owner, 2026-10-18: speed returns per current starter, as a floor. OPTIONAL — a
// game whose four starters were all untracked in 2022 has no row — but when it
// renders it must carry its season and mark every value as a floor ("≥").
const SPEED_ROW = 'Speed floor mph';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 3200 } });
  const manifest = { url: URL, ts: TS, droppedRows: DROPPED_ROWS, keptRows: KEPT_ROWS, speedRow: SPEED_ROW };

  // The relay's own NFL count for today (ET), read from the runner, not the page.
  // 2026-10-18: the page showed no NFL section while the relay served 12 games,
  // and this probe printed SKIP ("no NFL game on slate") and exited 0. A slate
  // the relay says exists is not an empty slate.
  try {
    const etDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
    const r = await fetch(`https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=nfl&date=${etDate}`);
    const j = await r.json();
    manifest.relayNflGameCount = Array.isArray(j?.games) ? j.games.length : null;
    manifest.relayNflDate = etDate;
  } catch (e) { manifest.relayNflGameCount = null; manifest.relayError = String(e?.message || e); }

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.game-card', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(9000); // let nflTeamTablesInit (fires ~6s post-boot) load

    manifest.moduleBooted = await page.evaluate(() => document.querySelectorAll('.game-card').length > 0);
    manifest.swVersion = await page.evaluate(() => window.SW_VERSION || null);

    await page.click('#stats-nav-link', { timeout: 15000 });
    await page.waitForTimeout(6000);

    const data = await page.evaluate(([DROPPED_ROWS, KEPT_ROWS, SPEED_ROW]) => {
      const sec = document.getElementById('stats-section');
      if (!sec) return { statsSectionPresent: false };
      const blocks = [...sec.querySelectorAll('.stats-sport-block')];
      const tg = blocks.find((b) =>
        (b.querySelector('.stats-sport-label')?.textContent || '').includes("Today's Games"));
      if (!tg) return { statsSectionPresent: true, todayGamesBlockPresent: false };

      const games = [...tg.querySelectorAll('.stats-subsection')].map((sub) => {
        const header = sub.querySelector('.stats-subsection-label')?.textContent?.trim() || '';
        const labelEls = [...sub.querySelectorAll('.bs-scout-lbl')];
        const labels = labelEls.map((s) => s.textContent.trim());
        // NFL games carry NFL-only scout labels. Matched on the base label so a
        // kept row is recognised whatever season it carries, or none.
        const base = (l) => l.replace(/ \(\d{4}\)$/, '');
        const nflMarkers = ['Team EPA', 'Pass pro', 'QB CPOE', ...DROPPED_ROWS, ...KEPT_ROWS, SPEED_ROW];
        const isNFL = labels.some((l) => nflMarkers.includes(base(l)));
        const droppedPresent = DROPPED_ROWS.filter((r) => labels.includes(r));
        const kept = {};
        for (const r of KEPT_ROWS) {
          const l = labels.find((x) => base(x) === r);
          kept[r] = { present: !!l, label: l || null, season: l ? (l.match(/\((\d{4})\)$/) || [])[1] || null : null };
        }
        // The value is the label's next sibling (.bs-scout-val); each player entry
        // "X.Name ≥19.6" must carry the floor mark, and an entry without one fails.
        const si = labels.findIndex((x) => base(x) === SPEED_ROW);
        const sval = si >= 0 ? (labelEls[si].nextElementSibling?.textContent || '').trim() : null;
        const entries = sval ? (sval.match(/\d+\.\d/g) || []) : [];
        const floors = sval ? (sval.match(/≥\d+\.\d/g) || []) : [];
        const speed = { present: si >= 0, label: si >= 0 ? labels[si] : null,
                        season: si >= 0 ? (labels[si].match(/\((\d{4})\)$/) || [])[1] || null : null,
                        value: sval, entries: entries.length, floorMarked: floors.length };
        const speedHolds = !speed.present || (!!speed.season && entries.length > 0 && floors.length === entries.length);
        return { header, scoutLabels: labels, rowCount: labels.length, isNFL, droppedPresent, kept, speed,
                 contractHolds: droppedPresent.length === 0 && KEPT_ROWS.every((r) => kept[r].present && kept[r].season) && speedHolds };
      });
      return { statsSectionPresent: true, todayGamesBlockPresent: true,
               todayGameCount: games.length, games };
    }, [DROPPED_ROWS, KEPT_ROWS, SPEED_ROW]);
    Object.assign(manifest, data);

    const nfl = (manifest.games || []).filter((g) => g.isNFL);
    manifest.nflGameCount = nfl.length;
    manifest.nflGames = nfl.map((g) => ({ header: g.header, rowCount: g.rowCount, scoutLabels: g.scoutLabels,
                                          droppedPresent: g.droppedPresent, kept: g.kept, speed: g.speed, contractHolds: g.contractHolds }));
    manifest.speedRowGames = nfl.filter((g) => g.speed?.present).length;
    manifest.gamesHoldingContract = nfl.filter((g) => g.contractHolds).map((g) => g.header);
    const counts = nfl.map((g) => g.rowCount).sort((a, b) => a - b);
    manifest.nflRowCount = counts.length ? { min: counts[0], median: counts[Math.floor(counts.length / 2)], max: counts[counts.length - 1] } : null;
    // VERDICT: EVERY live NFL game shows none of the four dropped rows and both
    // kept rows with a season. One game holding it is not enough: a game whose
    // team tables failed to load would otherwise hide a regression in another.
    manifest.contractHoldsOnEveryNFLGame = nfl.length > 0 && manifest.gamesHoldingContract.length === nfl.length;

    await page.screenshot({ path: `outbox/nfl-bdb-scout-${TS}.png`, fullPage: false });
  } catch (e) {
    manifest.error = String(e && e.message ? e.message : e);
  } finally {
    await browser.close();
  }

  // The relay has NFL games and the page shows none, or fewer: not a SKIP.
  // null (relay unreadable) is also not a SKIP, because an empty page could
  // not then be told from an empty slate.
  manifest.pageMissesRelayGames = manifest.relayNflGameCount == null
    || (manifest.nflGameCount || 0) < manifest.relayNflGameCount;
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/nfl-bdb-scout-manifest-${TS}.json`, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));

  // Exit code drives the automated schedule: a REGRESSION (an NFL game is on
  // the slate but not every BDB row rendered) is a red run. No NFL game today
  // (off-season / no games in this window) is NOT a failure — exit 0. A boot
  // failure or missing every row despite NFL games present is fatal.
  const nflOnSlate = (manifest.nflGameCount || 0) > 0;
  const regression = nflOnSlate && manifest.contractHoldsOnEveryNFLGame !== true;
  // The speed row is optional PER GAME (a game whose starters were all
  // untracked in 2022 has none: SEA and CLE alone, on the 2026-10-12 depth
  // chart). It is not optional across a slate: on none of them means the table
  // never loaded. Measured 2026-10-18: 12/12 at 12:35 UTC, then 0/12 from
  // 14:55, and this probe passed both.
  const speedTableMissing = nflOnSlate && manifest.nflGameCount >= 2 && !(manifest.speedRowGames > 0);
  if (manifest.error || regression || manifest.pageMissesRelayGames || speedTableMissing) {
    console.error(`[FAIL] error=${manifest.error || ''} nflGames=${manifest.nflGameCount} relayNflGames=${manifest.relayNflGameCount} holding=${(manifest.gamesHoldingContract || []).length} speedRowGames=${manifest.speedRowGames}`);
    process.exit(1);
  }
  console.log(nflOnSlate
    ? `[PASS] ${manifest.gamesHoldingContract.length}/${manifest.nflGameCount} NFL games: no team-keyed player row, both team rows season-labelled, speed floor on ${manifest.speedRowGames}/${manifest.nflGameCount} and marked "≥" where shown; rows per game ${JSON.stringify(manifest.nflRowCount)}`
    : `[SKIP] no NFL game on slate this window (relay agrees: ${manifest.relayNflGameCount}) — nothing to verify`);
  process.exit(0);
})();
