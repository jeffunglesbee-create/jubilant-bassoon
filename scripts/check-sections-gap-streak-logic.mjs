// Rule 90 for computeStreak. The counter's job is to be harder to fool than a
// human reading a directory — which it replaced precisely because that reading
// was wrong twice today (reported "2 of 5" and "3 of 5"; the real figure was 1).
import { computeStreak } from './check-sections-gap-streak.mjs';

let failed = 0, checked = 0;
const eq = (l, got, want) => { checked++;
  if (JSON.stringify(got) === JSON.stringify(want)) console.log(`ok    ${l}`);
  else { failed++; console.log(`FAIL  ${l} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); } };

const r = (sw, trigger, state) => ({ sw, trigger, state });
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
eq('a run with no SW is excluded', run([
  r(null,'schedule','green'), r('2026-09-12u','schedule','green'),
]).since.length, 1);
eq('no runs at all is zero, not done', run([]).schedStreak, 0);

console.log(`\n${failed ? 'FAILED' : 'PASS'}: ${checked - failed}/${checked}`);
process.exit(failed ? 1 : 0);
