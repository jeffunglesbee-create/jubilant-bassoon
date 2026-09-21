// Rule 90 for scripts/check-tennis-pass-streak-logic.mjs.
//
// Mutations run against a COPY, pointed at through TENNIS_STREAK_MODULE, so the
// working tree is never written to. A harness that edits the tree can leave a
// mutation behind when interrupted — that cost an hour in another repo today.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';

const SRC = 'scripts/check-tennis-pass-streak.mjs';
const original = readFileSync(SRC, 'utf8');
// MUTANTS LIVE BESIDE THE ORIGINAL, NOT IN /tmp.
//
// The first version wrote them to a temp directory, where
// `./check-sections-gap-streak.mjs` does not resolve. Every mutant died on the
// import and the harness read six dead imports as six caught mutations. An
// UNMUTATED copy in /tmp fails identically, which is how it was caught — and
// which is why the positive control below now runs before any verdict is
// accepted. A harness cannot report what it did not observe.
const DIR = dirname(SRC);
const born = [];
const place = (text, tag) => {
  const p = join(DIR, `.mutant-${tag}-${Math.random().toString(36).slice(2, 8)}.mjs`);
  writeFileSync(p, text);
  born.push(p);
  return resolve(p);
};
process.on('exit', () => { for (const p of born) { try { unlinkSync(p); } catch (_e) {} } });

const run = (modulePath) => {
  try {
    execFileSync(process.execPath, ['scripts/check-tennis-pass-streak-logic.mjs'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, TENNIS_STREAK_MODULE: modulePath } });
    return true;
  } catch { return false; }
};

if (!run(resolve(SRC))) { console.log('FAIL — the logic test is already red on clean source.'); process.exit(1); }
// THE POSITIVE CONTROL. An unmutated copy AT THE MUTANT'S LOCATION must pass.
// If it does not, the location itself is red and every mutation below would
// report CAUGHT for a reason that has nothing to do with the mutation.
if (!run(place(original, 'control'))) {
  console.log('FAIL — an UNMUTATED copy at the mutant location is red, so no verdict below would mean anything.');
  process.exit(1);
}
console.log('baseline: the logic test passes on current source, and on an unmutated copy at the mutant location\n');

const MUTATIONS = [
  ['S1 any PASS counts, however small the slate',
   '  const big = (m.relayLiveMatches ?? 0) >= MIN_MATCHES;',
   '  const big = true;',
   'THE LOOPHOLE THE BAR EXISTS FOR: 2026-09-17 passed at 19 matches with the bug in place, because the slate was under the overflow threshold that day'],

  ['S2 a PASS counts even when cards are missing',
   '  const complete = m.tennisCardCount === m.relayLiveMatches;',
   '  const complete = true;',
   'the section rendering 40 of 42 is a different state from rendering all of them, and it would close the condition'],

  ['S3 the bar drops below every observed FAIL',
   'const MIN_MATCHES = 34;',
   'const MIN_MATCHES = 5;',
   '34 is the lowest FAIL outside the boundary overlap; below it a PASS can be explained by the slate shrinking rather than by the fix'],

  ['S4 one qualifying run closes the condition',
   'const REQUIRED = 2;',
   'const REQUIRED = 1;',
   'a single reading cannot exclude the coincidence — 2026-09-06 went red and green six minutes apart at the same slate size'],

  ['S5 pre-fix manifests count toward the streak',
   "const FIX_SW = '2026-09-21c';",
   "const FIX_SW = '2026-01-01a';",
   'every PASS from the sixteen days before the fix would be admitted as evidence for it'],

  ['S6 a small PASS is filed as a plain red',
   "      : pass && !big ? 'small'",
   "      : pass && !big ? 'red'",
   'a slate too small to judge is not a failure of the page; printing it red makes the log unreadable and hides real reds in it'],
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
console.log('COVERAGE: runOf’s state decision and the three constants. It does NOT cover');
console.log('computeStreak (its own logic test does), the manifest scan, or the printing.');
process.exit(caught === MUTATIONS.length ? 0 : 1);
