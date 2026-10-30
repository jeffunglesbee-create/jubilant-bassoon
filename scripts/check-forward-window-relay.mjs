#!/usr/bin/env node
// The forward-window probe's relay capture: per-sport counts the window file does not carry, reported beside it
// (scripts/forward-window-relay.cjs; the probe is forward_window_probe.js).
//
// THE GAP. The probe asserts one thing about content, the MLB count, and the window file carries only MLB, MLS and WNBA on
// forward days. On 2026-10-30 the relay listed 12 NFL games for Sunday 11-01, 10 NHL games for 10-31 and 10 NBA games for
// 10-30 while the file carried 0 for each and the probe passed. The capture puts both counts in the manifest. It adds no
// problem to the verdict: what counts as a failure for these sports is the owner's decision.
//
// THE TRAP. The relay answers HTTP 200 with `games: [], count: 0, source: "nhle-error"` when NHL's API fails, which reads as
// no games unless `source` is checked. ESPN-side failures are 502/500 with an `error` key. Every one is null with a reason,
// never 0. Those error shapes were read from field-relay-nba src/index.js (lines named in the fixture), not observed live;
// the success shapes in outbox/fixture-relay-v2-games-20261030.json were observed live on 2026-10-30.
//
// Coverage (Rule 91): the collector and the table builder run as the real functions against a fake fetch built from the
// fixture's real game shapes (nfl, nhl, nba; cfb is treated as nfl and was not observed). The probe's in-page read and the
// manifest-building lines are checked as TEXT only; the runner is their check.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const RELAY = process.env.RELAY_SRC || 'scripts/forward-window-relay.cjs';
const PROBE = process.env.PROBE_SRC || 'forward_window_probe.js';
const FIXTURE = 'outbox/fixture-relay-v2-games-20261030.json';

const { askRelaySports, coverageRows, coverageLines, RELAY_V2_GAMES } = createRequire(import.meta.url)(path.resolve(RELAY));
const fx = JSON.parse(readFileSync(FIXTURE, 'utf8'));

let failed = 0, ran = 0, section = 'relay';
const tally = {};
const want = (label, ok, detail) => {
  ran++; tally[section] = (tally[section] || 0) + 1;
  if (ok) console.log(`  ok    ${label}`);
  else { failed++; console.error(`  FAIL  ${label}${detail ? ' -> ' + detail : ''}`); }
};
const settle = async (p) => { try { return { value: await p }; } catch (e) { return { error: String((e && e.message) || e) }; } };

const D = ['2026-10-31', '2026-11-01', '2026-11-02'];
const SPORTS = ['nfl', 'cfb', 'nba', 'nhl'];
const REAL = { nfl: fx.observed.nfl, cfb: fx.observed.nfl, nba: fx.observed.nba, nhl: fx.observed.nhl };

// A clean relay answer with n copies of the real first game for that sport.
const answer = (sport, iso, n, source) => ({
  sport, date: iso, games: Array.from({ length: n }, () => JSON.parse(JSON.stringify(REAL[sport].game))),
  count: n, source: source || REAL[sport].source, ts: 1793399498555,
});
// handler(sport, iso) -> { status?, json?, throws? }; unlisted cells answer a clean empty day.
const fake = (handler, urls = []) => async (url) => {
  urls.push(url);
  const u = new URL(url);
  const sport = u.searchParams.get('sport'), iso = u.searchParams.get('date');
  const h = (handler && handler(sport, iso)) || {};
  if (h.throws) throw new Error(h.throws);
  const status = h.status || 200;
  const json = h.json === undefined ? answer(sport, iso, 0) : h.json;
  return { ok: status >= 200 && status < 300, status, json: async () => json };
};
const cell = (r, s, iso) => r.counts[s][iso];
// askRelaySports must resolve for every input. A rejection is a FAIL line (and the cells read as unknown), not a crash.
const ask = async (...a) => {
  try { return await askRelaySports(...a); }
  catch (e) {
    want('relay: askRelaySports must resolve for every input (it rejected)', false, String((e && e.message) || e));
    const none = () => Object.fromEntries(SPORTS.map((s) => [s, {}]));
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
for (const st of [400, 500, 502]) {
  const r = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { status: st, json: { error: `ESPN upstream ${st}`, sport: s, date: d } } : null)));
  want(`relay: HTTP ${st} is null with the reason, not 0`, cell(r, 'nfl', D[1]) === null && r.errors.nfl[D[1]] === `HTTP ${st}`, JSON.stringify(r.errors.nfl));
}
{
  const r = await ask(D, fake((s, d) => (s === 'nba' && d === D[0] ? { status: 503, json: answer(s, d, 0) } : null)));
  want('relay: HTTP 503 whose body parses as a clean empty answer is still null', cell(r, 'nba', D[0]) === null && r.errors.nba[D[0]] === 'HTTP 503', JSON.stringify(r.errors.nba));
}
{
  const r = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { json: { ...answer(s, d, 0), error: 'ESPN upstream 502' } } : null)));
  want('relay: HTTP 200 with an error key is null, with the relay\'s words',
       cell(r, 'nfl', D[1]) === null && /^relay error: ESPN upstream 502/.test(r.errors.nfl[D[1]] || ''), JSON.stringify(r.errors.nfl));
}
{
  // The trap: NHL's API failed and the relay said so with a 200, an empty list and a count of 0.
  const r = await ask(D, fake((s, d) => (s === 'nhl' && d === D[0]
    ? { json: { sport: s, date: d, games: [], count: 0, source: 'nhle-error', ts: 1 } } : null)));
  want('relay: an NHL upstream failure (HTTP 200, games [], count 0, source nhle-error) is null, never "no games"',
       cell(r, 'nhl', D[0]) === null && r.errors.nhl[D[0]] === 'relay source nhle-error' && r.sources.nhl[D[0]] === undefined, JSON.stringify({ c: r.counts.nhl, e: r.errors.nhl }));
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
  const r = await settle(askRelaySports(D, fake((s, d) => (s === 'cfb' && d === D[2] ? { throws: 'network down' } : (s === 'nhl' && d === D[0] ? { status: 502, json: {} } : null)))));
  const v = r.value;
  want('relay: one failing cell does not stop the others (the call resolves)', !!v, JSON.stringify(r));
  want('relay: a failed cell is null with its reason and the other ten cells keep their answers',
       !!v && v.counts.cfb[D[2]] === null && /network down/.test(v.errors.cfb[D[2]] || '') && v.counts.nhl[D[0]] === null
       && SPORTS.flatMap((s) => D.map((d) => [s, d])).filter(([s, d]) => !((s === 'cfb' && d === D[2]) || (s === 'nhl' && d === D[0])))
          .every(([s, d]) => v.counts[s][d] === 0), JSON.stringify(v && v.counts));
}
{
  const hang = (url, opts) => new Promise((resolve, reject) => { if (opts && opts.signal) opts.signal.addEventListener('abort', () => reject(opts.signal.reason)); });
  let timer;
  const r = await Promise.race([askRelaySports(['2026-11-01'], hang, { sports: ['nfl'], timeoutMs: 50 }), new Promise((res) => { timer = setTimeout(() => res('HUNG'), 3000); })]);
  clearTimeout(timer);
  want('relay: a request that never answers is cut off by the timeout and recorded as null with its reason',
       r !== 'HUNG' && r.counts.nfl['2026-11-01'] === null && /abort|timeout/i.test(r.errors.nfl['2026-11-01'] || ''), JSON.stringify(r));
}
{
  const urls = [];
  const r = await ask(D, fake(null, urls), { sports: ['nfl'] });
  want('relay: the sports option limits what is asked', urls.length === 3 && Object.keys(r.counts).join() === 'nfl', urls.join(' '));
}

// ── the table the manifest and the log carry ───────────────────────────────────────────────────────────────────────────
section = 'coverage';
const FILE = {   // the window file's own per-sport counts for these days, outbox/field-data-today.json generated 2026-10-30T14:26Z
  '2026-10-31': { nhl: 0, nba: 0, mlb: 0, soccer: 0, wnba: 1 },
  '2026-11-01': { nhl: 0, nba: 0, mlb: 0, soccer: 0, wnba: 0 },
  '2026-11-02': { nhl: 0, nba: 0, mlb: 0, soccer: 0, wnba: 0 },
};
const days = D.map((iso) => ({ iso, windowBySport: FILE[iso] }));
{
  const relay = await ask(D, fake((s, d) => {
    if (s === 'nfl' && d === '2026-11-01') return { json: answer('nfl', d, 12) };
    if (s === 'nhl' && d === '2026-10-31') return { json: answer('nhl', d, 10, 'nhle') };
    return null;
  }));
  const rows = coverageRows(days, relay);
  const lines = coverageLines(rows);
  want('coverage: one row per day, in order', rows.length === 3 && rows.map((r) => r.iso).join() === D.join(), JSON.stringify(rows.map((r) => r.iso)));
  want('coverage: a row carries what the file had and what the relay listed',
       rows[0].window?.nhl === 0 && rows[0].relay.nhl === 10 && rows[1].relay.nfl === 12 && rows[0].window?.wnba === 1, JSON.stringify(rows[0]));
  const nfl = lines.find((l) => l.startsWith('nfl:')) || '', nhl = lines.find((l) => l.startsWith('nhl:')) || '';
  want('coverage: NFL on 2026-11-01 reads "relay 12, file -" (the file has no key for it)', nfl.includes('2026-11-01 relay 12, file -'), nfl);
  want('coverage: NHL on 2026-10-31 reads "relay 10, file 0" (the file has the key and carries none)', nhl.includes('2026-10-31 relay 10, file 0'), nhl);
  want('coverage: there is one line per sport asked', lines.length === 4 && lines.map((l) => l.split(':')[0]).join() === 'nfl,cfb,nba,nhl', JSON.stringify(lines.map((l) => l.slice(0, 12))));
}
{
  const relay = await ask(D, fake((s, d) => (s === 'nfl' && d === D[1] ? { status: 502, json: {} } : null)));
  const rows = coverageRows([{ iso: D[0], windowBySport: null }, { iso: D[1], windowBySport: FILE[D[1]] }], relay);
  const lines = coverageLines(rows);
  want('coverage: rows carry null where the relay could not answer, not 0', rows[1].relay.nfl === null && rows[1].relay.cfb === 0, JSON.stringify(rows[1].relay));
  want('coverage: a cell the relay could not answer reads "unasked"', (lines.find((l) => l.startsWith('nfl:')) || '').includes(`${D[1]} relay unasked`), lines[0]);
  want('coverage: a day that was not read reads "file unread", not a count', (lines.find((l) => l.startsWith('nfl:')) || '').includes(`${D[0]} relay 0, file unread`), lines[0]);
  want('coverage: a day that was not read has window null', rows[0].window === null);
}
{
  const empty = coverageRows([], { counts: {} });
  want('coverage: no days and no sports give no rows and no lines, and do not throw', empty.length === 0 && coverageLines(empty).length === 0);
  want('coverage: a missing relay result gives rows with nothing in them',
       JSON.stringify(coverageRows([{ iso: D[0], windowBySport: { nhl: 1 } }], null)) === JSON.stringify([{ iso: D[0], window: { nhl: 1 }, relay: {} }]));
  want('coverage: a windowBySport that is not an object is treated as unread', coverageRows([{ iso: D[0], windowBySport: 'x' }], { counts: {} })[0].window === null);
  want('coverage: a day the relay never listed for a sport is null', coverageRows([{ iso: '2030-01-01', windowBySport: {} }], { counts: { nfl: { [D[0]]: 3 } } })[0].relay.nfl === null);
}

// ── the probe is wired to the capture and cannot fail on it ─────────────────────────────────────────────────────────────
section = 'probe text';
const src = readFileSync(PROBE, 'utf8');
const at = (n) => src.indexOf(n);
want('probe: requires the capture module', src.includes("require('./scripts/forward-window-relay.cjs')"));
want('probe: asks the relay for the forward days with the global fetch', src.includes('await askRelaySports(isoDays, fetch)'));
want('probe: the relay is asked after the ESPN question and before the verdict is judged',
     at('askEspnMlb(') > 0 && at('await askRelaySports(isoDays, fetch)') > at('askEspnMlb(') && at('await askRelaySports(isoDays, fetch)') < at('judgeForwardWindow(manifest, espn)'),
     `${at('askEspnMlb(')} ${at('await askRelaySports(isoDays, fetch)')} ${at('judgeForwardWindow(manifest, espn)')}`);
want('probe: the manifest carries the raw reading and the table', src.includes('relaySports: relay,') && src.includes('    coverage,\n'));
want('probe: the in-page read returns the window file\'s per-sport counts, and the day keeps them',
     src.includes('return { iso: d, has: !!sched, mlb: sched && sched.mlb ? sched.mlb.length : 0, bySport };') && src.includes('windowBySport: w.bySport,'));
want('probe: the table is printed in the run log', src.includes('for (const line of coverageLines(coverage))'));
want('probe: the judge is not given the relay reading (the call keeps its two arguments)', src.includes('judgeForwardWindow(manifest, espn)') && !src.includes('judgeForwardWindow(manifest, espn, '));
want('probe: nothing from the relay capture can fail the run (no problem is pushed anywhere in the probe)', !/\.problems\.push\(/.test(src) && !/problems\.push\(/.test(src));

console.log(`\nchecked ${ran} case(s): ${tally['relay']} on askRelaySports (a fake fetch built from real relay shapes: nfl, nba and nhl observed live, cfb treated as nfl and not observed), `
          + `${tally['coverage']} on the table builder, ${tally['probe text']} text assertions on forward_window_probe.js. The probe's in-page read and manifest-building lines are NOT executed here; the runner is their check.`);
if (failed) { console.error(`FAIL — ${failed} case(s).`); process.exit(1); }
console.log('PASS');
