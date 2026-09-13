#!/usr/bin/env node
// Rule 90 for the section-label / injector-coverage check. The first mutation
// removes the bundesliga call site and reproduces the live defect exactly as it
// stood for two days: a FIELD_V2_SOURCES key whose games reach espnScores and
// render nothing, while the previous version of this check printed
// "6 key(s) have no injector" and PASSED.
//
// Anchor discipline: exactly-one-match asserted, replacement confirmed on disk,
// `git checkout --` to restore. Only field.js is mutated, so index.html is not
// touched and no sync is needed.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SRC = 'src/legacy/field.js';
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const dirty = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (dirty) { console.error(`FAIL — ${SRC} is dirty; refusing to mutate.\n${dirty}`); process.exit(1); }

const MUTATIONS = [
  { name: 'L1  the bundesliga call site is removed — the defect as it shipped',
    anchor: "  if (FIELD_V2_SOURCES.bundesliga) injectV2SportSection('bundesliga', 'Bundesliga');\n",
    replace: '',
    expect: 'NO INJECTOR bundesliga' },
  { name: 'L2  a call site label drifts from the map',
    anchor: "injectV2SportSection('seriea',   'Serie A')",
    replace: "injectV2SportSection('seriea',   'Serie A ')",
    expect: 'DRIFT     seriea' },
  { name: 'L3  a sport key loses its label',
    anchor: "  afl: 'Australian Football (AFL)', bundesliga: 'Bundesliga',",
    replace: "  bundesliga: 'Bundesliga',",
    expect: 'UNLABELLED afl' },
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
  const after = fs.readFileSync(SRC, 'utf8');
  // For a deletion the replacement is empty, so "is it present" is meaningless:
  // assert the ANCHOR is gone instead. A harness that cannot tell these apart
  // reports NOT CAUGHT on a mutation it never applied.
  const applied = m.replace === '' ? !after.includes(m.anchor) : after.includes(m.replace);
  if (!applied) {
    bad++; console.error(`  NOTAPPLIED  ${m.name}`);
    sh('git', ['checkout', '--', SRC]); continue;
  }

  let out = '', code = 0;
  try { out = sh('node', ['scripts/check-v2-section-labels.mjs']); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  sh('git', ['checkout', '--', SRC]);

  if (code === 0) { bad++; console.error(`  NOT CAUGHT  ${m.name}\n          check-v2-section-labels still passed.`); }
  else if (!out.includes(m.expect)) {
    bad++; console.error(`  WRONG REASON  ${m.name}\n          failed, but not on "${m.expect}". Output:\n${out}`);
  } else {
    console.log(`  caught  ${m.name}\n          by "${m.expect}"`);
  }
}

const post = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (post) { console.error(`FAIL — ${SRC} not restored:\n${post}`); process.exit(1); }
console.log(`\nran ${MUTATIONS.length} mutation(s) against scripts/check-v2-section-labels.mjs; each asserted its `
          + `anchor unique and its effect present before the verdict; ${SRC} restored clean`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');
