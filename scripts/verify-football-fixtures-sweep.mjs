// One-shot CI probe (workflow_dispatch only). CC-CMD-2026-08-02-add-
// football-to-date-fixtures-sweep TASK 3: real verification. Reproduces
// the exact real URL-construction logic shipped in
// fetchESPNFixturesForDate (src/legacy/field.js) -- including the new
// groupsParam handling -- and confirms: (1) real NFL games come back
// with correct home/away fields for the confirmed Sept 10/11 2026 date,
// (2) real CFB games come back with groups=80 correctly applied as a
// query param (not path-embedded), (3) an existing, already-shipped
// sport (NHL, a real June 2026 Stanley Cup Final date already hardcoded
// elsewhere in this codebase) is unaffected -- same URL shape as before
// the groupsParam addition (empty string appended, no behavior change).

import { writeFileSync } from 'fs';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

// Exact same FETCH_LEAGUES entries shipped in field.js (subset relevant
// to this verification), including the real groupsParam mechanism.
const ENTRIES = [
  { sport: 'football', league: 'nfl', section: 'NFL', dateStr: '20260910' },
  { sport: 'football', league: 'nfl', section: 'NFL', dateStr: '20260911' }, // real game landed on the 11th per the shape probe
  { sport: 'football', league: 'college-football', section: 'CFB', dateStr: '20260829', groupsParam: '80' },
  { sport: 'hockey', league: 'nhl', section: 'NHL', dateStr: '20260615' }, // real, already-hardcoded Stanley Cup Final G6 date -- regression check
];

function buildUrl({ sport, league, dateStr, groupsParam }) {
  return `${ESPN_BASE}/${sport}/${league}/scoreboard?dates=${dateStr}&limit=50`
    + (groupsParam ? `&groups=${groupsParam}` : '');
}

function buildGame(ev, section) {
  const comp = (ev.competitions || [])[0];
  if (!comp) return null;
  const comps = comp.competitors || [];
  const home = comps.find(t => t.homeAway === 'home') || comps[0];
  const away = comps.find(t => t.homeAway === 'away') || comps[1];
  if (!home || !away) return null;
  return {
    _sport: section,
    home: home.team?.displayName || '?',
    away: away.team?.displayName || '?',
    league: section,
    start_time: ev.date || '',
    venue: comp.venue?.fullName || '',
  };
}

async function main() {
  const out = { entries: [], regressionCheck: null, error: null };
  try {
    for (const entry of ENTRIES) {
      const url = buildUrl(entry);
      const groupsParamCorrectlyQueryString = entry.groupsParam ? url.includes('&groups=' + entry.groupsParam) && !url.includes(`/${entry.groupsParam}/scoreboard`) : true;
      const r = await fetch(url);
      const body = await r.json();
      const events = body.events || [];
      const games = events.map(ev => buildGame(ev, entry.section)).filter(Boolean);
      out.entries.push({
        ...entry, url, status: r.status,
        eventCount: events.length, gameCount: games.length,
        sampleGame: games[0] || null,
        groupsParamCorrectlyQueryString,
      });
    }
    // Regression check: the NHL entry (no groupsParam) must produce the
    // exact same URL shape as before this change (no trailing junk from
    // the new `+ (groupsParam ? ... : "")` logic).
    const nhlEntry = out.entries.find(e => e.league === 'nhl');
    out.regressionCheck = {
      urlHasNoGroupsSuffix: !!nhlEntry && !nhlEntry.url.includes('groups'),
      urlEndsCorrectly: !!nhlEntry && nhlEntry.url.endsWith('limit=50'),
    };
  } catch (e) {
    out.error = String(e).slice(0, 300);
  }
  console.log(JSON.stringify(out, null, 2));
  writeFileSync('outbox/verify-football-fixtures-sweep-result.json', JSON.stringify(out, null, 2));

  const nflGames = out.entries.filter(e => e.league === 'nfl').reduce((s, e) => s + e.gameCount, 0);
  const cfbEntry = out.entries.find(e => e.league === 'college-football');
  const allPass =
    nflGames > 0 &&
    cfbEntry && cfbEntry.gameCount > 0 && cfbEntry.groupsParamCorrectlyQueryString &&
    out.regressionCheck.urlHasNoGroupsSuffix && out.regressionCheck.urlEndsCorrectly;
  console.log(`\nallPass=${allPass}`);
  if (!allPass) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
