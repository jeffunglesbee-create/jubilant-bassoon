// Rule 90 for computeStreak — the counter that says how close
// CC-CMD-2026-09-12-v2-sections-in-model-not-in-dom is to done.
//
// It had a logic test and no mutation harness, so every property it asserted
// was one that had only ever passed. The 2026-09-22 same-day-comparison
// exclusion is the reason this now exists: it is the second time this counter's
// denominator has had to be reset (the first was the empty-probe-window fix on
// 09-15), and a reset that the test cannot prove it enforces is a reset in
// prose only.
//
// Mutants are placed BESIDE the original and deleted on exit, and a POSITIVE
// CONTROL runs an unmutated copy at the mutant location first — this repo has
// already read six dead imports as six caught mutations by writing them to /tmp.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';

const SRC = 'scripts/check-sections-gap-streak.mjs';
const original = readFileSync(SRC, 'utf8');
const DIR = dirname(SRC);
const born = [];
const place = (text, tag) => {
  const p = join(DIR, `.mutant-${tag}-${Math.random().toString(36).slice(2, 8)}.mjs`);
  writeFileSync(p, text); born.push(p); return resolve(p);
};
process.on('exit', () => { for (const p of born) { try { unlinkSync(p); } catch (_e) {} } });

const run = (modulePath) => {
  try {
    execFileSync(process.execPath, ['scripts/check-sections-gap-streak-logic.mjs'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, GAP_STREAK_MODULE: modulePath } });
    return true;
  } catch { return false; }
};

if (!run(resolve(SRC))) { console.log('FAIL — the logic test is already red on clean source.'); process.exit(1); }
if (!run(place(original, 'control'))) {
  console.log('FAIL — an UNMUTATED copy at the mutant location is red, so no verdict below would mean anything.');
  process.exit(1);
}
console.log('baseline: the logic test passes on current source and on an unmutated copy at the mutant location\n');

const MUTATIONS = [
  ['S1 a run that compared two different dates counts as evidence again',
   '  const since = runs.filter(r => r.sw && r.sw >= fixSw && r.comparedOn);',
   '  const since = runs.filter(r => r.sw && r.sw >= fixSw);',
   'THE 2026-09-22 RESET: 59 of 60 manifests compared yesterday’s model against today’s DOM, and counting their `[]` as greens would close a five-run condition on runs that never measured this defect'],

  ['S2 pre-fix runs count again',
   '  const since = runs.filter(r => r.sw && r.sw >= fixSw && r.comparedOn);',
   '  const since = runs.filter(r => r.comparedOn);',
   'runs before SW 2026-09-12r measured the defect itself; counting them closes the condition with evidence of the bug'],

  ['S3 a dispatched green counts toward the scheduled tally',
   "    if (r.trigger === 'schedule') schedStreak++;",
   '    schedStreak++;',
   'five clicks would then close a five-day condition — the exact failure this counter replaced a human reading a directory to prevent'],

  ['S4 a red no longer resets the streak',
   "    if (r.state !== 'green') break;",
   "    if (r.state === 'never') break;",
   'a streak that survives a red is not a streak; the bar is FIVE CONSECUTIVE because one green was already a coin that landed heads'],

  ['S5 an absent gap field reads as green',
   "  if (gap === undefined || gap === null) return 'n/a';",
   "  if (gap === undefined || gap === null) return 'green';",
   'a manifest predating the field cannot vouch for it; absent and empty are different facts (Rule 99). This mutation went UNCAUGHT on first run because the mapping lived inside the CLI guard and no test reached it — which is why runState is now an exported function'],

  ['S6 a non-array gap is treated as an empty one',
   "  return (Array.isArray(gap) && gap.length === 0) ? 'green' : 'red';",
   "  return (!gap || gap.length === 0) ? 'green' : 'red';",
   'a gap serialised as the string "[]" has length 2 and would read red, but an empty string or 0 would read green — a shape check is not a length check'],
];

let caught = 0;
for (const [name, anchor, repl, why] of MUTATIONS) {
  const hits = original.split(anchor).length - 1;
  if (hits !== 1) { console.log(`FAIL       ${name}\n            anchor matched ${hits} times, expected 1 — NOTHING MUTATED.`); continue; }
  const mutated = original.replace(anchor, repl);
  if (mutated === original) { console.log(`FAIL       ${name}\n            file unchanged — NOTHING MUTATED.`); continue; }
  const path = place(mutated, 'm');
  if (readFileSync(path, 'utf8') === original) { console.log(`FAIL       ${name}\n            the written copy is identical — NOTHING MUTATED.`); continue; }
  const red = !run(path);
  console.log(`${red ? 'CAUGHT    ' : 'NOT CAUGHT'} ${name}\n            (${why})`);
  if (red) caught++;
}

console.log(`\n${caught} of ${MUTATIONS.length} mutations caught.`);
console.log('COVERAGE: computeStreak and runState — 2 functions, 1 file. It');
console.log('does NOT cover whether any manifest’s gap figure is itself correct.');
process.exit(caught === MUTATIONS.length ? 0 : 1);
