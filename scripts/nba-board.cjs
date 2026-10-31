'use strict';
// The generator's read of the NBA board, alone in a module so build-field-data.js and its check share ONE definition.
//
// WHY IT EXISTS. build-field-data.js used to read the NBA board from /tmp/nba.json, which field-data.yml filled from the
// relay's /nba/liveData/scoreboard/todaysScoreboard_00.json passthrough with `curl -sf ... || echo '{}'`. That passthrough
// answers 403 (the CDN refuses the Worker; field-relay-nba docs/CC-CMD-2026-10-22-nba-cdn-403-in-season.md), `-f` turned
// the 403 into a failed command, the fallback wrote `{}`, and parseNBA returned an empty list. On 2026-10-30 the file said
// nba 0 on a night the relay listed 10 games (that CC-CMD's "Data point 2026-10-30"). A refused read was recorded as
// "no games".
//
// WHAT IT READS NOW. The relay's own ESPN-sourced board, /v2/games?sport=nba&date=, the route parseWNBA already reads for
// WNBA and the one the client's NBA cards come from. The relay owns that contract (STANDARDS Rule 60); this module adapts
// nothing beyond naming the fields the file carries.
//
// ABSENCE IS NOT ZERO. A board is a list only when the answer is clean. Anything else THROWS, with the reason, and the
// caller records the day as unread. The cases, each measured or read from the relay source (2026-10-30):
//   - HTTP not ok. ESPN upstream failure is 502 {error}; the catch-all is 500 {error}.
//   - an `error` key in a 200 body.
//   - a `source` naming an error. The NHL branch answers HTTP 200 with games [] and source "nhle-error" when NHL's API
//     fails; the NBA branch has no such source today, and a future one would read as an empty slate without this check.
//   - no games array.
//   - a body that echoes another sport or date (the route defaults a missing date to today).
//   - a game with no team name. The ESPN adapter writes '' for a team ESPN did not give. parseWNBA drops such a game
//     silently, which lowers the count with nothing recording why; here it fails the read.
// A genuinely empty day is `games: []`, count 0, source espn-wc, and returns [] without error.
//
// WHAT IT DOES NOT CARRY. The ESPN board has no series text, no playoff flag and no game label (`round` is the ESPN week
// number, null for the NBA). The CDN board had `seriesText`, `gameLabel` and `seasonType`. Those fields are ABSENT from
// the entries returned here, not false and not null, so a reader cannot take "not a playoff game" from them. Until the
// relay serves series context, the generator writes no NBA matchupNote (its note targets are playoff and series games).

const RELAY_V2_GAMES = 'https://field-relay-nba.jeffunglesbee.workers.dev/v2/games';
const DEFAULT_TIMEOUT_MS = 15000;

async function readNbaBoard(iso, fetchImpl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let res;
  try {
    res = await fetchImpl(`${RELAY_V2_GAMES}?sport=nba&date=${iso}`, {
      headers: { 'User-Agent': 'FIELD-DataBot/1.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new Error(`request failed: ${String((e && e.message) || e).slice(0, 120)}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let body;
  try { body = await res.json(); } catch (e) { throw new Error('response is not JSON'); }
  if (!body || typeof body !== 'object') throw new Error('response is not an object');
  if (body.error) throw new Error(`relay error: ${String(body.error).slice(0, 120)}`);
  if (/error/i.test(String(body.source || ''))) throw new Error(`relay source ${body.source}`);
  if (!Array.isArray(body.games)) throw new Error('response has no games array');
  if (body.sport !== 'nba' || body.date !== iso) throw new Error(`relay answered for ${body.sport} ${body.date}`);
  const unnamed = body.games.filter((g) => !(g && g.home && g.home.name && g.away && g.away.name)).length;
  if (unnamed) throw new Error(`${unnamed} of ${body.games.length} games have no team name`);
  return {
    source: body.source === undefined ? null : body.source,
    games: body.games.map((g) => ({
      sport: 'NBA', league: 'NBA',
      home: g.home.name, away: g.away.name,
      start_time: g.start || null,
      venue: g.venue || null,
    })),
  };
}

module.exports = { readNbaBoard, RELAY_V2_GAMES, DEFAULT_TIMEOUT_MS };
