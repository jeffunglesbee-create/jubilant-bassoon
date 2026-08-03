// retry_telemetry_probe.js — real, live verification for
// CC-CMD-2026-08-02-retry-chain-telemetry TASK 3. Loads the live FIELD
// site in a fresh (no-cache) browser context, watches real network
// traffic for the client's own POST to /jq/retry-telemetry firing during
// a real journalism generation (compound editorial, initFIELDBrief ->
// fetchCompoundEditorial, calls CLAUDE_PROXY_URL directly -- no relay-
// native attempt first, so it's the most reliable real trigger of the
// client-side retry chain). Not synthetic: this is the app's own real
// code, on the real live deploy, run for real.
//
// A fresh browser context has empty sessionStorage/localStorage, so the
// compound brief's cache check (`const cached = sessionStorage.getItem(
// cacheKey); if (cached) return ...`) misses and a real generation call
// fires, IF journalismCallsToday().canCall() allows it (real daily
// budget, shared with real production traffic -- this probe consumes a
// negligible amount of it, same as any one real page load).
//
// Whether any of the 7 gates ACTUALLY fires is not fully deterministic
// (it depends on whether the real model output happens to trip a real
// quality gate) -- this probe reports the real outcome honestly either
// way, rather than assuming success.

const { chromium } = require('@playwright/test');
const fs = require('fs');
const https = require('https');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';
const RELAY_URL = process.env.RELAY_URL || 'https://field-relay-nba.jeffunglesbee.workers.dev';
const SCRATCHPAD = 'outbox';
const WAIT_MS = 90000; // real compound generation + retry chain can take 10-30s; generous window

function d1Query(sql, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql, params: params || [] });
    const req = https.request(
      `${RELAY_URL}/d1/execute`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FIELD-Relay': 'field-relay-cron-2026', 'Content-Length': Buffer.byteLength(body) } },
      res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const result = {
    timestamp: new Date().toISOString(),
    fieldUrl: FIELD_URL,
    telemetryRequestsObserved: [],
    telemetryRequestSucceeded: null,
    d1RowsBeforeProbe: null,
    d1RowsAfterProbe: null,
    realRowConfirmed: false,
    consoleErrors: [],
  };

  // 1. Real D1 count BEFORE the probe navigates (baseline).
  try {
    const before = await d1Query('SELECT COUNT(*) as n FROM jq_retry_telemetry');
    result.d1RowsBeforeProbe = before?.results?.[0]?.n ?? null;
  } catch (e) {
    result.d1RowsBeforeProbe = `error: ${e.message}`;
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext(); // fresh: no session/localStorage cache
  const page = await ctx.newPage();

  page.on('console', m => { if (m.type() === 'error') result.consoleErrors.push(m.text().slice(0, 200)); });

  page.on('request', req => {
    if (req.url().includes('/jq/retry-telemetry')) {
      let body = null;
      try { body = req.postData(); } catch (_) {}
      result.telemetryRequestsObserved.push({ url: req.url(), method: req.method(), body });
    }
  });
  page.on('requestfinished', async req => {
    if (req.url().includes('/jq/retry-telemetry')) {
      try {
        const resp = await req.response();
        result.telemetryRequestSucceeded = resp ? resp.ok() : false;
      } catch (_) {}
    }
  });

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Real wait for a real generation + retry chain to complete (or not).
  await page.waitForTimeout(WAIT_MS);

  await ctx.close();
  await browser.close();

  // 2. Real D1 count AFTER the probe (confirms a real row landed, not
  // just that a request was sent -- a request could 400/500 and never
  // actually write).
  try {
    const after = await d1Query('SELECT COUNT(*) as n FROM jq_retry_telemetry');
    result.d1RowsAfterProbe = after?.results?.[0]?.n ?? null;
    if (typeof result.d1RowsBeforeProbe === 'number' && typeof result.d1RowsAfterProbe === 'number') {
      result.realRowConfirmed = result.d1RowsAfterProbe > result.d1RowsBeforeProbe;
    }
  } catch (e) {
    result.d1RowsAfterProbe = `error: ${e.message}`;
  }

  if (result.realRowConfirmed) {
    try {
      const latest = await d1Query('SELECT * FROM jq_retry_telemetry ORDER BY id DESC LIMIT 5');
      result.latestRows = latest?.results ?? [];
    } catch (_) {}
  }

  console.log(JSON.stringify(result, null, 2));
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  fs.writeFileSync(`${SCRATCHPAD}/retry-telemetry-probe-${ts}.json`, JSON.stringify(result, null, 2));
  fs.writeFileSync(`${SCRATCHPAD}/retry-telemetry-probe-latest.json`, JSON.stringify(result, null, 2));

  // Exit 0 either way -- a real "no gate fired this run" is honest data,
  // not a probe failure. Only a genuine D1/network error should fail CI.
  if (typeof result.d1RowsAfterProbe === 'string' && result.d1RowsAfterProbe.startsWith('error')) {
    process.exit(1);
  }
})();
