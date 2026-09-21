// Rule 90 for scripts/check-tennis-boundary-line.mjs.
//
// The self-test found a real defect on its first run — `bad()` counted `empty`
// as a failed feed, so a day with no tennis would have been reported as a
// double outage. That is encouraging but proves nothing about the OTHER
// fourteen checks, which have only ever passed.
//
// The harness mutates a COPY of the module and points the test at it through
// an env var, so the working tree is never written to. A harness that edits the
// tree can leave a mutation behind when it is interrupted — this session lost
// an hour to exactly that in another repo today.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = 'scripts/tennis-boundary-line.cjs';
const original = readFileSync(SRC, 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'boundary-mut-'));

const run = (modulePath) => {
  try {
    execFileSync(process.execPath, ['scripts/check-tennis-boundary-line.mjs'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, TENNIS_BOUNDARY_MODULE: modulePath } });
    return true;   // green
  } catch { return false; }  // red
};

if (!run(join(process.cwd(), SRC))) {
  console.log('FAIL — the self-test is already red on clean source.');
  process.exit(1);
}
console.log('baseline: the self-test passes on current source\n');

const MUTATIONS = [
  ['B1 `empty` counts as a failed feed again',
   "  const bad = (o) => o != null && !String(o).startsWith('ok:') && String(o) !== 'empty';",
   "  const bad = (o) => o != null && !String(o).startsWith('ok:');",
   'THE DEFECT THE TEST ALREADY CAUGHT ONCE: a quiet Tuesday with no tennis reported as NEITHER FEED DELIVERED'],

  ['B2 the tier filter is checked before the feeds',
   '  if (m.rowsBeforeTier === 0) {',
   '  if (false) {',
   'zero rows arriving would be blamed on the filter that never saw them'],

  ['B3 a throw is reported after the feed outcomes instead of before',
   '  if (m.producerThrew) return `the producer threw: ${m.producerThrew}`;',
   '  if (false) return `the producer threw: ${m.producerThrew}`;',
   'the exception that stopped everything is the one thing not mentioned'],

  ['B4 missing instrumentation reads as "the producer never ran"',
   "  if (m.diagRan === 'absent') {",
   '  if (false) {',
   'a deployed bundle with no diagnostics is a different fact from a producer that did not start, and the fix for each is different'],

  ['B5 the merge and the render are no longer distinguished',
   '  if (m.sectionInAllData === false) {',
   '  if (m.sectionInAllData !== true) {',
   'null means allData was unreadable; reading it as false blames a merge that may have worked'],

  ['B6 the mapping stage is skipped',
   '  if (m.sectionReturned === 0) {',
   '  if (false) {',
   'every allowed row failing the player-name guard would be reported as a render problem'],
];

let caught = 0;
for (const [name, anchor, repl, why] of MUTATIONS) {
  const hits = original.split(anchor).length - 1;
  if (hits !== 1) {
    console.log(`FAIL       ${name}\n            anchor matched ${hits} times, expected 1 — NOTHING MUTATED.`);
    continue;
  }
  const mutated = original.replace(anchor, repl);
  if (mutated === original) {
    console.log(`FAIL       ${name}\n            file unchanged — NOTHING MUTATED.`);
    continue;
  }
  const path = join(dir, `boundary-${caught}-${Math.random().toString(36).slice(2, 8)}.cjs`);
  writeFileSync(path, mutated);
  if (readFileSync(path, 'utf8') === original) {
    console.log(`FAIL       ${name}\n            the written copy is identical — NOTHING MUTATED.`);
    continue;
  }
  const red = !run(path);
  console.log(`${red ? 'CAUGHT    ' : 'NOT CAUGHT'} ${name}\n            (${why})`);
  if (red) caught++;
}

console.log(`\n${caught} of ${MUTATIONS.length} mutations caught.`);
console.log('COVERAGE: the six branch decisions in boundaryLine. It does NOT cover the');
console.log('wording of any clause, the probe that calls it, or whether the page');
console.log('publishes the values it reads.');
process.exit(caught === MUTATIONS.length ? 0 : 1);
