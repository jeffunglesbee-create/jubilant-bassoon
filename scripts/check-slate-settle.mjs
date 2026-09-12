#!/usr/bin/env node
// Enumerated input/output pairs for the slate settle criterion
// (CC-CMD-2026-09-12-slate-size-variance Task 1). The probe's own loop calls
// the same function, so a change here or there cannot drift apart.
//
// Rule 90: each case is a series the probe could really see, and the ones that
// matter are the ones a naive criterion gets WRONG — a blank page reading 0,0,0
// is perfectly stable and must not count as settled; a slate that climbs while
// the V2 poll injects section after section must not settle on a plateau of
// two; and a series that never stops moving must report not-reached rather than
// hand back its last value as final.

import { createRequire } from 'node:module';
const { settleScan } = createRequire(import.meta.url)('./slate-settle.cjs');

const CASES = [
  // [ label, totals, expected settledIndex, expected reached ]
  ['empty series',                       [],                       null, false],
  ['a blank page is stable but not settled', [0, 0, 0, 0, 0],      null, false],
  ['zeros then a real slate that settles',   [0, 0, 45, 45, 45],   4,    true],
  ['three equal non-zero, earliest wins',    [45, 45, 45, 45],     2,    true],
  ['two equal is NOT enough (a plateau between injections)', [45, 45, 129], null, false],
  ['a plateau of two then the climb resumes, settling later',
                                         [45, 45, 129, 129, 129],  4,    true],
  ['the 129-then-45 shape never settles',  [129, 45, 129, 45],      null, false],
  ['monotonic climb, never settles',       [10, 20, 30, 40, 50],    null, false],
  ['settles at the very end',              [16, 44, 44, 44],        3,    true],
  ['a single non-zero reading',            [129],                   null, false],
  ['two readings only',                    [129, 129],              null, false],
  ['drops back to zero mid-series',        [45, 0, 0, 0],           null, false],
];

let failed = 0;
for (const [label, totals, wantIdx, wantReached] of CASES) {
  const got = settleScan(totals);
  const ok = got.settledIndex === wantIdx && got.reached === wantReached;
  if (ok) console.log(`  ok    ${label}`);
  else { failed++; console.error(`  FAIL  ${label}\n        ${JSON.stringify(totals)} -> ${JSON.stringify(got)}, wanted {settledIndex: ${wantIdx}, reached: ${wantReached}}`); }
}

console.log(`\nchecked ${CASES.length} enumerated series against settleScan — the criterion only. `
          + `Whether the probe SAMPLES often enough, and whether a settled slate is the `
          + `COMPLETE slate, are separate claims this does not make.`);
if (failed) { console.error(`FAIL — ${failed} case(s).`); process.exit(1); }
console.log('PASS');
