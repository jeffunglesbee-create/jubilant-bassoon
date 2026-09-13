#!/usr/bin/env node
// Rule 90. The first mutation removes the absent-score guard and reproduces the
// defect exactly as it shipped — a test for a guard that cannot detect the
// guard's absence is worth nothing, and this one was written after the fix.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SRC = 'src/debrief/index.ts';
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const dirty = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (dirty) { console.error(`FAIL — ${SRC} is dirty; refusing to mutate.\n${dirty}`); process.exit(1); }

const MUTATIONS = [
  { name: 'O1  the absent-score guard is removed — the defect as it shipped',
    anchor: '  if (homeScore == null || awayScore == null) return null;\n',
    replace: '',
    expect: 'both scores null' },
  { name: 'O2  the guard uses === null, missing undefined',
    anchor: 'if (homeScore == null || awayScore == null) return null;',
    replace: 'if (homeScore === null || awayScore === null) return null;',
    expect: 'both scores undefined' },
  { name: 'O3  the guard checks only one side',
    anchor: 'if (homeScore == null || awayScore == null) return null;',
    replace: 'if (homeScore == null) return null;',
    expect: 'away score undefined, home real' },
  { name: 'O4  the OT clause is dropped from the SWEAT test',
    anchor: "const scenario = !favWon ? 'UPSET' : (margin <= 1 || wentToOT) ? 'SWEAT' : 'CHALK';",
    replace: "const scenario = !favWon ? 'UPSET' : (margin <= 1) ? 'SWEAT' : 'CHALK';",
    expect: 'favourite wins, went to OT' },
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
  // A deletion has an empty replacement, so "is it present" is meaningless —
  // assert the anchor is GONE instead.
  const applied = m.replace === '' ? !after.includes(m.anchor) : after.includes(m.replace);
  if (!applied) { bad++; console.error(`  NOTAPPLIED  ${m.name}`); sh('git', ['checkout', '--', SRC]); continue; }

  let out = '', code = 0;
  try { out = sh('node', ['--experimental-strip-types', '--no-warnings', 'scripts/check-odds-story-scenario.mjs']); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  sh('git', ['checkout', '--', SRC]);

  if (code === 0) { bad++; console.error(`  NOT CAUGHT  ${m.name}\n          the check still passed.`); }
  else if (!(out.match(/^ {2}FAIL {2}.*$/gm) || []).some(l => l.includes(m.expect))) {
    bad++; console.error(`  WRONG REASON  ${m.name}\n          failed, but no FAIL line mentioned "${m.expect}". Output:\n${out}`);
  } else {
    const n = (out.match(/^ {2}FAIL {2}/gm) || []).length;
    console.log(`  caught  ${m.name}\n          by "${m.expect}" (${n} case(s) went red)`);
  }
}

const post = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (post) { console.error(`FAIL — ${SRC} not restored:\n${post}`); process.exit(1); }
console.log(`\nran ${MUTATIONS.length} mutation(s) against scripts/check-odds-story-scenario.mjs; each asserted its `
          + `anchor unique and its effect present before the verdict; ${SRC} restored clean`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');
