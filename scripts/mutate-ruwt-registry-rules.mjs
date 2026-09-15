#!/usr/bin/env node
// Rule 90 for the three rule-registry entries the relay's staleness monitor has
// been reporting as UNEXERCISED — rule-92, rule-93, rule-94, all three at 65.8
// days as of 2026-09-15.
//
// UNEXERCISED does not mean unchecked. Each rule names a smoke assertion that
// has passed every run since it was written:
//
//   rule-92  A483  _otwFindWCLiveGame uses categorical tiers, not a composite score
//   rule-93  A482  getOTWMomentum reads score snapshots, not drama history
//   rule-94  A485  window._fieldDataReady is set after the first renderAll()
//
// It means no one has ever made them fail. A check that has only ever passed
// has proven nothing: it may be asserting the right thing, or it may be unable
// to match the code it is aimed at, and from the outside those are identical.
//
// MUTATES index.html, NOT src/legacy/field.js. field.js is the edit target for
// real changes (CLAUDE.md), but these three assertions read `html` — the
// contents of index.html — and a harness that mutates something the assertion
// does not read would prove nothing about the assertion. Restored via
// `git checkout` and the restoration is verified.
//
// EACH MUTATION IS A REGRESSION OF THE RULE, not of a string. Where the rule
// can be broken while the assertion still passes, that is the finding, and it
// is reported as NOT CAUGHT rather than quietly dropped.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SRC = 'index.html';
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const dirty = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (dirty) { console.error(`FAIL — ${SRC} is dirty; refusing to mutate.\n${dirty}`); process.exit(1); }

const MUTATIONS = [
  // ── rule-93 / A482 ──────────────────────────────────────────────────────
  // THE ACTUAL RULE VIOLATION: momentum read from the drama history instead of
  // the score-change log. This is the exact thing the rule forbids.
  { rule: 'rule-93', name: 'R1  getOTWMomentum reads drama history instead of the score log',
    anchor: "    const key = SCORE_SNAP_KEY + gameId;\n    const log = JSON.parse(localStorage.getItem(key) || '[]');\n    if (log.length < 2) return null; // need at least one score change",
    replace: "    const key = 'field_drama_history_' + gameId;\n    const log = JSON.parse(localStorage.getItem(key) || '[]');\n    if (log.length < 2) return null; // need at least one score change",
    expect: 'A482' },

  { rule: 'rule-93', name: 'R2  the score-snapshot recorder is renamed away',
    anchor: 'function recordScoreSnapshot(',
    replace: 'function recordSnap(',
    expect: 'A482' },

  { rule: 'rule-93', name: 'R3  the binary-observable comment is deleted',
    anchor: 'did scoring happen recently',
    replace: 'momentum heuristic',
    expect: 'A482' },

  // ── rule-92 / A483 ──────────────────────────────────────────────────────
  // THE ACTUAL RULE VIOLATION: a composite numerical score replaces the tier
  // walk. The assertion's negative clause pins one historical literal.
  { rule: 'rule-92', name: 'R4  a composite score returns, under a different number',
    anchor: '  let bestTier = 99, bestElapsed = -1, best = null;',
    replace: '  let sel = 60, bestElapsed = -1, best = null;\n  let bestTier = 99;',
    expect: 'A483' },

  { rule: 'rule-92', name: 'R5  the categorical-tiers comment is deleted',
    anchor: 'strict categorical tiers, no mathematical combination',
    replace: 'tier selection',
    expect: 'A483' },

  // ── rule-94 / A485 ──────────────────────────────────────────────────────
  // THE ACTUAL RULE VIOLATION: the sentinel fires BEFORE the first render, so
  // Playwright resolves its wait against an empty page. The assertion's own
  // text says "set after first renderAll" — this is what it claims to catch.
  { rule: 'rule-94', name: 'R6  the sentinel moves BEFORE the first renderAll',
    anchor: "  renderAll();\n  // Sentinel for Playwright test optimization: tests waitForFunction(() => window._fieldDataReady)\n  // instead of waitForTimeout(15000). Typically resolves in ~1.5s not 15s.\n  window._fieldDataReady = Date.now();",
    replace: "  window._fieldDataReady = Date.now();\n  renderAll();\n  // Sentinel for Playwright test optimization: tests waitForFunction(() => window._fieldDataReady)\n  // instead of waitForTimeout(15000). Typically resolves in ~1.5s not 15s.",
    expect: 'A485' },

  { rule: 'rule-94', name: 'R7  the sentinel is removed entirely',
    anchor: '  window._fieldDataReady = Date.now();',
    replace: '',
    expect: 'A485' },
];

let notCaught = [], bad = 0;
for (const m of MUTATIONS) {
  const before = fs.readFileSync(SRC, 'utf8');
  const hits = before.split(m.anchor).length - 1;
  if (hits !== 1) {
    bad++;
    console.error(`  ANCHOR  ${m.name}\n          anchor occurs ${hits} time(s), expected 1. NOTHING WAS MUTATED — harness defect, not a result.`);
    continue;
  }
  fs.writeFileSync(SRC, before.replace(m.anchor, m.replace));
  const after = fs.readFileSync(SRC, 'utf8');
  const applied = m.replace === '' ? !after.includes(m.anchor) : after.includes(m.replace);
  if (!applied) { bad++; console.error(`  NOTAPPLIED  ${m.name}`); sh('git', ['checkout', '--', SRC]); continue; }

  let out = '', code = 0;
  try { out = sh('node', ['smoke.js', 'index.html']); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  sh('git', ['checkout', '--', SRC]);

  // SMOKE DOES NOT PRINT THE WORD "FAIL" ON AN ASSERTION LINE. It prints
  // `❌ A485 — ...`, and only the summary says "N failed". The first version of
  // this harness filtered for /FAIL/i and therefore reported 7 of 7 NOT CAUGHT —
  // including removing the sentinel outright, which smoke catches in one line.
  // Every verdict was a harness defect wearing the costume of a finding, which
  // is precisely what Rule 90's corollary warns a mutation script can become.
  const named = out.split('\n').filter(l => l.includes('❌') && l.includes(m.expect));
  if (code === 0 || !named.length) {
    notCaught.push(m);
    console.error(`  NOT CAUGHT  [${m.rule}] ${m.name}\n              ${m.expect} still passed. The rule is broken and the check does not say so.`);
  } else {
    console.log(`  caught  [${m.rule}] ${m.name}\n          by ${m.expect}`);
  }
}

const post = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (post) { console.error(`FAIL — ${SRC} not restored:\n${post}`); process.exit(1); }

console.log(`\nran ${MUTATIONS.length} mutation(s) against smoke.js; each asserted its anchor unique`);
console.log(`and its effect present before the verdict; ${SRC} restored clean.`);
if (notCaught.length) {
  console.error(`\n${notCaught.length} of ${MUTATIONS.length} NOT CAUGHT:`);
  for (const m of notCaught) console.error(`  [${m.rule}] ${m.name}`);
  console.error(`\nThese are the assertions' real coverage, measured rather than assumed.`);
}
if (bad) { console.error(`\nFAIL — ${bad} harness defect(s).`); process.exit(1); }
process.exit(notCaught.length ? 1 : 0);
