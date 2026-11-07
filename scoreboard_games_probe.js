// scoreboard_games_probe.js — ESPN's REAL scoreboards, as a list of games per league, for the fuzzy-team-match measurement (Task 7 of
// field-relay-nba docs/CC-CMD-2026-08-08-fa-cup-coverage.md). Runs on a GitHub runner (Node's fetch gets the data; ESPN answers a headless browser and
// this sandbox empty or "Access Denied"). No browser, no secret, no credit: ESPN's public scoreboard only.
//
// One entry per URL the page itself asks for, so a collision measured here is a collision the page can have:
//   cfb-poller   football/college-football?limit=50           the live poller (ESPN_SPORTS), the writer of the 'espn' slot: key `${displayName}|${displayName}`
//   cfb-sweep    football/college-football?limit=50&groups=80 the date sweep (FETCH_LEAGUES), which builds cards
//   ncaab-poller basketball/mens-college-basketball?limit=50  the live poller
//   nfl, nba, nhl                                              the sweep's other football/basketball/hockey leagues
// Output: outbox/espn-scoreboard-games-<ts>.json, { at, etDay, leagues: { <key>: { url, status, events, games: [{id, home, away, homeScore, awayScore, state}] } } },
// the shape outbox/fa-cup-findscore-collision-2026-11-07.cjs reads (as espnSameRun.games).
const fs = require('fs');

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const etDay = process.env.ET_DAY || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const d = etDay.replace(/-/g, '');
const LEAGUES = {
  'cfb-poller':   `${BASE}/football/college-football/scoreboard?dates=${d}&limit=50`,
  'cfb-sweep':    `${BASE}/football/college-football/scoreboard?dates=${d}&limit=50&groups=80`,
  'ncaab-poller': `${BASE}/basketball/mens-college-basketball/scoreboard?dates=${d}&limit=50`,
  'nfl':          `${BASE}/football/nfl/scoreboard?dates=${d}&limit=50`,
  'nba':          `${BASE}/basketball/nba/scoreboard?dates=${d}&limit=50`,
  'nhl':          `${BASE}/hockey/nhl/scoreboard?dates=${d}&limit=50`,
};

async function read(url) {
  const rec = { url, status: null, events: null, games: [] };
  try {
    const r = await fetch(url);
    rec.status = r.status;
    if (!r.ok) return rec;
    const j = await r.json();
    const events = Array.isArray(j.events) ? j.events : [];
    rec.events = events.length;
    for (const ev of events) {
      const comp = ev.competitions && ev.competitions[0] ? ev.competitions[0] : null;
      const cs = comp && Array.isArray(comp.competitors) ? comp.competitors : [];
      const h = cs.find(x => x.homeAway === 'home'), a = cs.find(x => x.homeAway === 'away');
      if (!h || !a || !h.team || !a.team) continue;
      rec.games.push({
        id: ev.id, home: h.team.displayName, away: a.team.displayName,
        homeScore: parseInt(h.score, 10), awayScore: parseInt(a.score, 10),
        state: ev.status && ev.status.type ? ev.status.type.state : null,
      });
    }
  } catch (e) { rec.error = String(e.message).slice(0, 120); }
  return rec;
}

(async () => {
  const leagues = {};
  for (const [k, url] of Object.entries(LEAGUES)) leagues[k] = await read(url);
  const at = new Date().toISOString();
  fs.writeFileSync(`outbox/espn-scoreboard-games-${at.replace(/[:.]/g, '-').slice(0, 19)}.json`, JSON.stringify({ at, etDay, leagues }, null, 2));
  for (const [k, v] of Object.entries(leagues)) console.log(`${k}: status ${v.status}, events ${v.events}, games read ${v.games.length}${v.error === undefined ? '' : ', error ' + v.error}`);
})();
