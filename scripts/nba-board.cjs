'use strict';
// The generator's read of the relay's basketball boards (NBA and WNBA), alone in a module so build-field-data.js and its check
// share ONE definition. The file is still called nba-board.cjs because the NBA read came first; the WNBA read was added to it
// 2026-10-31 because it is the same route and the same ESPN basketball adapter, and a second reader would have been a second
// definition of "a clean answer".
//
// WHY IT EXISTS. build-field-data.js used to read the NBA board from /tmp/nba.json, which field-data.yml filled from the
// relay's /nba/liveData/scoreboard/todaysScoreboard_00.json passthrough with `curl -sf ... || echo '{}'`. That passthrough
// answers 403 (the CDN refuses the Worker; field-relay-nba docs/CC-CMD-2026-10-22-nba-cdn-403-in-season.md), `-f` turned
// the 403 into a failed command, the fallback wrote `{}`, and parseNBA returned an empty list. On 2026-10-30 the file said
// nba 0 on a night the relay listed 10 games (that CC-CMD's "Data point 2026-10-30"). A refused read was recorded as
// "no games".
//
// WHAT IT READS NOW. The relay's own ESPN-sourced board, /v2/games?sport=nba&date= (the one the client's NBA cards come from)
// and /v2/games?sport=wnba&date= (which parseWNBA used to read with no status check, so a 502 body parsed as an empty slate).
// The relay owns that contract (STANDARDS Rule 60); this module adapts nothing beyond naming the fields the file carries.
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
// A genuinely empty day is `games: []`, count 0, source espn-wc, and returns [] without error. That is also what the relay
// answers for an off-season day (probed 2026-10-31: WNBA 2026-11-01 and 2027-01-15, both 200, source espn-wc), so an off-season
// window reads clean and does not turn the daily run red.
//
// THE WNBA FAILOVER IS AN ANSWER, NOT AN ERROR. When ESPN fails the relay serves WNBA from a KV secondary and says so:
// source "wnba-kv", plus fetchedAt and staleSeconds (field-relay-nba handleV2Games, _trySecondary; read from source 2026-10-31,
// not observed). null from the secondary means both failed and the relay answers 502, which is an error here; [] from it is the
// relay's own "real off-day". The reader returns the source so the caller can log it; it does not judge staleness, which is the
// relay's contract to define (Rule 60).
//
// WHAT IT DOES NOT CARRY. The ESPN board has no series text, no playoff flag and no game label (`round` is the ESPN week
// number, null for the NBA). The CDN board had `seriesText`, `gameLabel` and `seasonType`. Those fields are ABSENT from
// the entries returned here, not false and not null, so a reader cannot take "not a playoff game" from them. Until the
// relay serves series context, the generator writes no NBA matchupNote (its note targets are playoff and series games).

const RELAY_V2_GAMES = 'https://field-relay-nba.jeffunglesbee.workers.dev/v2/games';
const DEFAULT_TIMEOUT_MS = 15000;
const BOARD_SPORTS = { nba: 'NBA', wnba: 'WNBA' };

// The message of a failed request, with the cause when there is one: undici reports every connection failure as "fetch failed"
// and puts the real reason (ECONNREFUSED, a reset, a DNS failure) in e.cause.
const why = (e) => {
  const msg = String((e && e.message) || e);
  const cause = e && e.cause && (e.cause.code || e.cause.message);
  return (cause ? `${msg} (${cause})` : msg).slice(0, 160);
};

async function readV2Board(sport, iso, fetchImpl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const label = BOARD_SPORTS[sport];
  if (!label) throw new Error(`no board reader for sport ${sport}`);
  let res;
  try {
    res = await fetchImpl(`${RELAY_V2_GAMES}?sport=${sport}&date=${iso}`, {
      headers: { 'User-Agent': 'FIELD-DataBot/1.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new Error(`request failed: ${why(e)}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let body;
  try { body = await res.json(); } catch (e) {
    // The timeout covers the body read too: headers can arrive and the body stall. That is a request that failed, not a body
    // that was not JSON, and a red run has to say which.
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw new Error(`request failed: ${why(e)}`);
    throw new Error('response is not JSON');
  }
  if (!body || typeof body !== 'object') throw new Error('response is not an object');
  if (body.error) throw new Error(`relay error: ${String(body.error).slice(0, 120)}`);
  if (/error/i.test(String(body.source || ''))) throw new Error(`relay source ${body.source}`);
  if (!Array.isArray(body.games)) throw new Error('response has no games array');
  if (body.sport !== sport || body.date !== iso) throw new Error(`relay answered for ${body.sport} ${body.date}`);
  const unnamed = body.games.filter((g) => !(g && g.home && g.home.name && g.away && g.away.name)).length;
  if (unnamed) throw new Error(`${unnamed} of ${body.games.length} games have no team name`);
  return {
    source: body.source === undefined ? null : body.source,
    games: body.games.map((g) => ({
      sport: label, league: label,
      home: g.home.name, away: g.away.name,
      start_time: g.start || null,
      venue: g.venue || null,
    })),
  };
}

const readNbaBoard = (iso, fetchImpl, opts) => readV2Board('nba', iso, fetchImpl, opts);
const readWnbaBoard = (iso, fetchImpl, opts) => readV2Board('wnba', iso, fetchImpl, opts);

module.exports = { readV2Board, readNbaBoard, readWnbaBoard, RELAY_V2_GAMES, DEFAULT_TIMEOUT_MS, BOARD_SPORTS };
