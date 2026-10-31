#!/usr/bin/env node
// The generator's NBA read: scripts/nba-board.cjs, how scripts/build-field-data.js uses it, and the last workflow step that
// turns an unread source into a failed run (scripts/field-data-source-errors.cjs, .github/workflows/field-data.yml).
//
// THE FAILURE THIS GUARDS. field-data.yml read the NBA board from the relay's /nba/... passthrough with `curl -sf ... || echo '{}'`.
// The passthrough answers 403 (the CDN refuses the Worker), the fallback wrote `{}`, and the file said nba 0 on 2026-10-30, a night
// the relay listed 10 games (field-relay-nba docs/CC-CMD-2026-10-22-nba-cdn-403-in-season.md, "Data point 2026-10-30"). A refused
// read was recorded as "no games". Here a read that is not clean is null with a reason, and an empty slate is [] with none.
//
// Coverage (Rule 91): the board reader runs as the real function against a fake fetch built from outbox/fixture-nba-board-20261031.json
// (the relay's real answer, observed 2026-10-31); the error shapes are READ from field-relay-nba src/index.js, not observed. The
// generator runs in full, under node:vm, against stubbed fs, https and fetch: every request it makes is answered by a stub (statsapi
// and ESPN with an empty slate, the relay's WNBA route with an empty board) and the run prints how many requests no stub claimed.
// What is NOT executed here: the generator against the live sources, the AI note calls (no key is set), and the workflow itself;
// the workflow is checked as TEXT, and the runner is its check.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const BOARD = process.env.BOARD_SRC || 'scripts/nba-board.cjs';
const GEN = process.env.GEN_SRC || 'scripts/build-field-data.js';
const ERRS = process.env.ERRS_SRC || 'scripts/field-data-source-errors.cjs';
const WORKFLOW = process.env.WORKFLOW_SRC || '.github/workflows/field-data.yml';
const CHECK_WORKFLOW = process.env.CHECK_WORKFLOW_SRC || '.github/workflows/nba-board-check.yml';
const FIXTURE = 'outbox/fixture-nba-board-20261031.json';

const require = createRequire(import.meta.url);
const fx = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const TODAY = fx.body.date;

let failed = 0, ran = 0, section = 'board';
const tally = {};
const want = (label, ok, detail) => {
  ran++; tally[section] = (tally[section] || 0) + 1;
  if (ok) console.log(`  ok    ${label}`);
  else { failed++; console.error(`  FAIL  ${label}${detail ? ' -> ' + detail : ''}`); }
};
const settle = async (p) => { try { return { value: await p }; } catch (e) { return { error: String((e && e.message) || e) }; } };
const clone = (o) => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const resp = (status, json, jsonThrows) => ({ ok: status >= 200 && status < 300, status, json: async () => { if (jsonThrows) throw new SyntaxError('Unexpected token <'); return json; } });
const fixtureBody = () => clone(fx.body);
const fakeFetch = (handler, urls = []) => async (url) => { urls.push(url); return handler(url); };

// ─── 1. the board reader ────────────────────────────────────────────────────────────────────────────────────────────────
section = 'board';
const { readNbaBoard } = require(path.resolve(BOARD));
const read = (handler, iso = TODAY, opts) => settle(readNbaBoard(iso, fakeFetch(handler), opts));
const reads = (label, r, re) => want(label, r.error !== undefined && re.test(r.error), JSON.stringify(r).slice(0, 200));

{
  const urls = [];
  const r = await settle(readNbaBoard(TODAY, fakeFetch(() => resp(200, fixtureBody()), urls)));
  const g = fx.body.games;
  want('board: the relay\'s real answer reads as 7 games', r.value && r.value.games.length === 7, JSON.stringify(r).slice(0, 200));
  want('board: a game is exactly sport, league, home, away, start_time and venue, in the names the relay gave',
       r.value && same(r.value.games[0], { sport: 'NBA', league: 'NBA', home: 'Utah Jazz', away: 'Portland Trail Blazers', start_time: '2026-10-31T19:00Z', venue: 'Delta Center' }), JSON.stringify(r.value && r.value.games[0]));
  want('board: every game keeps the relay\'s order, home and away',
       r.value && r.value.games.every((x, i) => x.home === g[i].home.name && x.away === g[i].away.name && x.start_time === g[i].start && x.venue === g[i].venue));
  want('board: no playoff field is invented (absent, not false and not null)',
       r.value && r.value.games.every((x) => !('isPlayoff' in x) && !('seriesRecord' in x) && !('gameLabel' in x)));
  want('board: the source is recorded', r.value && r.value.source === 'espn-wc', JSON.stringify(r.value && r.value.source));
  want('board: exactly one request, to /v2/games for the nba and the date asked',
       urls.length === 1 && urls[0] === `https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=nba&date=${TODAY}`, JSON.stringify(urls));
}
{
  const empty = { sport: 'nba', date: TODAY, games: [], count: 0, source: 'espn-wc', ts: 1 };
  const r = await read(() => resp(200, empty));
  want('board: a clean empty day is an empty list, not an error', r.value && Array.isArray(r.value.games) && r.value.games.length === 0, JSON.stringify(r));
}
reads('board: HTTP 403 is an error (the CDN passthrough\'s own answer)', await read(() => resp(403, { error: 'nba returned 403' })), /HTTP 403/);
reads('board: HTTP 502 is an error (ESPN upstream failure, read from the relay source)', await read(() => resp(502, { error: 'ESPN returned 503' })), /HTTP 502/);
reads('board: HTTP 500 is an error (the relay catch-all)', await read(() => resp(500, { error: 'boom' })), /HTTP 500/);
reads('board: HTTP 503 whose body parses as a clean empty board is still an error', await read(() => resp(503, { sport: 'nba', date: TODAY, games: [], count: 0, source: 'espn-wc' })), /HTTP 503/);
reads('board: an error key on a 200 is an error', await read(() => resp(200, { ...fixtureBody(), error: 'upstream' })), /relay error: upstream/);
reads('board: a source naming an error is an error (the NHL branch\'s 200 with source nhle-error)', await read(() => resp(200, { sport: 'nba', date: TODAY, games: [], count: 0, source: 'nhle-error' })), /relay source nhle-error/);
reads('board: any source containing "error" is an error, not only nhle-error', await read(() => resp(200, { sport: 'nba', date: TODAY, games: [], count: 0, source: 'espn-error' })), /relay source espn-error/);
reads('board: a body without a games array is an error', await read(() => resp(200, { sport: 'nba', date: TODAY, count: 7, source: 'espn-wc' })), /no games array/);
reads('board: a body that is JSON null is an error', await read(() => resp(200, null)), /not an object/);
reads('board: an answer for another sport is an error', await read(() => resp(200, { ...fixtureBody(), sport: 'nhl' })), /answered for nhl/);
reads('board: an answer for another date is an error (the route defaults a missing date to today)', await read(() => resp(200, { ...fixtureBody(), date: '2026-10-30' })), /answered for nba 2026-10-30/);
{
  const b = fixtureBody(); b.games[3].away.name = '';
  reads('board: a game with no team name fails the read and says how many', await read(() => resp(200, b)), /1 of 7 games have no team name/);
}
{
  const b = fixtureBody(); delete b.games[2].home;
  reads('board: a game with no home object fails the read rather than throwing a TypeError', await read(() => resp(200, b)), /1 of 7 games have no team name/);
}
reads('board: a response that is not JSON is an error', await read(() => resp(200, null, true)), /not JSON/);
reads('board: a fetch that rejects is an error that names the reason', await settle(readNbaBoard(TODAY, async () => { throw new Error('connect ECONNRESET'); })), /request failed: connect ECONNRESET/);
{
  const hang = (url, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted by the timeout'))));
  let timer;
  const watchdog = new Promise((r) => { timer = setTimeout(() => r({ error: 'WATCHDOG: still waiting after 2000 ms, the request has no timeout' }), 2000); });
  const r = await Promise.race([settle(readNbaBoard(TODAY, hang, { timeoutMs: 40 })), watchdog]);
  clearTimeout(timer);
  reads('board: a request that never answers is cut at the timeout and fails the read', r, /request failed: aborted by the timeout/);
}
{
  // The timeout the generator actually gets: its call passes no option, so the default is the production value.
  const seen = [], orig = AbortSignal.timeout;
  AbortSignal.timeout = (ms) => { seen.push(ms); return orig.call(AbortSignal, ms); };
  try {
    await settle(readNbaBoard(TODAY, fakeFetch(() => resp(200, fixtureBody()))));
    await settle(readNbaBoard(TODAY, fakeFetch(() => resp(200, fixtureBody())), { timeoutMs: 40 }));
  } finally { AbortSignal.timeout = orig; }
  want('board: with no option the request is cut at 15000 ms, and timeoutMs overrides it', same(seen, [15000, 40]), JSON.stringify(seen));
}
{
  const b = fixtureBody(); delete b.source;
  const r = await read(() => resp(200, b));
  want('board: an answer with no source keeps its games and records the source as null', r.value && r.value.games.length === 7 && r.value.source === null, JSON.stringify(r.value && r.value.source));
}

// ─── 2. the generator, in full, under stubs ────────────────────────────────────────────────────────────────────────────
section = 'generator';
const GEN_SRC_TEXT = readFileSync(GEN, 'utf8');
const unstubbedAll = [];

// A fake `https` whose every request is answered from a table. Anything the table does not claim is recorded and answered {}.
const stubHttps = (unstubbed, wnbaCalls) => ({
  request(opts, cb) {
    const req = new EventEmitter();
    req.setTimeout = () => req; req.destroy = () => {}; req.write = () => {};
    req.end = () => setImmediate(() => {
      const p = opts.path || '';
      let body;
      if (opts.hostname === 'statsapi.mlb.com') body = { dates: [] };
      else if (opts.hostname === 'site.api.espn.com') body = { events: [] };
      else if (opts.hostname === 'field-relay-nba.jeffunglesbee.workers.dev' && p.startsWith('/v2/games?sport=wnba&date=')) { wnbaCalls.push(p); body = { sport: 'wnba', games: [], count: 0 }; }
      else { unstubbed.push(`${opts.hostname}${p}`); body = {}; }
      const res = new EventEmitter(); res.setEncoding = () => {}; res.statusCode = 200;
      cb(res); res.emit('data', JSON.stringify(body)); res.emit('end');
    });
    return req;
  },
});

async function runGenerator({ src = GEN, fetchHandler, nbaJson = '{}' }) {
  const written = {}, readLog = [], logs = [], unstubbed = [], wnbaCalls = [], nbaUrls = [], timeouts = [];
  let exited = null;
  const fakeFs = {
    readFileSync(p) { readLog.push(p); if (p === '/tmp/nhl.json') return '{}'; if (p === '/tmp/nba.json') return nbaJson; throw new Error(`ENOENT ${p}`); },
    writeFileSync(p, d) { written[p] = d; },
  };
  const fakeProcess = { env: { TODAY }, exit(c) { exited = c; } };
  const fakeConsole = { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) };
  const stubFetch = async (url, o) => { nbaUrls.push(url); return fetchHandler(url, o); };
  const stubRequire = (id) => (id === 'fs' ? fakeFs : id === 'https' ? stubHttps(unstubbed, wnbaCalls)
    : id === './nba-board.cjs' ? require(path.resolve(BOARD)) : createRequire(path.resolve(src))(id));
  const code = readFileSync(src, 'utf8').replace(/^#!.*\n/, '');
  const fn = vm.runInThisContext(`(function (require, process, console, fetch) {${code}\n})`, { filename: src });
  const origTimeout = AbortSignal.timeout;
  AbortSignal.timeout = (ms) => { timeouts.push(ms); return origTimeout.call(AbortSignal, ms); };
  try {
    fn(stubRequire, fakeProcess, fakeConsole, stubFetch);
    for (let i = 0; i < 400 && written['/tmp/field-data-today.json'] === undefined && exited === null; i++) await new Promise((r) => setImmediate(r));
  } finally { AbortSignal.timeout = origTimeout; }
  unstubbedAll.push(...unstubbed);
  const text = written['/tmp/field-data-today.json'];
  return { text, out: text ? JSON.parse(text) : null, exited, logs, unstubbed, readLog, nbaUrls, wnbaCalls, timeouts };
}

const se = (o) => (o && o._meta && o._meta.source_errors) || {};
const good = await runGenerator({ fetchHandler: () => resp(200, fixtureBody()) });
{
  const o = good.out;
  want('generator: the run wrote its file and did not exit', !!o && good.exited === null, JSON.stringify({ wrote: !!o, exited: good.exited, tail: good.logs.slice(-3) }));
  const nba = o && o.schedules && o.schedules.nba;
  want('generator: day 0 NBA is the relay\'s 7 games', Array.isArray(nba) && nba.length === 7, JSON.stringify(nba && nba.length));
  want('generator: an entry is sport, home, away, start_time, venue and confirmed, with no playoff field',
       Array.isArray(nba) && same(nba[0], { sport: 'NBA', home: 'Utah Jazz', away: 'Portland Trail Blazers', start_time: '2026-10-31T19:00Z', venue: 'Delta Center', confirmed: true }), JSON.stringify(nba && nba[0]));
  want('generator: games_found.nba is 7', o && o._meta.games_found.nba === 7, JSON.stringify(o && o._meta.games_found));
  want('generator: day 0 games_found_by_date counts the 7 (every other sport is stubbed empty)', o && o._meta.games_found_by_date[TODAY] === 7, JSON.stringify(o && o._meta.games_found_by_date));
  want('generator: source_errors is present and empty on a clean read', o && same(o._meta.source_errors, {}), JSON.stringify(o && o._meta.source_errors));
  want('generator: the NBA board is asked once, for day 0 only (forward days stay day-0-only)', good.nbaUrls.length === 1 && good.nbaUrls[0].endsWith(`/v2/games?sport=nba&date=${TODAY}`), JSON.stringify(good.nbaUrls));
  want('generator: the forward days carry an empty NBA list, as before', o && Object.keys(o.schedules_by_date).length === 4
       && Object.entries(o.schedules_by_date).filter(([d]) => d !== TODAY).every(([, s]) => same(s.nba, [])), JSON.stringify(o && Object.fromEntries(Object.entries(o.schedules_by_date).map(([d, s]) => [d, s.nba && s.nba.length]))));
  want('generator: the NBA board is requested with the 15000 ms timeout', same(good.timeouts, [15000]), JSON.stringify(good.timeouts));
  want('generator: source_errors_cover lists exactly the source the empty record vouches for (nba)', o && same(o._meta.source_errors_cover, ['nba']), JSON.stringify(o && o._meta.source_errors_cover));
  want('generator: the retired /tmp/nba.json is never read', !good.readLog.includes('/tmp/nba.json'), JSON.stringify(good.readLog));
  want('generator: the run log counts 7 day-0 games and 7 in the window', good.logs.some((l) => l.includes('Output: 7 day-0 games')) && good.logs.some((l) => /window: 4\/4 days .* = 7 games/.test(l)), JSON.stringify(good.logs.slice(-4)));
}
const empty = await runGenerator({ fetchHandler: () => resp(200, { sport: 'nba', date: TODAY, games: [], count: 0, source: 'espn-wc', ts: 1 }) });
{
  const o = empty.out;
  want('generator: a clean empty NBA day is [] with games_found.nba 0 and no source error', !!o && same(o.schedules.nba, []) && o._meta.games_found.nba === 0 && same(o._meta.source_errors, {}), JSON.stringify(o && [o.schedules.nba, o._meta.games_found.nba, o._meta.source_errors]));
}
for (const [name, handler, why] of [
  ['a 403', () => resp(403, { error: 'nba returned 403' }), /HTTP 403/],
  ['a 502', () => resp(502, { error: 'ESPN returned 503' }), /HTTP 502/],
  ['a 200 whose source names an error', () => resp(200, { sport: 'nba', date: TODAY, games: [], count: 0, source: 'nhle-error' }), /relay source nhle-error/],
  ['a fetch that rejects', async () => { throw new Error('connect ECONNRESET'); }, /request failed: connect ECONNRESET/],
  ['a game with no team name', () => { const b = fixtureBody(); b.games[0].home.name = ''; return resp(200, b); }, /1 of 7 games have no team name/],
]) {
  const bad = await runGenerator({ fetchHandler: handler });
  const o = bad.out;
  want(`generator: ${name} still ships the file and does not exit`, !!o && bad.exited === null, JSON.stringify({ wrote: !!o, exited: bad.exited }));
  want(`generator: ${name} makes day 0 NBA null, not an empty list`, !!o && o.schedules.nba === null && o.schedules_by_date[TODAY].nba === null, JSON.stringify(o && o.schedules && o.schedules.nba));
  want(`generator: ${name} makes games_found.nba null, not 0`, !!o && o._meta.games_found.nba === null, JSON.stringify(o && o._meta.games_found));
  want(`generator: ${name} records the date and the reason in source_errors.nba`, !!o && typeof se(o).nba === 'string' && se(o).nba.startsWith(`${TODAY}: `) && why.test(se(o).nba), JSON.stringify(o && o._meta.source_errors));
  want(`generator: ${name} does not count the null as a game in games_found_by_date`, !!o && o._meta.games_found_by_date[TODAY] === 0, JSON.stringify(o && o._meta.games_found_by_date));
  want(`generator: ${name} counts 0 games in the run log, not the null as one`, bad.logs.some((l) => l.includes('Output: 0 day-0 games')) && bad.logs.some((l) => /window: 4\/4 days .* = 0 games/.test(l)), JSON.stringify(bad.logs.slice(-4)));
  want(`generator: ${name} says which date was not read in the run log`, bad.logs.some((l) => l.includes(`NBA board not read for ${TODAY}`)), JSON.stringify(bad.logs.slice(0, 6)));
  want(`generator: ${name} keeps source_errors_cover at nba`, !!o && same(o._meta.source_errors_cover, ['nba']), JSON.stringify(o && o._meta.source_errors_cover));
  want(`generator: ${name} leaves every other sport's key an array`, !!o && ['nhl', 'mlb', 'soccer', 'wnba'].every((k) => Array.isArray(o.schedules[k])), JSON.stringify(o && Object.keys(o.schedules)));
}
want('generator: every request the generator made was answered by a stub (none unclaimed)', unstubbedAll.length === 0, JSON.stringify(unstubbedAll));

// ─── 3. the last workflow step ──────────────────────────────────────────────────────────────────────────────────────────
section = 'source errors';
const tmp = mkdtempSync(path.join(tmpdir(), 'nba-board-'));
const runErrs = (file) => spawnSync('node', [path.resolve(ERRS), ...(file === undefined ? [] : [file])], { encoding: 'utf8' });
const put = (name, text) => { const f = path.join(tmp, name); writeFileSync(f, text); return f; };
try {
  const clean = runErrs(put('clean.json', JSON.stringify({ _meta: { source_errors: {}, source_errors_cover: ['nba'] } })));
  want('source errors: a present, empty record with its cover list exits 0', clean.status === 0, `${clean.status} ${clean.stderr}`);
  want('source errors: a green run says which source it vouches for and that the others are not checked', /none recorded for nba\./.test(clean.stdout) && /Other sources are not checked/.test(clean.stdout), clean.stdout);
  const noCover = runErrs(put('nocover.json', JSON.stringify({ _meta: { source_errors: {} } })));
  want('source errors: an empty record with no cover list exits 1 (what it vouches for is unknown)', noCover.status === 1 && /no _meta\.source_errors_cover list/.test(noCover.stderr), `${noCover.status} ${noCover.stderr}`);
  const emptyCover = runErrs(put('emptycover.json', JSON.stringify({ _meta: { source_errors: {}, source_errors_cover: [] } })));
  want('source errors: an empty cover list exits 1', emptyCover.status === 1 && /no _meta\.source_errors_cover list/.test(emptyCover.stderr), `${emptyCover.status} ${emptyCover.stderr}`);
  const badCover = runErrs(put('badcover.json', JSON.stringify({ _meta: { source_errors: {}, source_errors_cover: [1] } })));
  want('source errors: a cover list that is not strings exits 1', badCover.status === 1 && /no _meta\.source_errors_cover list/.test(badCover.stderr), `${badCover.status} ${badCover.stderr}`);
  const dirty = runErrs(put('dirty.json', JSON.stringify({ _meta: { source_errors: { nba: '2026-10-31: HTTP 403' } } })));  // no cover list on purpose: the errors are reported first
  want('source errors: a recorded error exits 1 and prints the source and the reason', dirty.status === 1 && /nba: 2026-10-31: HTTP 403/.test(dirty.stderr), `${dirty.status} ${dirty.stderr}`);
  const none = runErrs(put('none.json', JSON.stringify({ _meta: {} })));
  want('source errors: a file with no source_errors record exits 1 (absence is not clean)', none.status === 1 && /no _meta\.source_errors record/.test(none.stderr), `${none.status} ${none.stderr}`);
  const arr = runErrs(put('arr.json', JSON.stringify({ _meta: { source_errors: [] } })));
  want('source errors: a record that is an array exits 1', arr.status === 1 && /no _meta\.source_errors record/.test(arr.stderr), `${arr.status} ${arr.stderr}`);
  const nul = runErrs(put('nul.json', 'null'));
  want('source errors: a file that is JSON null exits 1 and does not crash', nul.status === 1 && /no _meta\.source_errors record/.test(nul.stderr), `${nul.status} ${nul.stderr}`);
  const bad = runErrs(put('bad.json', '<html>'));
  want('source errors: a file that is not JSON exits 1', bad.status === 1 && /is not JSON/.test(bad.stderr), `${bad.status} ${bad.stderr}`);
  const missing = runErrs(path.join(tmp, 'missing.json'));
  want('source errors: a file that does not exist exits 1', missing.status === 1 && /cannot read/.test(missing.stderr), `${missing.status} ${missing.stderr}`);
  const noArg = runErrs(undefined);
  want('source errors: no argument exits 2 with a usage line', noArg.status === 2 && /usage:/.test(noArg.stderr), `${noArg.status} ${noArg.stderr}`);
  const fromGood = runErrs(put('gen-good.json', good.text));
  want('source errors: the generator\'s own output for a clean read exits 0', fromGood.status === 0, `${fromGood.status} ${fromGood.stderr}`);
  const failedRun = await runGenerator({ fetchHandler: () => resp(403, { error: 'nba returned 403' }) });
  const fromBad = runErrs(put('gen-bad.json', failedRun.text));
  want('source errors: the generator\'s own output for a 403 exits 1 and names the NBA', fromBad.status === 1 && /nba: 2026-10-31: HTTP 403/.test(fromBad.stderr), `${fromBad.status} ${fromBad.stderr}`);
} finally { rmSync(tmp, { recursive: true, force: true }); }

// ─── 4. text: the workflows and the generator's own words ──────────────────────────────────────────────────────────────
section = 'text';
const wf = readFileSync(WORKFLOW, 'utf8');
const cw = readFileSync(CHECK_WORKFLOW, 'utf8');
const at = (hay, s) => hay.indexOf(s);
const count = (hay, s) => hay.split(s).length - 1;
const STEP_CHECK = 'node scripts/check-nba-board.mjs';
const STEP_MUT = 'node scripts/mutate-nba-board.mjs';
const STEP_BUILD = 'run: node scripts/build-field-data.js';
const STEP_PUSH = '- name: Push overlay to outbox';
const STEP_ERRS = 'node scripts/field-data-source-errors.cjs /tmp/field-data-today.json';
// The step whose run line is `cmd`, reduced to its code lines (blank lines and comments dropped). A step is plain when it is
// exactly a name and that one run line: no `||`, no `;`, no `if:`, no `env:`, no `continue-on-error`, nothing a gate can hide behind.
const stepCode = (text, cmd) => {
  const i = text.indexOf(cmd); if (i < 0) return null;
  const start = text.lastIndexOf('      - name:', i); if (start < 0) return null;
  const next = text.indexOf('\n      - ', i);
  return text.slice(start, next < 0 ? undefined : next).split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
};
const plain = (text, cmd) => { const c = stepCode(text, cmd); return !!c && c.length === 2 && c[0].startsWith('      - name: ') && c[1] === `        run: ${cmd}`; };
const PATHS = ['scripts/nba-board.cjs', 'scripts/build-field-data.js', 'scripts/field-data-source-errors.cjs', 'scripts/check-nba-board.mjs', 'scripts/mutate-nba-board.mjs',
               'outbox/fixture-nba-board-20261031.json', '.github/workflows/field-data.yml', '.github/workflows/nba-board-check.yml'];
want('text: field-data.yml no longer fetches the NBA CDN passthrough or writes /tmp/nba.json', !wf.includes('todaysScoreboard_00.json') && !wf.includes('/tmp/nba.json'));
want('text: field-data.yml still fetches the NHL scoreboard into /tmp/nhl.json (untouched)', wf.includes('/nhl/v1/scoreboard/now') && wf.includes('/tmp/nhl.json'));
want('text: field-data.yml holds no check or harness step (a check that asserts text must not sit in the publishing job)', !wf.includes('check-nba-board') && !wf.includes('mutate-nba-board'));
want('text: the source-errors step runs once, after the push step, as the last step',
     count(wf, STEP_ERRS) === 1 && at(wf, STEP_ERRS) > at(wf, STEP_PUSH) && at(wf, STEP_PUSH) > at(wf, STEP_BUILD) && wf.indexOf('- name:', at(wf, STEP_ERRS)) === -1, JSON.stringify([at(wf, STEP_BUILD), at(wf, STEP_PUSH), at(wf, STEP_ERRS)]));
want('text: the source-errors step is exactly a name and its run line (no ||, ;, if:, env: or continue-on-error to hide behind)', plain(wf, STEP_ERRS), JSON.stringify(stepCode(wf, STEP_ERRS)));
want('text: the check workflow runs the check, then the harness, each once', count(cw, STEP_CHECK) === 1 && count(cw, STEP_MUT) === 1 && at(cw, STEP_CHECK) > 0 && at(cw, STEP_CHECK) < at(cw, STEP_MUT), JSON.stringify([at(cw, STEP_CHECK), at(cw, STEP_MUT)]));
want('text: the check step and the harness step are each exactly a name and their run line', plain(cw, STEP_CHECK) && plain(cw, STEP_MUT), JSON.stringify([stepCode(cw, STEP_CHECK), stepCode(cw, STEP_MUT)]));
want('text: the check workflow runs on a push to every file it checks and on dispatch', PATHS.every((p) => cw.includes(`      - '${p}'`)) && cw.includes('  workflow_dispatch:'), JSON.stringify(PATHS.filter((p) => !cw.includes(`      - '${p}'`))));
want('text: the check workflow cannot write to the repo (contents: read) and does not run on a schedule', cw.includes('permissions:\n  contents: read') && !/\n\s*schedule:/.test(cw));
want('text: no step in either workflow may fail silently (no continue-on-error anywhere)', !wf.includes('continue-on-error') && !cw.includes('continue-on-error'));
want('text: the generator requires the shared board reader and calls it once', GEN_SRC_TEXT.includes("require('./nba-board.cjs')") && count(GEN_SRC_TEXT, 'readNbaBoard(') === 1, String(count(GEN_SRC_TEXT, 'readNbaBoard(')));
const GEN_CODE = GEN_SRC_TEXT.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
want('text: no line of code in the generator names the retired files (its comments explain them)', !GEN_CODE.includes('/tmp/nba.json') && !GEN_CODE.includes('todaysScoreboard_00.json'), GEN_CODE.split('\n').filter((l) => /nba\.json|todaysScoreboard/.test(l)).join(' | '));
want('text: the generator still exits non-zero only in its one fatal handler (a source error must not stop the push step)', count(GEN_SRC_TEXT, 'process.exit(') === 1 && GEN_SRC_TEXT.includes("console.error('Fatal:', e.message); process.exit(1);"), String(count(GEN_SRC_TEXT, 'process.exit(')));
want('text: the generator\'s source_errors record is written into _meta from the one collector', count(GEN_SRC_TEXT, 'source_errors: SOURCE_ERRORS') === 1, String(count(GEN_SRC_TEXT, 'source_errors: SOURCE_ERRORS')));

console.log(`\nchecked ${ran} case(s): ${tally['board']} on readNbaBoard (a fake fetch driven by the relay's real 7-game answer of 2026-10-31; error shapes read from the relay source, not observed), `
          + `${tally['generator']} on the generator run in full under node:vm (stubbed fs, https and fetch; ${unstubbedAll.length} request(s) no stub claimed), `
          + `${tally['source errors']} on the last-step script (run as a subprocess), ${tally['text']} text assertions on the workflow and the generator. `
          + `NOT executed here: the generator against live sources, the AI note calls (no key set), the workflow itself.`);
if (failed) { console.error(`FAIL — ${failed} case(s).`); process.exit(1); }
console.log('PASS');
