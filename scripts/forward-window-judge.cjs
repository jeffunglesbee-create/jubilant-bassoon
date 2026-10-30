'use strict';
// The forward-window probe's verdict, alone in a module so the probe and its check share ONE definition
// (as scripts/slate-settle.cjs does for the settle criterion).
//
// WHY THE MLB CLAUSE ASKS SOMEONE ELSE. The probe used to fail whenever the window carried 0 MLB entries.
// That is the right answer when the generator dropped games and the wrong one in the off-season, and the
// manifest alone cannot tell them apart: from 2026-10-28 the window was empty because the postseason was
// over (ESPN's MLB scoreboard for 2026-10-31 lists 0 events), not because anything had regressed.
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

// One request per date, one attempt each. A failure is recorded against its date as null and never read as 0.
async function askEspnMlb(isoDays, fetchImpl, timeoutMs = 15000) {
  const out = { asked_at: new Date().toISOString(), counts: {}, errors: {} };
  for (const iso of isoDays) {
    try {
      const res = await fetchImpl(ESPN_MLB + iso.replace(/-/g, ''), { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!body || !Array.isArray(body.events)) throw new Error('response has no events array');
      out.counts[iso] = body.events.length;
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
  const mlb = { state: 'measured', window_total: m.windowMlbTotal, espn_counts: null, unasked: [] };

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
    const dates = days.map((d) => d.iso);
    mlb.espn_counts = Object.fromEntries(dates.map((iso) => [iso, isCount(counts[iso]) ? counts[iso] : null]));
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
        problems.push(`0 MLB entries in the window while ESPN lists ${listed.map((iso) => `${counts[iso]} on ${iso}`).join(', ')} — ` +
                      'the generator dropped them, or the window never carried them');
      } else {
        mlb.state = 'not-measured';
        notes.push(`MLB enrichment NOT MEASURED: the window carries 0 MLB entries and ESPN lists 0 MLB games on ${dates.join(', ')}, ` +
                   'so the name match across ESPN and statsapi was not exercised');
      }
    }
  }
  return { problems, notes, mlb };
}

module.exports = { judgeForwardWindow, askEspnMlb, espnNeeded, ESPN_MLB };
