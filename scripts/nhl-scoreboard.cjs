'use strict';
// The generator's read of the NHL scoreboard, alone in a module so build-field-data.js and its check share ONE definition. It returns
// the raw game objects for one date; parseNHL in the generator still maps a game to the file's entry, exactly as before.
//
// WHY. field-data.yml filled /tmp/nhl.json with `curl -sf ... || echo '{}'`. A failed request wrote `{}`, parseNHL read the file and
// `raw.games || (raw.gamesByDate || []).filter(...)` gave an empty list, and a JSON parse failure returned [] too: an unread NHL
// day was recorded as a day with no games, and the run stayed green. The same step did it for the NBA until 2026-10-30, when the
// NBA passthrough's 403 turned that into a ten-game night recorded as zero. The read now happens in the generator, through the
// same getJson as the other readers.
//
// WHAT IT READS. The relay's passthrough of NHL's own scoreboard, /nhl/v1/scoreboard/now (field-relay-nba src/index.js, `/nhl/*`
// -> api-web.nhle.com). Its shape, read by a runner on 2026-10-31: { focusedDate, focusedDateCount, gamesByDate: [{ date, games }] }
// over the last 3 days and the next 7 (78 games, every one with a team abbreviation: outbox/fixture-nhl-scoreboard-20261031.json).
// The relay's own failure answers (src/cache-helpers.js relayFetch, read from source, not observed): an upstream non-OK is the
// same status with the text body `nhl returned <status>`; a network error is a 502 with `nhl network error: ...`. Both are HTTP
// errors here.
//
// ABSENCE IS NOT ZERO. A scoreboard is a list of games only when the answer is clean. Anything else THROWS, with the reason, and the
// caller records the day as unread:
//   - a request that fails or times out (also while the body is read), HTTP not ok, a body that is not JSON or not an object.
//   - a body with neither a `gamesByDate` array nor a `games` array. `{}` is exactly what the old fallback wrote, and it is an error.
//   - a `gamesByDate` entry that is not keyed by a YYYY-MM-DD `date` string (null, `{}`, a renamed key, a timestamp, YYYYMMDD). Without
//     this a populated scoreboard whose date key drifted would match no date and read as the off-season's empty day (an independent
//     review reproduced it on 2026-10-31: 10 real games recorded as 0 with nothing in source_errors).
//   - an entry for the date that has no `games` array.
//   - a game with no team abbreviation, which the old code dropped silently.
// A date with NO entry is NOT an error: it is an empty day. In the off-season the scoreboard returns the last ~9 days
// (field-relay-nba docs/CC-CMD-2026-06-26-nhl-nhle.md), so today is not among them, and that must stay green all summer. That shape
// was not observed here (it is October), only read from that document.
// `games`, an alternate shape parseNHL has always accepted, is kept.

const { getJson } = require('./nba-board.cjs');

const NHL_SCOREBOARD = 'https://field-relay-nba.jeffunglesbee.workers.dev/nhl/v1/scoreboard/now';
const DEFAULT_TIMEOUT_MS = 15000;

async function readNhlScoreboard(iso, fetchImpl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const body = await getJson(NHL_SCOREBOARD, fetchImpl, timeoutMs, { 'Cache-Control': 'no-cache' });
  let games;
  if (Array.isArray(body.games)) games = body.games;
  else if (Array.isArray(body.gamesByDate)) {
    const undated = body.gamesByDate.filter((d) => !(d && typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date))).length;
    if (undated) throw new Error(`${undated} of ${body.gamesByDate.length} gamesByDate entries have no YYYY-MM-DD date`);
    const entries = body.gamesByDate.filter((d) => d.date === iso);
    if (entries.some((e) => !Array.isArray(e.games))) throw new Error(`the entry for ${iso} has no games array`);
    games = entries.flatMap((e) => e.games);
  } else throw new Error('response has neither a gamesByDate array nor a games array');
  const unnamed = games.filter((g) => !(g && g.homeTeam && g.homeTeam.abbrev && g.awayTeam && g.awayTeam.abbrev)).length;
  if (unnamed) throw new Error(`${unnamed} of ${games.length} games have no team abbreviation`);
  return { games };
}

module.exports = { readNhlScoreboard, NHL_SCOREBOARD, DEFAULT_TIMEOUT_MS };
