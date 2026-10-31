#!/usr/bin/env node
// Rule 90 harness for scripts/check-forward-window-relay.mjs.
//
// Each mutation breaks one clause of the capture module (or of the probe's wiring) in a COPY of the file, points the check at
// the copy through RELAY_SRC / PROBE_SRC, and requires the check to go red on that clause's own FAIL line. The real files are
// never written. A mutation counts as CAUGHT only when the check exits non-zero AND prints a FAIL line AND that line names the
// clause. An anchor that is not unique, a mutation that did not apply, or a crash with no FAIL line is a harness defect and is
// reported as one.
//
// Rule 91: the harness prints how many of the check's assertions went red under at least one mutation, and lists the ones that
// none reached, so "N mutations caught" is never read as "every assertion can fail".
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const RELAY = 'scripts/forward-window-relay.cjs';
const PROBE = 'forward_window_probe.js';
const MUT_RELAY = 'scripts/__mut_forward_window_relay__.cjs';
const MUT_PROBE = 'scripts/__mut_forward_window_relay_probe__.js';
const JUDGE = 'scripts/forward-window-judge.cjs';
const MUT_JUDGE = 'scripts/__mut_forward_window_relay_judge__.cjs';

const URLX = '`${RELAY_V2_GAMES}?sport=${sport}&date=${iso}`';
const REQ = '      const res = await fetchImpl(' + URLX + ', { signal: AbortSignal.timeout(timeoutMs) });\n';
const CAPTURE = '  const { relay, coverage } = await captureOtherSports(days, isoDays, fetch);';

const MUTATIONS = [
  // ── the collector: what is a clean answer ──
  { name: 'L1  the count is the count field, not the length of games',
    file: 'relay', anchor: 'out.counts[sport][iso] = body.games.length;', replace: 'out.counts[sport][iso] = body.count;',
    expect: 'relay: the count is the length of games' },
  { name: 'L2  an NHL upstream failure (200, empty, source nhle-error) reads as no games',
    file: 'relay', anchor: "      if (/error/i.test(String(body.source || ''))) throw new Error(`relay source ${body.source}`);\n", replace: '',
    expect: "relay: the fixture's nhle_upstream_not_ok" },
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
    expect: "relay: the fixture's espn_upstream_not_ok" },
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
    expect: 'relay: a clean empty day is a real 0, with its source recorded' },
  { name: 'L14 the reason for a failed cell is not recorded',
    file: 'relay', anchor: '      out.errors[sport][iso] = String((e && e.message) || e).slice(0, 200);\n', replace: '',
    expect: "relay: the fixture's espn_upstream_not_ok" },
  { name: 'L15 the games array is not required',
    file: 'relay', anchor: "      if (!Array.isArray(body.games)) throw new Error('response has no games array');\n", replace: '',
    expect: 'relay: games missing is null' },
  { name: 'L16 a body that is not an object is not rejected',
    file: 'relay', anchor: "      if (!body || typeof body !== 'object') throw new Error('response is not an object');\n", replace: '',
    expect: 'relay: a body that is JSON null is null, said to be not an object' },
  { name: 'L17 the sports option is ignored',
    file: 'relay', anchor: 'today = new Date().toISOString().slice(0, 10) } = {}) {\n', replace: 'today = new Date().toISOString().slice(0, 10) } = {}) {\n  sports = SPORTS;\n',
    expect: 'relay: the sports option limits what is asked' },
  { name: 'L18 a recorded reason is not cut',
    file: 'relay', anchor: 'String((e && e.message) || e).slice(0, 200);', replace: 'String((e && e.message) || e);',
    expect: 'relay: a recorded reason is cut at 200 characters' },
  { name: 'L19 a recorded reason is cut at 20',
    file: 'relay', anchor: 'String((e && e.message) || e).slice(0, 200);', replace: 'String((e && e.message) || e).slice(0, 20);',
    expect: 'relay: a recorded reason is cut at 200 characters' },
  { name: 'L20 only a source spelled "nhle-error" is an error',
    file: 'relay', anchor: "/error/i.test(String(body.source || ''))", replace: "/nhle-error/.test(String(body.source || ''))",
    expect: 'relay: any source containing "error"' },
  { name: 'L21 a missing source is recorded as undefined, not null',
    file: 'relay', anchor: 'body.source === undefined ? null : body.source', replace: 'body.source',
    expect: 'relay: an answer with no source keeps its count and records the source as null' },
  { name: 'L22 a missing source makes the cell null',
    file: 'relay', anchor: 'body.source === undefined ? null : body.source;', replace: 'body.source === undefined ? (() => { throw new Error("no source"); })() : body.source;',
    expect: 'relay: an answer with no source keeps its count and records the source as null' },
  // ── the collector: cost, timing, which days ──
  { name: 'D1  the default timeout is 1 ms',
    file: 'relay', anchor: 'const DEFAULT_TIMEOUT_MS = 15000;', replace: 'const DEFAULT_TIMEOUT_MS = 1;',
    expect: 'relay: the default timeout is 15000 ms' },
  { name: 'D2  the default timeout is ten minutes',
    file: 'relay', anchor: 'const DEFAULT_TIMEOUT_MS = 15000;', replace: 'const DEFAULT_TIMEOUT_MS = 600000;',
    expect: 'relay: the default timeout is 15000 ms' },
  { name: 'D3  a cell that does not answer OK is asked a second time',
    file: 'relay', anchor: REQ, replace: '      let res = await fetchImpl(' + URLX + ', { signal: AbortSignal.timeout(timeoutMs) });\n      if (!res.ok) res = await fetchImpl(' + URLX + ', { signal: AbortSignal.timeout(timeoutMs) });\n',
    expect: 'relay: a failing cell is asked once' },
  { name: 'D4  the requests are made one after another',
    file: 'relay', anchor: REQ, replace: '      const res = await (globalThis.__relayQ = (globalThis.__relayQ || Promise.resolve()).catch(() => {}).then(() => fetchImpl(' + URLX + ', { signal: AbortSignal.timeout(timeoutMs) })));\n',  // absence-ok: the text of a mutant that the harness writes into a COPY of the relay reader to prove the check notices serial requests; the .catch only keeps that queue alive and nothing here reads a value from outside
    expect: 'relay: all twelve requests are in flight at once' },
  { name: 'D5  a day before the runner\'s date is asked',
    file: 'relay', anchor: "      if (iso < today) throw new Error(`not asked: ${iso} is before ${today}, and a finished day can start the relay's brief pipeline`);\n", replace: '',
    expect: 'relay: a day before the runner' },
  { name: 'D6  the runner\'s own date is not asked',
    file: 'relay', anchor: 'if (iso < today) throw', replace: 'if (iso <= today) throw',
    expect: 'relay: the runner\'s own date is asked' },
  { name: 'D7  the default "today" is a fixed date',
    file: 'relay', anchor: 'today = new Date().toISOString().slice(0, 10) } = {}) {', replace: "today = '2000-01-01' } = {}) {",
    expect: 'relay: the default "today" is the runner' },
  { name: 'D8  an NHL day past the scoreboard window is asked',
    file: 'relay', anchor: "      if (sport === 'nhl' && iso > addDays(today, NHL_DAYS_AHEAD)) throw", replace: "      if (false) throw",
    expect: 'relay: an NHL day more than' },
  { name: 'D9  the NHL ceiling applies to every sport',
    file: 'relay', anchor: "if (sport === 'nhl' && iso > addDays(today, NHL_DAYS_AHEAD))", replace: 'if (iso > addDays(today, NHL_DAYS_AHEAD))',
    expect: 'relay: the NHL ceiling applies to NHL only' },
  { name: 'D10 the NHL ceiling is 60 days',
    file: 'relay', anchor: 'const NHL_DAYS_AHEAD = 6;', replace: 'const NHL_DAYS_AHEAD = 60;',
    expect: 'relay: an NHL day more than' },
  // ── captureOtherSports ──
  { name: 'C1  the table is built from an empty reading',
    file: 'relay', anchor: 'coverage: coverageRows(days, relay) };', replace: 'coverage: coverageRows(days, {}) };',
    expect: 'capture: returns { relay, coverage }' },
  { name: 'C2  the reading is not returned',
    file: 'relay', anchor: 'return { relay, coverage: coverageRows(days, relay) };', replace: 'return { relay: null, coverage: coverageRows(days, relay) };',
    expect: 'capture: returns { relay, coverage }' },
  // ── the table ──
  { name: 'T1  a day that was not read shows a 0',
    file: 'relay', anchor: "r.window === null ? 'unread'", replace: 'r.window === null ? 0',
    expect: 'coverage: a day that was not read reads "file unread"' },
  { name: 'T2  a cell the relay could not answer shows a 0',
    file: 'relay', anchor: "r.relay[s] === null ? 'unasked'", replace: 'r.relay[s] === null ? 0',
    expect: 'coverage: a cell the relay could not answer reads "unasked"' },
  { name: 'T3  a sport the window file has no key for shows a 0',
    file: 'relay', anchor: "(s in r.window ? r.window[s] : '-')", replace: '(s in r.window ? r.window[s] : 0)',
    expect: 'coverage: NFL reads "file -"' },
  { name: 'T4  a cell the relay could not answer is stored as 0 in the row',
    file: 'relay', anchor: 'isCount((counts[s] || {})[d.iso]) ? counts[s][d.iso] : null', replace: 'isCount((counts[s] || {})[d.iso]) ? counts[s][d.iso] : 0',
    expect: 'coverage: rows carry null where the relay could not answer' },
  { name: 'T5  the first day is dropped from the table',
    file: 'relay', anchor: ': []).map((d) => ({', replace: ': []).slice(1).map((d) => ({',
    expect: 'coverage: one row per day, in order' },
  { name: 'T6  the window side is not kept',
    file: 'relay', anchor: "window: d.windowBySport && typeof d.windowBySport === 'object' ? d.windowBySport : null,", replace: 'window: null,',
    expect: "coverage: every row carries exactly its own day's file counts" },
  { name: 'T7  a windowBySport that is not an object is kept',
    file: 'relay', anchor: "d.windowBySport && typeof d.windowBySport === 'object' ? d.windowBySport", replace: 'd.windowBySport ? d.windowBySport',
    expect: 'coverage: a windowBySport that is not an object' },
  { name: 'T8  the file side always prints 0',
    file: 'relay', anchor: "(s in r.window ? r.window[s] : '-')", replace: "(s in r.window ? 0 : '-')",
    expect: 'coverage: NHL reads, day by day' },
  { name: 'T9  every row carries the first day\'s file counts',
    file: 'relay', anchor: "window: d.windowBySport && typeof d.windowBySport === 'object' ? d.windowBySport : null,", replace: "window: days[0].windowBySport && typeof days[0].windowBySport === 'object' ? days[0].windowBySport : null,",
    expect: "coverage: every row carries exactly its own day's file counts" },
  { name: 'T10 every row carries the previous day\'s file counts',
    file: 'relay', anchor: "window: d.windowBySport && typeof d.windowBySport === 'object' ? d.windowBySport : null,", replace: "window: (days[Math.max(0, days.indexOf(d) - 1)] || d).windowBySport || null,",
    expect: "coverage: every row carries exactly its own day's file counts" },
  { name: 'T11 the relay side is read from the first day',
    file: 'relay', anchor: 'isCount((counts[s] || {})[d.iso]) ? counts[s][d.iso] : null', replace: 'isCount((counts[s] || {})[days[0].iso]) ? counts[s][days[0].iso] : null',
    expect: "coverage: every row carries the relay's counts for its own day" },
  // ── assertions the first run of this report found no mutation reaching ──
  { name: 'R1  the reading has no timestamp',
    file: 'relay', anchor: "asked_at: new Date().toISOString(), ", replace: '',
    expect: 'relay: the reading carries an ISO timestamp and the URL it asked' },
  { name: 'R2  the reading does not record the URL it asked',
    file: 'relay', anchor: "url: RELAY_V2_GAMES, counts: {}", replace: 'counts: {}',
    expect: 'relay: the reading carries an ISO timestamp and the URL it asked' },
  { name: 'R3  the per-cell maps are not initialised for a sport',
    file: 'relay', anchor: 'for (const sport of sports) { out.counts[sport] = {}; out.sources[sport] = {}; out.errors[sport] = {}; }\n', replace: '',
    expect: 'relay: askRelaySports must resolve for every input' },
  { name: 'R4  the table lists the sports in reverse',
    file: 'relay', anchor: "const sports = rows.length ? Object.keys(rows[0].relay) : [];", replace: "const sports = rows.length ? Object.keys(rows[0].relay).reverse() : [];",
    expect: 'coverage: there is one line per sport asked, in order' },
  { name: 'R5  the table drops the last sport',
    file: 'relay', anchor: "const sports = rows.length ? Object.keys(rows[0].relay) : [];", replace: "const sports = rows.length ? Object.keys(rows[0].relay).slice(0, -1) : [];",
    expect: 'coverage: there is one line per sport asked, in order' },
  { name: 'R6  a day that was not read gets an empty window instead of null',
    file: 'relay', anchor: "d.windowBySport : null,", replace: "d.windowBySport : {},",
    expect: 'coverage: a day that was not read has window null' },
  { name: 'R7  days that are not an array crash the table',
    file: 'relay', anchor: "(Array.isArray(days) ? days : []).map(", replace: "days.map(",
    expect: 'coverage: days that are not an array give no rows' },
  { name: 'R8  the capture needs days to be an array',
    file: 'relay', anchor: "(Array.isArray(days) ? days : []).map(", replace: "days.map(",
    expect: 'capture: with no days, no fetch and no table input it still resolves' },
  { name: 'R9  the judge reads the relay keys and adds a problem',
    file: 'judge', anchor: '  const total = m.windowMlbTotal;\n', replace: "  if (m.relaySports) problems.push('relay');\n  const total = m.windowMlbTotal;\n",
    expect: 'judge: the same verdict with or without relay keys in the manifest (a healthy window)' },
  { name: 'R10 the judge adds a note when the relay keys are present',
    file: 'judge', anchor: "  const notes = [];\n", replace: "  const notes = m.coverage ? ['relay'] : [];\n",
    expect: 'judge: the same verdict with or without relay keys in the manifest (a healthy window)' },
  { name: 'R14 the table lines crash on no rows',
    file: 'relay', anchor: "const sports = rows.length ? Object.keys(rows[0].relay) : [];", replace: "const sports = Object.keys(rows[0].relay);",
    expect: 'coverage: no days and no sports give no rows and no lines' },
  { name: 'R11 the probe\'s window read cannot be found',
    file: 'probe', anchor: 'const windowRead = await readPv(', replace: 'const windowReadX = await readPv(',
    expect: "in-page: the probe's window read was found" },
  { name: 'R12 the MLB count is one too many',
    file: 'probe', anchor: 'sched && sched.mlb ? sched.mlb.length : 0, bySport };', replace: 'sched && sched.mlb ? sched.mlb.length + 1 : 0, bySport };',
    expect: 'in-page: the MLB count is the length of the mlb array, and the day is marked read' },
  { name: 'R13 a present day is not marked read',
    file: 'probe', anchor: 'return { iso: d, has: !!sched,', replace: 'return { iso: d, has: false,',
    expect: 'in-page: the MLB count is the length of the mlb array, and the day is marked read' },
  // ── the probe's wiring ──
  { name: 'W1  the probe does not use the capture module',
    file: 'probe', anchor: "const { captureOtherSports, coverageLines } = require('./scripts/forward-window-relay.cjs');\n", replace: '',
    expect: 'probe: requires the capture module' },
  { name: 'W2  the probe never asks the relay',
    file: 'probe', anchor: CAPTURE, replace: '  const relay = { counts: {} }, coverage = [];',
    expect: 'probe: the capture is one top-level statement' },
  { name: 'W3  the manifest does not carry the raw reading',
    file: 'probe', anchor: '  manifest.relaySports = relay;\n', replace: '',
    expect: 'probe: the order is ESPN question, capture, judge' },
  { name: 'W4  the manifest does not carry the table',
    file: 'probe', anchor: '  manifest.coverage = coverage;\n', replace: '',
    expect: 'probe: the order is ESPN question, capture, judge' },
  { name: 'W5  the judge is given the relay reading',
    file: 'probe', anchor: 'const verdict = judgeForwardWindow(manifest, espn);', replace: 'const verdict = judgeForwardWindow(manifest, espn, relay);',
    expect: 'probe: the judge call keeps its two arguments' },
  { name: 'W6  the in-page read does not return the per-sport counts',
    file: 'probe', anchor: 'mlb: sched && sched.mlb ? sched.mlb.length : 0, bySport };', replace: 'mlb: sched && sched.mlb ? sched.mlb.length : 0 };',
    expect: "in-page: a day's per-sport counts" },
  { name: 'W7  the day does not keep the per-sport counts',
    file: 'probe', anchor: 'windowBySport: w.bySport,', replace: '',
    expect: 'probe: the day keeps the in-page per-sport counts' },
  { name: 'W8  the table is not printed',
    file: 'probe', anchor: '  for (const line of coverageLines(coverage)) console.log(`  ${line}`);\n', replace: '',
    expect: 'probe: the table is printed in the run log' },
  { name: 'W9  a failed relay capture fails the run',
    file: 'probe', anchor: '  manifest.verdict = verdict;\n', replace: "  manifest.verdict = verdict;\n  if (relay && Object.keys(relay.errors).length) verdict.problems.push('relay capture failed');\n",
    expect: 'probe: only the verdict can fail the run' },
  { name: 'W10 the relay reading is attached before the judge runs',
    file: 'probe', anchor: '  const verdict = judgeForwardWindow(manifest, espn);\n', replace: '  manifest.relaySports = relay;\n  const verdict = judgeForwardWindow(manifest, espn);\n',
    expect: 'probe: the order is ESPN question, capture, judge' },
  { name: 'W11 the relay reading is in the manifest literal the judge reads',
    file: 'probe', anchor: '    espnMlb: espn,\n', replace: '    espnMlb: espn,\n    relaySports: relay,\n',
    expect: 'probe: the relay keys are attached after the judge' },
  { name: 'W12 the exit code is set from the relay capture',
    file: 'probe', anchor: '  manifest.verdict = verdict;\n', replace: '  manifest.verdict = verdict;\n  if (!relay) process.exitCode = 1;\n',
    expect: 'probe: only the verdict can fail the run' },
  { name: 'W13 a problem is added to the verdict from the capture',
    file: 'probe', anchor: '  manifest.verdict = verdict;\n', replace: "  manifest.verdict = verdict;\n  verdict.problems.unshift('relay');\n",
    expect: 'probe: only the verdict can fail the run' },
  { name: 'W14 the in-page read counts keys that are not arrays',
    file: 'probe', anchor: 'Object.entries(sched).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])', replace: 'Object.entries(sched).map(([k, v]) => [k, v.length])',
    expect: "in-page: a day's per-sport counts" },
  { name: 'W15 an unread day has bySport {} instead of null',
    file: 'probe', anchor: '[k, v.length])) : null;', replace: '[k, v.length])) : {};',
    expect: 'in-page: a day the window does not have is not read' },
  { name: 'W16 an absent day is marked read',
    file: 'probe', anchor: 'return { iso: d, has: !!sched,', replace: 'return { iso: d, has: true,',
    expect: 'in-page: a day the window does not have is not read' },
  { name: 'W17 the MLB count of a day with no mlb key is 1',
    file: 'probe', anchor: 'sched && sched.mlb ? sched.mlb.length : 0, bySport };', replace: 'sched && sched.mlb ? sched.mlb.length : 1, bySport };',
    expect: 'in-page: a day with no mlb key counts 0 MLB' },
  { name: 'W18 the capture is called with no days',
    file: 'probe', anchor: CAPTURE, replace: '  const { relay, coverage } = await captureOtherSports([], isoDays, fetch);',
    expect: 'probe: the capture is one top-level statement' },
];

let bad = 0;
const cleanup = () => { for (const f of [MUT_RELAY, MUT_PROBE, MUT_JUDGE]) { try { unlinkSync(f); } catch { /* not created */ } } };
process.on('exit', cleanup);

// The unmutated check: it must be green, and its assertion labels are the denominator for the never-red report.
let base = 0, baseOut = '';
try { baseOut = execFileSync('node', ['scripts/check-forward-window-relay.mjs'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (e) { base = e.status ?? 1; baseOut = `${e.stdout || ''}${e.stderr || ''}`; }
const allLabels = new Set(baseOut.split('\n').filter((l) => /^\s*ok {4}/.test(l)).map((l) => l.replace(/^\s*ok {4}/, '')));
const redLabels = new Set();
const labelOf = (l) => l.replace(/^\s*FAIL {2}/, '').split(' -> ')[0];

for (const m of MUTATIONS) {
  const orig = m.file === 'relay' ? RELAY : (m.file === 'judge' ? JUDGE : PROBE);
  const mut = m.file === 'relay' ? MUT_RELAY : (m.file === 'judge' ? MUT_JUDGE : MUT_PROBE);
  const before = readFileSync(orig, 'utf8');
  const hits = before.split(m.anchor).length - 1;
  if (hits !== 1) { bad++; console.error(`  ANCHOR  ${m.name}\n          anchor occurs ${hits} time(s), expected 1. NOTHING WAS MUTATED — harness defect, not a result.`); continue; }
  const after = before.replace(m.anchor, () => m.replace);
  if (after === before) { bad++; console.error(`  NO EFFECT  ${m.name}`); continue; }
  writeFileSync(mut, after);
  const env = { ...process.env,
    RELAY_SRC: m.file === 'relay' ? MUT_RELAY : RELAY,
    PROBE_SRC: m.file === 'probe' ? MUT_PROBE : PROBE,
    JUDGE_SRC: m.file === 'judge' ? MUT_JUDGE : JUDGE };
  let out = '', code = 0;
  try { out = execFileSync('node', ['scripts/check-forward-window-relay.mjs'], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  finally { cleanup(); }
  const red = out.split('\n').filter((l) => /^\s*FAIL {2}/.test(l));
  for (const l of red) redLabels.add(labelOf(l));
  if (code === 0) { bad++; console.error(`  NOT CAUGHT  ${m.name}\n          the check still passed.`); }
  else if (!red.length) { bad++; console.error(`  CRASH  ${m.name}\n          exit ${code} with no FAIL line (a harness or syntax error, not a catch). Output tail:\n${out.slice(-500)}`); }
  else if (!red.some((l) => l.includes(m.expect))) { bad++; console.error(`  WRONG REASON  ${m.name}\n          no FAIL line mentioned "${m.expect}". Red lines:\n${red.join('\n')}`); }
  else console.log(`  caught  ${m.name}\n          by "${m.expect}" (${red.length} red)`);
}

if (base) { bad++; console.error('  BASELINE  the unmutated check is red, so no catch above means anything.'); }
else console.log('  baseline  the unmutated check is green');

const reached = [...allLabels].filter((l) => redLabels.has(l));
const never = [...allLabels].filter((l) => !redLabels.has(l));
console.log(`\nassertions that went red under at least one mutation: ${reached.length} of ${allLabels.size}`
          + (never.length ? `\nnone of the ${MUTATIONS.length} mutations reaches these ${never.length}:\n${never.map((l) => `  - ${l}`).join('\n')}` : ''));
console.log(`\nran ${MUTATIONS.length} mutation(s) against scripts/check-forward-window-relay.mjs; each asserted its anchor unique and its text change applied; the real files were not written`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');
