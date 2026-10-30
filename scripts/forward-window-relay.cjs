'use strict';
// The forward-window probe's capture of what the RELAY lists, per sport, for the forward days. REPORTED, NEVER ASSERTED.
//
// WHY. The probe's one assertion about content is the MLB count, and the window file it checks carries only MLB, MLS and
// WNBA on forward days (scripts/build-field-data.js: WINDOWED_SPORTS). NHL and NBA are day 0 only because their feeds serve
// only today (build-field-data.js says "not by choice"), and NFL and college football have no key at all. So a green probe
// said nothing about this weekend's other sports: on 2026-10-30 the relay listed 12 NFL games for Sunday 11-01 and 10 NHL
// games for Saturday 10-31, while the window file carried 0 for both and the probe passed. This module puts both counts side
// by side in the manifest, so a run says which sports it looked at and what the relay had.
//
// NOT COVERED: day 0. The capture asks only the forward days, so it cannot see a day-0 miss. On 2026-10-30 the file's NBA was
// 0 on a night the relay listed 10 games (the generator's NBA read hits a 403'ing passthrough; see field-relay-nba
// docs/CC-CMD-2026-10-22-nba-cdn-403-in-season.md, "Data point 2026-10-30"). That is invisible here.
//
// It is a capture (raw counts the laboratory can read), not a metric and not a verdict: nothing here adds a problem to the
// judge, and the probe attaches the result to the manifest AFTER the judge has run, so the judge never sees it. What counts as
// a failure for these sports is the owner's decision.
//
// ABSENCE IS NOT ZERO. A relay answer is a count only when it is a clean answer. The relay returns HTTP 200 with
// `games: [], count: 0, source: "nhle-error"` when NHL's own API fails (field-relay-nba src/index.js, the nhleSource branch),
// which reads as "no games" unless `source` is checked. ESPN-side failures are 502/500 with an `error` key. Every one of
// those is recorded against its cell as null with the reason, never as 0. A response that echoes another sport or date (the
// route defaults a missing date to today) is not an answer for the cell either.
//
// TWO CLEAN-LOOKING ZEROS THE COLLECTOR REFUSES TO ASK FOR. (1) The NHL branch reads only NHL's /v1/scoreboard/now and finds
// the date in its gamesByDate; a date outside that window comes back 200, games [], count 0, source "nhle", with no error,
// byte-identical to a real empty day. Probed 2026-10-30: 2026-11-06 listed 3 games, 2026-11-07 and 11-08 came back empty;
// the June NHLE migration doc records the window as roughly the last nine days. So NHL cells more than NHL_DAYS_AHEAD days
// past the runner's UTC date are not asked. (2) Past days are not asked at all: see COST.
//
// COST. 4 sports x 3 forward days = 12 requests per run, one attempt each, in parallel, 15 s timeout. Per request, read from
// the relay source and reproduced by an independent review (2026-10-30: a skeptic ran the relay's worker against a recording
// fetch): nfl, cfb and nba make ONE ESPN scoreboard call
// (cacheTtl 15 s) and, when the relay has BSD_API_TOKEN bound, ONE uncached call to BSD's live feed
// (https://sports.bzzoiro.com/api/v2/events/live/, 3 s timeout; no BSD rate limit is documented in the relay), so up to 9
// uncached BSD calls per probe run; nhl makes ONE call to NHL's API (cacheTtl 30 s). No Odds API and no api-sports key is
// involved: per that review the odds lambda and the WC D1 writer are gated off for football and basketball.
// The finished-game brief pipeline the route can start for a viewer's request is the other thing a request could trigger, which
// is why a day before the runner's UTC date is never asked: the probe's days come from the window file's for_date, and a
// stale file would otherwise put finished days into the request.

const RELAY_V2_GAMES = 'https://field-relay-nba.jeffunglesbee.workers.dev/v2/games';
const SPORTS = ['nfl', 'cfb', 'nba', 'nhl'];
const DEFAULT_TIMEOUT_MS = 15000;
const NHL_DAYS_AHEAD = 6;

const isCount = (n) => Number.isInteger(n) && n >= 0;
const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function askRelaySports(isoDays, fetchImpl, { sports = SPORTS, timeoutMs = DEFAULT_TIMEOUT_MS, today = new Date().toISOString().slice(0, 10) } = {}) {
  const out = { asked_at: new Date().toISOString(), url: RELAY_V2_GAMES, counts: {}, sources: {}, errors: {} };
  for (const sport of sports) { out.counts[sport] = {}; out.sources[sport] = {}; out.errors[sport] = {}; }
  await Promise.all(sports.flatMap((sport) => isoDays.map(async (iso) => {
    try {
      if (iso < today) throw new Error(`not asked: ${iso} is before ${today}, and a finished day can start the relay's brief pipeline`);
      if (sport === 'nhl' && iso > addDays(today, NHL_DAYS_AHEAD)) throw new Error(`not asked: ${iso} is past the NHL scoreboard window (${NHL_DAYS_AHEAD} days ahead of ${today})`);
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

// What the probe calls: the reading and the table, in one step the check can execute end to end. Never rejects.
async function captureOtherSports(days, isoDays, fetchImpl, opts) {
  const relay = await askRelaySports(isoDays, fetchImpl, opts);
  return { relay, coverage: coverageRows(days, relay) };
}

module.exports = { askRelaySports, coverageRows, coverageLines, captureOtherSports, RELAY_V2_GAMES, SPORTS, DEFAULT_TIMEOUT_MS, NHL_DAYS_AHEAD };
