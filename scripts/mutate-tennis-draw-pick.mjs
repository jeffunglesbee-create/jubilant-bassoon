#!/usr/bin/env node
// Rule 90 for the run-time Draw-tab decision (A-TDRAW-16/17/18/22/23 in smoke.js).
//
// Those assertions decide whether a tournament gets a Draw tab from the rows on
// today's card (`round_name`, `status`), not from its name. A check that has only
// ever passed has proven nothing, so each mutation below breaks one thing the
// decision depends on and the named assertions must go red.
//
// MUTATES A COPY of index.html in a temp directory and runs `node smoke.js <copy>`.
// Nothing in the repo is written, so it runs on a dirty tree and cannot leave a
// mutated page behind. (index.html is what the assertions read: the script block is
// byte-identical to src/legacy/field.js after scripts/sync-source.mjs.)
//
// THE HARNESS CHECKS ITSELF FIRST, because NOT CAUGHT with no mutation applied is
// worse than no test (Rule 90's corollary):
//   - CONTROL: the unmutated copy must pass smoke with 0 failures, so a red can only
//     come from the mutation;
//   - every anchor must occur exactly once, and its replacement must be present in
//     the mutated text, or the run is a HARNESS DEFECT and says so.
//
// Coverage is printed (Rule 91): `ran N mutations, caught M of N`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'index.html');
const original = fs.readFileSync(SRC, 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mutate-tennis-draw-'));
const copy = path.join(tmp, 'index.html');

const runSmoke = (text) => {
  fs.writeFileSync(copy, text);
  try { return { code: 0, out: execFileSync('node', [path.join(ROOT, 'smoke.js'), copy], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) }; }
  catch (e) { return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` }; }
};
// smoke prints `  ❌ <label> — <detail>` for a failure; the ids are the first token of the label.
const redIds = (out) => out.split('\n').filter((l) => l.includes('❌')).map((l) => (/❌ (A-TDRAW-\d+(?:\/[A-Z0-9]+)?)/.exec(l) || [])[1]).filter(Boolean);

const PRED = '    if (!_tennisRowInMainDraw(m)) continue;\n';
const BODY = "  return _TENNIS_MAIN_DRAW_ROUNDS.includes(String(m?.round_name)) && String(m?.status) !== 'cancelled';";
const PICK = ['A-TDRAW-22/B', 'A-TDRAW-22/N1', 'A-TDRAW-22/R2'];
const MUTATIONS = [
  { name: 'M1  the predicate line is deleted from the pick (the exact line the fix added)',
    anchor: PRED, replace: '',
    expect: ['A-TDRAW-22/A1', 'A-TDRAW-22/A2', 'A-TDRAW-22/E', 'A-TDRAW-22/G', 'A-TDRAW-22/B2', 'A-TDRAW-22/D', 'A-TDRAW-22/H', 'A-TDRAW-22/J', 'A-TDRAW-17'] },
  { name: 'M2  a Davis Cup exclusion by name comes back',
    anchor: PRED, replace: PRED + "    if (/^(Davis Cup|Billie Jean King Cup Group I)$/.test(t.name || '')) continue;\n",
    expect: PICK },
  { name: 'M3  the predicate is always true',
    anchor: BODY, replace: '  return true;',
    expect: ['A-TDRAW-22/A1', 'A-TDRAW-22/A2', 'A-TDRAW-22/E', 'A-TDRAW-22/G', 'A-TDRAW-22/B2', 'A-TDRAW-22/D', 'A-TDRAW-22/H', 'A-TDRAW-22/J', 'A-TDRAW-17'] },
  { name: 'M4  the predicate is always false (the pick can never be non-null)',
    anchor: BODY, replace: '  return false;',
    expect: ['A-TDRAW-22/A3', 'A-TDRAW-22/B', 'A-TDRAW-22/F', 'A-TDRAW-22/I', 'A-TDRAW-22/N1', 'A-TDRAW-22/R2', 'A-TDRAW-17'] },
  { name: 'M5  cancelled rows count as main-draw matches',
    anchor: " && String(m?.status) !== 'cancelled';", replace: ';',
    expect: ['A-TDRAW-22/G', 'A-TDRAW-22/J', 'A-TDRAW-17'] },
  { name: 'M6  one round name is misspelled against the relay vocabulary (Quarterfinals -> Quarter-finals)',
    anchor: "                                  'Quarterfinals', 'Semifinals', 'Final'];", replace: "                                  'Quarter-finals', 'Semifinals', 'Final'];",
    expect: ['A-TDRAW-17', 'A-TDRAW-22/B', 'A-TDRAW-22/I', 'A-TDRAW-22/N1', 'A-TDRAW-22/R2'] },
  { name: 'M7  a named event is no longer rankable by default',
    anchor: '(_TENNIS_DRAW_NAMED_RANK[t.name] ?? 2) : null)', replace: '(_TENNIS_DRAW_NAMED_RANK[t.name]) : null)',
    expect: ['A-TDRAW-16', 'A-TDRAW-22/B', 'A-TDRAW-22/I', 'A-TDRAW-22/N1', 'A-TDRAW-22/R2'] },
  { name: 'M8  the Finals lose their rank-1 preference',
    anchor: "  'ATP Finals': 1, 'WTA Finals': 1,\n};", replace: "  'ATP Finals': 2, 'WTA Finals': 2,\n};",
    expect: ['A-TDRAW-16', 'A-TDRAW-22/K'] },
  { name: 'M9  the sentence "played as ties" comes back for an empty rounds array',
    anchor: "    host.innerHTML = `<div class=\"wct-loading\">${_tdtEsc(res.pick.name)} — today's card lists a main-draw match,`\n      + ` but the relay serves no main-draw round for ${_tdtEsc(d.season || 'this season')}${served}.</div>`;",
    replace: "    host.innerHTML = `<div class=\"wct-loading\">${_tdtEsc(res.pick.name)} is played as ties, not as a single draw — ${d.editionMatches} matches this season, none of them in a knockout round.</div>`;",
    expect: ['A-TDRAW-22/R1', 'A-TDRAW-18'] },
  { name: 'M10 the predicate is renamed away from the name the relay replay reads',
    anchor: 'function _tennisRowInMainDraw(m){', replace: 'function _rowInDraw(m){',
    expect: ['A-TDRAW-23', 'A-TDRAW-17'] },
  { name: 'M11 a picker declaration moves inside a function (no longer top-level)',
    anchor: 'const _TENNIS_DRAW_TIER_RANK = {', replace: 'if (true) { var _x = 0; }\n  const _TENNIS_DRAW_TIER_RANK = {',
    expect: ['A-TDRAW-23'] },
];

let harnessDefects = 0, notCaught = 0, caught = 0;
const control = runSmoke(original);
const controlRed = redIds(control.out);
const controlFailed = /(\d+) failed/.exec(control.out)?.[1];
console.log(`control (unmutated copy): smoke exit ${control.code}, ${controlFailed ?? '?'} failed`);
if (control.code !== 0 || controlFailed !== '0') {
  console.error(`HARNESS DEFECT — the control run is not green, so no red below would mean anything. Red: ${controlRed.join(', ') || '(unparsed)'}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}

for (const m of MUTATIONS) {
  const hits = original.split(m.anchor).length - 1;
  if (hits !== 1) { harnessDefects++; console.error(`  ANCHOR      ${m.name}\n              anchor occurs ${hits} time(s), expected 1. NOTHING WAS MUTATED: a harness defect, not a result.`); continue; }
  const mutated = original.replace(m.anchor, () => m.replace);
  if (mutated === original || !mutated.includes(m.replace)) { harnessDefects++; console.error(`  NOTAPPLIED  ${m.name}`); continue; }
  const r = runSmoke(mutated);
  const red = redIds(r.out);
  const missing = m.expect.filter((id) => !red.includes(id));
  if (r.code === 0 || missing.length) {
    notCaught++;
    console.error(`  NOT CAUGHT  ${m.name}\n              still green: ${missing.join(', ') || '(all of them; smoke exit 0)'}`);
  } else {
    caught++;
    console.log(`  caught      ${m.name}\n              red: ${red.join(', ')}`);
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
const after = fs.readFileSync(SRC, 'utf8');
if (after !== original) { console.error('FAIL: index.html changed during the run (it must not).'); process.exit(1); }
console.log(`\nran ${MUTATIONS.length} mutations, caught ${caught} of ${MUTATIONS.length}; each asserted its anchor unique and its effect present; a control run on the unmutated copy was green; index.html untouched.`);
if (notCaught) console.error(`${notCaught} NOT CAUGHT: those are the assertions' real coverage, measured, and a defect of the check.`);
if (harnessDefects) console.error(`${harnessDefects} harness defect(s).`);
process.exit(notCaught || harnessDefects ? 1 : 0);
