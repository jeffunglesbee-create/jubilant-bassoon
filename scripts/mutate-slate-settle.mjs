#!/usr/bin/env node
// Rule 90 for the settle criterion. Each mutation is a criterion somebody might
// plausibly have written instead, and each must be rejected by a NAMED case —
// not merely by a non-zero exit, which a check passing for the wrong reason
// would also give.
//
// Anchor discipline as in mutate-relay-date-sections.mjs: exactly-one-match
// asserted, the replacement confirmed present on disk, and `git checkout --`
// to restore. A "NOT CAUGHT" with nothing mutated is worse than no test.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SRC = 'scripts/slate-settle.cjs';
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const dirty = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (dirty) { console.error(`FAIL — ${SRC} is dirty; refusing to mutate.\n${dirty}`); process.exit(1); }

const MUTATIONS = [
  { name: 'S1  two equal readings are enough (equalRun >= 1)',
    anchor: 'if (equalRun >= 2) return { settledIndex: i, reached: true };',
    replace: 'if (equalRun >= 1) return { settledIndex: i, reached: true };',
    expect: 'two equal is NOT enough' },
  { name: 'S2  the non-zero guard is dropped — a blank page reads as settled',
    anchor: 'if (last !== null && t === last && t > 0) equalRun++;',
    replace: 'if (last !== null && t === last) equalRun++;',
    expect: 'a blank page is stable but not settled' },
  { name: 'S3  equalRun is never reset — any two equals anywhere accumulate',
    anchor: '    else equalRun = 0;\n    last = t;',
    replace: '    last = t;',
    expect: 'the 129-then-45 shape never settles' },
  { name: 'S4  reached is always true — the not-settled state disappears',
    anchor: '  return { settledIndex: null, reached: false };',
    replace: '  return { settledIndex: null, reached: true };',
    expect: 'monotonic climb, never settles' },
];

let bad = 0;
for (const m of MUTATIONS) {
  const before = fs.readFileSync(SRC, 'utf8');
  const hits = before.split(m.anchor).length - 1;
  if (hits !== 1) {
    bad++; console.error(`  ANCHOR  ${m.name}\n          anchor occurs ${hits} time(s), expected 1. NOTHING WAS MUTATED — harness defect, not a result.`);
    continue;
  }
  fs.writeFileSync(SRC, before.replace(m.anchor, m.replace));
  if (!fs.readFileSync(SRC, 'utf8').includes(m.replace)) {
    bad++; console.error(`  NOTAPPLIED  ${m.name}`);
    sh('git', ['checkout', '--', SRC]); continue;
  }

  let out = '', code = 0;
  try { out = sh('node', ['scripts/check-slate-settle.mjs']); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  sh('git', ['checkout', '--', SRC]);

  if (code === 0) { bad++; console.error(`  NOT CAUGHT  ${m.name}\n          check-slate-settle still passed.`); }
  else if (!/FAIL {2}.*/.test(out) || !out.includes(m.expect)) {
    bad++; console.error(`  WRONG REASON  ${m.name}\n          failed, but no FAIL line mentioned "${m.expect}". Output:\n${out}`);
  } else {
    const n = (out.match(/^ {2}FAIL /gm) || []).length;
    console.log(`  caught  ${m.name}\n          by "${m.expect}" (${n} case(s) went red)`);
  }
}

const post = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (post) { console.error(`FAIL — ${SRC} not restored:\n${post}`); process.exit(1); }

console.log(`\nran ${MUTATIONS.length} mutation(s) against scripts/check-slate-settle.mjs; each asserted its `
          + `anchor unique and applied before the verdict; ${SRC} restored clean`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');
