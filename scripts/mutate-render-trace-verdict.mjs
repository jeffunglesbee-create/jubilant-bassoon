// Rule 90 for scripts/check-render-trace-verdict.mjs.
//
// Mutants are placed BESIDE the original and deleted on exit, and a POSITIVE
// CONTROL runs an unmutated copy at the mutant location first. A harness in
// this repo once wrote mutants to /tmp where a relative import did not resolve,
// and read six dead imports as six caught mutations.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';

const SRC = 'scripts/render-trace-verdict.cjs';
const original = readFileSync(SRC, 'utf8');
const DIR = dirname(SRC);
const born = [];
const place = (text, tag) => {
  const p = join(DIR, `.mutant-${tag}-${Math.random().toString(36).slice(2, 8)}.cjs`);
  writeFileSync(p, text); born.push(p); return resolve(p);
};
process.on('exit', () => { for (const p of born) { try { unlinkSync(p); } catch (_e) {} } });

const run = (modulePath) => {
  try {
    execFileSync(process.execPath, ['scripts/check-render-trace-verdict.mjs'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, RENDER_TRACE_MODULE: modulePath } });
    return true;
  } catch { return false; }
};

if (!run(resolve(SRC))) { console.log('FAIL — the self-test is already red on clean source.'); process.exit(1); }
if (!run(place(original, 'control'))) {
  console.log('FAIL — an UNMUTATED copy at the mutant location is red, so no verdict below would mean anything.');
  process.exit(1);
}
console.log('baseline: the self-test passes on current source and on an unmutated copy at the mutant location\n');

const MUTATIONS = [
  ['R1 every missing section is the same defect again — the state before this file',
   "      if (s.emitted) return { label, verdict: 'emitted-but-absent', games: s.games ?? null, chars: s.chars ?? null };",
   "      return { label, verdict: 'dropped-at-render', games: s.games ?? null, chars: s.chars ?? null };",
   'THE REASON THIS EXISTS: the gap has been a COUNT for ten days, and every hypothesis refuted so far was refuted because a count cannot say which way a section was lost'],

  ['R2 a section with zero games is filed as the defect',
   "      if (s.games > 0) return { label, verdict: 'dropped-at-render', games: s.games, chars: s.chars ?? null };",
   "      if (s.games >= 0) return { label, verdict: 'dropped-at-render', games: s.games, chars: s.chars ?? null };",
   'renderAll returns "" for a section with no games — calling that the defect makes the 0/5 done condition unclosable, which is the exact failure gap_split was built to end'],

  ['R3 an unreadable game count reads as empty-by-design',
   "      if (s.games === null || s.games === undefined)\n        return { label, verdict: 'unknown-count', games: null, chars: s.chars ?? null };",
   "      if (s.games === null || s.games === undefined)\n        return { label, verdict: 'empty-by-design', games: 0, chars: s.chars ?? null };",
   'a bundle predating sportsGameCounts reports every section that way; filing them as correct behaviour announces "no defect" for a page never measured'],

  ['R4 a filtered-out section is reported as never iterated',
   "    if (inModel.has(label)) return { label, verdict: 'filtered-out', games: null, chars: null };",
   "    if (false) return { label, verdict: 'filtered-out', games: null, chars: null };",
   'a myTeams or freeOnly filter emptying a section is the filter doing its job; reporting it as a render that never ran sends the next fix into renderAll for nothing'],

  ['R5 a section the render never saw is reported as dropped by the render',
   "    return { label, verdict: 'not-iterated', games: null, chars: null };",
   "    return { label, verdict: 'dropped-at-render', games: null, chars: null };",
   'THE ONE THE TRACE EXISTS TO SEPARATE: a section that entered allData AFTER the render pass was never offered to the DOM, and blaming the renderer for it is the ten-day-old dead end'],

  ['R6 a missing trace yields a clean bill instead of null',
   '  if (!trace || !Array.isArray(trace.sections) || !Array.isArray(trace.modelSections)) return null;',
   '  if (!trace || !Array.isArray(trace.sections) || !Array.isArray(trace.modelSections)) return [];',
   'an empty list reads as "checked, every section accounted for"; null says the verdict could not be reached. Rule 99, inside the function written to enforce it'],

  ['R7 a half-formed trace is treated as complete',
   '  if (!trace || !Array.isArray(trace.sections) || !Array.isArray(trace.modelSections)) return null;',
   '  if (!trace) return null;',
   'without modelSections every gap label falls through to not-iterated, so a truncated trace would report the whole gap as a timing artifact'],

  ['R8 the census claims zero of everything when it cannot count',
   '  if (!Array.isArray(verdicts)) return null;',
   '  if (!Array.isArray(verdicts)) return {};',
   'an empty census reads as counted-and-none; null says nothing was counted'],
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
console.log('COVERAGE: traceVerdicts and verdictCensus only — 2 functions, 1 file. It');
console.log('does NOT cover the trace the page publishes, the probe that reads it, or');
console.log('whether the verdicts are TRUE of any live render.');
process.exit(caught === MUTATIONS.length ? 0 : 1);
