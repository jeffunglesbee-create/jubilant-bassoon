#!/usr/bin/env node
// The forward-window probe's first read survives the page reloading itself (scripts/probe-meta-read.cjs; the probe is
// forward_window_probe.js).
//
// THE DEFECT. The page reloads itself when a freshly registered service worker activates (src/legacy/field.js, updatefound
// -> statechange -> location.reload()). The probe's browser context is always fresh, so that fires on some runs, and when
// it lands between the wait resolving and the value being read the single-shot read died with
//   jsHandle.jsonValue: Execution context was destroyed, most likely because of a navigation
// and the run reported cacheAccepted:false, schema:null and every forward day "did not reach the client". 4 of the 13
// manifests committed 2026-10-19 to 2026-10-30 (10-21, 10-26, 10-28, 10-30 21:11Z). The error text below is read from the
// committed 2026-10-26 manifest (outbox/fixture-forward-window-manifests-20261030.json), not retyped.
//
// THREE KINDS OF EVIDENCE, kept apart.
//   A. a fake page: the retry logic, one call at a time, with the real error text
//   B. a real browser: Playwright's own errors, with the reload forced to land in the same window, deterministically.
//      B4 runs the OLD single-shot read on that page and requires it to FAIL, so B1 cannot pass because the page is unable
//      to produce the race.
//   C. the probe's wiring, read as text
//
// Coverage (Rule 91): A runs 9 groups on the real readFieldDataMeta; B runs 4 cases in headless Chromium through the
// Playwright named by PLAYWRIGHT_MODULE (default @playwright/test, the probe's own). The live race is natural and
// intermittent; a survived one shows in a run's manifest as readFailures with stage "meta" and cacheAccepted true.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const META = process.env.META_SRC || 'scripts/probe-meta-read.cjs';
const PROBE = process.env.PROBE_SRC || 'forward_window_probe.js';
const PW = process.env.PLAYWRIGHT_MODULE || '@playwright/test';
const FIXTURE = 'outbox/fixture-forward-window-manifests-20261030.json';

const { readFieldDataMeta, META_PREDICATE } = require(path.resolve(META));
const { chromium } = require(PW);
const REAL = JSON.parse(readFileSync(FIXTURE, 'utf8')).manifests.context_lost.manifest.metaError;

let failed = 0, ran = 0;
const want = (label, ok, detail) => {
  ran++;
  if (ok) console.log(`  ok    ${label}`);
  else { failed++; console.error(`  FAIL  ${label}${detail ? ' -> ' + detail : ''}`); }
};
const settle = async (p) => { try { return { value: await p }; } catch (e) { return { error: String((e && e.message) || e) }; } };

want('fixture: the committed 2026-10-26 metaError is the lost-context text',
     typeof REAL === 'string' && REAL.includes('jsHandle.jsonValue') && /Execution context was destroyed/.test(REAL), String(REAL));

// ── A. a fake page ────────────────────────────────────────────────────────────────────────────────────────────────────
// steps[i] is what the i-th waitForFunction call does; the last step repeats.
const fake = (steps) => {
  const calls = [];
  return { calls, waitForFunction: async (fn, arg, opts) => {
    calls.push({ fn, arg, opts });
    const s = steps[Math.min(calls.length, steps.length) - 1];
    if (s.waitErr) throw new Error(s.waitErr);
    return { jsonValue: async () => { if (s.jsonErr) throw new Error(s.jsonErr); return s.value; } };
  } };
};
const V1 = { schema: '2.1', for_date: 'first' }, V2 = { schema: '2.1', for_date: 'second' };
const TIMEOUT = 'page.waitForFunction: Timeout 30000ms exceeded.';

{
  const pg = fake([{ value: V1 }]); const st = { readFailures: [] };
  const r = await settle(readFieldDataMeta(pg, st));
  want('A1: a clean read returns the value after one wait, with nothing recorded',
       r.value === V1 && pg.calls.length === 1 && st.readFailures.length === 0, JSON.stringify(r));
}
{
  const pg = fake([{ jsonErr: REAL }, { value: V2 }]); const st = { readFailures: [] };
  const r = await settle(readFieldDataMeta(pg, st));
  want('A2: a context lost at jsonValue is retried, and the SECOND read\'s value is the one returned',
       r.value === V2 && pg.calls.length === 2, JSON.stringify(r));
  want('A2: the survived loss is kept in readFailures (attempt 1, stage meta, the real text, whole)',
       st.readFailures.length === 1 && st.readFailures[0].attempt === 1 && st.readFailures[0].stage === 'meta'
       && st.readFailures[0].error === REAL.slice(0, 200), JSON.stringify(st.readFailures));
  want('A2: every wait, the retried one included, is made with the predicate, a null arg and { timeout: 30000 }',
       pg.calls.length === 2 && pg.calls.every((c) => c.fn === META_PREDICATE && c.arg === null && c.opts && c.opts.timeout === 30000), JSON.stringify(pg.calls.map((c) => c.opts)));
}
{
  const pg = fake([{ waitErr: REAL }, { value: V2 }]); const st = { readFailures: [] };
  const r = await settle(readFieldDataMeta(pg, st));
  want('A3: a context lost inside waitForFunction itself is retried too', r.value === V2 && pg.calls.length === 2, JSON.stringify(r));
}
{
  const pg = fake([{ jsonErr: REAL }]); const st = { readFailures: [] };
  const r = await settle(readFieldDataMeta(pg, st));
  want('A4: three losses in a row end in the error (three waits, not four)', !!r.error && r.error.includes('Execution context was destroyed') && pg.calls.length === 3, JSON.stringify({ r, calls: pg.calls.length }));
  want('A4: the two retried losses are recorded and the final one is thrown, not recorded',
       st.readFailures.map((f) => f.attempt).join() === '1,2'
       && st.readFailures.every((f) => f.stage === 'meta' && f.error === REAL.slice(0, 200)), JSON.stringify(st.readFailures));
}
{
  const pg = fake([{ waitErr: TIMEOUT }, { value: V2 }]); const st = { readFailures: [] };
  const r = await settle(readFieldDataMeta(pg, st));
  want('A5: a timeout is NOT retried (a cache that was never accepted fails once)',
       !!r.error && r.error.includes('Timeout 30000ms') && pg.calls.length === 1 && st.readFailures.length === 0, JSON.stringify({ r, calls: pg.calls.length }));
}
{
  // The likely live shape of a cache that is never accepted AFTER the page reloaded: a loss, then the timeout.
  const pg = fake([{ jsonErr: REAL }, { waitErr: TIMEOUT }, { value: V2 }]); const st = { readFailures: [] };
  const r = await settle(readFieldDataMeta(pg, st));
  want('A10: a lost context followed by a timeout is retried once and then fails with the timeout (two waits, both with the 30 s option)',
       !!r.error && r.error.includes('Timeout 30000ms') && pg.calls.length === 2 && pg.calls.every((c) => c.opts && c.opts.timeout === 30000)
       && st.readFailures.length === 1, JSON.stringify({ r, calls: pg.calls.map((c) => c.opts), f: st.readFailures.length }));
  const pg2 = fake([{ jsonErr: REAL }, { waitErr: 'page.waitForFunction: Target page, context or browser has been closed' }, { value: V2 }]);
  const r2 = await settle(readFieldDataMeta(pg2, { readFailures: [] }));
  want('A11: a lost context followed by a closed page is not retried a second time', !!r2.error && pg2.calls.length === 2, JSON.stringify({ r2, calls: pg2.calls.length }));
}
for (const msg of ['page.waitForFunction: Target was destroyed', 'page.waitForFunction: Execution context was not found', 'boom']) {
  const pg = fake([{ waitErr: msg }, { value: V2 }]); const st = { readFailures: [] };
  const r = await settle(readFieldDataMeta(pg, st));
  want(`A6c: only the exact phrase "Execution context was destroyed" is retried; "${msg.slice(-34)}" is not`, !!r.error && pg.calls.length === 1 && st.readFailures.length === 0, JSON.stringify({ r, calls: pg.calls.length }));
}
{
  const pg = fake([{ waitErr: 'page.waitForFunction: Target page, context or browser has been closed' }, { value: V2 }]); const st = { readFailures: [] };
  const r = await settle(readFieldDataMeta(pg, st));
  want('A6: a closed page is NOT retried', !!r.error && pg.calls.length === 1, JSON.stringify({ r, calls: pg.calls.length }));
}
{
  const pg = fake([{ jsonErr: REAL }]); const st = { readFailures: [] };
  const r = await settle(readFieldDataMeta(pg, st, { attempts: 2 }));
  want('A7: the attempts option is honoured', !!r.error && pg.calls.length === 2 && st.readFailures.length === 1, JSON.stringify({ calls: pg.calls.length }));
}
{
  const pg = fake([{ value: V1 }]); await readFieldDataMeta(pg, { readFailures: [] });
  want('A8: waitForFunction gets the predicate, a null arg and { timeout: 30000 } as OPTIONS (it was once passed as the arg)',
       pg.calls[0].fn === META_PREDICATE && pg.calls[0].arg === null && pg.calls[0].opts && pg.calls[0].opts.timeout === 30000, JSON.stringify(pg.calls[0].opts));
  const pg2 = fake([{ value: V1 }]); await readFieldDataMeta(pg2, { readFailures: [] }, { timeoutMs: 5000 });
  want('A8: the timeout option is passed through', pg2.calls[0].opts && pg2.calls[0].opts.timeout === 5000);
}
{
  const run = (win) => { globalThis.window = win; try { return META_PREDICATE(); } finally { delete globalThis.window; } };
  want('A9: no _plVerify -> falsy', !run({}));
  want('A9: fieldDataMeta() returning null -> falsy', !run({ _plVerify: { fieldDataMeta: () => null } }));
  want('A9: _plVerify without fieldDataMeta -> falsy', !run({ _plVerify: {} }));
  const full = run({ _plVerify: { fieldDataMeta: () => ({ schema_version: '2.1', for_date: '2026-10-30', window_dates: ['a', 'b'], games_found_by_date: { a: 1 } }) } });
  want('A9: the metadata is mapped to the names the manifest and the judge read',
       JSON.stringify(full) === JSON.stringify({ schema: '2.1', for_date: '2026-10-30', window_dates: ['a', 'b'], by_date: { a: 1 } }), JSON.stringify(full));
  const bare = run({ _plVerify: { fieldDataMeta: () => ({ schema_version: '2.1', for_date: '2026-10-30' }) } });
  want('A9: a missing window_dates and games_found_by_date are null (absence is not an empty list)',
       bare && bare.window_dates === null && bare.by_date === null, JSON.stringify(bare));
}

// ── B. a real browser ───────────────────────────────────────────────────────────────────────────────────────────────
const HTML = (meta) => `<!doctype html><script>window._plVerify={fieldDataMeta:()=>${meta}}</script>`;
const OK_META = "({schema_version:'2.1',for_date:'2026-10-30',window_dates:['2026-10-30','2026-10-31'],games_found_by_date:{}})";
// A page whose document requests are counted; with reloadOnce the first resolved wait is followed by a real reload
// BEFORE the handle is read, which is the window the live race lands in.
const mkPage = async (browser, { meta = OK_META, reloadOnce = false } = {}) => {
  const page = await (await browser.newContext()).newPage();
  const hits = { docs: 0 };
  await page.route('http://probe.test/**', (r) => { hits.docs++; return r.fulfill({ contentType: 'text/html', body: HTML(meta) }); });
  await page.goto('http://probe.test/', { waitUntil: 'domcontentloaded' });
  if (reloadOnce) {
    const real = page.waitForFunction.bind(page); let n = 0;
    page.waitForFunction = async (...a) => { const h = await real(...a); if (n++ === 0) await page.reload({ waitUntil: 'domcontentloaded' }); return h; };
  }
  return { page, hits };
};
const browser = await chromium.launch();
try {
  {
    const { page, hits } = await mkPage(browser, { reloadOnce: true }); const st = { readFailures: [] };
    const r = await settle(readFieldDataMeta(page, st));
    want('B1: a real reload between the wait and the read is survived, and the value comes from the NEW document',
         !!r.value && r.value.schema === '2.1' && r.value.for_date === '2026-10-30' && Array.isArray(r.value.window_dates) && r.value.window_dates.length === 2, JSON.stringify(r));
    want('B1: the reload really happened (the page was fetched twice) and the loss is in readFailures',
         hits.docs === 2 && st.readFailures.length === 1 && st.readFailures[0].stage === 'meta'
         && st.readFailures[0].error.includes('Execution context was destroyed'), JSON.stringify({ docs: hits.docs, f: st.readFailures }));
  }
  {
    const { page, hits } = await mkPage(browser); const st = { readFailures: [] };
    const r = await settle(readFieldDataMeta(page, st));
    want('B2: with no reload the read returns on the first attempt and records nothing',
         !!r.value && r.value.schema === '2.1' && hits.docs === 1 && st.readFailures.length === 0, JSON.stringify({ r, docs: hits.docs }));
  }
  {
    const { page } = await mkPage(browser, { meta: 'null' }); const st = { readFailures: [] };
    const t0 = Date.now();
    const r = await settle(readFieldDataMeta(page, st, { timeoutMs: 1500 }));
    const ms = Date.now() - t0;
    want('B3: a cache that is never accepted times out ONCE (a real TimeoutError is not a lost context)',
         !!r.error && /Timeout 1500ms/.test(r.error) && st.readFailures.length === 0 && ms >= 1400 && ms < 3400, JSON.stringify({ r, ms, f: st.readFailures }));
  }
  {
    // The single-shot read the probe used to make, on the page of B1. If this does not fail, B1 proves nothing.
    const { page } = await mkPage(browser, { reloadOnce: true });
    const r = await settle((async () => {
      const h = await page.waitForFunction(META_PREDICATE, null, { timeout: 30000 });
      return h.jsonValue();
    })());
    want('B4: harness validity: the OLD single-shot read on the same page loses its context with the runner\'s text',
         !!r.error && r.error.includes('jsHandle.jsonValue') && /Execution context was destroyed/.test(r.error), JSON.stringify(r));
  }
} finally { await browser.close(); }

// ── C. the probe is wired to the module and holds no copy of the read ─────────────────────────────────────────────────
const src = readFileSync(PROBE, 'utf8');
want('C: the probe requires the module', src.includes("require('./scripts/probe-meta-read.cjs')"));
want('C: the first read goes through readFieldDataMeta(page, STATE)', src.includes('await readFieldDataMeta(page, STATE)'));
want('C: no single-shot read of the metadata remains in the probe',
     !src.includes('.then(h => h.jsonValue())') && !src.includes('fieldDataMeta'), 'the probe still reads the metadata itself');
want('C: a read that still fails is kept as metaError and does not throw',
     src.includes('STATE.metaError = String(e && e.message || e).slice(0, 300);') && src.includes('return null;'));

console.log(`\nchecked ${ran} case(s): the retry logic on a fake page, the same code in headless Chromium through ${PW} with a real forced reload, `
          + 'and the probe\'s wiring as text. A natural race on the live page is intermittent and is shown in a run\'s manifest, not here.');
if (failed) { console.error(`FAIL — ${failed} case(s).`); process.exit(1); }
console.log('PASS');
