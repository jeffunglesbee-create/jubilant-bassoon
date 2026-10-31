#!/usr/bin/env node
// The generator's NBA and WNBA reads: scripts/nba-board.cjs, how scripts/build-field-data.js uses it, and the last workflow step that
// turns an unread source into a failed run (scripts/field-data-source-errors.cjs, .github/workflows/field-data.yml).
//
// THE FAILURE THIS GUARDS. field-data.yml read the NBA board from the relay's /nba/... passthrough with `curl -sf ... || echo '{}'`.
// The passthrough answers 403 (the CDN refuses the Worker), the fallback wrote `{}`, and the file said nba 0 on 2026-10-30, a night
// the relay listed 10 games (field-relay-nba docs/CC-CMD-2026-10-22-nba-cdn-403-in-season.md, "Data point 2026-10-30"). A refused
// read was recorded as "no games". Here a read that is not clean is null with a reason, and an empty slate is [] with none.
// The WNBA read had the same defect in another form (no status check: a 502 body parsed as an empty slate) and moved to the same
// reader on 2026-10-31. The WNBA season ends 10-31, so the case that has to stay green all winter is an off-season window of
// clean empty boards; it is checked from the relay's real off-season answers (outbox/fixture-wnba-board-20261031.json).
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
const WFIXTURE = 'outbox/fixture-wnba-board-20261031.json';

const require = createRequire(import.meta.url);
const fx = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const wfx = JSON.parse(readFileSync(WFIXTURE, 'utf8'));
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
const { readNbaBoard, readWnbaBoard, readV2Board } = require(path.resolve(BOARD));
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
reads('board: a fetch that fails with a cause (undici reports "fetch failed" and keeps the reason in e.cause) records the cause',
      await settle(readNbaBoard(TODAY, async () => { throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }); })), /request failed: fetch failed \(ECONNREFUSED\)/);
reads('board: a timeout while the body is being read is a request that failed, not a body that is not JSON',
      await settle(readNbaBoard(TODAY, async () => ({ ok: true, status: 200, json: async () => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError'); } }))), /request failed: The operation was aborted due to timeout/);
reads('board: an abort while the body is being read is a request that failed too',
      await settle(readNbaBoard(TODAY, async () => ({ ok: true, status: 200, json: async () => { throw new DOMException('This operation was aborted', 'AbortError'); } }))), /request failed: This operation was aborted/);
{
  // The relay writes '' for a start it did not get and for a venue ESPN left empty (adaptESPNBasketball: ev.date || '', comp.venue?.fullName || '').
  const b = fixtureBody(); b.games[0].start = ''; b.games[0].venue = '';
  const r = await read(() => resp(200, b));
  want('board: a game with no start time and no venue (the relay writes empty strings) reads both as null', r.value && r.value.games[0].start_time === null && r.value.games[0].venue === null, JSON.stringify(r.value && r.value.games[0]));
}
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

// WNBA: the same reader, the same clauses, its own sport. The answers are the relay's real ones (last game day, two off-season days).
const wlast = () => clone(wfx.last_game_day.body);
const emptyOf = (sport, iso, source = 'espn-wc') => ({ sport, date: iso, games: [], count: 0, source, ts: 1 });
const wread = (handler, iso = TODAY, opts) => settle(readWnbaBoard(iso, fakeFetch(handler), opts));
{
  const urls = [];
  const r = await settle(readWnbaBoard(TODAY, fakeFetch(() => resp(200, wlast()), urls)));
  want('wnba board: the relay\'s real last-game-day answer reads as 1 game, labelled WNBA in sport and league',
       r.value && same(r.value.games, [{ sport: 'WNBA', league: 'WNBA', home: 'Golden State Valkyries', away: 'Atlanta Dream', start_time: '2026-11-01T00:00Z', venue: 'Chase Center' }]), JSON.stringify(r).slice(0, 240));
  want('wnba board: exactly one request, to /v2/games for the wnba and the date asked',
       urls.length === 1 && urls[0] === `https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=wnba&date=${TODAY}`, JSON.stringify(urls));
}
for (const key of ['off_season_day_after', 'off_season_midwinter']) {
  const f = wfx[key], iso = f.body.date;
  const r = await wread(() => resp(200, clone(f.body)), iso);
  want(`wnba board: the relay's real off-season answer for ${iso} is an empty list, not an error`, r.value && same(r.value.games, []) && r.value.source === 'espn-wc', JSON.stringify(r).slice(0, 200));
}
reads('wnba board: HTTP 502 is an error (the old parseWNBA read this body as an empty slate)', await wread(() => resp(502, { error: 'ESPN upstream 503', sport: 'wnba', date: TODAY })), /HTTP 502/);
reads('wnba board: HTTP 500 is an error', await wread(() => resp(500, { error: 'boom', sport: 'wnba', date: TODAY })), /HTTP 500/);
reads('wnba board: an error key on a 200 is an error', await wread(() => resp(200, { ...wlast(), error: 'upstream' })), /relay error: upstream/);
reads('wnba board: a source naming an error is an error', await wread(() => resp(200, emptyOf('wnba', TODAY, 'espn-error'))), /relay source espn-error/);
reads('wnba board: an answer for the NBA is an error (a wnba request answered with the nba board)', await wread(() => resp(200, fixtureBody())), /answered for nba 2026-10-31/);
reads('wnba board: an answer for another date is an error', await wread(() => resp(200, { ...wlast(), date: '2026-10-30' })), /answered for wnba 2026-10-30/);
reads('nba board: an answer for the WNBA is an error (an nba request answered with the wnba board)', await read(() => resp(200, wlast())), /answered for wnba 2026-10-31/);
reads('wnba board: a fetch that rejects is an error', await settle(readWnbaBoard(TODAY, async () => { throw new Error('connect ECONNRESET'); })), /request failed: connect ECONNRESET/);
{
  const b = wlast(); b.games[0].home.name = '';
  reads('wnba board: a game with no team name fails the read (the old parseWNBA dropped it silently)', await wread(() => resp(200, b)), /1 of 1 games have no team name/);
}
{
  // The relay's KV secondary: read from source (handleV2Games, _trySecondary), not observed. It is a labelled answer, not an error.
  const kv = { ...wlast(), source: 'wnba-kv', fetchedAt: '2026-10-31T20:00:00.000Z', staleSeconds: 120 };
  const r = await wread(() => resp(200, kv));
  want('wnba board: the relay\'s KV failover (source wnba-kv, with fetchedAt and staleSeconds) is an answer: its game is read and its source is returned', r.value && r.value.games.length === 1 && r.value.source === 'wnba-kv', JSON.stringify(r).slice(0, 200));
  const r2 = await wread(() => resp(200, { ...emptyOf('wnba', TODAY, 'wnba-kv'), fetchedAt: '2026-10-31T20:00:00.000Z', staleSeconds: 120 }));
  want('wnba board: the KV failover\'s empty list is the relay\'s real off-day, an empty list and not an error', r2.value && same(r2.value.games, []) && r2.value.source === 'wnba-kv', JSON.stringify(r2).slice(0, 200));
}
{
  const urls = [];
  const r = await settle(readV2Board('afl', TODAY, fakeFetch(() => resp(200, emptyOf('afl', TODAY)), urls)));
  reads('board: a sport with no reader (afl) is refused before any request is made', r, /no board reader for sport afl/);
  want('board: a refused sport makes no request', urls.length === 0, JSON.stringify(urls));
}
{
  const seen = [], orig = AbortSignal.timeout;
  AbortSignal.timeout = (ms) => { seen.push(ms); return orig.call(AbortSignal, ms); };
  try { await settle(readWnbaBoard(TODAY, fakeFetch(() => resp(200, wlast())))); } finally { AbortSignal.timeout = orig; }
  want('wnba board: with no option the request is cut at 15000 ms', same(seen, [15000]), JSON.stringify(seen));
}

// ─── 2. the generator, in full, under stubs ────────────────────────────────────────────────────────────────────────────
section = 'generator';
const GEN_SRC_TEXT = readFileSync(GEN, 'utf8');
const unstubbedAll = [];

// A fake `https` whose every request is answered from a table. Anything the table does not claim is recorded and answered {}.
// The relay is deliberately NOT in the table: the NBA and WNBA boards are read with fetch, so an https request to the relay
// (the old parseWNBA) is an unclaimed request and fails the "none unclaimed" assertion.
const stubHttps = (unstubbed) => ({
  request(opts, cb) {
    const req = new EventEmitter();
    req.setTimeout = () => req; req.destroy = () => {}; req.write = () => {};
    req.end = () => setImmediate(() => {
      const p = opts.path || '';
      let body;
      if (opts.hostname === 'statsapi.mlb.com') body = { dates: [] };
      else if (opts.hostname === 'site.api.espn.com') body = { events: [] };
      else { unstubbed.push(`${opts.hostname}${p}`); body = {}; }
      const res = new EventEmitter(); res.setEncoding = () => {}; res.statusCode = 200;
      cb(res); res.emit('data', JSON.stringify(body)); res.emit('end');
    });
    return req;
  },
});

const WIN = [TODAY, '2026-11-01', '2026-11-02', '2026-11-03'];
// A window day's WNBA entry, or undefined when the day is not in the file at all (a day dropped from window_dates).
const wDay = (o, d) => ((o && o.schedules_by_date && o.schedules_by_date[d]) || {}).wnba;
const dateOf = (url) => new URL(url).searchParams.get('date');
const sportOf = (url) => new URL(url).searchParams.get('sport');
// nba(iso, url) and wnba(iso, url) answer that sport's board requests; unlisted ones answer the real 7-game NBA board for day 0 and a clean empty WNBA board.
async function runGenerator({ src = GEN, nba = () => resp(200, fixtureBody()), wnba = (iso) => resp(200, emptyOf('wnba', iso)), nbaJson = '{}' }) {
  const written = {}, readLog = [], logs = [], unstubbed = [], fetchUrls = [], timeouts = [];
  let exited = null;
  const fakeFs = {
    readFileSync(p) { readLog.push(p); if (p === '/tmp/nhl.json') return '{}'; if (p === '/tmp/nba.json') return nbaJson; throw new Error(`ENOENT ${p}`); },
    writeFileSync(p, d) { written[p] = d; },
  };
  const fakeProcess = { env: { TODAY }, exit(c) { exited = c; } };
  const fakeConsole = { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) };
  const stubFetch = async (url) => {
    fetchUrls.push(url);
    const sp = sportOf(url);
    if (sp === 'nba') return nba(dateOf(url), url);
    if (sp === 'wnba') return wnba(dateOf(url), url);
    unstubbed.push(`fetch ${url}`);
    return resp(404, {});
  };
  const stubRequire = (id) => (id === 'fs' ? fakeFs : id === 'https' ? stubHttps(unstubbed)
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
  const nbaUrls = fetchUrls.filter((u) => sportOf(u) === 'nba'), wnbaUrls = fetchUrls.filter((u) => sportOf(u) === 'wnba');
  return { text, out: text ? JSON.parse(text) : null, exited, logs, unstubbed, readLog, nbaUrls, wnbaUrls, timeouts };
}

const se = (o) => (o && o._meta && o._meta.source_errors) || {};
const good = await runGenerator({});
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
  want('generator: the one NBA board and the four WNBA boards are each requested with the 15000 ms timeout', same(good.timeouts, [15000, 15000, 15000, 15000, 15000]), JSON.stringify(good.timeouts));
  want('generator: source_errors_cover lists exactly the sources the empty record vouches for (nba, wnba)', o && same(o._meta.source_errors_cover, ['nba', 'wnba']), JSON.stringify(o && o._meta.source_errors_cover));
  want('generator: the retired /tmp/nba.json is never read', !good.readLog.includes('/tmp/nba.json'), JSON.stringify(good.readLog));
  want('generator: the run log counts 7 day-0 games and 7 in the window', good.logs.some((l) => l.includes('Output: 7 day-0 games')) && good.logs.some((l) => /window: 4\/4 days .* = 7 games/.test(l)), JSON.stringify(good.logs.slice(-4)));
}
const empty = await runGenerator({ nba: () => resp(200, emptyOf('nba', TODAY)) });
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
  const bad = await runGenerator({ nba: handler });
  const o = bad.out;
  want(`generator: ${name} still ships the file and does not exit`, !!o && bad.exited === null, JSON.stringify({ wrote: !!o, exited: bad.exited }));
  want(`generator: ${name} makes day 0 NBA null, not an empty list`, !!o && o.schedules.nba === null && o.schedules_by_date[TODAY].nba === null, JSON.stringify(o && o.schedules && o.schedules.nba));
  want(`generator: ${name} makes games_found.nba null, not 0`, !!o && o._meta.games_found.nba === null, JSON.stringify(o && o._meta.games_found));
  want(`generator: ${name} records the date and the reason in source_errors.nba`, !!o && typeof se(o).nba === 'string' && se(o).nba.startsWith(`${TODAY}: `) && why.test(se(o).nba), JSON.stringify(o && o._meta.source_errors));
  want(`generator: ${name} does not count the null as a game in games_found_by_date`, !!o && o._meta.games_found_by_date[TODAY] === 0, JSON.stringify(o && o._meta.games_found_by_date));
  want(`generator: ${name} counts 0 games in the run log, not the null as one`, bad.logs.some((l) => l.includes('Output: 0 day-0 games')) && bad.logs.some((l) => /window: 4\/4 days .* = 0 games/.test(l)), JSON.stringify(bad.logs.slice(-4)));
  want(`generator: ${name} says which date was not read in the run log`, bad.logs.some((l) => l.includes(`NBA board not read for ${TODAY}`)), JSON.stringify(bad.logs.slice(0, 6)));
  want(`generator: ${name} keeps source_errors_cover at nba and wnba`, !!o && same(o._meta.source_errors_cover, ['nba', 'wnba']), JSON.stringify(o && o._meta.source_errors_cover));
  want(`generator: ${name} leaves every other sport's key an array`, !!o && ['nhl', 'mlb', 'soccer', 'wnba'].every((k) => Array.isArray(o.schedules[k])), JSON.stringify(o && Object.keys(o.schedules)));
}

// ── WNBA: four window days, one board each ──
const wnbaGood = await runGenerator({ wnba: (iso) => (iso === TODAY ? resp(200, wlast()) : resp(200, emptyOf('wnba', iso))) });
{
  const o = wnbaGood.out;
  want('generator: day 0 WNBA is the relay\'s one game, as sport, home, away, start_time, venue, league and confirmed',
       !!o && same(o.schedules.wnba, [{ sport: 'WNBA', home: 'Golden State Valkyries', away: 'Atlanta Dream', start_time: '2026-11-01T00:00Z', venue: 'Chase Center', league: 'WNBA', confirmed: true }]), JSON.stringify(o && o.schedules.wnba));
  want('generator: games_found.wnba is 1 and the day-0 window count is 8 (7 NBA + 1 WNBA)', !!o && o._meta.games_found.wnba === 1 && o._meta.games_found_by_date[TODAY] === 8, JSON.stringify(o && [o._meta.games_found.wnba, o._meta.games_found_by_date]));
  want('generator: the WNBA board is asked once for each of the four window days, in order', same(wnbaGood.wnbaUrls.map(dateOf), WIN), JSON.stringify(wnbaGood.wnbaUrls.map(dateOf)));
  want('generator: the three forward WNBA days are [] and nothing is recorded as unread', !!o && WIN.slice(1).every((d) => same(wDay(o, d), [])) && same(o._meta.source_errors, {}), JSON.stringify(o && o._meta.source_errors));
}
// Winter: the relay's real off-season answer for the day after (observed), clean empty boards for the rest. The daily run must stay green.
const winter = await runGenerator({
  nba: () => resp(200, emptyOf('nba', TODAY)),
  wnba: (iso) => (iso === '2026-11-01' ? resp(200, clone(wfx.off_season_day_after.body)) : resp(200, emptyOf('wnba', iso))),
});
{
  const o = winter.out;
  want('generator: an off-season window (four clean empty WNBA boards) is [] on every day, games_found.wnba 0, and records nothing',
       !!o && WIN.every((d) => same(wDay(o, d), [])) && o._meta.games_found.wnba === 0 && same(o._meta.source_errors, {}), JSON.stringify(o && [o._meta.games_found, o._meta.source_errors]));
}
// A WNBA game on a forward day (a season opener two or three days after a run). Derived from the real last-game-day body, re-dated:
// the relay has not answered a forward-day game yet, so this body is a derivation and is labelled as one.
const wOn = (iso, n) => { const b = wlast(); b.date = iso; b.games = Array.from({ length: n }, () => clone(wfx.last_game_day.body.games[0])); b.count = n; return b; };
const wnbaFwd = await runGenerator({ wnba: (iso) => (iso === '2026-11-02' ? resp(200, wOn(iso, 1)) : iso === '2026-11-03' ? resp(200, wOn(iso, 2)) : resp(200, emptyOf('wnba', iso))) });
{
  const o = wnbaFwd.out;
  want('generator: a WNBA game on a forward day is carried on that day (1 on 11-02, 2 on 11-03), and the empty days stay []',
       !!o && same(WIN.map((d) => (wDay(o, d) || []).length), [0, 0, 1, 2]) && WIN.every((d) => Array.isArray(wDay(o, d))), JSON.stringify(o && WIN.map((d) => wDay(o, d))));
  want('generator: the forward days\' WNBA games are counted in games_found_by_date and in the window total of the run log, and nothing is recorded as unread',
       !!o && same(o._meta.games_found_by_date, { [TODAY]: 7, '2026-11-01': 0, '2026-11-02': 1, '2026-11-03': 2 }) && wnbaFwd.logs.some((l) => /window: 4\/4 days .* = 10 games/.test(l)) && same(o._meta.source_errors, {}), JSON.stringify(o && [o._meta.games_found_by_date, o._meta.source_errors]));
}
const wnbaRuns = [];
for (const [name, wnba, nullDays, why] of [
  ['a 502 on every window day', () => resp(502, { error: 'ESPN upstream 503', sport: 'wnba' }), WIN, /HTTP 502/],
  ['a 503 on one forward day only', (iso) => (iso === '2026-11-02' ? resp(503, { error: 'x' }) : resp(200, emptyOf('wnba', iso))), ['2026-11-02'], /HTTP 503/],
  ['a 502 on day 0 only', (iso) => (iso === TODAY ? resp(502, { error: 'x' }) : resp(200, emptyOf('wnba', iso))), [TODAY], /HTTP 502/],
  ['a fetch that rejects on day 0', (iso) => { if (iso === TODAY) throw new Error('connect ECONNRESET'); return resp(200, emptyOf('wnba', iso)); }, [TODAY], /request failed: connect ECONNRESET/],
  ['a 200 whose source names an error on a forward day', (iso) => (iso === '2026-11-01' ? resp(200, emptyOf('wnba', iso, 'espn-error')) : resp(200, emptyOf('wnba', iso))), ['2026-11-01'], /relay source espn-error/],
  ['the NBA board answered for a WNBA request on day 0', (iso) => (iso === TODAY ? resp(200, fixtureBody()) : resp(200, emptyOf('wnba', iso))), [TODAY], /answered for nba 2026-10-31/],
  ['a game with no team name on a forward day', (iso) => { if (iso !== '2026-11-03') return resp(200, emptyOf('wnba', iso)); const b = wlast(); b.date = iso; b.games[0].away.name = ''; return resp(200, b); }, ['2026-11-03'], /1 of 1 games have no team name/],
]) {
  const r = await runGenerator({ wnba }); const o = r.out;
  wnbaRuns.push([name, r]);
  want(`generator: WNBA ${name} still ships the file and does not exit`, !!o && r.exited === null, JSON.stringify({ wrote: !!o, exited: r.exited }));
  want(`generator: WNBA ${name} makes exactly the failed days null for WNBA and leaves the others arrays`,
       !!o && WIN.every((d) => (wDay(o, d) === null) === nullDays.includes(d) && (wDay(o, d) === null || Array.isArray(wDay(o, d))))
       && (o.schedules.wnba === null) === nullDays.includes(TODAY), JSON.stringify(o && WIN.map((d) => wDay(o, d))));
  want(`generator: WNBA ${name} keeps all four days in window_dates (an unread WNBA board does not drop a day whose MLB and MLS entries are fine)`, !!o && same(o._meta.window_dates, WIN), JSON.stringify(o && o._meta.window_dates));
  want(`generator: WNBA ${name} makes games_found.wnba null when day 0 failed and a number when it did not`, !!o && (o._meta.games_found.wnba === null) === nullDays.includes(TODAY) && (nullDays.includes(TODAY) || Number.isInteger(o._meta.games_found.wnba)), JSON.stringify(o && o._meta.games_found));
  want(`generator: WNBA ${name} records each failed date and its reason in source_errors.wnba, in window order, joined by "; "`,
       !!o && typeof se(o).wnba === 'string' && same(se(o).wnba.split('; ').map((x) => x.slice(0, 10)), nullDays) && se(o).wnba.split('; ').every((x) => x[10] === ':' && why.test(x)), JSON.stringify(o && o._meta.source_errors));
  want(`generator: WNBA ${name} does not touch source_errors.nba or the NBA games (the NBA board read clean)`, !!o && !('nba' in se(o)) && Array.isArray(o.schedules.nba) && o.schedules.nba.length === 7, JSON.stringify(o && o._meta.source_errors));
  want(`generator: WNBA ${name} does not count a null day as a game in games_found_by_date`, !!o && WIN.every((d) => o._meta.games_found_by_date[d] === (d === TODAY ? 7 : 0)), JSON.stringify(o && o._meta.games_found_by_date));
  want(`generator: WNBA ${name} names each date not read in the run log`, nullDays.every((d) => r.logs.some((l) => l.includes(`WNBA board not read for ${d}`))), JSON.stringify(r.logs.slice(0, 8)));
  want(`generator: WNBA ${name} keeps the other sports' keys arrays and the cover at nba and wnba`, !!o && ['nhl', 'nba', 'mlb', 'soccer'].every((k) => Array.isArray(o.schedules[k])) && same(o._meta.source_errors_cover, ['nba', 'wnba']), JSON.stringify(o && Object.keys(o.schedules)));
}
const both = await runGenerator({ nba: () => resp(403, { error: 'nba returned 403' }), wnba: () => resp(502, { error: 'x' }) });
{
  const o = both.out;
  want('generator: when both boards fail, both are recorded under their own sport and both day-0 entries are null',
       !!o && o.schedules.nba === null && o.schedules.wnba === null && /^2026-10-31: HTTP 403$/.test(se(o).nba) && se(o).wnba.split('; ').length === 4, JSON.stringify(o && o._meta.source_errors));
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
  want('source errors: a recorded error exits 1 and prints the source and the reason', dirty.status === 1 && /^  nba: 2026-10-31: HTTP 403$/m.test(dirty.stderr), `${dirty.status} ${dirty.stderr}`);
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
  const failedRun = await runGenerator({ nba: () => resp(403, { error: 'nba returned 403' }) });
  const fromBad = runErrs(put('gen-bad.json', failedRun.text));
  want('source errors: the generator\'s own output for a 403 exits 1 and names the NBA', fromBad.status === 1 && /^  nba: 2026-10-31: HTTP 403$/m.test(fromBad.stderr), `${fromBad.status} ${fromBad.stderr}`);
  const two = runErrs(put('two.json', JSON.stringify({ _meta: { source_errors: { nba: '2026-10-31: HTTP 502', wnba: '2026-10-31: HTTP 502; 2026-11-01: HTTP 502' }, source_errors_cover: ['nba', 'wnba'] } })));
  want('source errors: two failed sources are both printed, with every failed date of the one read on several days', two.status === 1 && /^  nba: 2026-10-31: HTTP 502$/m.test(two.stderr) && /^  wnba: 2026-10-31: HTTP 502; 2026-11-01: HTTP 502$/m.test(two.stderr), `${two.status} ${two.stderr}`);
  const fromBoth = runErrs(put('gen-both.json', both.text));
  want('source errors: the generator\'s own output when both boards fail prints both sources and all four WNBA dates', fromBoth.status === 1 && /^  nba: 2026-10-31: HTTP 403$/m.test(fromBoth.stderr) && /^  wnba: 2026-10-31: HTTP 502; 2026-11-01: HTTP 502; 2026-11-02: HTTP 502; 2026-11-03: HTTP 502$/m.test(fromBoth.stderr), `${fromBoth.status} ${fromBoth.stderr}`);
  const wnbaDown = wnbaRuns.find(([n]) => n === 'a 503 on one forward day only')[1];
  const fromWnbaBad = runErrs(put('gen-wnba-bad.json', wnbaDown.text));
  want('source errors: the generator\'s own output for a WNBA 503 on one forward day exits 1 and names the WNBA and the date', fromWnbaBad.status === 1 && /^  wnba: 2026-11-02: HTTP 503$/m.test(fromWnbaBad.stderr), `${fromWnbaBad.status} ${fromWnbaBad.stderr}`);
  const fromWinter = runErrs(put('gen-winter.json', winter.text));
  want('source errors: the generator\'s own output for an off-season window exits 0 and says it vouches for nba and wnba', fromWinter.status === 0 && /none recorded for nba, wnba\./.test(fromWinter.stdout), `${fromWinter.status} ${fromWinter.stdout} ${fromWinter.stderr}`);
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
               'outbox/fixture-nba-board-20261031.json', 'outbox/fixture-wnba-board-20261031.json', '.github/workflows/field-data.yml', '.github/workflows/nba-board-check.yml'];
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
want('text: the generator requires the shared board reader and calls each of its two readers once', GEN_SRC_TEXT.includes("require('./nba-board.cjs')") && count(GEN_SRC_TEXT, 'readNbaBoard(') === 1 && count(GEN_SRC_TEXT, 'readWnbaBoard(') === 1, JSON.stringify([count(GEN_SRC_TEXT, 'readNbaBoard('), count(GEN_SRC_TEXT, 'readWnbaBoard(')]));
const GEN_CODE = GEN_SRC_TEXT.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
want('text: no line of code in the generator names the retired files (its comments explain them)', !GEN_CODE.includes('/tmp/nba.json') && !GEN_CODE.includes('todaysScoreboard_00.json'), GEN_CODE.split('\n').filter((l) => /nba\.json|todaysScoreboard/.test(l)).join(' | '));
want('text: no line of code in the generator still reads the WNBA route by https (its comments explain the old read)', !GEN_CODE.includes('sport=wnba') && !GEN_CODE.includes("hostname: 'field-relay-nba"), GEN_CODE.split('\n').filter((l) => /sport=wnba|field-relay-nba/.test(l)).join(' | '));
want('text: the generator still exits non-zero only in its one fatal handler (a source error must not stop the push step)', count(GEN_SRC_TEXT, 'process.exit(') === 1 && GEN_SRC_TEXT.includes("console.error('Fatal:', e.message); process.exit(1);"), String(count(GEN_SRC_TEXT, 'process.exit(')));
want('text: the generator\'s source_errors record is written into _meta from the one collector', count(GEN_SRC_TEXT, 'source_errors: SOURCE_ERRORS') === 1, String(count(GEN_SRC_TEXT, 'source_errors: SOURCE_ERRORS')));

console.log(`\nchecked ${ran} case(s): ${tally['board']} on the board reader, NBA and WNBA (a fake fetch driven by the relay's real answers of 2026-10-31 and its real off-season days; error shapes read from the relay source, not observed), `
          + `${tally['generator']} on the generator run in full under node:vm (stubbed fs, https and fetch; ${unstubbedAll.length} request(s) no stub claimed), `
          + `${tally['source errors']} on the last-step script (run as a subprocess), ${tally['text']} text assertions on the workflow and the generator. `
          + `NOT executed here: the generator against live sources, the AI note calls (no key set), the workflow itself.`);
if (failed) { console.error(`FAIL — ${failed} case(s).`); process.exit(1); }
console.log('PASS');
