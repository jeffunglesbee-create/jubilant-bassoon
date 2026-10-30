'use strict';
// The forward-window probe's verdict, alone in a module so the probe and its check share ONE definition
// (as scripts/slate-settle.cjs does for the settle criterion).
//
// WHY THE MLB CLAUSE ASKS SOMEONE ELSE. The probe used to fail whenever the window carried 0 MLB entries.
// That is the right answer when the generator dropped games and the wrong one in the off-season, and the
// manifest alone cannot tell them apart. The last MLB game of the 2026 postseason was 2026-10-28 (MLB's schedule,
// gameType R,F,D,L,W, lists none after it; ESPN's scoreboard lists none for 2026-10-29 or 2026-10-31 either), so from
// the 2026-10-29 run the window was empty because the season was over, not because anything had regressed, and the
// probe was red on this clause alone. (The 2026-10-28 run was red for a different reason: see scripts/probe-meta-read.cjs.)
// A probe that cannot say which it is has two options, both bad: stay red all winter, or stop caring.
//
// So when the window carries 0 MLB entries the probe asks ESPN's own MLB scoreboard about the same dates,
// from Node (a runner's browser is CORS-blocked from site.api.espn.com). Three outcomes:
//   - ESPN lists games the window does not carry   -> problem: the generator dropped them
//   - ESPN lists none, for every date, all fetched -> note:    enrichment NOT MEASURED, not failed
//   - ESPN could not be asked about some date       -> problem: an empty off-season cannot be told from a drop
// Nothing falls back to a pass. The last outcome is the one Rule 99 exists for: a date ESPN was not asked
// about is not a date ESPN lists no games on.
//
// SCOPE. ESPN is asked only when the WHOLE window is empty. A window with some MLB entries and one silently empty day is
// not examined (the old probe did not examine it either; the check asserts this on purpose). And ESPN's empty list is
// the oracle: src/legacy/field.js:16192 records ESPN answering 200 with `events: []` for a past date that had 15 games.
// On 2026-10-30 ESPN and MLB's own schedule agreed for the dates in question (outbox/fixture-espn-mlb-event-kinds-20261030.json),
// so a NOT MEASURED pass states what ESPN listed, not that no game exists.
//
// The probe's own clauses (cache accepted, schema 2.1, window_dates, each forward day reaching the client) are
// unchanged. Two guards are new: no forward day read at all, and a windowMlbTotal that is not a number. An empty loop
// and a missing count must not read as a pass.
//
// "NOT MEASURED" is what the pass says about the name match across ESPN and statsapi: with no MLB entries in
// the window that match is not exercised, so a green run proves the window reached the client and nothing
// about the join.

const ESPN_MLB = 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=';

const isCount = (n) => Number.isInteger(n) && n >= 0;

// A forward day that did not reach the client is UNREAD, not empty: its MLB count is 0 only because there was nothing to
// count. An empty-window verdict is only meaningful over days that were read.
const daysRead = (days) => Array.isArray(days) && days.length > 0 && days.every((d) => d.windowHasDay);

// Whether the empty-window question can be asked at all. The probe asks ESPN only when this is true, and the judge
// compares against ESPN only when this is true, from this one definition.
function espnNeeded(days, windowMlbTotal) {
  return windowMlbTotal === 0 && daysRead(days);
}

// WHICH ESPN EVENTS COUNT. The generator asks MLB's schedule for gameType R,F,D,L,W (regular season, wild card, division,
// league championship, World Series; scripts/build-field-data.js), so it never carries spring training, exhibitions or the
// All-Star Game, and ESPN's scoreboard lists all three. Counting every ESPN event would make a healthy empty window fail as
// "the generator dropped them" for the ~30 days before every Opening Day. An event is set aside only when it is POSITIVELY
// one of the kinds seen in ESPN's responses on 2026-10-30 (outbox/fixture-espn-mlb-event-kinds-20261030.json):
//   preseason   event.season.type 1                        "Toronto Blue Jays at Atlanta Braves", competition type EXH
//   exhibition  competitions[0].type.abbreviation EXH
//   all-star    competitions[0].type.abbreviation ALLSTAR  "American All-Stars at National All-Stars", event.season.type 2
// Everything else is counted, shapes nobody has seen included: a kind this file does not recognise has to make the probe
// louder, not quieter. Regular season is STD with season.type 2; the World Series is FINAL with season.type 3.
function notCarried(ev) {
  const seasonType = ev && ev.season && ev.season.type;
  const comp = ev && Array.isArray(ev.competitions) ? ev.competitions[0] : null;
  const kind = comp && comp.type && comp.type.abbreviation;
  if (seasonType === 1) return 'preseason';
  if (kind === 'EXH') return 'exhibition';
  if (kind === 'ALLSTAR') return 'all-star';
  return null;
}

// One request per date, one attempt each. A failure is recorded against its date as null and never read as 0.
// counts[iso] is the number of events the generator would carry; listed[iso] is everything ESPN listed; setAside[iso] names
// what was left out and why, so the denominator is in the manifest and not in the reader's head.
async function askEspnMlb(isoDays, fetchImpl, timeoutMs = 15000) {
  const out = { asked_at: new Date().toISOString(), counts: {}, listed: {}, setAside: {}, errors: {} };
  for (const iso of isoDays) {
    try {
      const res = await fetchImpl(ESPN_MLB + iso.replace(/-/g, ''), { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!body || !Array.isArray(body.events)) throw new Error('response has no events array');
      const aside = [];
      let carried = 0;
      for (const ev of body.events) {
        const why = notCarried(ev);
        if (why) aside.push({ name: String((ev && ev.name) || ''), why });
        else carried++;
      }
      out.counts[iso] = carried;
      out.listed[iso] = body.events.length;
      if (aside.length) out.setAside[iso] = aside;
    } catch (e) {
      out.counts[iso] = null;
      out.errors[iso] = String((e && e.message) || e).slice(0, 200);
    }
  }
  return out;
}

// m is the manifest as the probe built it (before the verdict is attached); espn is askEspnMlb's result, or
// null when it was not asked (the window carried MLB entries).
function judgeForwardWindow(m, espn) {
  const problems = [];
  const notes = [];
  const days = Array.isArray(m.days) ? m.days : [];
  const mlb = { state: 'measured', window_total: m.windowMlbTotal, espn_counts: null, espn_set_aside: null, unasked: [] };

  if (!m.cacheAccepted)
    problems.push('field-data was never accepted into the cache — the accept gate rejected it, or ?pl-verify is not honoured by this build');
  if (m.schema !== '2.1')
    problems.push(`schema is ${m.schema}, expected 2.1 — the generator has not run since the change`);
  if (!Array.isArray(m.window_dates) || m.window_dates.length < 2)
    problems.push('window_dates missing or shorter than 2 — there is no forward window to prove');
  if (days.length === 0)
    problems.push('no forward day was read — there is nothing to prove');
  for (const d of days) {
    if (!d.windowHasDay)
      problems.push(`${d.iso}: scheduleForDate returned nothing — the window did not reach the client for this date`);
  }

  const total = m.windowMlbTotal;
  if (typeof total !== 'number' || !Number.isFinite(total)) {
    mlb.state = 'unread';
    problems.push('windowMlbTotal is not a number — the MLB entry count was never read');
  } else if (total === 0 && !daysRead(days)) {
    // Nothing to compare ESPN with: the clauses above already name each day that did not reach the client.
    mlb.state = 'unread';
  } else if (total === 0) {
    const counts = (espn && espn.counts) || {};
    const errors = (espn && espn.errors) || {};
    const aside = (espn && espn.setAside) || {};
    const dates = days.map((d) => d.iso);
    mlb.espn_counts = Object.fromEntries(dates.map((iso) => [iso, isCount(counts[iso]) ? counts[iso] : null]));
    mlb.espn_set_aside = Object.fromEntries(dates.filter((iso) => Array.isArray(aside[iso])).map((iso) => [iso, aside[iso]]));
    mlb.unasked = dates.filter((iso) => !isCount(counts[iso]));
    if (mlb.unasked.length) {
      mlb.state = 'unverifiable';
      const why = mlb.unasked.map((iso) => `${iso} (${errors[iso] || 'not asked'})`).join(', ');
      problems.push(`0 MLB entries in the window and ESPN could not be asked about ${why}, ` +
                    'so an empty off-season cannot be told from a window that dropped games');
    } else {
      const listed = dates.filter((iso) => counts[iso] > 0);
      if (listed.length) {
        mlb.state = 'dropped';
        problems.push(`0 MLB entries in the window while ESPN lists games the generator carries (${listed.map((iso) => `${counts[iso]} on ${iso}`).join(', ')}) — ` +
                      'the generator dropped them, or the window never carried them');
      } else {
        mlb.state = 'not-measured';
        const setAside = Object.entries(mlb.espn_set_aside).map(([iso, evs]) => `${iso}: ${evs.map((e) => e.why).join(', ')}`).join('; ');
        notes.push(`MLB enrichment NOT MEASURED: the window carries 0 MLB entries and ESPN lists 0 MLB games the generator carries on ${dates.join(', ')}` +
                   (setAside ? ` (set aside, not carried by the generator: ${setAside})` : '') +
                   ', so the name match across ESPN and statsapi was not exercised');
      }
    }
  }
  return { problems, notes, mlb };
}

module.exports = { judgeForwardWindow, askEspnMlb, espnNeeded, ESPN_MLB };
