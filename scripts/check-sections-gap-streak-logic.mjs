// Rule 90 for computeStreak. The counter's job is to be harder to fool than a
// human reading a directory — which it replaced precisely because that reading
// was wrong twice today (reported "2 of 5" and "3 of 5"; the real figure was 1).
// Pointed at through GAP_STREAK_MODULE so scripts/mutate-sections-gap-streak.mjs
// can aim this same test at a mutated copy. Without the indirection the harness
// would have to mutate the file in place, and a crash mid-run would leave the
// counter broken on main.
const { computeStreak, runState } = await import(process.env.GAP_STREAK_MODULE || './check-sections-gap-streak.mjs');

let failed = 0, checked = 0;
const eq = (l, got, want) => { checked++;
  if (JSON.stringify(got) === JSON.stringify(want)) console.log(`ok    ${l}`);
  else { failed++; console.log(`FAIL  ${l} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); } };

// `comparedOn` defaults to a date, because every fixture below is about the
// streak arithmetic and not about the two-date artifact. The runs that carry
// null are the ones testing the exclusion itself.
const r = (sw, trigger, state, comparedOn = 'Yesterday') => ({ sw, trigger, state, comparedOn });
const FIX = '2026-09-12r';
const run = (rows) => computeStreak(rows, FIX);

// The measured shape on 2026-09-13: three greens, one scheduled.
eq('three greens, one scheduled', (({allStreak,schedStreak}) => [allStreak,schedStreak])(run([
  r('2026-09-12r','workflow_dispatch','green'),
  r('2026-09-12u','workflow_dispatch','green'),
  r('2026-09-12u','schedule','green'),
])), [3, 1]);

// The failure that made this script necessary: dispatched runs must never count
// toward the scheduled tally, or five clicks close a five-day condition.
eq('five dispatches do not close it', run([
  r('2026-09-12u','workflow_dispatch','green'), r('2026-09-12u','workflow_dispatch','green'),
  r('2026-09-12u','workflow_dispatch','green'), r('2026-09-12u','workflow_dispatch','green'),
  r('2026-09-12u','workflow_dispatch','green'),
]).schedStreak, 0);

eq('five scheduled greens close it', run([
  r('2026-09-12u','schedule','green'), r('2026-09-12u','schedule','green'),
  r('2026-09-12u','schedule','green'), r('2026-09-12u','schedule','green'),
  r('2026-09-12u','schedule','green'),
]).schedStreak, 5);

// A red resets BOTH counters, including a red that arrives after four greens.
eq('a red resets the streak', run([
  r('2026-09-12u','schedule','green'), r('2026-09-12u','schedule','green'),
  r('2026-09-12u','schedule','green'), r('2026-09-12u','schedule','green'),
  r('2026-09-12u','schedule','red'),
]).schedStreak, 0);
eq('a red buried mid-run truncates, not skips', run([
  r('2026-09-12u','schedule','green'), r('2026-09-12u','schedule','red'),
  r('2026-09-12u','schedule','green'), r('2026-09-12u','schedule','green'),
]).schedStreak, 2);

// A manifest with no field is not a green. Absence is not evidence (Rule 99).
eq('an absent field breaks the streak', run([
  r('2026-09-12u','schedule','green'), r('2026-09-12u','schedule','n/a'),
  r('2026-09-12u','schedule','green'),
]).schedStreak, 1);

// Pre-fix runs are excluded, not counted as green — they measured the defect.
eq('pre-fix runs are excluded', run([
  r('2026-09-12a','schedule','green'), r('2026-09-12b','schedule','green'),
  r('2026-09-12u','schedule','green'),
]).since.length, 1);
// THE 2026-09-22 EXCLUSION. Until that day the probe read the DOM section
// census BEFORE the step-back loop and the model after it, so a step_back>0 run
// compared yesterday's model against today's DOM. Such a run did not measure
// this defect either way, and counting its `[]` as a green would rebuild the
// fake streak that the 09-15 window fix already had to reset once.
eq('a run whose comparison was not same-day is excluded, not counted green', run([
  r('2026-09-22b','schedule','green', null),
  r('2026-09-22b','schedule','green', null),
  r('2026-09-22b','schedule','green'),
]).schedStreak, 1);
eq('...and such a run does not break a streak either — it is not a red', run([
  r('2026-09-22b','schedule','green'),
  r('2026-09-22b','schedule','green', null),
  r('2026-09-22b','schedule','green'),
]).schedStreak, 2);
eq('a directory of nothing but pre-fix comparisons closes nothing', run([
  r('2026-09-22b','schedule','green', null), r('2026-09-22b','schedule','green', null),
  r('2026-09-22b','schedule','green', null), r('2026-09-22b','schedule','green', null),
  r('2026-09-22b','schedule','green', null),
]).schedStreak, 0);

eq('a run with no SW is excluded', run([
  r(null,'schedule','green'), r('2026-09-12u','schedule','green'),
]).since.length, 1);
// THE MAPPING, which had no test until 2026-09-22. A mutation making an absent
// gap read as green went uncaught because the fixtures above build `state`
// themselves and never reached the line that derives it.
eq('an empty gap is green', runState([]), 'green');
eq('a gap with sections in it is red', runState(['NHL']), 'red');
eq('AN ABSENT GAP IS NOT GREEN — a manifest predating the field cannot vouch for it',
  runState(undefined), 'n/a');
eq('...and neither is a null one, which says the comparison could not be made',
  runState(null), 'n/a');
// ONLY AN ARRAY CAN BE GREEN. A falsy non-null gap — an empty string from a
// truncated write, a 0 from a field that was meant to be a count — is not an
// empty gap, and a length check alone cannot tell them apart. `'[]'` reads red
// under both the real rule and a length-only one, so it does not discriminate;
// these two do.
eq('a non-array gap is red, not silently green', runState('[]'), 'red');
eq('an empty STRING gap is red — a truncated write is not a verified-empty gap',
  runState(''), 'red');
eq('a numeric 0 gap is red for the same reason', runState(0), 'red');

eq('no runs at all is zero, not done', run([]).schedStreak, 0);

console.log(`\n${failed ? 'FAILED' : 'PASS'}: ${checked - failed}/${checked}`);
process.exit(failed ? 1 : 0);
