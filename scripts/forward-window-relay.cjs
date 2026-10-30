'use strict';
// The forward-window probe's capture of what the RELAY lists, per sport, for the forward days. REPORTED, NEVER ASSERTED.
//
// WHY. The probe's one assertion about content is the MLB count, and the window file it checks carries only MLB, MLS and
// WNBA on forward days (scripts/build-field-data.js: WINDOWED_SPORTS). NHL and NBA are day 0 only by design and NFL and
// college football have no key at all. So a green probe said nothing about this weekend's other sports: on 2026-10-30 the
// relay listed 12 NFL games for Sunday 11-01, 10 NHL games for Saturday 10-31 and 10 NBA games for Friday 10-30, while the
// window file carried 0 for every one of them and the probe passed. This module puts both counts side by side in the
// manifest, so a run says which sports it looked at and what the relay had.
//
// It is a capture (raw counts the laboratory can read), not a metric and not a verdict: nothing here adds a problem to the
// judge. What counts as a failure for these sports is the owner's decision.
//
// ABSENCE IS NOT ZERO. A relay answer is a count only when it is a clean answer. The relay returns HTTP 200 with
// `games: [], count: 0, source: "nhle-error"` when NHL's own API fails (field-relay-nba src/index.js:4845), which reads as
// "no games" unless `source` is checked. ESPN-side failures are 502/500 with an `error` key. Every one of those is recorded
// against its cell as null with the reason, never as 0. A response that echoes another sport or date (the route defaults a
// missing date to today) is not an answer for the cell either.
//
// COST. 4 sports x 3 forward days = 12 requests per run, one attempt each, in parallel, 15 s timeout. The route reads ESPN
// (nfl, cfb, nba) and NHL's API (nhl) through the relay's own cache; no Odds API and no api-sports key is involved. Forward
// days have no finished game, and the finished-game brief pipeline the route can start for a viewer's request does not apply.

const RELAY_V2_GAMES = 'https://field-relay-nba.jeffunglesbee.workers.dev/v2/games';
const SPORTS = ['nfl', 'cfb', 'nba', 'nhl'];

const isCount = (n) => Number.isInteger(n) && n >= 0;

async function askRelaySports(isoDays, fetchImpl, { sports = SPORTS, timeoutMs = 15000 } = {}) {
  const out = { asked_at: new Date().toISOString(), url: RELAY_V2_GAMES, counts: {}, sources: {}, errors: {} };
  for (const sport of sports) { out.counts[sport] = {}; out.sources[sport] = {}; out.errors[sport] = {}; }
  await Promise.all(sports.flatMap((sport) => isoDays.map(async (iso) => {
    try {
      const res = await fetchImpl(`${RELAY_V2_GAMES}?sport=${sport}&date=${iso}`, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!body || typeof body !== 'object') throw new Error('response is not an object');
      if (body.error) throw new Error(`relay error: ${String(body.error).slice(0, 120)}`);
      if (/error/i.test(String(body.source || ''))) throw new Error(`relay source ${body.source}`);
      if (!Array.isArray(body.games)) throw new Error('response has no games array');
      if (body.sport !== sport || body.date !== iso) throw new Error(`relay answered for ${body.sport} ${body.date}`);
      out.counts[sport][iso] = body.games.length;
      out.sources[sport][iso] = body.source === undefined ? null : body.source;
    } catch (e) {
      out.counts[sport][iso] = null;
      out.errors[sport][iso] = String((e && e.message) || e).slice(0, 200);
    }
  })));
  return out;
}

// Pure. days: the probe's days[] (iso, windowBySport: the window file's per-sport counts for that day, null when the day
// was not read). Returns one row per day: what the file carried and what the relay listed, null where a side is unknown.
function coverageRows(days, relay) {
  const counts = (relay && relay.counts) || {};
  const sports = Object.keys(counts);
  return (Array.isArray(days) ? days : []).map((d) => ({
    iso: d.iso,
    window: d.windowBySport && typeof d.windowBySport === 'object' ? d.windowBySport : null,
    relay: Object.fromEntries(sports.map((s) => [s, isCount((counts[s] || {})[d.iso]) ? counts[s][d.iso] : null])),
  }));
}

// One line per sport, for the run log. "file -" means the window file has no key for that sport at all.
function coverageLines(rows) {
  const sports = rows.length ? Object.keys(rows[0].relay) : [];
  return sports.map((s) => `${s}: ` + rows.map((r) => {
    const rel = r.relay[s] === null ? 'unasked' : r.relay[s];
    const file = r.window === null ? 'unread' : (s in r.window ? r.window[s] : '-');
    return `${r.iso} relay ${rel}, file ${file}`;
  }).join(' | '));
}

module.exports = { askRelaySports, coverageRows, coverageLines, RELAY_V2_GAMES, SPORTS };
