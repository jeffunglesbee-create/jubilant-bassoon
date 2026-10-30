#!/usr/bin/env node
// The forward-window probe's verdict is season-aware, and cannot be talked into a pass
// (scripts/forward-window-judge.cjs; the probe is forward_window_probe.js).
//
// THE DEFECT. The probe failed on `windowMlbTotal === 0`. From 2026-10-28 that was true because the MLB postseason
// was over (ESPN's MLB scoreboard for 2026-10-31 lists 0 events), so the probe was red every day while nothing was
// wrong, and a probe that is always red stops being read. It could not be loosened to "0 is fine": that is also what
// a generator that drops every MLB game looks like.
//
// FIXTURES are real manifests the probe committed (outbox/fixture-forward-window-manifests-20261030.json, copied
// verbatim from the runs of 2026-10-30, 2026-10-26 and 2026-10-25). The ESPN inputs are TEST INPUTS shaped like
// askEspnMlb's result; the one real ESPN reading is recorded in the fixture's `espn_probe` and is not used as an input.
// askEspnMlb itself is executed here against a fake fetch, so its response handling is the real code.
//
// Coverage (Rule 91): the judge and askEspnMlb run as the real functions on 3 manifests x enumerated ESPN inputs.
// forward_window_probe.js drives a browser and is checked as TEXT here (it calls the judge, asks ESPN before the
// manifest is written, no longer holds the old rule). That the wiring runs is shown by the runner, not by this file.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const JUDGE = process.env.JUDGE_SRC || 'scripts/forward-window-judge.cjs';
const PROBE = process.env.PROBE_SRC || 'forward_window_probe.js';
const FIXTURE = 'outbox/fixture-forward-window-manifests-20261030.json';

const { judgeForwardWindow, askEspnMlb, espnNeeded } = createRequire(import.meta.url)(path.resolve(JUDGE));
const fx = JSON.parse(readFileSync(FIXTURE, 'utf8')).manifests;
const clone = (o) => JSON.parse(JSON.stringify(o));
const OFF = fx.offseason.manifest;        // cache accepted, schema 2.1, window present, windowMlbTotal 0
const REJ = fx.cache_rejected.manifest;   // cacheAccepted false, schema null, windowHasDay false on every day
const INS = fx.in_season.manifest;        // windowMlbTotal 3

let failed = 0, ran = 0;
const want = (label, ok, detail) => {
  ran++;
  if (ok) console.log(`  ok    ${label}`);
  else { failed++; console.error(`  FAIL  ${label}${detail ? ' -> ' + detail : ''}`); }
};
const mentions = (arr, s) => arr.some((p) => p.includes(s));
const D = OFF.days.map((d) => d.iso);                                        // 2026-10-31, 11-01, 11-02
// ESPN inputs are keyed to a manifest's OWN days, so a case about one manifest never feeds ESPN another manifest's dates.
const espnFor = (m, ...c) => ({ counts: Object.fromEntries(m.days.map((d, i) => [d.iso, c[i]])), errors: {} });
const espnOf = (...c) => espnFor(OFF, ...c);

// ── 1. an empty window, ESPN asked ─────────────────────────────────────────────────────────────────────────────
{
  const r = judgeForwardWindow(clone(OFF), espnOf(0, 0, 0));
  want('off-season: 0 in the window and 0 on ESPN for every date passes', r.problems.length === 0, r.problems.join(' | '));
  want('off-season: reported as NOT MEASURED, naming all three dates',
       r.mlb.state === 'not-measured' && r.notes.length === 1 && r.notes[0].includes('NOT MEASURED')
       && D.every((iso) => r.notes[0].includes(iso)), JSON.stringify(r.notes));
  want('off-season: the ESPN counts are carried in the verdict', D.every((iso) => r.mlb.espn_counts?.[iso] === 0));
}
{
  const r = judgeForwardWindow(clone(OFF), espnOf(0, 2, 0));
  want('dropped: ESPN lists 2 games on one date the window does not carry -> FAIL', r.problems.length === 1, JSON.stringify(r.problems));
  want('dropped: the problem names the date and the count, and the state is dropped',
       mentions(r.problems, '2 on 2026-11-01') && r.mlb.state === 'dropped', JSON.stringify(r.problems));
  want('dropped: no NOT MEASURED note is issued', r.notes.length === 0);
}
{
  const r = judgeForwardWindow(clone(OFF), espnOf(0, 0, 1));
  want('dropped: the LAST date alone is enough', r.mlb.state === 'dropped' && mentions(r.problems, '1 on 2026-11-02'));
}
for (const [label, espn] of [['null (never asked)', null], ['undefined', undefined], ['an empty object', {}]]) {
  const r = judgeForwardWindow(clone(OFF), espn);
  want(`unverifiable: ESPN input is ${label} -> FAIL, not a pass`,
       r.mlb.state === 'unverifiable' && r.problems.length === 1 && r.notes.length === 0, JSON.stringify(r));
}
{
  const r = judgeForwardWindow(clone(OFF), { counts: { [D[0]]: 0, [D[1]]: null, [D[2]]: 0 }, errors: { [D[1]]: 'HTTP 503' } });
  want('unverifiable: one date failed -> FAIL naming that date and its error, and only that date',
       r.mlb.state === 'unverifiable' && mentions(r.problems, `${D[1]} (HTTP 503)`)
       && !mentions(r.problems, D[0]) && !mentions(r.problems, D[2]), JSON.stringify(r.problems));
  want('unverifiable: the unasked dates are listed in the verdict', r.mlb.unasked.join() === D[1]);
}
for (const [label, bad] of [['the string "0"', '0'], ['-1', -1], ['NaN', NaN], ['1.5', 1.5], ['undefined', undefined]]) {
  const e = espnOf(0, 0, 0); e.counts[D[2]] = bad;
  const r = judgeForwardWindow(clone(OFF), e);
  want(`unverifiable: a count of ${label} is not a zero (absence is not zero)`, r.mlb.state === 'unverifiable', JSON.stringify(r.mlb));
}
{
  const e = espnOf(0, 0, 0); delete e.counts[D[0]];
  want('unverifiable: a date with no entry at all is not a zero', judgeForwardWindow(clone(OFF), e).mlb.state === 'unverifiable');
}
{
  // An ESPN reading for a date the window did not read is no answer for the dates it did.
  const r = judgeForwardWindow(clone(OFF), { counts: { '2026-12-25': 0 }, errors: {} });
  want('unverifiable: a count for some OTHER date does not cover the window\'s dates', r.mlb.state === 'unverifiable');
}

// ── 2. a window with MLB entries is measured, and ESPN is not consulted ───────────────────────────────────────
{
  const r = judgeForwardWindow(clone(INS), null);
  want('in season: 3 MLB entries passes without ESPN', r.problems.length === 0 && r.mlb.state === 'measured' && r.notes.length === 0, JSON.stringify(r));
  const r2 = judgeForwardWindow(clone(INS), { counts: Object.fromEntries(INS.days.map((d) => [d.iso, 9])), errors: {} });
  want('in season: an ESPN reading that disagrees is not applied (the window is what is measured)',
       r2.problems.length === 0 && r2.mlb.state === 'measured', JSON.stringify(r2));
}

// ── 3. everything else the probe asserts stays asserted ────────────────────────────────────────────────────────
{
  const m = clone(INS); m.cacheAccepted = false;
  const r = judgeForwardWindow(m, null);
  want('cache never accepted -> FAIL', mentions(r.problems, 'never accepted into the cache'), JSON.stringify(r.problems));
}
{
  const m = clone(INS); m.schema = '2.0';
  want('schema 2.0 -> FAIL naming it', mentions(judgeForwardWindow(m, null).problems, 'schema is 2.0, expected 2.1'));
}
{
  const m = clone(INS); m.window_dates = ['2026-10-25'];
  want('window_dates of length 1 -> FAIL', mentions(judgeForwardWindow(m, null).problems, 'window_dates missing or shorter than 2'));
  const m2 = clone(INS); m2.window_dates = null;
  want('window_dates null -> FAIL', mentions(judgeForwardWindow(m2, null).problems, 'window_dates missing'));
}
{
  const m = clone(INS); m.days[1].windowHasDay = false;
  const r = judgeForwardWindow(m, null);
  want('one forward day not reaching the client -> FAIL naming that date only',
       r.problems.length === 1 && r.problems[0].startsWith(`${m.days[1].iso}:`), JSON.stringify(r.problems));
}
{
  const m = clone(INS); delete m.windowMlbTotal;
  const r = judgeForwardWindow(m, null);
  want('windowMlbTotal missing -> FAIL, state unread', r.mlb.state === 'unread' && mentions(r.problems, 'windowMlbTotal'), JSON.stringify(r));
  const m2 = clone(INS); m2.windowMlbTotal = '3';
  want('windowMlbTotal as the string "3" -> FAIL (not a number)', judgeForwardWindow(m2, null).mlb.state === 'unread');
  const m3 = clone(INS); m3.windowMlbTotal = NaN;
  want('windowMlbTotal NaN -> FAIL', judgeForwardWindow(m3, null).mlb.state === 'unread');
}
{
  const m = clone(INS); m.days = [];
  const r = judgeForwardWindow(m, null);
  want('no forward day read -> FAIL (an empty loop proves nothing)', mentions(r.problems, 'no forward day was read'), JSON.stringify(r.problems));
  const m0 = clone(OFF); m0.days = [];
  const r0 = judgeForwardWindow(m0, espnOf(0, 0, 0));
  want('no forward day read and total 0 -> FAIL, state unread, and no NOT MEASURED note for a window nobody read',
       r0.problems.length >= 1 && r0.mlb.state === 'unread' && r0.notes.length === 0, JSON.stringify(r0));
  const m1 = clone(INS); delete m1.days;
  want('days missing -> FAIL', mentions(judgeForwardWindow(m1, null).problems, 'no forward day was read'));
}
{
  // The real failed run: the cache was rejected, so nothing was read. It must fail on the cache, and an ESPN
  // zero must not turn it into a pass on the MLB clause.
  const r = judgeForwardWindow(clone(REJ), espnFor(REJ, 0, 0, 0));
  want('real cache-rejected run (2026-10-26) fails even with ESPN zero on ITS OWN dates', r.problems.length >= 1, JSON.stringify(r.problems));
  want('unread: that run read nothing, so it is state unread and gets no NOT MEASURED note (it printed one live on 2026-10-30)',
       r.mlb.state === 'unread' && r.notes.length === 0, JSON.stringify({ s: r.mlb.state, n: r.notes }));
  const rd = judgeForwardWindow(clone(REJ), espnFor(REJ, 4, 4, 4));
  want('unread: ESPN listing games on that run\'s own dates is not blamed on the generator',
       rd.mlb.state === 'unread' && !rd.problems.some((p) => p.includes('the generator dropped them')), JSON.stringify(rd));
  want('real cache-rejected run: every clause that failed is reported, none short-circuits',
       mentions(r.problems, 'never accepted') && mentions(r.problems, 'schema is null')
       && mentions(r.problems, 'window_dates missing') && r.problems.filter((p) => p.includes('scheduleForDate returned nothing')).length === 3,
       JSON.stringify(r.problems));
}
{
  const m = clone(OFF); m.days[1].windowHasDay = false;
  const r = judgeForwardWindow(m, espnOf(0, 0, 0));
  want('unread: one of three days not read, total 0 -> FAIL naming that day, state unread, no NOT MEASURED note',
       r.mlb.state === 'unread' && r.notes.length === 0 && r.problems.length === 1 && r.problems[0].startsWith(`${D[1]}:`), JSON.stringify(r));
}
{
  const read = (n) => Array.from({ length: n }, (_, i) => ({ iso: `d${i}`, windowHasDay: true }));
  const un = read(3); un[2].windowHasDay = false;
  want('espnNeeded: every day read and total 0 -> asked', espnNeeded(read(3), 0) === true);
  want('espnNeeded: total above 0 -> not asked', espnNeeded(read(3), 1) === false && espnNeeded(read(3), 3) === false);
  want('espnNeeded: one day unread -> not asked', espnNeeded(un, 0) === false);
  want('espnNeeded: no days -> not asked', espnNeeded([], 0) === false && espnNeeded(undefined, 0) === false);
  want('espnNeeded: a total that is not the number 0 -> not asked', espnNeeded(read(3), '0') === false && espnNeeded(read(3), null) === false && espnNeeded(read(3), undefined) === false);
}
{
  const m = clone(OFF); m.cacheAccepted = false; m.schema = '2.0';
  const r = judgeForwardWindow(m, espnOf(0, 0, 0));
  want('the MLB clause\'s NOT MEASURED note does not mask a failed cache or schema',
       r.problems.length === 2 && r.mlb.state === 'not-measured', JSON.stringify(r.problems));
}

// ── 4. askEspnMlb, as the real function, against a fake fetch ───────────────────────────────────────────────────
const fake = (byDate, urls = []) => async (url) => {
  urls.push(url);
  const d = url.slice(-8);
  const v = byDate[d];
  if (v instanceof Error) throw v;
  // A failed response whose body still parses as an empty list must not read as "ESPN lists none".
  if (v && v.status) return { ok: false, status: v.status, json: async () => ({ events: [] }) };
  return { ok: true, status: 200, json: async () => (v === undefined ? { events: [] } : v) };
};
{
  const urls = [];
  const r = await askEspnMlb(D, fake({}, urls));
  want('askEspnMlb: one request per date, on the ESPN MLB scoreboard, YYYYMMDD',
       urls.length === 3 && urls[0].includes('/baseball/mlb/scoreboard?dates=20261031')
       && urls[1].endsWith('dates=20261101') && urls[2].endsWith('dates=20261102'), urls.join(' '));
  want('askEspnMlb: events [] on every date reads as 0 on every date', D.every((iso) => r.counts[iso] === 0) && Object.keys(r.errors).length === 0);
}
{
  const r = await askEspnMlb(D, fake({ 20261101: { events: [{}, {}] } }));
  want('askEspnMlb: the length of events is the count', r.counts[D[1]] === 2 && r.counts[D[0]] === 0);
  const r2 = await askEspnMlb(D, fake({ 20261101: { events: [{}, {}] } }));
  want('askEspnMlb -> judge: ESPN listing games fails the window', judgeForwardWindow(clone(OFF), r2).mlb.state === 'dropped');
}
{
  const r = await askEspnMlb(D, fake({ 20261101: { status: 503 } }));
  want('askEspnMlb: HTTP 503 is null with the error recorded, not 0', r.counts[D[1]] === null && r.errors[D[1]] === 'HTTP 503', JSON.stringify(r));
  want('askEspnMlb -> judge: one failed date makes the window unverifiable', judgeForwardWindow(clone(OFF), r).mlb.state === 'unverifiable');
  want('askEspnMlb: a failed date does not stop the other dates being asked', r.counts[D[0]] === 0 && r.counts[D[2]] === 0);
}
{
  const r = await askEspnMlb(D, fake({ 20261031: new Error('network down') }));
  want('askEspnMlb: a thrown fetch is null with the error recorded', r.counts[D[0]] === null && /network down/.test(r.errors[D[0]]), JSON.stringify(r));
}
for (const [label, body] of [['{}', {}], ['{events: null}', { events: null }], ['{events: "none"}', { events: 'none' }], ['null', null]]) {
  const r = await askEspnMlb(D, fake({ 20261102: body }));
  want(`askEspnMlb: a body of ${label} has no events array and is null, not 0`, r.counts[D[2]] === null && !!r.errors[D[2]], JSON.stringify(r));
}
{
  const r = await askEspnMlb(D, fake({}));
  const j = judgeForwardWindow(clone(OFF), r);
  want('askEspnMlb -> judge end to end: ESPN all zero on a real off-season manifest passes as NOT MEASURED',
       j.problems.length === 0 && j.mlb.state === 'not-measured', JSON.stringify(j));
}

// ── 5. the probe is wired to the judge and holds no rule of its own ───────────────────────────────────────────
const src = readFileSync(PROBE, 'utf8');
const at = (needle) => src.indexOf(needle);
const WRITE = ['fs.writeFileSync(`${OUT}/forward-window', '-manifest-latest.json`, JSON.stringify(manifest'].join('');
want('probe: requires the judge module', src.includes("require('./scripts/forward-window-judge.cjs')"));
want('probe: the verdict is the judge\'s', src.includes('judgeForwardWindow(manifest, espn)'));
want('probe: ESPN is asked before the manifest is judged and written',
     at('askEspnMlb(isoDays, fetch)') > 0 && at('askEspnMlb(isoDays, fetch)') < at('judgeForwardWindow(manifest, espn)')
     && at('judgeForwardWindow(manifest, espn)') < at(WRITE), `${at('askEspnMlb(isoDays, fetch)')} ${at('judgeForwardWindow(manifest, espn)')} ${at(WRITE)}`);
want('probe: the manifest that is written carries the verdict and the ESPN reading',
     at('manifest.verdict = verdict') > 0 && at('manifest.verdict = verdict') < at(WRITE) && src.includes('espnMlb: espn'));
want('probe: ESPN is asked only when every day was read and the window is empty (the judge\'s own definition)',
     src.includes('espnNeeded(days, windowMlbTotal) ? await askEspnMlb('));
want('probe: the exit code follows the verdict', src.includes('verdict.problems.length) {') && src.includes('process.exit(1); }'));
want('probe: the old rule (any 0 is a problem) is gone',
     !src.includes(['every forward day carried 0', ' MLB entries'].join('')) && !src.includes('manifest.windowMlbTotal === 0'));
want('probe: no inline copy of the cache/schema/window rules remains',
     !src.includes('problems.push(') && !src.includes('const problems = []'));

console.log(`\nchecked ${ran} case(s): 3 real manifests (three distinct runs) x enumerated ESPN inputs through the real judgeForwardWindow and askEspnMlb; `
          + 'the probe\'s wiring is checked as text and runs on the runner.');
if (failed) { console.error(`FAIL — ${failed} case(s).`); process.exit(1); }
console.log('PASS');
