#!/usr/bin/env node
// Rule 90 harness for scripts/check-forward-window-judge.mjs.
//
// Each mutation breaks one clause of the judge (or of the probe's wiring) in a COPY of the file, points the check at
// the copy through JUDGE_SRC / PROBE_SRC, and requires the check to go red on that clause's own FAIL line. The real
// files are never written.
//
// A mutation counts as CAUGHT only when the check exits non-zero AND prints a FAIL line AND that line names the clause.
// An anchor that is not unique, a mutation that did not apply, or a crash with no FAIL line is a harness defect and is
// reported as one (NOT CAUGHT with nothing mutated is worse than no test).
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const JUDGE = 'scripts/forward-window-judge.cjs';
const PROBE = 'forward_window_probe.js';
const MUT_JUDGE = 'scripts/__mut_forward_window_judge__.cjs';
const MUT_PROBE = 'scripts/__mut_forward_window_probe__.js';

const WRITE_CALL = ['  fs.writeFileSync(`${OUT}/forward-window', '-manifest-latest.json`, JSON.stringify(manifest, null, 2));\n'].join('');

const MUTATIONS = [
  // ── the MLB clause ──
  { name: 'J1  ESPN listing games is never a problem',
    file: 'judge', anchor: 'if (listed.length) {', replace: 'if (false) {',
    expect: 'dropped: ESPN lists 2 games' },
  { name: 'J2  total 0 is a pass without asking ESPN (the "0 is fine" loosening)',
    file: 'judge', anchor: '} else if (total === 0) {', replace: '} else if (total === 0 && false) {',
    expect: 'dropped: ESPN lists 2 games' },
  { name: 'J3  total 0 is always a problem (the rule before this change)',
    file: 'judge', anchor: "    const counts = (espn && espn.counts) || {};\n    const errors",
    replace: "    problems.push('every forward day carried 0 MLB entries');\n    const counts = (espn && espn.counts) || {};\n    const errors",
    expect: 'off-season: 0 in the window and 0 on ESPN for every date passes' },
  { name: 'J4  ESPN is consulted when the window carries MLB entries',
    file: 'judge', anchor: '} else if (total === 0) {', replace: '} else if (total >= 0) {',
    expect: 'in season: 3 MLB entries passes without ESPN' },
  { name: 'J5  a date ESPN was not asked about is not counted as unasked',
    file: 'judge', anchor: 'mlb.unasked = dates.filter((iso) => !isCount(counts[iso]));',
    replace: 'mlb.unasked = dates.filter((iso) => counts[iso] === undefined);',
    expect: 'unverifiable: one date failed' },
  { name: 'J6  any number >= 0 is a count, so a string "0" and null are zeros',
    file: 'judge', anchor: 'const isCount = (n) => Number.isInteger(n) && n >= 0;', replace: 'const isCount = (n) => n >= 0;',
    expect: 'a count of the string "0"' },
  { name: 'J7  a negative integer is a count',
    file: 'judge', anchor: 'const isCount = (n) => Number.isInteger(n) && n >= 0;', replace: 'const isCount = (n) => Number.isInteger(n);',
    expect: 'a count of -1' },
  { name: 'J8  a zero on ESPN counts as listing games',
    file: 'judge', anchor: 'counts[iso] > 0);', replace: 'counts[iso] >= 0);',
    expect: 'off-season: 0 in the window and 0 on ESPN for every date passes' },
  { name: 'J9  the unverifiable problem names every date, not the ones that failed',
    file: 'judge', anchor: 'const why = mlb.unasked.map((iso)', replace: 'const why = dates.map((iso)',
    expect: 'one date failed -> FAIL naming that date' },
  { name: 'J10 an empty day list is not unverifiable',
    file: 'judge', anchor: 'if (dates.length === 0 || mlb.unasked.length) {', replace: 'if (mlb.unasked.length) {',
    expect: 'no forward day read and total 0' },
  { name: 'J11 the NOT MEASURED note is never issued',
    file: 'judge', anchor: '        notes.push(', replace: '        void (',
    expect: 'off-season: reported as NOT MEASURED' },
  { name: 'J12 an unreadable windowMlbTotal passes',
    file: 'judge', anchor: "if (typeof total !== 'number' || !Number.isFinite(total)) {", replace: 'if (false) {',
    expect: 'windowMlbTotal missing' },
  // ── what the probe asserted before stays asserted ──
  { name: 'J13 a cache that was never accepted passes',
    file: 'judge', anchor: 'if (!m.cacheAccepted)\n    problems.push(', replace: 'if (false)\n    problems.push(',
    expect: 'cache never accepted' },
  { name: 'J14 schema is not checked',
    file: 'judge', anchor: "if (m.schema !== '2.1')", replace: 'if (false)',
    expect: 'schema 2.0' },
  { name: 'J15 a window of one date is enough',
    file: 'judge', anchor: 'm.window_dates.length < 2', replace: 'm.window_dates.length < 1',
    expect: 'window_dates of length 1' },
  { name: 'J16 a forward day that did not reach the client passes',
    file: 'judge', anchor: 'if (!d.windowHasDay)', replace: 'if (false)',
    expect: 'one forward day not reaching the client' },
  { name: 'J17 no forward day read passes (an empty loop)',
    file: 'judge', anchor: '  if (days.length === 0)\n    problems.push(', replace: '  if (false)\n    problems.push(',
    expect: 'no forward day read -> FAIL' },
  { name: 'J18 the first failed clause ends the judgement',
    file: 'judge', anchor: "  if (m.schema !== '2.1')\n", replace: "  if (!m.cacheAccepted) return { problems, notes, mlb };\n  if (m.schema !== '2.1')\n",
    expect: 'every clause that failed is reported' },
  { name: 'J19 a NOT MEASURED window ends the judgement before the cache and schema are reported',
    file: 'judge', anchor: "        mlb.state = 'not-measured';\n", replace: "        mlb.state = 'not-measured';\n        problems.length = 0;\n",
    expect: 'does not mask a failed cache or schema' },
  // ── askEspnMlb ──
  { name: 'E1  a non-OK response is read as its body',
    file: 'judge', anchor: '      if (!res.ok) throw new Error(`HTTP ${res.status}`);\n', replace: '',
    expect: 'HTTP 503 is null with the error recorded' },
  { name: 'E2  a body with no events array is read by its length',
    file: 'judge', anchor: '!body || !Array.isArray(body.events)', replace: '!body',
    expect: 'a body of {events: "none"}' },
  { name: 'E3  a failed date is recorded as 0',
    file: 'judge', anchor: '      out.counts[iso] = null;\n', replace: '      out.counts[iso] = 0;\n',
    expect: 'HTTP 503 is null with the error recorded' },
  { name: 'E4  the error is not recorded',
    file: 'judge', anchor: '      out.errors[iso] = String((e && e.message) || e).slice(0, 200);\n', replace: '',
    expect: 'HTTP 503 is null with the error recorded' },
  { name: 'E5  only the first date is asked',
    file: 'judge', anchor: 'for (const iso of isoDays) {', replace: 'for (const iso of isoDays.slice(0, 1)) {',
    expect: 'one request per date' },
  { name: 'E6  the date is sent with its dashes',
    file: 'judge', anchor: "iso.replace(/-/g, '')", replace: 'iso',
    expect: 'one request per date' },
  { name: 'E7  a different league is asked',
    file: 'judge', anchor: '/baseball/mlb/scoreboard', replace: '/basketball/nba/scoreboard',
    expect: 'one request per date' },
  { name: 'E8  a failed date stops the remaining dates being asked',
    file: 'judge', anchor: '      out.counts[iso] = null;\n', replace: '      out.counts[iso] = null;\n      break;\n',
    expect: 'a failed date does not stop the other dates' },
  // ── the probe's wiring ──
  { name: 'P1  the probe judges nothing',
    file: 'probe', anchor: 'const verdict = judgeForwardWindow(manifest, espn);', replace: 'const verdict = { problems: [], notes: [], mlb: null };',
    expect: "probe: the verdict is the judge's" },
  { name: 'P2  the probe never asks ESPN',
    file: 'probe', anchor: 'const espn = windowMlbTotal === 0 ? await askEspnMlb(isoDays, fetch) : null;', replace: 'const espn = null;',
    expect: 'probe: ESPN is asked before the manifest is judged and written' },
  { name: 'P3  the probe asks ESPN every run',
    file: 'probe', anchor: 'windowMlbTotal === 0 ? await askEspnMlb(isoDays, fetch) : null', replace: 'await askEspnMlb(isoDays, fetch)',
    expect: 'probe: ESPN is asked only when the window is empty' },
  { name: 'P4  the written manifest carries no verdict',
    file: 'probe', anchor: '  manifest.verdict = verdict;\n', replace: '',
    expect: 'probe: the manifest that is written carries the verdict' },
  { name: 'P5  the verdict is attached after the manifest is written',
    file: 'probe', anchor: `  manifest.verdict = verdict;\n\n  fs.mkdirSync(OUT, { recursive: true });\n${WRITE_CALL}`,
    replace: `  fs.mkdirSync(OUT, { recursive: true });\n${WRITE_CALL}  manifest.verdict = verdict;\n`,
    expect: 'probe: the manifest that is written carries the verdict' },
  { name: 'P6  the ESPN reading is not written',
    file: 'probe', anchor: '    espnMlb: espn,\n', replace: '',
    expect: 'probe: the manifest that is written carries the verdict and the ESPN reading' },
  { name: 'P7  the exit code ignores the verdict',
    file: 'probe', anchor: 'if (verdict.problems.length) {', replace: 'if (false) {',
    expect: 'probe: the exit code follows the verdict' },
  { name: 'P8  the old rule is reinstated beside the judge',
    file: 'probe', anchor: '  manifest.verdict = verdict;\n',
    replace: "  manifest.verdict = verdict;\n  if (manifest.windowMlbTotal === 0) verdict.problems.push('every forward day carried 0 MLB entries — the window is present but empty');\n",
    expect: 'probe: the old rule (any 0 is a problem) is gone' },
  { name: 'P9  an inline copy of a clause is reinstated beside the judge',
    file: 'probe', anchor: '  manifest.verdict = verdict;\n',
    replace: "  manifest.verdict = verdict;\n  const problems = []; if (!manifest.cacheAccepted) problems.push('x');\n",
    expect: 'probe: no inline copy of the cache/schema/window rules remains' },
];

let bad = 0;
const cleanup = () => { for (const f of [MUT_JUDGE, MUT_PROBE]) { try { unlinkSync(f); } catch { /* not created */ } } };
process.on('exit', cleanup);

for (const m of MUTATIONS) {
  const orig = m.file === 'judge' ? JUDGE : PROBE;
  const mut = m.file === 'judge' ? MUT_JUDGE : MUT_PROBE;
  const before = readFileSync(orig, 'utf8');
  const hits = before.split(m.anchor).length - 1;
  if (hits !== 1) { bad++; console.error(`  ANCHOR  ${m.name}\n          anchor occurs ${hits} time(s), expected 1. NOTHING WAS MUTATED — harness defect, not a result.`); continue; }
  const after = before.replace(m.anchor, () => m.replace);
  if (after === before) { bad++; console.error(`  NO EFFECT  ${m.name}`); continue; }
  writeFileSync(mut, after);
  const env = { ...process.env,
    JUDGE_SRC: m.file === 'judge' ? MUT_JUDGE : JUDGE,
    PROBE_SRC: m.file === 'probe' ? MUT_PROBE : PROBE };
  let out = '', code = 0;
  try { out = execFileSync('node', ['scripts/check-forward-window-judge.mjs'], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  finally { cleanup(); }
  const red = out.split('\n').filter((l) => /^\s*FAIL {2}/.test(l));
  if (code === 0) { bad++; console.error(`  NOT CAUGHT  ${m.name}\n          the check still passed.`); }
  else if (!red.length) { bad++; console.error(`  CRASH  ${m.name}\n          exit ${code} with no FAIL line (a harness or syntax error, not a catch). Output tail:\n${out.slice(-500)}`); }
  else if (!red.some((l) => l.includes(m.expect))) { bad++; console.error(`  WRONG REASON  ${m.name}\n          no FAIL line mentioned "${m.expect}". Red lines:\n${red.join('\n')}`); }
  else console.log(`  caught  ${m.name}\n          by "${m.expect}" (${red.length} red)`);
}

// The unmutated check must be green, or every "caught" above could be the check failing for its own reasons.
let base = 0;
try { execFileSync('node', ['scripts/check-forward-window-judge.mjs'], { stdio: 'ignore' }); } catch (e) { base = e.status ?? 1; }
if (base) { bad++; console.error('  BASELINE  the unmutated check is red, so no catch above means anything.'); }
else console.log('  baseline  the unmutated check is green');

console.log(`\nran ${MUTATIONS.length} mutation(s) against scripts/check-forward-window-judge.mjs; each asserted its anchor unique and its effect present; the real files were not written`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');
