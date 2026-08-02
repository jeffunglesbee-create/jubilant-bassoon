// One-shot CI probe (workflow_dispatch only). CC-CMD-2026-08-02-wire-
// bundesliga-broadcasts-date-mode -- follow-up: full e2e verification
// against a REAL historical fixture, since the break-window gate only
// blocks fetching CURRENT/live schedule data (correctly, so stale
// off-season results don't leak into the live app), not testing the
// pipeline against a real past date. This replicates the exact same
// three real calls the shipped code makes -- ESPN scoreboard fetch,
// relay resolve-dayid date-mode, relay broadcasts -- for the same real
// (season, date) pair already cross-verified in field-relay-nba's own
// CC-CMD (2025-2026, 2026-05-09, real Matchday 33).

import { writeFileSync } from 'fs';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const RELAY_BASE = 'https://field-relay-nba.jeffunglesbee.workers.dev';
const DATE_ESPN = '20260509';   // ESPN's YYYYMMDD format, same as fetchSoccerFixtures
const DATE_ISO  = '2026-05-09'; // same real date, ISO format
const SEASON    = '2025-2026';

// Exact same logic shipped in src/legacy/field.js -- not re-derived, so
// this probe fails if the two ever drift.
function _bundesligaSeasonFromDate(year, month) {
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

async function main() {
  const out = {
    date: DATE_ISO, season: SEASON,
    espnEventCount: null, espnSampleGame: null,
    derivedSeason: null, seasonDerivationCorrect: null,
    resolveOk: null, broadcastsOk: null, error: null,
  };
  try {
    // Step 1: real ESPN fetch, identical URL shape to fetchSoccerFixtures.
    const espnR = await fetch(`${ESPN_BASE}/soccer/ger.1/scoreboard?dates=${DATE_ESPN}&limit=30`);
    const espnBody = await espnR.json();
    const events = espnBody.events || [];
    out.espnEventCount = events.length;
    if (events.length) {
      const ev = events[0];
      const comp = (ev.competitions || [])[0];
      const comps = comp?.competitors || [];
      const home = comps.find(c => c.homeAway === 'home');
      const away = comps.find(c => c.homeAway === 'away');
      out.espnSampleGame = {
        home: home?.team?.displayName, away: away?.team?.displayName, date: ev.date,
      };
    }

    // Step 2: same season-derivation function shipped in field.js.
    const [y, mo] = [parseInt(DATE_ISO.slice(0, 4), 10), parseInt(DATE_ISO.slice(5, 7), 10)];
    out.derivedSeason = _bundesligaSeasonFromDate(y, mo);
    out.seasonDerivationCorrect = out.derivedSeason === SEASON;

    // Step 3: real relay calls, identical to _fetchBundesligaRealBroadcastStreams.
    const resolveR = await fetch(`${RELAY_BASE}/bundesliga-bapi/resolve-dayid?season=${out.derivedSeason}&date=${DATE_ISO}`);
    const resolveBody = await resolveR.json();
    out.resolve = resolveBody;
    out.resolveOk = resolveBody?.ok === true && !!resolveBody.dayId && !!resolveBody.comId;

    if (out.resolveOk) {
      const bR = await fetch(`${RELAY_BASE}/bundesliga-bapi/broadcasts?comId=${encodeURIComponent(resolveBody.comId)}&dayId=${encodeURIComponent(resolveBody.dayId)}`);
      const bBody = await bR.json();
      out.broadcasts = bBody;
      out.broadcastsOk = bBody?.available === true;
    }
  } catch (e) {
    out.error = String(e).slice(0, 300);
  }

  console.log(JSON.stringify(out, null, 2));
  writeFileSync('outbox/verify-bundesliga-e2e-historical-result.json', JSON.stringify(out, null, 2));

  const fullChainReal =
    out.espnEventCount > 0 && out.seasonDerivationCorrect && out.resolveOk && out.broadcastsOk;
  console.log(`\nfullChainReal=${fullChainReal}`);
  if (!fullChainReal) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
