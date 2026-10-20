#!/usr/bin/env node
// Rule 90 (MUTATE-FIRST-A) + docs/CC-CMD-2026-10-20-debrief-cache-outlives-archive-repair.md
//
// injectDebriefCards reads Gap 12's `field-debriefs` Cache API before the relay.
// Until 2026-10-20 a hit was used as-is, with no age check and no request, and
// the only eviction was sw.js's activate handler at 7 days. On 2026-10-20 the
// archive repaired the odds of 211 games; a browser that had cached one kept
// rendering "E Michigan null · Sacramento St +27400" after D1 said -345 / +275.
//
// This runs field.js's OWN text, not a copy of its logic:
//   - injectDebriefCards, _fetchDebriefContext, _revalidateDebriefContext and
//     the session Map: the region from `const _debriefContextCache` to the end
//     of injectDebriefCards;
//   - buildEnrichedGame and fieldChip;
//   - buildDebrief from src/debrief/index.ts.
// Fakes: the DOM (only what these functions touch), the Cache API storage
// (which outlives a "page load", as the real one outlives a reload), and the
// relay's fetch. A "page load" re-evaluates the region, so the session Map
// starts empty and the Cache API does not.
//
// Payloads: outbox/fixtures/context-game-espn-401866408-2026-10-20.json. It
// holds the live relay body after the repair, and the same body with the
// damaged moneyline D1 held before it.
//
//   node --experimental-strip-types --no-warnings scripts/check-debrief-cache-revalidates.mjs
//   ... --src=<path to a field.js>   run the cases against another copy (red before)
//   ... --mutate                     each mutation of the source must turn a case red

import { readFileSync } from 'node:fs';

const SRC = (process.argv.find(a => a.startsWith('--src=')) || '--src=src/legacy/field.js').slice(6);
const MUTATE = process.argv.includes('--mutate');
const FIX = JSON.parse(readFileSync('outbox/fixtures/context-game-espn-401866408-2026-10-20.json', 'utf8'));
const CONTEXT_ID = FIX.meta.contextId;
const BASE = 'https://relay.test';
const CONTEXT_URL = `${BASE}/context/game/${encodeURIComponent(CONTEXT_ID)}`;
const CACHE_KEY = `https://field-local/debrief/${encodeURIComponent(CONTEXT_ID)}`;
const DAMAGED = FIX.damaged, REPAIRED = FIX.repaired;

// ── the source under test ────────────────────────────────────────────────────
function slice(src, startMarker, label) {
  const at = src.indexOf(startMarker);
  if (at < 0 || src.indexOf(startMarker, at + 1) >= 0)
    throw new Error(`${label}: "${startMarker}" must occur exactly once in ${SRC}`);
  return at;
}
function extract(src) {
  const fn = name => {
    const s = slice(src, `\nfunction ${name}(`, name) + 1;
    return src.slice(s, src.indexOf('\n}\n', s) + 2);
  };
  const s = slice(src, '\nconst _debriefContextCache = new Map();', 'session Map') + 1;
  const inj = slice(src, '\nasync function injectDebriefCards(', 'injectDebriefCards');
  return `'use strict';\n${fn('fieldChip')}\ninitDebriefModule({ fieldChip });\n${fn('buildEnrichedGame')}\n`
    + `${src.slice(s, src.indexOf('\n}\n', inj) + 2)}\nreturn { injectDebriefCards };`;
}

// ── fake DOM: only what injectDebriefCards and the debrief builders touch ────
class El {
  constructor(tag, doc) {
    Object.assign(this, { tagName: tag.toUpperCase(), doc, kids: [], parent: null, own: '',
      className: '', dataset: {}, style: {}, title: '' });
    const cls = () => this.className.split(/\s+/).filter(Boolean);
    this.classList = {
      add: (...c) => { this.className = [...new Set([...cls(), ...c])].join(' '); },
      remove: (...c) => { this.className = cls().filter(x => !c.includes(x)).join(' '); },
      toggle: (c, on) => { (on ?? !cls().includes(c)) ? this.classList.add(c) : this.classList.remove(c); },
      contains: c => cls().includes(c),
    };
  }
  get isConnected() { for (let n = this; n; n = n.parent) if (n === this.doc.body) return true; return false; }
  get textContent() { return this.own + this.kids.map(k => k.textContent).join(''); }
  set textContent(t) { this.kids = []; this.own = String(t); }
  appendChild(c) { c.remove(); c.parent = this; this.kids.push(c); return c; }
  replaceChildren(...cs) {
    this.kids.forEach(k => { k.parent = null; }); this.kids = [];
    cs.forEach(c => this.appendChild(c));
    if (this.classList.contains('card-debrief')) this.doc.debriefRenders++;
  }
  remove() { if (this.parent) { this.parent.kids = this.parent.kids.filter(k => k !== this); this.parent = null; } }
  removeAttribute(name) {
    if (name !== 'data-debrief-injected') throw this.doc.unsupported(`removeAttribute(${name})`);
    delete this.dataset.debriefInjected;
  }
  *walk() { for (const k of this.kids) { yield k; yield* k.walk(); } }
  querySelector(sel) {
    const m = /^\.([\w-]+)$/.exec(sel);
    if (!m) throw this.doc.unsupported(`querySelector(${sel})`);
    for (const n of this.walk()) if (n.classList.contains(m[1])) return n;
    return null;
  }
}
const DOM_PROBLEMS = [];
function makeDocument() {
  const doc = { debriefRenders: 0 };
  doc.unsupported = what => { DOM_PROBLEMS.push(`fake DOM cannot do ${what}`); return new Error(what); };
  doc.createElement = tag => new El(tag, doc);
  doc.body = new El('body', doc);
  const cards = () => [...doc.body.walk()].filter(n => n.classList.contains('game-card'));
  doc.querySelectorAll = sel => {
    if (sel === '.game-card[data-gameid]:not([data-debrief-injected])')
      return cards().filter(c => c.dataset.gameid !== undefined && c.dataset.debriefInjected === undefined);
    const m = /^\.game-card\[data-gameid="([^"]*)"\]\[data-debrief-injected\]$/.exec(sel);
    if (m) return cards().filter(c => c.dataset.gameid === m[1] && c.dataset.debriefInjected !== undefined);
    const f = /^\.game-card\[data-gameid="([^"]*)"\]:not\(\[data-debrief-injected\]\)$/.exec(sel);
    if (f) return cards().filter(c => c.dataset.gameid === f[1] && c.dataset.debriefInjected === undefined);
    throw doc.unsupported(`querySelectorAll(${sel})`);
  };
  return doc;
}

// ── fake Cache API storage (outlives a page load) and fake relay ─────────────
// Every held relay answer, so a case that never releases its own cannot hang the run.
const GATES = [];
function makeWorld() {
  const stores = new Map();
  // fail.open / fail.put make the Cache API reject, as a browser does in a
  // private window or over quota.
  const fail = { open: false, put: false };
  const caches = {
    open: async name => {
      if (fail.open) throw new Error('SecurityError: The operation is insecure.');
      if (!stores.has(name)) stores.set(name, new Map());
      const m = stores.get(name);
      return {
        match: async k => { const e = m.get(String(k)); return e ? new Response(e.body, { headers: e.headers }) : undefined; },
        put: async (k, r) => {
          if (fail.put) throw new Error('QuotaExceededError');
          m.set(String(k), { body: await r.text(), headers: Object.fromEntries(r.headers) });
        },
      };
    },
  };
  // An entry as an older build, or a torn write, left it.
  const putRaw = (id, body) => {
    if (!stores.has('field-debriefs')) stores.set('field-debriefs', new Map());
    stores.get('field-debriefs').set(`https://field-local/debrief/${encodeURIComponent(id)}`,
      { body, headers: { 'content-type': 'application/json', 'x-cache-time': String(Date.now()) } });
  };
  // body/status answer every id unless byId names it; hold(id) holds one id's
  // requests (or all, with no id) until release().
  const relay = { body: null, status: 200, offline: false, calls: [], inits: [], gate: null, gateId: null, byId: {}, statusById: {} };
  relay.hold = (id = null) => {
    let release, requested;
    const g = { released: new Promise(r => { release = r; }), requested: new Promise(r => { requested = r; }) };
    Object.assign(g, { release, signal: requested });
    relay.gate = g; relay.gateId = id; GATES.push(g);
    return g;
  };
  relay.fetch = async (url, init) => {
    relay.calls.push(String(url)); relay.inits.push(init);
    const id = decodeURIComponent(String(url).split('/context/game/')[1] || '');
    const g = relay.gate;
    if (g && (relay.gateId === null || relay.gateId === id)) { g.signal(); await g.released; }
    if (relay.offline) throw new TypeError('Failed to fetch');
    const body = Object.hasOwn(relay.byId, id) ? relay.byId[id] : relay.body;
    const status = Object.hasOwn(relay.statusById, id) ? relay.statusById[id] : relay.status;
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  relay.callsFor = id => relay.calls.filter(u => u === `${BASE}/context/game/${encodeURIComponent(id)}`).length;
  const entry = (id = CONTEXT_ID) => stores.get('field-debriefs')?.get(`https://field-local/debrief/${encodeURIComponent(id)}`);
  const stored = (id = CONTEXT_ID) => entry(id)?.body ?? null;
  const storedAt = (id = CONTEXT_ID) => entry(id)?.headers['x-cache-time'] ?? null;
  // AbortSignal.timeout as the code under test sees it: real, and recorded.
  const timeouts = [], signals = new Set();
  const abortSignal = { timeout: ms => { timeouts.push(ms); const sg = AbortSignal.timeout(ms); signals.add(sg); return sg; } };
  return { caches, relay, stored, storedAt, timeouts, signals, abortSignal, fail, putRaw };
}

const { buildDebrief, initDebriefModule } = await import('../src/debrief/index.ts');

// One final game per slate id; the measured game is g7. Others reuse its
// payload under their own context id (withId) for the multi-game cases.
const game = (_id, _gameId) => ({ _id, _gameId, home: 'E Michigan', away: 'Sacramento St',
  league: 'CFB', _sport: 'CFB', start_time: '2026-08-29T22:30Z', state: 'post', homeScore: 28, awayScore: 17 });
const G7 = game('g7', CONTEXT_ID);
const withId = (body, id) => ({ ...body, id });

function pageLoad(world, code, games = [G7]) {
  const doc = makeDocument();
  globalThis.document = doc;   // the debrief builders read the global
  const errors = [];
  const allData = { sports: [{ sport: 'CFB', games }] };
  const mod = new Function('document', 'caches', 'fetch', 'allData', 'isGameOver', 'findEspnEntry',
    'findESPNScore', 'captureFieldError', 'V2_RELAY_BASE', 'buildDebrief', 'initDebriefModule', 'AbortSignal', code)(
    doc, world.caches, world.relay.fetch, allData, () => true, () => null, () => null,
    (fn, e) => errors.push(`${fn}: ${e?.message ?? e}`), BASE, buildDebrief, initDebriefModule, world.abortSignal);
  const card = (gameId = 'g7') => {
    const c = doc.createElement('div');
    c.className = 'game-card'; c.dataset.gameid = gameId;
    return doc.body.appendChild(c);
  };
  const shown = c => c.querySelector('.card-debrief')?.textContent ?? '';
  return { doc, inject: mod.injectDebriefCards, card, shown, errors };
}

// The odds line of a rendered debrief, for messages (the whole text carries the brief too).
const line = t => (t.match(/E Michigan (?:null|[-+]?\d+) · Sacramento St (?:null|[-+]?\d+)/) || [t ? t.slice(0, 60) : '(nothing)'])[0];

const settle = async () => { for (let i = 0; i < 50; i++) await new Promise(r => setImmediate(r)); };
// Whether p settles within a number of event-loop turns. Turns, not
// milliseconds: a starved CI runner stretches time but not the turn count.
const within = async (p, turns = 200) => {
  let done = false;
  p.then(() => { done = true; }, () => { done = true; });
  for (let i = 0; i < turns && !done; i++) await new Promise(r => setImmediate(r));
  return done;
};
// A hang guard only; every wait a case asserts on is turn-based (within, settle).
const CASE_LIMIT_MS = Number(process.env.CHECK_CASE_LIMIT_MS || 20000);
const msEpoch = (v, lo, hi) => /^\d+$/.test(String(v)) && Number(v) >= lo && Number(v) <= hi;

// What each payload renders to, measured by running the same code on it once.
async function renderOf(code, body) {
  const w = makeWorld(); w.relay.body = body;
  const p = pageLoad(w, code); const c = p.card(); await p.inject();
  return p.shown(c);
}

// ── the cases ────────────────────────────────────────────────────────────────
// Each returns a list of failures (empty = pass). `seed` performs a first page
// load that leaves `body` in the persistent cache, as a real first visit does.
async function seed(code, body, games = [G7], byId = {}) {
  const w = makeWorld(); w.relay.body = body; w.relay.byId = byId;
  const p = pageLoad(w, code, games); games.forEach(g => p.card(g._id)); await p.inject(); await settle();
  w.relay.byId = {};
  return w;
}

// The relay's answer when a D1 sub-query fails: still 200 and ok:true, with the
// failed section null and `_errors` naming it (field-relay-nba src/index.js,
// the /context/game handler: findGame and the fan-out are settled, and
// `_errors: _errors.length ? _errors : undefined`).
const PARTIAL_ARCHIVE = { ...REPAIRED, archive: null,
  _errors: [{ source: 'archive', reason: 'D1_ERROR: D1 DB storage operation exceeded timeout' }] };
// C15: a debrief whose only layer is the odds line, and its correction to a
// payload with nothing to draw (a repair that NULLs the odds).
const ODDS_ONLY = { ...REPAIRED, archive: { ...REPAIRED.archive, gameBriefs: [] },
  game: { ...REPAIRED.game, drama_peak: null } };
const NOTHING_TO_DRAW = { ...ODDS_ONLY, game: { ...ODDS_ONLY.game, opening_odds: null, closing_odds: null,
  opening_odds_parsed: null, closing_odds_parsed: null } };
// When findGame rejects, `briefId = game?.espn_event_id || id` falls back to the
// prefixed id, which no brief matches (D1, 2026-10-20: 0 rows for
// 'espn:401866408' against 3 for '401866408'), and bracketDelta finds nothing.
const PARTIAL_GAME = { ...REPAIRED, resolved: false, id_form: 'unresolved', game: null,
  archive: { gameBriefs: [], slateBrief: null, priorBrief: null }, bracketDelta: null,
  _errors: [{ source: 'game', reason: 'D1_ERROR: D1 DB storage operation exceeded timeout' }] };

function caseList(code, R) {
  const J = JSON.stringify;
  return [
    ['C1  first load, empty cache: one fetch, the relay payload renders and is stored', async () => {
      const w = makeWorld(); w.relay.body = DAMAGED;
      const t0 = Date.now();
      const p = pageLoad(w, code); const c = p.card(); await p.inject();
      const t1 = Date.now();
      return [msEpoch(w.storedAt(), t0, t1) || `X-Cache-Time ${w.storedAt()} is not a millisecond time within the case (sw.js evicts on Date.now() - X-Cache-Time)`,
        w.relay.calls.length === 1 || `fetches ${w.relay.calls.length}, expected 1`,
        w.relay.calls[0] === CONTEXT_URL || `fetched ${w.relay.calls[0]}`,
        p.shown(c) === R.damaged || `rendered "${line(p.shown(c))}"`,
        w.stored() === J(DAMAGED) || 'the Cache API does not hold the payload',
        c.dataset.debriefInjected === '1' || 'card not stamped'];
    }],
    ['C2  reload after the archive is corrected: the corrected payload renders and replaces the cached one', async () => {
      const w = await seed(code, DAMAGED); w.relay.body = REPAIRED;
      const seededAt = Number(w.storedAt());
      await new Promise(r => setTimeout(r, 5));
      const p = pageLoad(w, code); const c = p.card(); await p.inject(); await settle();
      return [p.shown(c) === R.repaired || `rendered "${line(p.shown(c))}"`,
        msEpoch(w.storedAt(), seededAt + 1, Date.now()) || `X-Cache-Time ${w.storedAt()} is not a later millisecond time than the seed's ${seededAt}`,
        w.relay.calls.length === 2 || `fetches ${w.relay.calls.length}, expected 2 (one per load)`,
        w.stored() === J(REPAIRED) || 'the Cache API still holds the damaged payload'];
    }],
    ['C3  the cached copy renders before the relay answers', async () => {
      const w = await seed(code, DAMAGED); w.relay.body = REPAIRED;
      const g = w.relay.hold();
      const p = pageLoad(w, code); const c = p.card(); const run = p.inject();
      const asked = await within(g.requested);
      const before = p.shown(c);
      g.release(); await run; await settle();
      return [asked || 'no request to the relay on a cache hit',
        before === R.damaged || `while the relay was pending the card showed "${line(before)}"`,
        p.shown(c) === R.repaired || `after the answer the card showed "${line(p.shown(c))}"`];
    }],
    ['C4  later renders in the same load use the corrected payload without another fetch', async () => {
      const w = await seed(code, DAMAGED); w.relay.body = REPAIRED;
      const p = pageLoad(w, code); p.card(); await p.inject(); await settle();
      p.doc.body.replaceChildren();               // renderAll replaces the cards
      const c = p.card(); await p.inject(); await settle();
      return [p.shown(c) === R.repaired || `rendered "${line(p.shown(c))}"`,
        w.relay.calls.length === 2 || `fetches ${w.relay.calls.length}, expected 2`];
    }],
    ['C5  offline reload: the cached copy still renders (Gap 12)', async () => {
      const w = await seed(code, REPAIRED); w.relay.offline = true;
      const p = pageLoad(w, code); const c = p.card(); await p.inject(); await settle();
      return [p.shown(c) === R.repaired || `rendered "${line(p.shown(c))}"`,
        c.dataset.debriefInjected === '1' || 'card not stamped',
        w.stored() === J(REPAIRED) || 'the Cache API copy changed'];
    }],
    ['C6  a relay error on revalidation leaves the cached copy and its render', async () => {
      const w = await seed(code, REPAIRED);
      w.relay.status = 500; w.relay.body = { ok: false, error: 'D1 timeout' };
      const p = pageLoad(w, code); const c = p.card(); await p.inject(); await settle();
      return [p.shown(c) === R.repaired || `rendered "${line(p.shown(c))}"`,
        p.doc.debriefRenders === 1 || `${p.doc.debriefRenders} renders`,
        c.dataset.debriefInjected === '1' || 'card not stamped',
        J(p.errors) === J(['debrief:revalidate: non-2xx answer']) || `errors ${J(p.errors)}`,
        w.stored() === J(REPAIRED) || `the Cache API now holds ${w.stored()}`];
    }],
    ['C6b a 200 carrying _errors (archive) is not a correction: cached copy, render and Map stay', async () => {
      const w = await seed(code, REPAIRED); w.relay.body = PARTIAL_ARCHIVE;
      const p = pageLoad(w, code); const c = p.card(); await p.inject(); await settle();
      const fetched = w.relay.calls.length;
      p.doc.body.replaceChildren(); const c2 = p.card(); await p.inject(); await settle();
      return [p.shown(c2) === R.repaired || `the next render shows "${line(p.shown(c2))}"`,
        p.doc.debriefRenders === 2 || `${p.doc.debriefRenders} renders, expected 2 (one per card)`,
        w.relay.calls.length === fetched || 'the next render asked the relay again',
        J(p.errors) === J(['debrief:revalidate: partial answer (archive)']) || `errors ${J(p.errors)}`,
        w.stored() === J(REPAIRED) || 'the Cache API copy was replaced by the partial answer'];
    }],
    ['C6c a 200 carrying _errors (game) is not a correction either', async () => {
      const w = await seed(code, REPAIRED); w.relay.body = PARTIAL_GAME;
      const p = pageLoad(w, code); const c = p.card(); await p.inject(); await settle();
      return [p.shown(c) === R.repaired || `rendered "${line(p.shown(c))}"`,
        J(p.errors) === J(['debrief:revalidate: partial answer (game)']) || `errors ${J(p.errors)}`,
        w.stored() === J(REPAIRED) || 'the Cache API copy was replaced by the partial answer'];
    }],
    ['C7  an unchanged payload is rendered once and leaves the stored copy and its date alone', async () => {
      const w = await seed(code, REPAIRED);
      const at = w.storedAt();
      await new Promise(r => setTimeout(r, 5));    // so a rewrite would carry a later X-Cache-Time
      const p = pageLoad(w, code); const c = p.card(); await p.inject(); await settle();
      return [p.doc.debriefRenders === 1 || `${p.doc.debriefRenders} renders`,
        p.shown(c) === R.repaired || `rendered "${line(p.shown(c))}"`,
        at !== null || 'the seed stored no X-Cache-Time',
        w.storedAt() === at || `X-Cache-Time rewritten (${at} -> ${w.storedAt()}), which restarts sw.js's 7-day eviction`];
    }],
    ['C8  a miss the relay cannot answer renders nothing and leaves the card unstamped', async () => {
      const w = makeWorld(); w.relay.status = 404; w.relay.body = { ok: false };
      const p = pageLoad(w, code); const c = p.card(); await p.inject(); await settle();
      return [!c.querySelector('.card-debrief') || 'a debrief rendered',
        c.dataset.debriefInjected === undefined || 'card stamped',
        w.stored() === null || 'the error was stored'];
    }],
    ['C8b a partial answer on a miss renders once and is kept nowhere: the next pass gets the healed answer', async () => {
      const w = makeWorld(); w.relay.body = PARTIAL_GAME;
      const p = pageLoad(w, code); p.card(); await p.inject(); await settle();
      const storedAfterPartial = w.stored();
      w.relay.body = REPAIRED;                     // the relay's partial window has passed
      p.doc.body.replaceChildren(); const c = p.card(); await p.inject(); await settle();
      return [storedAfterPartial === null || 'the partial answer was written to the Cache API',
        w.relay.calls.length === 2 || `fetches ${w.relay.calls.length}, expected 2 (the partial answer must not be pinned in the session Map)`,
        p.shown(c) === R.repaired || `the next pass shows "${line(p.shown(c))}"`,
        w.stored() === J(REPAIRED) || 'the healed answer was not stored'];
    }],
    ['C9  a card that leaves the DOM before rendering still refreshes the session copy', async () => {
      const w = await seed(code, DAMAGED); w.relay.body = REPAIRED;
      const g = w.relay.hold();
      const p = pageLoad(w, code); const gone = p.card(); const run = p.inject();
      gone.remove();                               // before the first await resolves
      const finished = await within(run);
      const asked = await within(g.requested);
      g.release(); await run; await settle(); w.relay.gate = null;
      const c = p.card(); await p.inject(); await settle();
      return [finished || 'the injection of a card that left the DOM waited on the relay',
        asked || 'no request to the relay',
        p.shown(c) === R.repaired || `the next card rendered "${line(p.shown(c))}"`,
        w.relay.calls.length === 2 || `fetches ${w.relay.calls.length}, expected 2`,
        w.stored() === J(REPAIRED) || 'the Cache API still holds the damaged payload'];
    }],
    ['C10 a replacement card rendered while the relay is pending is corrected when it answers', async () => {
      const w = await seed(code, DAMAGED); w.relay.body = REPAIRED;
      const g = w.relay.hold();
      const p = pageLoad(w, code); const first = p.card(); const run = p.inject();
      await within(g.requested);
      first.remove(); const c = p.card(); const second = p.inject();   // renderAll, while pending
      await within(second);
      const before = p.shown(c);
      g.release(); await run; await second; await settle();
      return [before === R.damaged || `the replacement first showed "${line(before)}"`,
        p.shown(c) === R.repaired || `the replacement shows "${line(p.shown(c))}" after the answer`];
    }],
    ['C11 an offline revalidation is recorded once, as debrief:revalidate', async () => {
      const w = await seed(code, REPAIRED); w.relay.offline = true;
      const p = pageLoad(w, code); p.card(); await p.inject(); await settle();
      return [J(p.errors) === J(['debrief:revalidate: Failed to fetch']) || `errors ${J(p.errors)}`];
    }],
    ['C12 offline, later renders in the same load ask the relay once in all', async () => {
      const w = await seed(code, REPAIRED); w.relay.offline = true;
      const p = pageLoad(w, code);
      for (let i = 0; i < 3; i++) { p.doc.body.replaceChildren(); p.card(); await p.inject(); await settle(); }
      return [w.relay.calls.length === 2 || `fetches ${w.relay.calls.length}, expected 2 (seed + one revalidation)`,
        p.errors.length === 1 || `${p.errors.length} errors recorded, expected 1`];
    }],
    ['C13 every relay request carries AbortSignal.timeout(8000)', async () => {
      const w = await seed(code, DAMAGED); w.relay.body = REPAIRED;
      const p = pageLoad(w, code); p.card(); await p.inject(); await settle();
      return [w.relay.calls.length === 2 || `fetches ${w.relay.calls.length}`,
        w.relay.inits.every(i => w.signals.has(i?.signal)) || 'a request went out without the signal AbortSignal.timeout returned',
        J(w.timeouts) === J(w.relay.calls.map(() => 8000)) || `timeouts ${J(w.timeouts)} for ${w.relay.calls.length} requests`,
        w.relay.inits[0]?.cache === undefined || `the miss fetch used cache: ${w.relay.inits[0]?.cache}`,
        w.relay.inits[1]?.cache === 'no-cache' || `the revalidation used cache: ${w.relay.inits[1]?.cache}, so the browser HTTP cache (max-age=300) can answer it with the old body`];
    }],
    ['C14 a corrected game re-runs only its own cards: pending and failing games are not touched', async () => {
      const A = 'espn:900000001', B = 'espn:900000002', C = 'espn:900000003', D = 'espn:900000004';
      const games = [game('gA', A), game('gB', B), game('gC', C), game('gD', D)];
      const w = await seed(code, null, games.slice(0, 2), { [A]: withId(DAMAGED, A), [B]: withId(DAMAGED, B) });
      w.relay.byId = { [A]: withId(REPAIRED, A), [B]: withId(REPAIRED, B), [C]: withId(REPAIRED, C), [D]: { ok: false } };
      w.relay.statusById = { [D]: 503 };
      const g = w.relay.hold(C);
      const p = pageLoad(w, code, games); const cards = ['gA', 'gB', 'gC'].map(id => p.card(id)); p.card('gD');
      const run = p.inject(); await within(g.requested); await settle();
      const cWhileHeld = w.relay.callsFor(C);
      g.release(); await run; await settle();
      return [cWhileHeld === 1 || `the uncached game was asked ${cWhileHeld} times while its first answer was pending`,
        w.relay.callsFor(D) === 1 || `the game answering 503 was asked ${w.relay.callsFor(D)} times in one pass`,
        w.relay.callsFor(A) === 2 && w.relay.callsFor(B) === 2 || `A ${w.relay.callsFor(A)}, B ${w.relay.callsFor(B)} requests, expected 2 each`,
        p.doc.debriefRenders === 5 || `${p.doc.debriefRenders} renders, expected 5 (A, B, C once; A, B again after their correction)`,
        cards.every(c => p.shown(c) === R.repaired) || `rendered ${J(cards.map(c => line(p.shown(c))))}`];
    }],
    ['C15 a correction that leaves nothing to draw clears the old debrief', async () => {
      const w = await seed(code, ODDS_ONLY); w.relay.body = NOTHING_TO_DRAW;
      const p = pageLoad(w, code); const c = p.card(); await p.inject(); await settle();
      return [R.oddsOnly.includes('-345') || `the seed render had no odds line: "${R.oddsOnly}"`,
        R.nothing === '' || `the corrected payload is meant to draw nothing, drew "${R.nothing}"`,
        p.shown(c) === '' || `the card still shows "${line(p.shown(c))}" after the correction`,
        w.stored() === J(NOTHING_TO_DRAW) || 'the correction was not stored'];
    }],
    ['C16 two passes overlapping on a cache hit revalidate once', async () => {
      const w = await seed(code, DAMAGED); w.relay.body = REPAIRED;
      const p = pageLoad(w, code); const c = p.card();
      const a = p.inject();
      p.doc.body.replaceChildren(); const c2 = p.card();   // renderAll before the first read resolves
      const b = p.inject();
      await a; await b; await settle();
      return [w.relay.calls.length === 2 || `fetches ${w.relay.calls.length}, expected 2 (seed + one revalidation)`,
        p.shown(c2) === R.repaired || `rendered "${line(p.shown(c2))}"`];
    }],
    ['C17 a pass during a held revalidation does not render the stamped card again', async () => {
      const w = await seed(code, REPAIRED);
      const g = w.relay.hold();
      const p = pageLoad(w, code); const c = p.card(); const run = p.inject();
      const asked = await within(g.requested);
      await settle();
      const stampedWhileHeld = c.dataset.debriefInjected === '1';
      const second = p.inject(); await within(second); await settle();
      const rendersWhileHeld = p.doc.debriefRenders;
      g.release(); await run; await second; await settle();
      return [asked || 'no request to the relay',
        stampedWhileHeld || 'the card was not stamped while its revalidation was pending',
        rendersWhileHeld === 1 || `${rendersWhileHeld} renders while the revalidation was pending, expected 1`];
    }],
    ['C18 a miss that fails while two passes await it: both settle, nothing is pinned, the next pass asks again', async () => {
      const w = makeWorld(); w.relay.body = REPAIRED;
      const g = w.relay.hold();
      const p = pageLoad(w, code); p.card();
      const a = p.inject(); await within(g.requested);
      p.doc.body.replaceChildren(); p.card(); const b = p.inject();
      w.relay.offline = true; g.release(); w.relay.gate = null;
      const settled = (await within(a)) && (await within(b));
      await settle();
      const errorsOffline = J(p.errors);
      w.relay.offline = false;
      p.doc.body.replaceChildren(); const c = p.card(); await p.inject(); await settle();
      return [settled || 'a pass awaiting the failed miss did not settle',
        errorsOffline === J(['debrief:inject: Failed to fetch', 'debrief:inject: Failed to fetch']) || `errors ${errorsOffline}`,
        w.relay.calls.length === 2 || `fetches ${w.relay.calls.length}, expected 2 (the failed miss must not stay in flight)`,
        p.shown(c) === R.repaired || `the next pass shows "${line(p.shown(c))}"`,
        c.dataset.debriefInjected === '1' || 'the next card was not stamped'];
    }],
    ['C19 a Cache API that rejects (open, then put) still lets a miss render from the relay', async () => {
      const out = [];
      for (const which of ['open', 'put']) {
        const w = makeWorld(); w.relay.body = REPAIRED; w.fail[which] = true;
        const p = pageLoad(w, code); const c = p.card(); await p.inject(); await settle();
        out.push(p.shown(c) === R.repaired || `with ${which} failing the card shows "${line(p.shown(c))}"`,
          J(p.errors) === '[]' || `with ${which} failing, errors ${J(p.errors)}`);
      }
      return out;
    }],
    ['C20 a corrupt cached entry falls through to the relay and is replaced', async () => {
      const w = makeWorld(); w.relay.body = REPAIRED;
      w.putRaw(CONTEXT_ID, '{"ok":true,"id":"espn:4018');
      const p = pageLoad(w, code); const c = p.card(); await p.inject(); await settle();
      return [p.shown(c) === R.repaired || `rendered "${line(p.shown(c))}"`,
        w.stored() === J(REPAIRED) || `the Cache API still holds ${String(w.stored()).slice(0, 40)}`];
    }],
    ['C21 a partial entry an older build stored renders, is revalidated, and is not pinned when that fails', async () => {
      const w = makeWorld(); w.putRaw(CONTEXT_ID, J(PARTIAL_ARCHIVE)); w.relay.offline = true;
      const p = pageLoad(w, code); p.card(); await p.inject(); await settle();
      const firstCalls = w.relay.calls.length;
      w.relay.offline = false; w.relay.body = REPAIRED;
      p.doc.body.replaceChildren(); const c = p.card(); await p.inject(); await settle();
      return [firstCalls === 1 || `the first pass asked the relay ${firstCalls} times, expected 1 (a revalidation)`,
        w.relay.calls.length === 2 || `fetches ${w.relay.calls.length}, expected 2 (the partial must not be pinned in the session Map)`,
        p.shown(c) === R.repaired || `the next pass shows "${line(p.shown(c))}"`,
        w.stored() === J(REPAIRED) || 'the healed answer did not replace the partial entry'];
    }],
  ];
}

const rendersOf = async code => ({ damaged: await renderOf(code, DAMAGED), repaired: await renderOf(code, REPAIRED),
  oddsOnly: await renderOf(code, ODDS_ONLY), nothing: await renderOf(code, NOTHING_TO_DRAW) });
const rendersSane = R => R.damaged.includes('+27400') && R.repaired.includes('-345') && R.damaged !== R.repaired;

// R: the renders every case compares against. --mutate passes the ones measured
// on the unmutated source, so a mutation is graded against the measured lines.
async function runCases(code, R0 = null) {
  const R = R0 || await rendersOf(code);
  const out = [];
  for (const [name, fn] of caseList(code, R)) {
    let fails;
    DOM_PROBLEMS.length = 0;
    try {
      // A ref'd timer, cleared after: an unref'd one lets a deadlocked case end
      // the process mid-run with no verdict.
      let timer;
      const r = await Promise.race([fn(), new Promise(res => {
        timer = setTimeout(() => res([`did not finish within ${CASE_LIMIT_MS} ms`]), CASE_LIMIT_MS); })]);
      clearTimeout(timer);
      fails = r.filter(x => x !== true);
    } catch (e) { fails = [`threw: ${e.message}`]; }
    GATES.splice(0).forEach(g => g.release());
    await settle();
    if (DOM_PROBLEMS.length) fails.push(...DOM_PROBLEMS);
    out.push({ name, fails });
  }
  return { R, out };
}

// ── mutations: each must turn at least one case red ──────────────────────────
const MUTATIONS = [
  ['M1  the revalidation is never started',
    ': _revalidateDebriefContext(base, contextId, gameId, _cachedJson);', ': null;'],
  ['M2  the comparison always says "unchanged"',
    'if (JSON.stringify(fresh) === cachedJson) return;', 'if (true) return;'],
  ['M3  a changed payload does not clear the stamp',
    ".forEach(c => c.removeAttribute('data-debrief-injected'));", '.forEach(c => c);'],
  ['M4  a kept answer is not written to the Cache API',
    'await _dc.put(_debriefCacheKeyOf(contextId),', 'if (0) await _dc.put(_debriefCacheKeyOf(contextId),'],
  ['M5  the render waits for the relay',
    ': _revalidateDebriefContext(base, contextId, gameId, _cachedJson);',
    ': await _revalidateDebriefContext(base, contextId, gameId, _cachedJson);'],
  ['M6  an unchanged answer is treated as a change',
    '    if (JSON.stringify(fresh) === cachedJson) return;\n', ''],
  ['M7  a non-2xx answer is used',
    '  if (!r.ok) return null;\n  return r.json();', '  return r.json();'],
  ['M8  a failed revalidation escapes as an injection error',
    "    captureFieldError('debrief:revalidate', _e, true);", '    throw _e;'],
  ['M9  a kept answer does not reach the session Map',
    '  if (ctx._errors) return;\n  _debriefContextCache.set(contextId, ctx);', '  if (ctx._errors) return;'],
  ['M10 every overlapping pass revalidates, not only the first',
    'if (_first) _cachedJson = _got.cachedJson;', '_cachedJson = _got.cachedJson;'],
  ['M11 a partial answer (200 + _errors) replaces the cached copy',
    'if (!fresh || fresh._errors) {', 'if (!fresh) {'],
  ['M12 a partial answer is kept on a miss (Map and Cache API)',
    '  if (ctx._errors) return;\n', ''],
  ['M27 a failed miss stays in flight (cleanup on success only)',
    '_resolving.then(_done, _done);', '_resolving.then(_done, () => {});'],
  ['M28 a failed miss leaves an unhandled rejection and stays in flight',
    '_resolving.then(_done, _done);', '_resolving.then(_done);'],
  ['M29 a Cache API read failure is not contained',
    "  } catch(_) {}\n  const ctx = await _fetchDebriefContext(base, contextId);", "  } finally {}\n  const ctx = await _fetchDebriefContext(base, contextId);"],
  ['M30 a Cache API write failure is not contained',
    "      }));\n    }\n  } catch(_) {}\n}", "      }));\n    }\n  } finally {}\n}"],
  ['M31 a corrupt cached entry ends the pass instead of asking the relay',
    "        const ctx = JSON.parse(cachedJson);", "        let ctx; try { ctx = JSON.parse(cachedJson); } catch (_) { return { ctx: null, cachedJson: null }; }"],
  ['M32 a legacy partial entry is pinned in the session Map',
    'if (!ctx._errors) _debriefContextCache.set(contextId, ctx);', '_debriefContextCache.set(contextId, ctx);'],
  ['M33 a legacy partial entry is never revalidated',
    '        return { ctx, cachedJson };', '        return { ctx, cachedJson: ctx._errors ? null : cachedJson };'],
  ['M26 a partial answer is pinned in the session Map',
    '  if (ctx._errors) return;\n  _debriefContextCache.set(contextId, ctx);', '  _debriefContextCache.set(contextId, ctx);\n  if (ctx._errors) return;'],
  ['M13 the re-run covers every card, not the corrected game\'s',
    'await injectDebriefCards(gameId);', 'await injectDebriefCards();'],
  ['M14 a Cache API hit is not put in the session Map',
    'if (!ctx._errors) _debriefContextCache.set(contextId, ctx);', '/* no Map write on a hit */'],
  ['M15 a non-2xx answer is treated as a correction',
    'if (!fresh || fresh._errors) {', 'if (fresh && fresh._errors) {'],
  ['M16 the request timeout is dropped',
    '    { signal: AbortSignal.timeout(8000), ...init });', '    { ...init });'],
  ['M17 the request timeout is lengthened',
    '    { signal: AbortSignal.timeout(8000), ...init });', '    { signal: AbortSignal.timeout(80000), ...init });'],
  ['M18 an unchanged answer rewrites the stored copy and its date',
    '    if (JSON.stringify(fresh) === cachedJson) return;\n    await _keepDebriefContext(contextId, fresh);',
    '    await _keepDebriefContext(contextId, fresh);\n    if (JSON.stringify(fresh) === cachedJson) return;'],
  ['M19 the revalidation can be answered by the HTTP cache',
    "_fetchDebriefContext(base, contextId, { cache: 'no-cache' })", '_fetchDebriefContext(base, contextId, {})'],
  ['M20 overlapping passes do not share the pending resolve',
    'let _resolving = _debriefResolving.get(contextId);', 'let _resolving = undefined;'],
  ['M21 a correction with nothing to draw leaves the old debrief',
    "        cardEl.querySelector('.card-debrief')?.replaceChildren();\n", ''],
  ['M22 the card is stamped only after its revalidation',
    "      cardEl.dataset.debriefInjected = '1';\n      await _revalidation;",
    "      await _revalidation;\n      cardEl.dataset.debriefInjected = '1';"],
  ['M23 X-Cache-Time is written in seconds',
    "'X-Cache-Time': String(Date.now())", "'X-Cache-Time': String(Math.floor(Date.now() / 1000))"],
  ['M24 X-Cache-Time is not written',
    "{ 'Content-Type': 'application/json', 'X-Cache-Time': String(Date.now()) }", "{ 'Content-Type': 'application/json' }"],
  ['M25 the timeout signal is created and then discarded',
    '    { signal: AbortSignal.timeout(8000), ...init });',
    '    { signal: (AbortSignal.timeout(8000), new AbortController().signal), ...init });'],
];

const src = readFileSync(SRC, 'utf8');
process.on('unhandledRejection', e => { globalThis.__unhandled = (globalThis.__unhandled || 0) + 1; void e; });

if (!MUTATE) {
  const { R, out } = await runCases(extract(src));
  console.log(`source: ${SRC}`);
  console.log(`renders: damaged "${line(R.damaged)}" | repaired "${line(R.repaired)}"`);
  if (!rendersSane(R)) {
    console.error('FAIL  the two payloads do not render as the measured damaged/repaired lines; the cases would prove nothing');
    process.exit(1);
  }
  let failed = 0;
  for (const { name, fails } of out) {
    if (fails.length) { failed++; console.error(`  FAIL  ${name}\n        ${fails.join('\n        ')}`); }
    else console.log(`  ok    ${name}`);
  }
  await settle();
  const un = globalThis.__unhandled || 0;
  console.log(`checked ${out.length} cases on the measured game ${CONTEXT_ID} (C14 adds three synthetic ids carrying its payload); `
    + `DOM, Cache API and relay are fakes; ${out.length - failed} of ${out.length} cases pass; unhandled rejections: ${un}`);
  if (un) console.error(`  FAIL  ${un} unhandled rejection(s)`);
  process.exit(failed || un ? 1 : 0);
} else {
  // The unmutated source first: a mutation is credited only to cases that were
  // green on it, so a red or starved baseline cannot make every mutation look caught.
  globalThis.__unhandled = 0;
  const base = await runCases(extract(src));
  await settle();
  if (!rendersSane(base.R)) {
    console.error('FAIL  the unmutated source does not render the measured damaged/repaired lines; no mutation can be judged');
    process.exit(1);
  }
  const baseRed = base.out.filter(o => o.fails.length).map(o => o.name.split(' ')[0]);
  if (baseRed.length || globalThis.__unhandled) {
    console.error(`FAIL  the unmutated source is not green (${baseRed.join(', ') || ''}${globalThis.__unhandled ? ` ${globalThis.__unhandled} unhandled` : ''}); no mutation can be judged`);
    process.exit(1);
  }
  console.log(`baseline: ${base.out.length} of ${base.out.length} cases pass on the unmutated source`);
  let bad = 0;
  for (const [name, anchor, replace] of MUTATIONS) {
    const hits = src.split(anchor).length - 1;
    if (hits !== 1) { bad++; console.error(`  ANCHOR  ${name}: occurs ${hits} time(s), expected 1. NOTHING WAS MUTATED.`); continue; }
    const mutated = src.replace(anchor, () => replace);
    if (mutated === src) { bad++; console.error(`  ANCHOR  ${name}: replacement changed nothing`); continue; }
    globalThis.__unhandled = 0;
    const { out } = await runCases(extract(mutated), base.R);
    await settle();
    // A case that hit the hang guard is marked "(timeout)": caught, but slow.
    const red = out.filter(o => o.fails.length)
      .map(o => o.name.split(' ')[0] + (o.fails.some(f => /did not finish/.test(f)) ? ' (timeout)' : ''));
    if (globalThis.__unhandled) red.push(`${globalThis.__unhandled} unhandled`);
    if (red.length) console.log(`  caught      ${name}  (${red.join(', ')})`);
    else { bad++; console.error(`  NOT CAUGHT  ${name}`); }
  }
  console.log(`mutations: ${MUTATIONS.length - bad} of ${MUTATIONS.length} caught${bad ? '' : ', each anchor unique and applied'}`);
  process.exit(bad ? 1 : 0);
}
