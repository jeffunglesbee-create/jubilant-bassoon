#!/usr/bin/env node
// Rule 90 (MUTATE-FIRST-A): the checks guarding the past-date slate have only
// ever passed. A check that cannot be made to fail has proven nothing, and
// "passes" and "cannot match the code it is aimed at" look identical from
// outside. Each mutation below breaks exactly one property and names the
// check + assertion that must go red.
//
// The harness's own failure mode is the one this repo has already been bitten
// by: reporting NOT CAUGHT while nothing was actually mutated. So before any
// verdict, every mutation asserts (a) its anchor occurs EXACTLY ONCE in
// field.js, and (b) the replacement is present in field.js afterwards AND in
// index.html after sync. Only then is a passing check a real miss.
//
// Restore is `git checkout --`, never a cp of a pre-read copy: a cp leaves
// index.html diverged from its last commit, sync-source's guard then blocks,
// and the check reads a stale artifact — which is how a previous run in this
// project produced a meaningless NOT CAUGHT.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SRC = 'src/legacy/field.js';
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// A dirty tree means `git checkout --` would destroy uncommitted work, and
// means the thing being mutated is not the thing that was committed.
const dirty = sh('git', ['status', '--porcelain', '--', SRC, 'index.html', 'sw.js']).trim();
if (dirty) { console.error(`FAIL — working tree is dirty; refusing to mutate.\n${dirty}`); process.exit(1); }

const restore = () => sh('git', ['checkout', '--', SRC, 'index.html']);

const MUTATIONS = [
  {
    name: 'M1  V2_SECTION_LABEL loses afl — an enabled sport with no label',
    anchor: "  afl: 'Australian Football (AFL)', bundesliga: 'Bundesliga',",
    replace: "  bundesliga: 'Bundesliga',",
    check: ['node', ['scripts/check-v2-section-labels.mjs']],
    expect: 'UNLABELLED afl',
  },
  {
    name: 'M2  allSettled reverts to all — one sport rejecting blanks them all',
    anchor: '  const settled = (await Promise.allSettled(enabled.map(async key => {',
    replace: '  const settled = (await Promise.all(enabled.map(async key => {',
    check: ['node', ['scripts/check-relay-date-sections.mjs']],
    expect: '2b the other two sports still render',
  },
  {
    name: 'M3  the empty day returns [] instead of null — a blank slate',
    anchor: '  return sections.length ? sections : null;',
    replace: '  return sections;',
    check: ['node', ['scripts/check-relay-date-sections.mjs']],
    expect: '3a every sport empty returns null',
  },
  {
    name: 'M4  the no-label guard is removed — the sport vanishes silently',
    anchor: "    if (!label) { captureFieldError('relay-date-sections:no-label', new Error(key), false); return null; }",
    replace: '    if (!label) { return null; }',
    check: ['node', ['scripts/check-relay-date-sections.mjs']],
    expect: '4b the unlabelled key is captured by name',
  },
];

let bad = 0;
for (const m of MUTATIONS) {
  const before = fs.readFileSync(SRC, 'utf8');
  const hits = before.split(m.anchor).length - 1;
  if (hits !== 1) {
    bad++; console.error(`  ANCHOR  ${m.name}\n          anchor occurs ${hits} time(s), expected exactly 1. NOTHING WAS MUTATED — this is a harness defect, not a result.`);
    continue;
  }
  fs.writeFileSync(SRC, before.replace(m.anchor, m.replace));

  // The mutation must reach BOTH the source and the artifact the checks read.
  let applied = false, syncErr = '';
  try { sh('node', ['scripts/sync-source.mjs']); } catch (e) { syncErr = String(e.stdout || e.message); }
  applied = fs.readFileSync(SRC, 'utf8').includes(m.replace)
         && fs.readFileSync('index.html', 'utf8').includes(m.replace.trim());
  if (!applied) {
    bad++; console.error(`  NOTAPPLIED ${m.name}\n          mutation did not reach index.html. ${syncErr}`);
    restore(); continue;
  }

  let out = '', code = 0;
  try { out = sh(m.check[0], m.check[1]); } catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  restore();

  if (code === 0) { bad++; console.error(`  NOT CAUGHT  ${m.name}\n          ${m.check[1][0]} still passed with the mutation applied.`); }
  else if (!out.includes(m.expect)) { bad++; console.error(`  WRONG REASON  ${m.name}\n          failed, but not on "${m.expect}". Output:\n${out}`); }
  else { console.log(`  caught  ${m.name}\n          by ${m.check[1][0]} on "${m.expect}"`); }
}

const post = sh('git', ['status', '--porcelain', '--', SRC, 'index.html']).trim();
if (post) { console.error(`FAIL — tree not restored after mutating:\n${post}`); process.exit(1); }

console.log(`\nran ${MUTATIONS.length} mutation(s) against 2 check script(s); each asserted its anchor unique `
          + `and its replacement present in index.html before the verdict was read; tree restored clean`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');
