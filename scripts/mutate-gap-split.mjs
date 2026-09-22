// Rule 90 for scripts/check-gap-split.mjs.
//
// Mutants are placed BESIDE the original and deleted on exit, and a POSITIVE
// CONTROL runs an unmutated copy at the mutant location first. Earlier today a
// harness in this repo wrote mutants to /tmp where a relative import did not
// resolve, and read six dead imports as six caught mutations.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';

const SRC = 'scripts/gap-split.cjs';
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
    execFileSync(process.execPath, ['scripts/check-gap-split.mjs'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, GAP_SPLIT_MODULE: modulePath } });
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
  ['G1 every missing section is a defect again — the state before this split',
   "    if (n === undefined || n === null) bucket.unknown.push(label);\n    else if (n > 0) bucket.dropped.push({ label, games: n });\n    else bucket.empty.push(label);",
   "    bucket.dropped.push({ label, games: n });",
   'THE REASON THIS EXISTS: eight sections were reported as a defect with no way to tell which of them had any games to render'],

  ['G2 a section with zero games counts as dropped',
   '    else if (n > 0) bucket.dropped.push({ label, games: n });',
   '    else if (n >= 0) bucket.dropped.push({ label, games: n });',
   'renderAll returns "" for a section with no games — calling that a defect makes the done condition unclosable'],

  ['G3 an unreadable count reads as empty',
   '    if (n === undefined || n === null) bucket.unknown.push(label);',
   '    if (n === undefined || n === null) bucket.empty.push(label);',
   'a deployed bundle predating sportsGameCounts reports every label that way; filing them as empty announces "no defect" for a page never measured'],

  ['G5 a matching DOM key no longer counts as present',
   '    .filter(c => c && !inDom.has(c.label) && !(typeof c.sport === \'string\' && inDom.has(c.sport)))',
   '    .filter(c => c && !inDom.has(c.label))',
   'THE ARTIFACT THIS REMOVES: every league-config section renders as data-sport="basketball" or "hockey" and reports as "WNBA" or "NHL", so comparing on the label alone calls a rendered section missing'],

  ['G6 a null sport key is reported as a mismatch',
   "    .filter(c => c && typeof c.sport === 'string' && c.sport !== c.label)",
   '    .filter(c => c && c.sport !== c.label)',
   'a section with no sport key at all has not mismatched anything; folding the two together is the absence collapse this file exists to avoid'],

  ['G7 the mismatch list claims none when it cannot be computed',
   '  if (!Array.isArray(counts)) return null;\n  return counts\n    .filter(c => c && typeof c.sport',
   '  if (!Array.isArray(counts)) return [];\n  return counts\n    .filter(c => c && typeof c.sport',
   'an empty list reads as "checked, no mismatches"; null says the check could not run'],

  ['G4 an unreadable input yields a clean bill instead of null',
   '  if (!Array.isArray(missing) || !Array.isArray(counts)) return null;',
   '  if (!Array.isArray(missing) || !Array.isArray(counts)) return { dropped: [], empty: [], unknown: [] };',
   'an empty split reads as checked-and-clean; null says the check could not run. Rule 99, in the function written to enforce it'],
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
console.log('COVERAGE: splitGap’s three-way decision and its null guard. It does NOT');
console.log('cover the probe that calls it or whether the page reports the counts.');
process.exit(caught === MUTATIONS.length ? 0 : 1);
