#!/usr/bin/env node
// The forward-window probe's relay capture: per-sport counts the window file does not carry, reported beside it
// (scripts/forward-window-relay.cjs; the probe is forward_window_probe.js).
//
// THE GAP. The probe asserts one thing about content, the MLB count, and the window file carries only MLB, MLS and WNBA on
// forward days. On 2026-10-30 the relay listed 12 NFL games for Sunday 11-01 and 10 NHL games for 10-31 while the file carried
// 0 for each and the probe passed. The capture puts both counts in the manifest. It adds no problem to the verdict and is
// attached to the manifest after the judge has run: what counts as a failure for these sports is the owner's decision.
//
// THE TRAP. The relay answers HTTP 200 with `games: [], count: 0, source: "nhle-error"` when NHL's API fails, which reads as
// no games unless `source` is checked. ESPN-side failures are 502/500 with an `error` key. Every one is null with a reason,
// never 0. The success shapes and the error shapes below are driven from outbox/fixture-relay-v2-games-20261030.json: the
// success shapes were observed live on 2026-10-30; the error shapes were READ from field-relay-nba src/index.js, not observed.
//
// Coverage (Rule 91): the collector, the table builder and captureOtherSports run as the real functions against a fake fetch
// built from the fixture's shapes (nfl, nhl, nba observed; cfb treated as nfl, not observed). The probe's in-page read is
// EXECUTED here too: its source is cut out of forward_window_probe.js and run against a fake window. What is checked as TEXT
// only: the order of the probe's statements, the call sites, and that exit codes come from the verdict alone. The probe's
// remaining manifest-building lines (the MLB total, cacheAccepted, schema) are not executed by this file; the runner is their
// check.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const RELAY = process.env.RELAY_SRC || 'scripts/forward-window-relay.cjs';
const PROBE = process.env.PROBE_SRC || 'forward_window_probe.js';
const FIXTURE = 'outbox/fixture-relay-v2-games-20261030.json';
const MANIFESTS = 'outbox/fixture-forward-window-manifests-20261030.json';
const JUDGE = process.env.JUDGE_SRC || 'scripts/forward-window-judge.cjs';

const require = createRequire(import.meta.url);
const { askRelaySports, coverageRows, coverageLines, captureOtherSports, RELAY_V2_GAMES, DEFAULT_TIMEOUT_MS, NHL_DAYS_AHEAD } = require(path.resolve(RELAY));
const { judgeForwardWindow } = require(path.resolve(JUDGE));
const fx = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const manifests = JSON.parse(readFileSync(MANIFESTS, 'utf8')).manifests;

let failed = 0, ran = 0, section = 'relay';
const tally = {};
const want = (label, ok, detail) => {
  ran++; tally[section] = (tally[section] || 0) + 1;
  if (ok) console.log(`  ok    ${label}`);
  else { failed++; console.error(`  FAIL  ${label}${detail ? ' -> ' + detail : ''}`); }
};
const settle = async (p) => { try { return { value: await p }; } catch (e) { return { error: String((e && e.message) || e) }; } };
const clone = (o) => JSON.parse(JSON.stringify(o));

const TODAY = '2026-10-30';
const D = ['2026-10-31', '2026-11-01', '2026-11-02'];
const SPORTS = ['nfl', 'cfb', 'nba', 'nhl'];
const REAL = { nfl: fx.observed.nfl, cfb: fx.observed.nfl, nba: fx.observed.nba, nhl: fx.observed.nhl };

// A clean relay answer with n copies of the real first game for that sport.
const answer = (sport, iso, n, source) => ({
  sport, date: iso, games: Array.from({ length: n }, () => clone(REAL[sport].game)),
  count: n, source: source || REAL[sport].source, ts: 1793399498555,
});
// handler(sport, iso) -> { status?, json?, throws?, jsonThrows? }; unlisted cells answer a clean empty day.
const fake = (handler, urls = []) => async (url) => {
  urls.push(url);
  const u = new URL(url);
  const sport = u.searchParams.get('sport'), iso = u.searchParams.get('date');
  const h = (handler && handler(sport, iso)) || {};
  if (h.throws) throw new Error(h.throws);
  const status = h.status || 200;
  const json = h.json === undefined ? answer(sport, iso, 0) : h.json;
  return { ok: status >= 200 && status < 300, status, json: async () => { if (h.jsonThrows) throw new Error('Unexpected token < in JSON'); return json; } };
};
const cell = (r, s, iso) => r.counts[s][iso];
const none = () => Object.fromEntries(SPORTS.map((s) => [s, {}]));
// askRelaySports must resolve for every input. A rejection is a FAIL line (and the cells read as unknown), not a crash.
const ask = async (isoDays, fetchImpl, opts = {}) => {
  try { return await askRelaySports(isoDays, fetchImpl, { today: TODAY, ...opts }); }
  catch (e) {
    want('relay: askRelaySports must resolve for every input (it rejected)', false, String((e && e.message) || e));
    return { counts: none(), sources: none(), errors: none() };
  }
};

// ── the collector ────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const urls = [];
  const r = await ask(D, fake(null, urls));
  const want12 = SPORTS.flatMap((s) => D.map((d) => `${RELAY_V2_GAMES}?sport=${s}&date=${d}`));
  want('relay: every sport and day is asked exactly once, on https://field-relay-nba.jeffunglesbee.workers.dev/v2/games',
       urls.length === 12 && want12.every((u) => urls.filter((x) => x === u).length === 1)
       && RELAY_V2_GAMES === 'https://field-relay-nba.jeffunglesbee.workers.dev/v2/games', urls.join(' '));
  want('relay: a clean empty day is a real 0, with its source recorded and no error',
       SPORTS.every((s) => D.every((d) => cell(r, s, d) === 0 && r.sources[s][d] === REAL[s].source && !(d in r.errors[s]))), JSON.stringify(r.counts));
  want('relay: the reading carries an ISO timestamp and the URL it asked', typeof r.asked_at === 'string' && r.asked_at.endsWith('Z') && !Number.isNaN(Date.parse(r.asked_at)) && r.url === RELAY_V2_GAMES);
  want('relay: the fake answer has exactly the fixture\'s top-level keys (so the shapes below are the real ones)',
       Object.keys(answer('nfl', D[0], 1)).sort().join() === fx.top_level_keys.slice().sort().join(), Object.keys(answer('nfl', D[0], 1)).join());
}
{
  // The numbers the relay actually returned on 2026-10-30 (fixture): 12 NFL on 11-01, 10 NHL on 10-31.
  const r = await ask(D, fake((s, d) => {
    if (s === 'nfl' && d === '2026-11-01') return { json: answer('nfl', d, fx.observed.nfl.count) };
    if (s === 'nhl' && d === '2026-10-31') return { json: answer('nhl', d, fx.observed.nhl.count, 'nhle') };
    return null;
  }));
  want('relay: the real counts come through (12 NFL on 2026-11-01, 10 NHL on 2026-10-31)', cell(r, 'nfl', '2026-11-01') === 12 && cell(r, 'nhl', '2026-10-31') === 10, JSON.stringify(r.counts));
  want('relay: the source is recorded per cell (espn-wc for nfl, nhle for nhl)', r.sources.nfl['2026-11-01'] === 'espn-wc' && r.sources.nhl['2026-10-31'] === 'nhle', JSON.stringify(r.sources));
  want('relay: a day beside a busy day stays 0', cell(r, 'nfl', '2026-11-02') === 0 && cell(r, 'nhl', '2026-11-01') === 0);
}
{
  const r = await ask(D, fake((s, d) => ({ json: { ...answer(s, d, 2), count: 99 } })));
  want('relay: the count is the length of games, not the count field', SPORTS.every((s) => D.every((d) => cell(r, s, d) === 2)), JSON.stringify(r.counts));
}
// The failure shapes come from the fixture (read from the relay source), each as the cell they would arrive for.
for (const [name, shape] of Object.entries(fx.error_shapes_from_source)) {
  const sport = shape.body.sport || 'nfl', iso = shape.body.date || D[1];
  const r = await ask(D, fake((s, d) => (s === sport && d === iso ? { status: shape.http, json: shape.body } : null)));
  const expected = shape.http === 200 ? `relay source ${shape.body.source}` : `HTTP ${shape.http}`;
  want(`relay: the fixture's ${name} (HTTP ${shape.http}) is null with "${expected}", not 0`,
       cell(r, sport, iso) === null && r.errors[sport][iso] === expected, JSON.stringify({ c: cell(r, sport, iso), e: r.errors[sport][iso] }));
}
{
  const r = await ask(D, fake((s, d) => (s === 'nba' && d === D[0] ? { status: 503, json: answer(s, d, 0) } : null)));
  want('relay: HTTP 503 whose body parses as a clean empty answer is still null', cell(r, 'nba', D[0]) === null && r.errors.nba[D[0]] === 'HTTP 503', JSON.stringify(r.errors.nba));
  const r2 = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { status: 502, jsonThrows: true } : null)));
  want('relay: a 502 whose body is not JSON is "HTTP 502" (the status is read before the body)', r2.errors.nfl[D[1]] === 'HTTP 502', JSON.stringify(r2.errors.nfl));
}
{
  const r = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { json: { ...answer(s, d, 0), error: 'ESPN upstream 502' } } : null)));
  want('relay: HTTP 200 with an error key is null, with the relay\'s words',
       cell(r, 'nfl', D[1]) === null && /^relay error: ESPN upstream 502/.test(r.errors.nfl[D[1]] || ''), JSON.stringify(r.errors.nfl));
  const r2 = await ask(D, fake((s, d) => (s === 'nba' && d === D[2] ? { json: { ...answer(s, d, 3), source: 'espn-ERROR-fallback' } } : null)));
  want('relay: any source containing "error", in any case, is null', cell(r2, 'nba', D[2]) === null && r2.errors.nba[D[2]] === 'relay source espn-ERROR-fallback', JSON.stringify(r2.errors.nba));
  const noSource = answer('nfl', D[1], 2); delete noSource.source;
  const r3 = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { json: noSource } : null)));
  want('relay: an answer with no source keeps its count and records the source as null', cell(r3, 'nfl', D[1]) === 2 && r3.sources.nfl[D[1]] === null, JSON.stringify({ c: cell(r3, 'nfl', D[1]), s: r3.sources.nfl[D[1]] }));
}
for (const [label, body] of [['games missing', { sport: 'nfl', date: D[1], count: 0, source: 'espn-wc' }], ['games null', { sport: 'nfl', date: D[1], games: null, source: 'espn-wc' }],
                             ['games a string', { sport: 'nfl', date: D[1], games: 'none', source: 'espn-wc' }]]) {
  const r = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { json: body } : null)));
  want(`relay: ${label} is null, not 0`, cell(r, 'nfl', D[1]) === null && r.errors.nfl[D[1]] === 'response has no games array', JSON.stringify(r.errors.nfl));
}
for (const [label, body] of [['JSON null', null], ['a string', 'oops']]) {
  const r = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { json: body } : null)));
  want(`relay: a body that is ${label} is null, said to be not an object`, cell(r, 'nfl', D[1]) === null && r.errors.nfl[D[1]] === 'response is not an object', JSON.stringify(r.errors.nfl));
}
{
  const r = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { json: { ...answer(s, d, 3), date: '2026-10-30' } } : null)));
  want('relay: an answer for another date (the route defaults a missing date to today) is null',
       cell(r, 'nfl', D[1]) === null && /relay answered for nfl 2026-10-30/.test(r.errors.nfl[D[1]] || ''), JSON.stringify(r.errors.nfl));
  const r2 = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { json: { ...answer(s, d, 3), sport: 'cfb' } } : null)));
  want('relay: an answer for another sport is null', cell(r2, 'nfl', D[1]) === null && /relay answered for cfb/.test(r2.errors.nfl[D[1]] || ''), JSON.stringify(r2.errors.nfl));
}
{
  const urls = [];
  const r = await settle(askRelaySports(D, fake((s, d) => (s === 'cfb' && d === D[2] ? { throws: 'network down' } : (s === 'nhl' && d === D[0] ? { status: 502, json: {} } : null)), urls), { today: TODAY }));
  const v = r.value;
  want('relay: one failing cell does not stop the others (the call resolves)', !!v, JSON.stringify(r));
  want('relay: a failed cell is null with its reason and the other ten cells keep their answers',
       !!v && v.counts.cfb[D[2]] === null && /network down/.test(v.errors.cfb[D[2]] || '') && v.counts.nhl[D[0]] === null
       && SPORTS.flatMap((s) => D.map((d) => [s, d])).filter(([s, d]) => !((s === 'cfb' && d === D[2]) || (s === 'nhl' && d === D[0])))
          .every(([s, d]) => v.counts[s][d] === 0), JSON.stringify(v && v.counts));
  want('relay: a failing cell is asked once (no retry): 12 requests for 12 cells', urls.length === 12, String(urls.length));
  const long = await ask(D, fake((s, d) => (s === 'nfl' && d === D[0] ? { throws: 'x'.repeat(5000) } : null)));
  want('relay: a recorded reason is cut at 200 characters', long.errors.nfl[D[0]].length === 200, String(long.errors.nfl[D[0]].length));
}
{
  const hang = (url, opts) => new Promise((resolve, reject) => { if (opts && opts.signal) opts.signal.addEventListener('abort', () => reject(opts.signal.reason)); });
  let timer;
  const r = await Promise.race([askRelaySports(['2026-11-01'], hang, { sports: ['nfl'], timeoutMs: 50, today: TODAY }), new Promise((res) => { timer = setTimeout(() => res('HUNG'), 3000); })]);
  clearTimeout(timer);
  want('relay: a request that never answers is cut off by the timeout and recorded as null with its reason',
       r !== 'HUNG' && r.counts.nfl['2026-11-01'] === null && /abort|timeout/i.test(r.errors.nfl['2026-11-01'] || ''), JSON.stringify(r));
}
{
  // The default timeout is 15 s and the option overrides it: observed through the signal the collector builds.
  const real = AbortSignal.timeout; const seen = [];
  AbortSignal.timeout = (ms) => { seen.push(ms); return new AbortController().signal; };
  try {
    await ask(['2026-10-31'], fake(null), { sports: ['nfl'] });
    await ask(['2026-10-31'], fake(null), { sports: ['nfl'], timeoutMs: 50 });
  } finally { AbortSignal.timeout = real; }
  want('relay: the default timeout is 15000 ms and the option overrides it', seen[0] === 15000 && seen[1] === 50 && DEFAULT_TIMEOUT_MS === 15000, JSON.stringify(seen));
}
{
  // Parallel: all twelve requests are in flight before any is answered. The check releases them on a timer and carries
  // its own watchdog, so a serial collector is a FAIL line and not a hang.
  let inflight = 0, max = 0; const waiters = [];
  const gated = async (url) => {
    inflight++; max = Math.max(max, inflight);
    await new Promise((r) => waiters.push(r));
    inflight--;
    const u = new URL(url);
    return { ok: true, status: 200, json: async () => answer(u.searchParams.get('sport'), u.searchParams.get('date'), 0) };
  };
  const p = ask(D, gated);
  await new Promise((r) => setTimeout(r, 40));
  const seen = inflight;
  const pump = setInterval(() => waiters.splice(0).forEach((r) => r()), 5);
  let timer;
  const done = await Promise.race([p.then(() => 'done'), new Promise((res) => { timer = setTimeout(() => res('HUNG'), 3000); })]);
  clearTimeout(timer); clearInterval(pump);
  want('relay: all twelve requests are in flight at once (parallel)', seen === 12 && max === 12 && done === 'done', JSON.stringify({ seen, max, done }));
}
{
  const urls = [];
  const r = await ask(['2026-10-29', '2026-10-30', '2026-10-31'], fake(null, urls), { sports: ['nfl'] });
  want('relay: a day before the runner\'s date is not asked (a finished day can start the relay\'s brief pipeline)',
       urls.length === 2 && !urls.some((u) => u.includes('2026-10-29')) && cell(r, 'nfl', '2026-10-29') === null
       && /^not asked: 2026-10-29 is before 2026-10-30/.test(r.errors.nfl['2026-10-29'] || ''), JSON.stringify({ urls, e: r.errors.nfl }));
  want('relay: the runner\'s own date is asked', cell(r, 'nfl', '2026-10-30') === 0);
}
{
  const urls = [];
  const lastOk = '2026-11-05', firstOut = '2026-11-06';   // TODAY + 6 and + 7
  const r = await ask([lastOk, firstOut], fake(null, urls), { sports: ['nhl', 'nfl'] });
  want(`relay: an NHL day more than ${NHL_DAYS_AHEAD} days ahead is not asked (the relay's NHL scoreboard window ends; an empty answer is not a zero)`,
       NHL_DAYS_AHEAD === 6 && cell(r, 'nhl', lastOk) === 0 && cell(r, 'nhl', firstOut) === null && /^not asked: 2026-11-06 is past the NHL scoreboard window/.test(r.errors.nhl[firstOut] || ''), JSON.stringify({ n: r.counts.nhl, e: r.errors.nhl }));
  want('relay: the NHL ceiling applies to NHL only', cell(r, 'nfl', firstOut) === 0 && urls.length === 3, JSON.stringify(urls));
}
{
  const urls = [];
  const past = await settle(askRelaySports(['2000-01-01'], fake(null, urls), { sports: ['nfl'] }));
  const future = await settle(askRelaySports(['2999-01-01'], fake(null, urls), { sports: ['nfl', 'nhl'] }));
  want('relay: the default "today" is the runner\'s own clock (2000-01-01 is not asked, 2999-01-01 is, except for NHL)',
       past.value.counts.nfl['2000-01-01'] === null && future.value.counts.nfl['2999-01-01'] === 0 && future.value.counts.nhl['2999-01-01'] === null && urls.length === 1, JSON.stringify({ urls }));
}
{
  const r = await settle(askRelaySports(D, undefined, { today: TODAY }));
  want('relay: with no fetch at all the call still resolves, every cell null', !!r.value && SPORTS.every((s) => D.every((d) => r.value.counts[s][d] === null)), JSON.stringify(r));
}
{
  const urls = [];
  const r = await ask(D, fake(null, urls), { sports: ['nfl'] });
  want('relay: the sports option limits what is asked', urls.length === 3 && Object.keys(r.counts).join() === 'nfl', urls.join(' '));
}

// ── the table the manifest and the log carry ───────────────────────────────────────────────────────────────────────────
section = 'coverage';
const FILE = {   // distinct on every day and sport, so a constant, a missing key or another day's row cannot pass
  '2026-10-31': { nhl: 3, nba: 5, mlb: 0, soccer: 2, wnba: 1 },
  '2026-11-01': { nhl: 7, nba: 6, mlb: 0, soccer: 0, wnba: 4 },
  '2026-11-02': { nhl: 9, nba: 8, mlb: 1, soccer: 0, wnba: 0 },
};
const days = D.map((iso) => ({ iso, windowBySport: FILE[iso] }));
const relayAnswers = (s, d) => {
  const n = { nfl: { [D[1]]: 12, [D[2]]: 1 }, cfb: { [D[0]]: 47 }, nba: { [D[0]]: 7, [D[1]]: 4, [D[2]]: 15 }, nhl: { [D[0]]: 10, [D[1]]: 5, [D[2]]: 4 } }[s][d] || 0;
  return { json: answer(s, d, n) };
};
{
  const relay = await ask(D, fake(relayAnswers));
  const rows = coverageRows(days, relay);
  const lines = coverageLines(rows);
  want('coverage: one row per day, in order', rows.length === 3 && rows.map((r) => r.iso).join() === D.join(), JSON.stringify(rows.map((r) => r.iso)));
  want('coverage: every row carries exactly its own day\'s file counts', rows.every((r, i) => JSON.stringify(r.window) === JSON.stringify(FILE[D[i]])), JSON.stringify(rows.map((r) => r.window)));
  want('coverage: every row carries the relay\'s counts for its own day', rows[0].relay.nhl === 10 && rows[1].relay.nhl === 5 && rows[2].relay.nhl === 4 && rows[1].relay.nfl === 12 && rows[0].relay.cfb === 47, JSON.stringify(rows.map((r) => r.relay)));
  want('coverage: NHL reads, day by day, the relay count beside the file count',
       lines.find((l) => l.startsWith('nhl:')) === 'nhl: 2026-10-31 relay 10, file 3 | 2026-11-01 relay 5, file 7 | 2026-11-02 relay 4, file 9', lines.find((l) => l.startsWith('nhl:')));
  want('coverage: NFL reads "file -" on every day (the file has no key for it)',
       lines.find((l) => l.startsWith('nfl:')) === 'nfl: 2026-10-31 relay 0, file - | 2026-11-01 relay 12, file - | 2026-11-02 relay 1, file -', lines.find((l) => l.startsWith('nfl:')));
  want('coverage: there is one line per sport asked, in order', lines.length === 4 && lines.map((l) => l.split(':')[0]).join() === 'nfl,cfb,nba,nhl');
}
{
  const relay = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { status: 502, json: {} } : null)));
  const rows = coverageRows([{ iso: D[0], windowBySport: null }, { iso: D[1], windowBySport: FILE[D[1]] }], relay);
  const lines = coverageLines(rows);
  const nfl = lines.find((l) => l.startsWith('nfl:')) || '';
  want('coverage: rows carry null where the relay could not answer, not 0', rows[1].relay.nfl === null && rows[1].relay.cfb === 0, JSON.stringify(rows[1].relay));
  want('coverage: a cell the relay could not answer reads "unasked"', nfl.includes(`${D[1]} relay unasked`), nfl);
  want('coverage: a day that was not read reads "file unread", not a count', nfl.includes(`${D[0]} relay 0, file unread`), nfl);
  want('coverage: a day that was not read has window null', rows[0].window === null);
}
{
  const safe = (f) => { try { return { v: f() }; } catch (e) { return { threw: String((e && e.message) || e) }; } };
  const empty = safe(() => coverageRows([], { counts: {} }));
  want('coverage: no days and no sports give no rows and no lines, and do not throw', !empty.threw && empty.v.length === 0 && safe(() => coverageLines(empty.v)).v?.length === 0, JSON.stringify(empty));
  want('coverage: a missing relay result gives rows with nothing in them',
       JSON.stringify(coverageRows([{ iso: D[0], windowBySport: { nhl: 1 } }], null)) === JSON.stringify([{ iso: D[0], window: { nhl: 1 }, relay: {} }]));
  want('coverage: a windowBySport that is not an object is treated as unread', coverageRows([{ iso: D[0], windowBySport: 'x' }], { counts: {} })[0].window === null);
  want('coverage: a day the relay never listed for a sport is null', coverageRows([{ iso: '2030-01-01', windowBySport: {} }], { counts: { nfl: { [D[0]]: 3 } } })[0].relay.nfl === null);
  const nul = safe(() => coverageRows(null, { counts: {} })), und = safe(() => coverageRows(undefined, null));
  want('coverage: days that are not an array give no rows', nul.v?.length === 0 && und.v?.length === 0, JSON.stringify({ nul, und }));
}
{
  // captureOtherSports is what the probe calls: the reading and the table in one step, and it never rejects.
  const out = await settle(captureOtherSports(days, D, fake(relayAnswers), { today: TODAY }));
  const v = out.value;
  want('capture: returns { relay, coverage } and the table is built from that same reading',
       v?.relay?.counts?.nfl?.[D[1]] === 12 && JSON.stringify(v?.coverage) === JSON.stringify(coverageRows(days, v?.relay)) && v?.coverage?.[1]?.relay?.nfl === 12 && v?.coverage?.[1]?.window?.nhl === 7, JSON.stringify(out));
  const bad = await settle(captureOtherSports(null, D, undefined, { today: TODAY }));
  want('capture: with no days, no fetch and no table input it still resolves', !!bad.value && Array.isArray(bad.value.coverage) && bad.value.coverage.length === 0, JSON.stringify(bad));
  const bad2 = await settle(captureOtherSports(days, [], fake(null), { today: TODAY }));
  want('capture: with no forward days it resolves with empty cells', !!bad2.value && SPORTS.every((s) => Object.keys(bad2.value.relay?.counts?.[s] ?? { x: 1 }).length === 0), JSON.stringify(bad2));
}

// ── the judge cannot see or be failed by the capture ───────────────────────────────────────────────────────────────────
section = 'judge isolation';
{
  const espn = { counts: { '2026-10-31': 0, '2026-11-01': 0, '2026-11-02': 0 }, errors: {} };
  const ok = clone(manifests.offseason.manifest), odd = { ...clone(ok), relaySports: { counts: 'x', errors: 7 }, coverage: [{ iso: 'x', window: null, relay: { nfl: 99 } }] };
  want('judge: the same verdict with or without relay keys in the manifest (a healthy window)',
       JSON.stringify(judgeForwardWindow(ok, espn)) === JSON.stringify(judgeForwardWindow(odd, espn)));
  const bad = clone(manifests.context_lost.manifest), bad2 = { ...clone(bad), relaySports: { counts: { nfl: { x: 99 } } }, coverage: [{ relay: { nfl: 99 } }] };
  want('judge: the same verdict with or without relay keys in the manifest (a failed run)',
       JSON.stringify(judgeForwardWindow(bad, espn)) === JSON.stringify(judgeForwardWindow(bad2, espn)));
}

// ── the probe's in-page read, executed ─────────────────────────────────────────────────────────────────────────────────
section = 'in-page read';
const src = readFileSync(PROBE, 'utf8');
{
  const head = 'const windowRead = await readPv(';
  const start = src.indexOf(head) + head.length;
  const end = src.indexOf(', isoDays);', start);
  const fnText = start > head.length && end > start ? src.slice(start, end) : '';
  want('in-page: the probe\'s window read was found and cut out of its source', fnText.startsWith('(list) =>') && fnText.includes('scheduleForDate'), fnText.slice(0, 60));
  const run = (sched, days2) => {
    const fn = new Function('window', `return (${fnText})`)({ _plVerify: { scheduleForDate: (d) => (d in sched ? sched[d] : null) } });
    return fn(days2);
  };
  const g = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));
  const out = fnText ? run({
    '2026-10-31': { nhl: g(2), nba: g(0), mlb: g(1), soccer: g(0), wnba: g(1), matchupNotes: { a: 1 }, label: 'x' },
    '2026-11-01': { nhl: g(0), wnba: g(0) },
    '2026-11-02': {},
  }, ['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03']) : [];
  want('in-page: a day\'s per-sport counts are the lengths of its arrays, and non-array keys are left out',
       JSON.stringify(out[0] && out[0].bySport) === JSON.stringify({ nhl: 2, nba: 0, mlb: 1, soccer: 0, wnba: 1 }), JSON.stringify(out[0]));
  want('in-page: the MLB count is the length of the mlb array, and the day is marked read', !!out[0] && out[0].mlb === 1 && out[0].has === true && out[0].iso === '2026-10-31');
  want('in-page: a day with no mlb key counts 0 MLB and is still read', !!out[1] && out[1].mlb === 0 && out[1].has === true && JSON.stringify(out[1].bySport) === JSON.stringify({ nhl: 0, wnba: 0 }), JSON.stringify(out[1]));
  want('in-page: an empty schedule object is a read day with no sports', !!out[2] && out[2].has === true && JSON.stringify(out[2].bySport) === '{}', JSON.stringify(out[2]));
  want('in-page: a day the window does not have is not read, with bySport null (not an empty object)', !!out[3] && out[3].has === false && out[3].mlb === 0 && out[3].bySport === null, JSON.stringify(out[3]));
}

// ── the probe is wired to the capture and cannot fail on it ─────────────────────────────────────────────────────────────
section = 'probe text';
const at = (n) => src.indexOf(n);
const count = (n) => src.split(n).length - 1;
const CAPTURE = '  const { relay, coverage } = await captureOtherSports(days, isoDays, fetch);';
const WRITE = ['fs.writeFileSync(`${OUT}/forward-window', '-manifest-latest.json`, JSON.stringify(manifest'].join('');
want('probe: requires the capture module for captureOtherSports and coverageLines', src.includes("const { captureOtherSports, coverageLines } = require('./scripts/forward-window-relay.cjs');"));
want('probe: the capture is one top-level statement that passes the days, the forward days and the global fetch', count(CAPTURE) === 1, String(count(CAPTURE)));
want('probe: the order is ESPN question, capture, judge, then the relay keys, then the write',
     at('askEspnMlb(') > 0 && at(CAPTURE) > at('askEspnMlb(') && at('judgeForwardWindow(manifest, espn)') > at(CAPTURE)
     && at('manifest.relaySports = relay;') > at('judgeForwardWindow(manifest, espn)') && at('manifest.coverage = coverage;') > at('manifest.relaySports = relay;')
     && at(WRITE) > at('manifest.coverage = coverage;'), JSON.stringify([at('askEspnMlb('), at(CAPTURE), at('judgeForwardWindow(manifest, espn)'), at('manifest.relaySports = relay;'), at('manifest.coverage = coverage;'), at(WRITE)]));
want('probe: the relay keys are attached after the judge and are not in the manifest literal the judge reads', !src.includes('relaySports: relay') && count('manifest.relaySports = relay;') === 1 && count('manifest.coverage = coverage;') === 1);
want('probe: the judge call keeps its two arguments', count('judgeForwardWindow(manifest, espn)') === 1 && !src.includes('judgeForwardWindow(manifest, espn, '));
want('probe: only the verdict can fail the run (verdict.problems appears in the one exit branch and nowhere else; two process.exit calls, no exitCode)',
     count('verdict.problems') === 2 && count('process.exit(') === 2 && count('exitCode') === 0 && !/problems\.(push|unshift|splice|concat)\(/.test(src.replace(/verdict\.problems\.join/g, '')), JSON.stringify([count('verdict.problems'), count('process.exit('), count('exitCode')]));
want('probe: the day keeps the in-page per-sport counts', src.includes('windowBySport: w.bySport,'));
want('probe: the table is printed in the run log under a label that does not claim more than it says',
     src.includes('for (const line of coverageLines(coverage))') && src.includes("console.log('\\nCOVERAGE (reported, not asserted):');"));

console.log(`\nchecked ${ran} case(s): ${tally['relay']} on askRelaySports (a fake fetch driven by the fixture's shapes: nfl, nba and nhl observed live, cfb treated as nfl and not observed; error shapes read from the relay source), `
          + `${tally['coverage']} on the table builder and captureOtherSports, ${tally['judge isolation']} on the judge ignoring the relay keys, ${tally['in-page read']} on the probe's in-page read (its source executed against a fake window), `
          + `${tally['probe text']} text assertions on forward_window_probe.js. The probe's remaining manifest-building lines (MLB total, cacheAccepted, schema) are NOT executed here; the runner is their check.`);
if (failed) { console.error(`FAIL — ${failed} case(s).`); process.exit(1); }
console.log('PASS');
