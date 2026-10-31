'use strict';
// The generator's read of the MLB schedule from statsapi.mlb.com, alone in a module so build-field-data.js and its check share ONE
// definition. It returns the raw `games` array for one date; parseMLBFull in the generator still maps a game to the file's entry
// and assigns the broadcast, exactly as before.
//
// WHY. parseMLBFull used https.request with no status check: the response was parsed, `(sched.dates || [])[0]?.games || []` gave an
// empty list for any body without a `dates` key (an error body included), a parse failure, a request error and a 10 s timeout each
// resolved [], and a game with no team name was dropped without a trace. An unread MLB day was recorded as a day with no games,
// and the run stayed green (reproduced by an independent review on 2026-10-31).
//
// ABSENCE IS NOT ZERO. A schedule is a list only when the answer is clean. Anything else THROWS, with the reason, and the caller
// records the day as unread. The cases, with what was observed (a GitHub runner read statsapi on 2026-10-31 through the cors-probe
// workflow: outbox/fixture-mlb-schedule-20261031.json):
//   - HTTP not ok. An invalid date answers HTTP 400 with {messageNumber, message, timestamp, traceId} and no `dates` key.
//   - a body that is not JSON, or not an object.
//   - no `dates` array. A day with no games is HTTP 200 with `dates: []` and `totalGames: 0`, and returns [] without error.
//   - more than one entry in `dates`, or an entry for another date: a single-date request answers for that date only.
//   - an entry with no `games` array.
//   - a game with no team name, which the old code dropped silently.
//   - a request that fails, times out (15 s, also while the body is read), or loses its connection.
// NOT USED: `totalGames`. It equalled the list length on all 7 days of a regular-season week (94 games, no doubleheader among them),
// but a doubleheader day was not observed, and a check that could turn a normal day red on a guess is not added. The response also
// carries `cache-control: stale-if-error=86400`, so an outage may be answered from cache and look clean; that is not detectable here.

const { getJson } = require('./nba-board.cjs');

const STATSAPI_SCHEDULE = 'https://statsapi.mlb.com/api/v1/schedule';
const DEFAULT_TIMEOUT_MS = 15000;

async function readMlbSchedule(iso, fetchImpl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const body = await getJson(`${STATSAPI_SCHEDULE}?sportId=1&date=${iso}&gameType=R,F,D,L,W&hydrate=game,team,venue,broadcasts(all)&limit=30`, fetchImpl, timeoutMs);
  if (!Array.isArray(body.dates)) throw new Error('response has no dates array');
  if (body.dates.length > 1) throw new Error(`response has ${body.dates.length} dates for a single-date request`);
  if (body.dates.length === 0) return { games: [] };
  const day = body.dates[0];
  if (!day || day.date !== iso) throw new Error(`statsapi answered for ${day && day.date}`);
  if (!Array.isArray(day.games)) throw new Error('response has no games array');
  const unnamed = day.games.filter((g) => !(g && g.teams && g.teams.home && g.teams.home.team && g.teams.home.team.name
                                           && g.teams.away && g.teams.away.team && g.teams.away.team.name)).length;
  if (unnamed) throw new Error(`${unnamed} of ${day.games.length} games have no team name`);
  return { games: day.games };
}

module.exports = { readMlbSchedule, STATSAPI_SCHEDULE, DEFAULT_TIMEOUT_MS };
