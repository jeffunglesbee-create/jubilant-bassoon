#!/usr/bin/env node
// Rule 90. A check that has only ever passed has proven nothing: each mutation breaks one clause of the late-opening
// rule in src/debrief/index.ts and the check must go red for that clause's reason.
// An anchor that is not unique, or a mutation that did not apply, is a harness defect and is reported as one.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SRC = 'src/debrief/index.ts';
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const dirty = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (dirty) { console.error(`FAIL — ${SRC} is dirty; refusing to mutate.\n${dirty}`); process.exit(1); }

const MUTATIONS = [
  { name: 'L1  buildOddsStory loses its guard',
    anchor: "  if (!odds?.opening) return null;\n  if (_openingCapturedLate(odds.opening)) return null;\n  const { opening, home, away, homeScore, awayScore, wentToOT } = odds;",
    replace: "  if (!odds?.opening) return null;\n  const { opening, home, away, homeScore, awayScore, wentToOT } = odds;",
    expect: 'story: opening captured 55 minutes after kickoff' },
  { name: 'L2  buildOddsMovement loses its guard',
    anchor: "  if (!odds?.opening) return null;\n  if (_openingCapturedLate(odds.opening)) return null;\n  const open = odds.opening, close = odds.closing;",
    replace: "  if (!odds?.opening) return null;\n  const open = odds.opening, close = odds.closing;",
    expect: 'movement: opening captured 55 minutes after kickoff' },
  { name: 'L3  the story guard reads the closing blob, which carries no mark',
    anchor: "  if (_openingCapturedLate(odds.opening)) return null;\n  const { opening, home,",
    replace: "  if (_openingCapturedLate(odds.closing)) return null;\n  const { opening, home,",
    expect: 'story: opening captured 55 minutes after kickoff' },
  { name: 'L4  the movement guard reads the closing blob, which carries no mark',
    anchor: "  if (_openingCapturedLate(odds.opening)) return null;\n  const open = odds.opening,",
    replace: "  if (_openingCapturedLate(odds.closing)) return null;\n  const open = odds.opening,",
    expect: 'movement: opening captured 55 minutes after kickoff' },
  { name: 'L5  the predicate is verified === false, which also hides an unreadable kickoff',
    anchor: "  return typeof n === 'number' && Number.isFinite(n);",
    replace: "  return open?._kickoff?.verified === false;",
    expect: 'kickoff unreadable' },
  { name: 'L6  the predicate is truthiness, which misses a capture at the kickoff instant (0)',
    anchor: "  return typeof n === 'number' && Number.isFinite(n);",
    replace: "  return !!n;",
    expect: 'kickoff instant' },
  { name: 'L7  the predicate is never true',
    anchor: "  return typeof n === 'number' && Number.isFinite(n);",
    replace: "  return false && typeof n === 'number';",
    expect: 'opening captured 55 minutes after kickoff' },
  { name: 'L8  the predicate is always true, which hides every opening',
    anchor: "  return typeof n === 'number' && Number.isFinite(n);",
    replace: "  return true || typeof n === 'number';",
    expect: 'opening verified before kickoff' },
  { name: 'L9  the predicate reads the mark off the wrong key',
    anchor: "const n = open?._kickoff?.late_minutes;",
    replace: "const n = open?._kickoff?.lateMinutes;",
    expect: 'opening captured 55 minutes after kickoff' },
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
  if (after === before || !after.includes(m.replace)) { bad++; console.error(`  NOTAPPLIED  ${m.name}`); sh('git', ['checkout', '--', SRC]); continue; }

  let out = '', code = 0;
  try { out = sh('node', ['--experimental-strip-types', '--no-warnings', 'scripts/check-opening-odds-late.mjs']); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  sh('git', ['checkout', '--', SRC]);

  const fails = out.match(/^ {2}FAIL {2}.*$/gm) || [];
  if (code === 0) { bad++; console.error(`  NOT CAUGHT  ${m.name}\n          the check still passed.`); }
  else if (!fails.length) { bad++; console.error(`  CRASH  ${m.name}\n          exit ${code} with no FAIL line (a harness or syntax error, not a catch). Output:\n${out}`); }
  else if (!fails.some(l => l.includes(m.expect))) {
    bad++; console.error(`  WRONG REASON  ${m.name}\n          failed, but no FAIL line mentioned "${m.expect}". Output:\n${out}`);
  } else console.log(`  caught  ${m.name}\n          by "${m.expect}" (${fails.length} case(s) went red)`);
}

const post = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (post) { console.error(`FAIL — ${SRC} not restored:\n${post}`); process.exit(1); }
console.log(`\nran ${MUTATIONS.length} mutation(s) against scripts/check-opening-odds-late.mjs; each asserted its anchor unique `
          + `and its effect present before the verdict; ${SRC} restored clean`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');
