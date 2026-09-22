// How close is CC-CMD-2026-09-12-v2-sections-in-model-not-in-dom to done?
//
// Its done condition is `sections_model_not_in_dom == []` on FIVE CONSECUTIVE
// SCHEDULED runs. Five, not one, because the field read `[]` once at 20:43 with
// no fix in place at all — one green is a coin that landed heads.
//
// NOTHING WAS COUNTING. The CC-CMD assumed "the two scheduled runs accumulate
// the count without a session", and the manifests do record `triggered_by`, but
// no code read them — so the condition could only be checked by a human
// eyeballing a directory, which is the same as not being checked. Measured
// 2026-09-13: the schedule had fired twice in total, once landing 4h47m after
// its cron.
//
// TWO DENOMINATORS, KEPT APART (Rule 99). A green from a session-dispatched run
// and a green from a scheduled run are not the same evidence: two dispatches
// minutes apart sample one slate state, which is the luck this condition exists
// to rule out. Collapsing them would let five clicks close it in five minutes.
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Consecutive green runs counted backwards from the newest, and how many of
 * them were SCHEDULED. Exported so scripts/check-sections-gap-streak-logic.mjs
 * tests this and not a copy of it — the mistake that cost a rewrite earlier
 * today was a check re-implementing its own subject.
 *
 * A red resets BOTH counters. A run predating the fix is excluded rather than
 * treated as green: it measured the defect.
 *
 * A run whose comparison was NOT same-day is excluded for a stronger reason: it
 * did not measure this defect at all. Until 2026-09-22 the probe read the DOM
 * section census in the settle loop, BEFORE the step-back loop, and the model
 * after it — so on every scheduled run the gap was yesterday's model minus
 * today's DOM sections. A manifest says for itself whether its comparison was
 * same-day, by carrying `gap_compared_on`; an SW cutoff cannot express this,
 * because the fix is in the probe, which runs from the repo checkout and not
 * from the deployed bundle.
 */
export function computeStreak(runs, fixSw) {
  const since = runs.filter(r => r.sw && r.sw >= fixSw && r.comparedOn);
  let allStreak = 0, schedStreak = 0;
  for (let i = since.length - 1; i >= 0; i--) {
    const r = since[i];
    if (r.state !== 'green') break;
    allStreak++;
    if (r.trigger === 'schedule') schedStreak++;
  }
  return { since, allStreak, schedStreak };
}

/**
 * A manifest's gap field -> one of 'green' | 'red' | 'n/a'.
 *
 * Extracted 2026-09-22 because it had no test: it lived inside the CLI guard
 * below, the logic test constructs `state` in its own fixtures, and a mutation
 * making an ABSENT gap read as green went uncaught. Absent and empty are
 * different facts (Rule 99) and this is the line that has to keep them apart —
 * a manifest predating the field cannot vouch for it.
 */
export function runState(gap) {
  if (gap === undefined || gap === null) return 'n/a';
  return (Array.isArray(gap) && gap.length === 0) ? 'green' : 'red';
}

const DIR = 'outbox';
// The fix landed in SW 2026-09-12r. Manifests before it measure the defect, so
// they are reported but never counted toward the streak.
const FIX_SW = '2026-09-12r';
const REQUIRED = 5;

// Importing this module must not scan a directory and print. The logic test
// imports computeStreak; without this guard its output interleaved with a live
// scan, which is a small version of a test observing something other than what
// it claims to.
if (process.argv[1] && process.argv[1].endsWith('check-sections-gap-streak.mjs')) {
  const files = readdirSync(DIR)
    .filter(f => /^odds-line-probe-manifest-.*\.json$/.test(f))
    .sort();

  const runs = [];
  for (const f of files) {
    let j;
    try { j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')); } catch { continue; }
    const gap = j.sections_model_not_in_dom;
    runs.push({
      file: f,
      stamp: f.replace(/^odds-line-probe-manifest-/, '').replace(/\.json$/, ''),
      sw: j.sw_version || j.swVersion || null,
      trigger: j.triggered_by || null,
      // null on every manifest before 2026-09-22: those runs compared two
      // different dates and cannot vouch for a gap either way.
      comparedOn: j.gap_compared_on || null,
      // absent is NOT green. A manifest predating the field cannot vouch for it.
      state: runState(gap),
      gap,
    });
  }

  const { since, allStreak, schedStreak } = computeStreak(runs, FIX_SW);

  const valid = runs.filter(r => r.comparedOn).length;
  console.log(`manifests: ${runs.length} total, ${valid} with a same-day comparison, `
            + `${since.length} of those at or after the fix (SW >= ${FIX_SW})`);
  console.log(`${runs.length - valid} manifest(s) compared the model against a DOM census taken`);
  console.log(`before the step-back — a different date. Those are not green and not red.\n`);
  for (const r of since.slice(-10)) {
    const mark = r.state === 'green' ? 'green' : r.state === 'red' ? 'RED  ' : 'n/a  ';
    const n = Array.isArray(r.gap) ? r.gap.length : '-';
    console.log(`  ${mark}  ${r.stamp}  sw=${r.sw}  ${String(r.trigger).padEnd(18)} `
              + `gap=${n}  on=${r.comparedOn}`);
  }

  const done = schedStreak >= REQUIRED;
  console.log(`\ncurrent green streak: ${allStreak} run(s), of which ${schedStreak} scheduled`);
  console.log(`done condition: ${schedStreak}/${REQUIRED} consecutive SCHEDULED greens — ${done ? 'MET' : 'OPEN'}`);
  if (!done) {
    console.log(`still needed: ${REQUIRED - schedStreak} more scheduled green run(s).`);
    console.log('a dispatched green does NOT count: two dispatches minutes apart sample one');
    console.log('slate state, which is the coincidence the five-run bar exists to exclude.');
  }
  // A counter, not a gate. It must not fail the probe it rides along with — the
  // probe's own red is the signal, and this exiting non-zero for "not yet five"
  // would make every run red until the day it closes.
  process.exit(0);
}
