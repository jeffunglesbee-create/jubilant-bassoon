#!/usr/bin/env node
// Rule 90 for injectV2SportSection. The first mutation is the defect itself:
// delete the else that was missing until 2026-09-12 and confirm the check goes
// red — a test for a restored branch that cannot detect the branch's absence
// would be worth nothing, and this one existed only after the fix.
//
// Anchor discipline: exactly-one-match asserted, the replacement confirmed in
// field.js AND in index.html after sync, `git checkout --` to restore. A
// NOT CAUGHT with nothing mutated is worse than no test.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SRC = 'src/legacy/field.js';
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const dirty = sh('git', ['status', '--porcelain', '--', SRC, 'index.html']).trim();
if (dirty) { console.error(`FAIL — working tree is dirty; refusing to mutate.\n${dirty}`); process.exit(1); }

const MUTATIONS = [
  { name: 'I1  the else is removed — the defect exactly as it shipped',
    anchor: "      captureFieldError(`v2-section-inject:no-target:${sportKey}`,",
    replace: "      void 0; ((_unused) => _unused)(",
    expect: 'allData is null: the failure is captured by sport name' },
  { name: 'I2  the memo is set even on the no-target path',
    anchor: "                + `, sports=${Array.isArray(allData?.sports) ? 'array' : typeof allData?.sports}`), true);",
    replace: "                + `, sports=${Array.isArray(allData?.sports) ? 'array' : typeof allData?.sports}`), true);\n      _v2SectionInjected[sportKey] = true;",
    expect: 'allData is null: the memo does NOT claim success' },
  { name: 'I3  the empty-sport early return is dropped — no games becomes a failure',
    anchor: '    if (!keys.length) return;',
    replace: '    if (!keys.length && false) return;',
    expect: 'nothing is pushed' },
  { name: 'I4  the merge branch pushes instead — a duplicate section',
    anchor: '    const existing = allData?.sports?.find(s => s.section === sectionLabel || s.sport === sectionLabel);',
    replace: '    const existing = null;',
    expect: 'no duplicate section' },
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
  let syncErr = '';
  try { sh('node', ['scripts/sync-source.mjs']); } catch (e) { syncErr = String(e.stdout || e.message); }
  const applied = fs.readFileSync(SRC, 'utf8').includes(m.replace)
               && fs.readFileSync('index.html', 'utf8').includes(m.replace.trim().split('\n')[0]);
  if (!applied) {
    bad++; console.error(`  NOTAPPLIED  ${m.name}\n          did not reach index.html. ${syncErr}`);
    sh('git', ['checkout', '--', SRC, 'index.html']); continue;
  }

  let out = '', code = 0;
  try { out = sh('node', ['scripts/check-v2-section-inject.mjs']); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  sh('git', ['checkout', '--', SRC, 'index.html']);

  if (code === 0) { bad++; console.error(`  NOT CAUGHT  ${m.name}\n          check-v2-section-inject still passed.`); }
  // Match the FAIL LINE containing the expectation, not `FAIL  ` + the text:
  // assertion labels carry a case prefix (`2 `, `3a `) that the expectation
  // does not repeat. The first version required an exact join and reported
  // WRONG REASON on all four mutations while every check was in fact red on
  // exactly the right assertion — a harness defect that reads as a product
  // defect, which is the failure mode this file's own header warns about.
  else if (!(out.match(/^ {2}FAIL {2}.*$/gm) || []).some(l => l.includes(m.expect))) {
    bad++; console.error(`  WRONG REASON  ${m.name}\n          failed, but no FAIL line for "${m.expect}". Output:\n${out}`);
  } else {
    const n = (out.match(/^ {2}FAIL {2}/gm) || []).length;
    console.log(`  caught  ${m.name}\n          by "${m.expect}" (${n} assertion(s) went red)`);
  }
}

const post = sh('git', ['status', '--porcelain', '--', SRC, 'index.html']).trim();
if (post) { console.error(`FAIL — tree not restored:\n${post}`); process.exit(1); }
console.log(`\nran ${MUTATIONS.length} mutation(s) against scripts/check-v2-section-inject.mjs; each asserted its `
          + `anchor unique and its replacement present in index.html before the verdict; tree restored clean`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');
