// Rule 90 for scripts/check-gap-cotemporal.mjs.
//
// Mutants are placed BESIDE the original and deleted on exit, and a POSITIVE
// CONTROL runs an unmutated copy at the mutant location first.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';

const SRC = 'odds_line_probe.js';
const original = readFileSync(SRC, 'utf8');
const DIR = dirname(resolve(SRC));
const born = [];
const place = (text, tag) => {
  const p = join(DIR, `.mutant-${tag}-${Math.random().toString(36).slice(2, 8)}.js`);
  writeFileSync(p, text); born.push(p); return resolve(p);
};
process.on('exit', () => { for (const p of born) { try { unlinkSync(p); } catch (_e) {} } });

const run = (path) => {
  try {
    execFileSync(process.execPath, ['scripts/check-gap-cotemporal.mjs'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PROBE_SRC: path } });
    return true;
  } catch { return false; }
};

if (!run(resolve(SRC))) { console.log('FAIL — the gate is already red on clean source.'); process.exit(1); }
if (!run(place(original, 'control'))) {
  console.log('FAIL — an UNMUTATED copy at the mutant location is red, so no verdict below would mean anything.');
  process.exit(1);
}
console.log('baseline: the gate passes on current source and on an unmutated copy at the mutant location\n');

const MUTATIONS = [
  ['C1 the gap goes back to the pre-step census — the defect itself',
   '    const dom = m.slate_sections_at_model_read || null;',
   '    const dom = m.slate_sections_present || null;',
   'THE STATE THIS GATE EXISTS TO END: yesterday’s model minus today’s DOM sections, on every scheduled run, with nothing in the output saying so'],

  ['C2 the co-temporal census moves above the step-back loop',
   '    m.slate_sections_at_model_read = await page.evaluate(() =>',
   '    if (false) m.slate_sections_at_model_read = await page.evaluate(() =>',
   'a census that is never assigned leaves the gap comparing the model against null, which reads as "comparison not run" rather than as a defect'],

  ['C6 the co-temporal census is deleted outright',
   '    m.slate_sections_at_model_read = await page.evaluate(() =>',
   '    const _removedCensus = (() =>',
   'the existence check has to be able to fail, or it is asserting that a string is present in a file it was written alongside'],

  ['C3 the gap census loses its date label',
   '    m.slate_sections_at_model_read_date_label = await dateLabel();',
   '    m.slate_sections_at_model_read_date_label = null;',
   'the artifact then cannot state which date the gap was computed on, which is exactly how this went unnoticed for ten days'],

  ['C4 the pre-step census loses its date label',
   '      m.slate_sections_present_date_label = await dateLabel();',
   '      m.slate_sections_present_date_label = null;',
   'two censuses from two different dates become indistinguishable in the committed manifest'],

  ['C5 the summary drops the date from the gap line',
   '    console.log(`sections in allData.sports but NOT in the DOM on ${m.gap_compared_on} `',
   '    console.log(`sections in allData.sports but NOT in the DOM `',
   'a gap figure with no date is a number a reader will carry into a conclusion, which is what happened on 2026-09-21 and again on 09-22'],
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
console.log('COVERAGE: the read order and the date labels in odds_line_probe.js — 1 file,');
console.log('5 properties. It does NOT cover what any run measures, only that the two');
console.log('things being compared are read on the same date.');
process.exit(caught === MUTATIONS.length ? 0 : 1);
