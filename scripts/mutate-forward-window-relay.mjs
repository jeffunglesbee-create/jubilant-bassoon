#!/usr/bin/env node
// Rule 90 harness for scripts/check-forward-window-relay.mjs.
//
// Each mutation breaks one clause of the capture module (or of the probe's wiring) in a COPY of the file, points the check at
// the copy through RELAY_SRC / PROBE_SRC, and requires the check to go red on that clause's own FAIL line. The real files are
// never written. A mutation counts as CAUGHT only when the check exits non-zero AND prints a FAIL line AND that line names the
// clause. An anchor that is not unique, a mutation that did not apply, or a crash with no FAIL line is a harness defect and is
// reported as one.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const RELAY = 'scripts/forward-window-relay.cjs';
const PROBE = 'forward_window_probe.js';
const MUT_RELAY = 'scripts/__mut_forward_window_relay__.cjs';
const MUT_PROBE = 'scripts/__mut_forward_window_relay_probe__.js';

const MUTATIONS = [
  // ── the collector ──
  { name: 'L1  the count is the count field, not the length of games',
    file: 'relay', anchor: 'out.counts[sport][iso] = body.games.length;', replace: 'out.counts[sport][iso] = body.count;',
    expect: 'relay: the count is the length of games' },
  { name: 'L2  an NHL upstream failure (200, empty, source nhle-error) reads as no games',
    file: 'relay', anchor: "      if (/error/i.test(String(body.source || ''))) throw new Error(`relay source ${body.source}`);\n", replace: '',
    expect: 'relay: an NHL upstream failure' },
  { name: 'L3  an error key on a 200 is ignored',
    file: 'relay', anchor: "      if (body.error) throw new Error(`relay error: ${String(body.error).slice(0, 120)}`);\n", replace: '',
    expect: 'relay: HTTP 200 with an error key' },
  { name: 'L4  an answer for another date is accepted',
    file: 'relay', anchor: 'body.sport !== sport || body.date !== iso', replace: 'body.sport !== sport',
    expect: 'relay: an answer for another date' },
  { name: 'L5  an answer for another sport is accepted',
    file: 'relay', anchor: 'body.sport !== sport || body.date !== iso', replace: 'body.date !== iso',
    expect: 'relay: an answer for another sport' },
  { name: 'L6  a non-OK status is not checked, so a 503 with a clean body reads as an answer',
    file: 'relay', anchor: '      if (!res.ok) throw new Error(`HTTP ${res.status}`);\n', replace: '',
    expect: 'relay: HTTP 503 whose body parses as a clean empty answer' },
  { name: 'L7  a failed cell is written as 0',
    file: 'relay', anchor: '      out.counts[sport][iso] = null;\n', replace: '      out.counts[sport][iso] = 0;\n',
    expect: 'relay: HTTP 400 is null with the reason' },
  { name: 'L8  the request has no timeout',
    file: 'relay', anchor: '{ signal: AbortSignal.timeout(timeoutMs) }', replace: '{}',
    expect: 'relay: a request that never answers' },
  { name: 'L9  one failing cell rejects the whole call',
    file: 'relay', anchor: '      out.counts[sport][iso] = null;\n', replace: '      out.counts[sport][iso] = null;\n      throw e;\n',
    expect: 'relay: one failing cell does not stop the others' },
  { name: 'L10 only the first sport is asked',
    file: 'relay', anchor: 'sports.flatMap((sport) =>', replace: 'sports.slice(0, 1).flatMap((sport) =>',
    expect: 'relay: every sport and day is asked exactly once' },
  { name: 'L11 the path is not /v2/games',
    file: 'relay', anchor: "workers.dev/v2/games'", replace: "workers.dev/v2/game'",
    expect: 'relay: every sport and day is asked exactly once' },
  { name: 'L12 the default sports lose college football',
    file: 'relay', anchor: "const SPORTS = ['nfl', 'cfb', 'nba', 'nhl'];", replace: "const SPORTS = ['nfl', 'nba', 'nhl'];",
    expect: 'relay: every sport and day is asked exactly once' },
  { name: 'L13 the source is not recorded',
    file: 'relay', anchor: '      out.sources[sport][iso] = body.source === undefined ? null : body.source;\n', replace: '',
    expect: 'relay: the source is recorded per cell' },
  { name: 'L14 the reason for a failed cell is not recorded',
    file: 'relay', anchor: '      out.errors[sport][iso] = String((e && e.message) || e).slice(0, 200);\n', replace: '',
    expect: 'relay: HTTP 400 is null with the reason' },
  { name: 'L15 the games array is not required',
    file: 'relay', anchor: "      if (!Array.isArray(body.games)) throw new Error('response has no games array');\n", replace: '',
    expect: 'relay: games missing is null' },
  { name: 'L16 a body that is not an object is not rejected',
    file: 'relay', anchor: "      if (!body || typeof body !== 'object') throw new Error('response is not an object');\n", replace: '',
    expect: 'relay: a body that is JSON null is null, said to be not an object' },
  { name: 'L17 the sports option is ignored',
    file: 'relay', anchor: 'async function askRelaySports(isoDays, fetchImpl, { sports = SPORTS, timeoutMs = 15000 } = {}) {\n',
    replace: 'async function askRelaySports(isoDays, fetchImpl, { sports: _ignored, timeoutMs = 15000 } = {}) {\n  const sports = SPORTS;\n',
    expect: 'relay: the sports option limits what is asked' },
  // ── the table ──
  { name: 'T1  a day that was not read shows a 0',
    file: 'relay', anchor: "r.window === null ? 'unread'", replace: 'r.window === null ? 0',
    expect: 'coverage: a day that was not read reads "file unread"' },
  { name: 'T2  a cell the relay could not answer shows a 0',
    file: 'relay', anchor: "r.relay[s] === null ? 'unasked'", replace: 'r.relay[s] === null ? 0',
    expect: 'coverage: a cell the relay could not answer reads "unasked"' },
  { name: 'T3  a sport the window file has no key for shows a 0',
    file: 'relay', anchor: "(s in r.window ? r.window[s] : '-')", replace: '(s in r.window ? r.window[s] : 0)',
    expect: 'coverage: NFL on 2026-11-01 reads "relay 12, file -"' },
  { name: 'T4  a cell the relay could not answer is stored as 0 in the row',
    file: 'relay', anchor: 'isCount((counts[s] || {})[d.iso]) ? counts[s][d.iso] : null', replace: 'isCount((counts[s] || {})[d.iso]) ? counts[s][d.iso] : 0',
    expect: 'coverage: rows carry null where the relay could not answer' },
  { name: 'T5  the first day is dropped from the table',
    file: 'relay', anchor: ': []).map((d) => ({', replace: ': []).slice(1).map((d) => ({',
    expect: 'coverage: one row per day, in order' },
  { name: 'T6  the window side is not kept',
    file: 'relay', anchor: "window: d.windowBySport && typeof d.windowBySport === 'object' ? d.windowBySport : null,", replace: 'window: null,',
    expect: 'coverage: a row carries what the file had' },
  { name: 'T7  a windowBySport that is not an object is kept',
    file: 'relay', anchor: "d.windowBySport && typeof d.windowBySport === 'object' ? d.windowBySport", replace: 'd.windowBySport ? d.windowBySport',
    expect: 'coverage: a windowBySport that is not an object' },
  // ── the probe's wiring ──
  { name: 'W1  the probe does not use the capture module',
    file: 'probe', anchor: "const { askRelaySports, coverageRows, coverageLines } = require('./scripts/forward-window-relay.cjs');\n", replace: '',
    expect: 'probe: requires the capture module' },
  { name: 'W2  the probe never asks the relay',
    file: 'probe', anchor: 'const relay = await askRelaySports(isoDays, fetch);', replace: 'const relay = { counts: {} };',
    expect: 'probe: asks the relay for the forward days' },
  { name: 'W3  the manifest does not carry the raw reading',
    file: 'probe', anchor: '    relaySports: relay,\n', replace: '',
    expect: 'probe: the manifest carries the raw reading and the table' },
  { name: 'W4  the manifest does not carry the table',
    file: 'probe', anchor: '    coverage,\n', replace: '',
    expect: 'probe: the manifest carries the raw reading and the table' },
  { name: 'W5  the judge is given the relay reading',
    file: 'probe', anchor: 'const verdict = judgeForwardWindow(manifest, espn);', replace: 'const verdict = judgeForwardWindow(manifest, espn, relay);',
    expect: 'probe: the judge is not given the relay reading' },
  { name: 'W6  the in-page read does not return the per-sport counts',
    file: 'probe', anchor: 'mlb: sched && sched.mlb ? sched.mlb.length : 0, bySport };', replace: 'mlb: sched && sched.mlb ? sched.mlb.length : 0 };',
    expect: 'probe: the in-page read returns the window file' },
  { name: 'W7  the day does not keep the per-sport counts',
    file: 'probe', anchor: 'windowBySport: w.bySport,', replace: '',
    expect: 'probe: the in-page read returns the window file' },
  { name: 'W8  the table is not printed',
    file: 'probe', anchor: '  for (const line of coverageLines(coverage)) console.log(`  ${line}`);\n', replace: '',
    expect: 'probe: the table is printed in the run log' },
  { name: 'W9  the relay capture can fail the run',
    file: 'probe', anchor: '  manifest.verdict = verdict;\n', replace: "  manifest.verdict = verdict;\n  if (relay && Object.keys(relay.errors).length) verdict.problems.push('relay capture failed');\n",
    expect: 'probe: nothing from the relay capture can fail the run' },
];

let bad = 0;
const cleanup = () => { for (const f of [MUT_RELAY, MUT_PROBE]) { try { unlinkSync(f); } catch { /* not created */ } } };
process.on('exit', cleanup);

for (const m of MUTATIONS) {
  const orig = m.file === 'relay' ? RELAY : PROBE;
  const mut = m.file === 'relay' ? MUT_RELAY : MUT_PROBE;
  const before = readFileSync(orig, 'utf8');
  const hits = before.split(m.anchor).length - 1;
  if (hits !== 1) { bad++; console.error(`  ANCHOR  ${m.name}\n          anchor occurs ${hits} time(s), expected 1. NOTHING WAS MUTATED — harness defect, not a result.`); continue; }
  const after = before.replace(m.anchor, () => m.replace);
  if (after === before) { bad++; console.error(`  NO EFFECT  ${m.name}`); continue; }
  writeFileSync(mut, after);
  const env = { ...process.env,
    RELAY_SRC: m.file === 'relay' ? MUT_RELAY : RELAY,
    PROBE_SRC: m.file === 'probe' ? MUT_PROBE : PROBE };
  let out = '', code = 0;
  try { out = execFileSync('node', ['scripts/check-forward-window-relay.mjs'], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }); }
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
try { execFileSync('node', ['scripts/check-forward-window-relay.mjs'], { stdio: 'ignore' }); } catch (e) { base = e.status ?? 1; }
if (base) { bad++; console.error('  BASELINE  the unmutated check is red, so no catch above means anything.'); }
else console.log('  baseline  the unmutated check is green');

console.log(`\nran ${MUTATIONS.length} mutation(s) against scripts/check-forward-window-relay.mjs; each asserted its anchor unique and its text change applied; the real files were not written`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');
