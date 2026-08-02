// One-shot CI probe (workflow_dispatch only). CC-CMD-2026-08-02-add-
// football-to-date-fixtures-sweep TASK 1: real, live confirmation of
// ESPN's NFL/CFB scoreboard event shape, specifically the fields
// fetchESPNFixturesForDate's existing generic (non-golf) mapper reads
// (competitions[0].competitors[].homeAway, .team.displayName,
// competitions[0].venue.fullName, ev.date) -- checking whether football
// matches the same convention as the 5 sports already wired, or needs
// its own branch (matching adaptESPNFootball's real reason for existing:
// down/distance/situation/curatedRank, none of which this function reads
// for ANY sport, so that reason may not apply here).

import { writeFileSync } from 'fs';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const NFL_DATE = '20260910'; // real confirmed 49ers @ Rams date, elsewhere in this codebase
const CFB_DATE = '20260829'; // real confirmed CFB season opener date

async function fetchScoreboard(url) {
  const r = await fetch(url);
  const body = await r.json();
  return { status: r.status, body };
}

function extractSample(events) {
  if (!events.length) return null;
  const ev = events[0];
  const comp = (ev.competitions || [])[0];
  const comps = comp?.competitors || [];
  const home = comps.find(t => t.homeAway === 'home');
  const away = comps.find(t => t.homeAway === 'away');
  return {
    hasCompetitions: !!comp,
    competitorCount: comps.length,
    homeAwayFieldPresent: comps.every(c => 'homeAway' in c),
    home: home ? { displayName: home.team?.displayName, homeAway: home.homeAway } : null,
    away: away ? { displayName: away.team?.displayName, homeAway: away.homeAway } : null,
    venueFullName: comp?.venue?.fullName,
    evDate: ev.date,
  };
}

async function main() {
  const out = { nfl: null, cfbNoGroups: null, cfbWithGroups: null, error: null };
  try {
    const nflR = await fetchScoreboard(`${ESPN_BASE}/football/nfl/scoreboard?dates=${NFL_DATE}&limit=50`);
    out.nfl = { status: nflR.status, eventCount: (nflR.body.events || []).length, sample: extractSample(nflR.body.events || []) };

    const cfbNoGroupsR = await fetchScoreboard(`${ESPN_BASE}/football/college-football/scoreboard?dates=${CFB_DATE}&limit=50`);
    out.cfbNoGroups = { status: cfbNoGroupsR.status, eventCount: (cfbNoGroupsR.body.events || []).length };

    const cfbWithGroupsR = await fetchScoreboard(`${ESPN_BASE}/football/college-football/scoreboard?dates=${CFB_DATE}&limit=50&groups=80`);
    out.cfbWithGroups = { status: cfbWithGroupsR.status, eventCount: (cfbWithGroupsR.body.events || []).length, sample: extractSample(cfbWithGroupsR.body.events || []) };
  } catch (e) {
    out.error = String(e).slice(0, 300);
  }
  console.log(JSON.stringify(out, null, 2));
  writeFileSync('outbox/probe-espn-football-fixtures-shape-result.json', JSON.stringify(out, null, 2));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
