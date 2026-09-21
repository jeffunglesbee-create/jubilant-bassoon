// How close is CC-CMD-2026-09-21-tennis-renders-zero-above-26 to done?
//
// Its done condition is TWO manifests with verdict PASS, relayLiveMatches >= 34
// and tennisCardCount == relayLiveMatches, from SCHEDULED runs. Two, not one,
// and 34, not any PASS, because both loopholes are real:
//
//   - a dispatched PASS samples one slate state, and two dispatches minutes
//     apart sample the same one
//   - a PASS at 19 proves nothing: that happened on 2026-09-17 with the bug in
//     place, because the slate was under the overflow threshold that day
//
// NOTHING WAS COUNTING THIS. The CC-CMD was closed on 2026-09-21 with the
// residual written as "the cron produces the second without a session", which
// is a carry-forward wearing a reassurance — the same shape
// check-sections-gap-streak.mjs was written to end when a CC-CMD assumed "the
// two scheduled runs accumulate the count without a session" and no code read
// the manifests.
//
// computeStreak is IMPORTED, not reimplemented. Its contract is runs of
// {sw, trigger, state}, which is generic; a second copy would be the
// check-that-re-derives-its-subject shape this repo keeps finding.
import { readdirSync, readFileSync } from 'node:fs';
import { computeStreak } from './check-sections-gap-streak.mjs';

const DIR = 'outbox';
// The fix landed in SW 2026-09-21c. Manifests before it measured the defect.
const FIX_SW = '2026-09-21c';
const REQUIRED = 2;
const MIN_MATCHES = 34;

/**
 * One manifest as computeStreak wants it.
 *
 * `state` is green ONLY when the done condition's three clauses all hold. A
 * PASS below MIN_MATCHES is reported as `small` rather than green — it is not a
 * failure of the page, and calling it red would make the log unreadable, but it
 * must not advance the count.
 */
export function runOf(m) {
  const pass = m.verdict === 'PASS';
  const big = (m.relayLiveMatches ?? 0) >= MIN_MATCHES;
  const complete = m.tennisCardCount === m.relayLiveMatches;
  return {
    ts: m.ts, sw: m.sw || null, trigger: m.triggered_by || '(unset)',
    matches: m.relayLiveMatches ?? null, cards: m.tennisCardCount ?? null,
    verdict: m.verdict,
    state: pass && big && complete ? 'green'
      : pass && !big ? 'small'
      : pass && !complete ? 'partial'
      : 'red',
  };
}

/**
 * MET or OPEN, from the scheduled-qualifying count.
 *
 * A FUNCTION so REQUIRED can be mutated and caught. Asserting `REQUIRED === 2`
 * would be the vacuous shape — a value checked against the definition that
 * produced it — so the test asks what the condition SAYS at 1 and at 2 instead.
 */
export function doneVerdict(schedStreak) {
  return schedStreak >= REQUIRED ? 'MET' : 'OPEN';
}

/**
 * The runs the streak is allowed to be computed over.
 *
 * Same reason: FIX_SW is only load-bearing through this filter, so the filter is
 * what the test exercises — a pre-fix green must not be admitted as evidence
 * for a fix that had not shipped when it was measured.
 */
export function qualifyingSince(runs) {
  return (runs ?? []).filter(r => r.sw && r.sw >= FIX_SW);
}

if (process.argv[1] && process.argv[1].endsWith('check-tennis-pass-streak.mjs')) {
  const files = readdirSync(DIR)
    .filter(f => /^tennis-live-probe-manifest-.*\.json$/.test(f))
    .sort();
  const runs = files.map(f => {
    try { return runOf(JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'))); }
    catch (_e) { return null; }
  }).filter(Boolean).sort((a, b) => String(a.ts).localeCompare(String(b.ts)));

  const { since, allStreak, schedStreak } = computeStreak(qualifyingSince(runs), FIX_SW);
  console.log(`manifests: ${runs.length} total, ${since.length} at or after the fix (SW >= ${FIX_SW})\n`);
  for (const r of since.slice(-12)) {
    const label = r.state === 'green' ? 'GREEN' : r.state.toUpperCase();
    console.log(`  ${label.padEnd(8)} ${String(r.ts).slice(0, 19)}  sw=${r.sw}  ${String(r.trigger).padEnd(18)} ${r.cards}/${r.matches}`);
  }
  console.log(`\ncurrent green streak: ${allStreak} run(s), of which ${schedStreak} scheduled`);
  console.log(`done condition: ${schedStreak}/${REQUIRED} consecutive SCHEDULED qualifying PASSes — ${doneVerdict(schedStreak)}`);
  if (schedStreak < REQUIRED) console.log(`still needed: ${REQUIRED - schedStreak} more scheduled qualifying run(s).`);
  // Rule 91: say what a green here does and does not mean, where it is read.
  console.log(`\nqualifying = verdict PASS AND relayLiveMatches >= ${MIN_MATCHES} AND cards == matches.`);
  console.log('A PASS on a small slate is printed SMALL and does not count: 2026-09-17');
  console.log('passed at 19 with the bug in place. A dispatched PASS does not count either.');
  console.log('COVERAGE: committed manifests only. It does NOT run the probe or read the page.');
}
