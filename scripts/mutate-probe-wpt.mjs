// Rule 90 for scripts/check-probe-wpt.mjs.
//
// Its FIRST run produced a wrong verdict on a real file: the detector matched
// `\?wpt` only, so nfl_standings_render_probe.js — which builds
// `BASE + (BASE.includes('?') ? '&' : '?') + 'wpt=1'`, correctly — was reported
// as an offender. Two of the nineteen names in that first list were innocent.
// It was caught by checking one against an earlier grep, not by trusting the
// output, and two innocent files came within one commit of being written into
// a baseline as known-bad.
//
// Mutations run against a COPY, and the harness refuses a verdict it did not
// produce: an anchor matching other than once prints NOTHING MUTATED.
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = 'scripts/check-probe-wpt.mjs';
const original = readFileSync(SRC, 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'wpt-mut-'));

// The check reads the CWD for *_probe.js and docs/ for the baseline, so a copy
// has to run from a tree that has both. Running it in place from a temp path
// would find no probes at all and pass vacuously — which would make every
// mutation look caught for the wrong reason.
const run = (srcPath, ...args) => {
  try {
    execFileSync(process.execPath, [srcPath, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch { return false; }
};

const scratch = join(dir, 'check.mjs');
copyFileSync(SRC, scratch);
if (!run(scratch)) { console.log('FAIL — the check is already red on clean source.'); process.exit(1); }
console.log('baseline: the check passes on current source\n');

const MUTATIONS = [
  ['W1 the detector matches ?wpt only — the defect it shipped with for one run',
   `  if (!/['"&?]wpt\\b/.test(src)) { failed++; offenders.push(f); }`,
   '  if (!/\\?wpt/.test(src)) { failed++; offenders.push(f); }',
   'nfl_standings_render_probe.js and tennis_draw_probe.js build the param with a computed separator; the narrow regex calls both offenders and they are not in the baseline, so the ratchet must go red'],

  ['W2 the ratchet is dropped and every baselined probe fails again',
   'failed = isNew.length;',
   'failed = offenders.length;',
   'seventeen pre-existing offenders red every run is the standing red this baseline exists to avoid'],

  ['W3 a probe that never navigates is checked anyway',
   "  if (!/page\\.goto\\(/.test(src)) { noNav++; continue; }",
   '  if (false) { noNav++; continue; }',
   'a relay-only probe has no modal to skip; failing it is a red nobody can clear'],

  ['W4 the ratchet becomes a pass-everything wildcard',
   '  return (offenders ?? []).filter(f => !known.has(f));',
   '  return [];',
   'THE ABUSE THE BASELINE HEADER WARNS ABOUT: nothing is ever new, so the ratchet never fires again. Judged by --self-test, which has a positive control; the live scan is green either way on a day with no new offender, which is why this mutation survived its first run',
   '--self-test'],

  ['W5 a stale baseline entry masks a real new offender',
   '  const known = new Set(baseline ?? []);',
   '  const known = new Set(baseline ?? []); if (known.size) return [];',
   'one admitted probe would excuse every future one',
   '--self-test'],
];

let caught = 0;
for (const [name, anchor, repl, why, mode] of MUTATIONS) {
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
  const path = join(dir, `check-${caught}-${Math.random().toString(36).slice(2, 8)}.mjs`);
  writeFileSync(path, mutated);
  if (readFileSync(path, 'utf8') === original) {
    console.log(`FAIL       ${name}\n            the written copy is identical — NOTHING MUTATED.`);
    continue;
  }
  const red = mode === '--self-test' ? !run(path, '--self-test') : !run(path);
  console.log(`${red ? 'CAUGHT    ' : 'NOT CAUGHT'} ${name}\n            (${why})`);
  if (red) caught++;
}

console.log(`\n${caught} of ${MUTATIONS.length} mutations caught.`);
console.log('COVERAGE: the detector regex, the navigation filter and the ratchet. It');
console.log('does NOT check that ?wpt reaches page.goto in any probe, nor that the modal');
console.log('is actually skipped at runtime — only the live probe can show that.');
process.exit(caught === MUTATIONS.length ? 0 : 1);
