// debrief_cache_revalidate_probe.js — proves, against the LIVE deploy, that a
// debrief cached by Gap 12 is replaced when the relay's payload differs.
//
// docs/CC-CMD-2026-10-20-debrief-cache-outlives-archive-repair.md. Rule 90:
// a rendering defect is verified in a real browser against the deployed URL.
//
// It does not wait for the archive to correct a game. It makes the cached copy
// differ from the relay instead:
//   1. first visit: step back one day (a complete slate at any hour, see
//      odds_line_probe.js) and let injectDebriefCards fetch and cache the
//      finals' /context/game payloads in the real field-debriefs Cache API;
//   2. rewrite ONE cached entry so its first game brief reads MARKER. The
//      debrief's "FIELD was watching" layer renders that text. This stands
//      in for a payload the archive has since corrected;
//   3. reload, step back again, and hold that game's /context/game request
//      for HOLD_MS so the order of events can be observed.
//
// Pass: the relay is asked for that game after the reload; the MARKER renders
// while the request is held (the cached copy renders first); after the answer,
// no debrief shows the MARKER and the Cache API entry no longer holds it.
// Before the fix, the cached copy is used with no request, so the MARKER stays
// on the page and in the cache. That is the failure this probe reports.
//
// Service workers are blocked: page.route() cannot see requests a service
// worker handles, and the field-debriefs cache is read from the page itself,
// so the service worker is not part of the path under test.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const URL = BASE + '?wpt';
const OUT = 'outbox';
const RUN_ID = process.env.GITHUB_RUN_ID || String(Date.now());
const MARKER = `PROBE-STALE-${RUN_ID}`;
const HOLD_MS = 4000;

const ctxId = u => decodeURIComponent((u.split('/context/game/')[1] || '').split('?')[0]);

async function stepToYesterday(page) {
  const skip = page.locator('#setup-skip');
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll('.game-card[data-gameid]').length > 0,
    null, { timeout: 60000 }).catch(() => {});
  await page.click('#date-prev', { timeout: 15000 });
  const label = () => page.evaluate(() => document.getElementById('date-label')?.textContent.trim() || null);
  return label();
}

const debriefsWithMarker = (page) => page.evaluate(m =>
  Array.from(document.querySelectorAll('.card-debrief')).filter(e => e.textContent.includes(m)).length, MARKER);

(async () => {
  const m = { probed_at: new Date().toISOString(), url: URL, run_id: RUN_ID, marker: MARKER, hold_ms: HOLD_MS,
    served_sw_version: null, served_page_has_revalidate: null,
    first_visit: { date_label: null, context_responses: 0, context_ok: 0, debriefs: 0, cached_entries: 0 },
    target: null, planted: false,
    after_reload: { date_label: null, target_requested: false, target_requested_at_ms: null,
      target_answered_at_ms: null, target_status: null, marker_first_seen_ms: null,
      marker_seen_while_held: false, debriefs_with_marker_at_end: null, cache_holds_marker_at_end: null,
      debriefs_at_end: null },
    page_errors: [], pass: false, problems: [] };

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', e => m.page_errors.push(String(e.message).slice(0, 200)));

  try {
    // Which build is being measured: the served sw.js version and whether the
    // served page carries the revalidation at all.
    const swText = await (await ctx.request.get(BASE + '/sw.js')).text();
    m.served_sw_version = (swText.match(/SW_VERSION = '([^']+)'/) || [])[1] || null;
    const html = await (await ctx.request.get(URL)).text();
    m.served_page_has_revalidate = html.includes('_revalidateDebriefContext');

    // ── 1. first visit ───────────────────────────────────────────────────────
    const first = [];
    const onFirst = r => { if (r.url().includes('/context/game/')) first.push({ id: ctxId(r.url()), status: r.status() }); };
    page.on('response', onFirst);
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    m.first_visit.date_label = await stepToYesterday(page);
    await page.waitForFunction(() => document.querySelectorAll('.card-debrief').length > 0,
      null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(5000);   // let the Cache API writes land
    page.off('response', onFirst);
    m.first_visit.context_responses = first.length;
    m.first_visit.context_ok = first.filter(r => r.status === 200).length;
    m.first_visit.debriefs = await page.evaluate(() => document.querySelectorAll('.card-debrief').length);

    // ── 2. plant the marker in one cached entry ──────────────────────────────
    const okIds = [...new Set(first.filter(r => r.status === 200).map(r => r.id))];
    const planted = await page.evaluate(async ({ okIds, marker }) => {
      const c = await caches.open('field-debriefs');
      const keys = (await c.keys()).map(k => k.url);
      for (const id of okIds) {
        const key = keys.find(k => decodeURIComponent(k.split('/debrief/')[1] || '') === id);
        if (!key) continue;
        const ctx = await (await c.match(key)).json();
        if (!ctx || !ctx.game) continue;
        const briefs = (ctx.archive && ctx.archive.gameBriefs) || [];
        ctx.archive = Object.assign({}, ctx.archive, {
          gameBriefs: [Object.assign({}, briefs[0] || {}, { brief_text: marker })].concat(briefs.slice(1)) });
        await c.put(key, new Response(JSON.stringify(ctx), {
          headers: { 'Content-Type': 'application/json', 'X-Cache-Time': String(Date.now()) } }));
        const back = await (await c.match(key)).text();
        return { id, key, entries: keys.length, written: back.includes(marker) };
      }
      return { id: null, entries: keys.length, written: false };
    }, { okIds, marker: MARKER });
    m.first_visit.cached_entries = planted.entries;
    m.target = planted.id;
    m.planted = planted.written;
    if (!m.target || !m.planted) throw new Error('no cached /context/game entry to plant the marker in');

    // ── 3. reload, hold the target's request, watch the order of events ──────
    const t0 = Date.now();
    await page.route(u => u.href.includes('/context/game/') && ctxId(u.href) === m.target, async route => {
      m.after_reload.target_requested = true;
      m.after_reload.target_requested_at_ms = Date.now() - t0;
      await new Promise(r => setTimeout(r, HOLD_MS));
      const resp = await route.fetch();
      m.after_reload.target_status = resp.status();
      m.after_reload.target_answered_at_ms = Date.now() - t0;
      await route.fulfill({ response: resp });
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    m.after_reload.date_label = await stepToYesterday(page);
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const n = await debriefsWithMarker(page);
      const t = Date.now() - t0;
      if (n > 0 && m.after_reload.marker_first_seen_ms === null) m.after_reload.marker_first_seen_ms = t;
      if (n > 0 && m.after_reload.target_requested && m.after_reload.target_answered_at_ms === null)
        m.after_reload.marker_seen_while_held = true;
      const answered = m.after_reload.target_answered_at_ms;
      if (answered !== null && t > answered + 8000) break;
      if (answered === null && m.after_reload.marker_first_seen_ms !== null && !m.after_reload.target_requested
          && t > m.after_reload.marker_first_seen_ms + 20000) break;   // cached render, no request in 20 s
      await page.waitForTimeout(200);
    }
    m.after_reload.debriefs_with_marker_at_end = await debriefsWithMarker(page);
    m.after_reload.debriefs_at_end = await page.evaluate(() => document.querySelectorAll('.card-debrief').length);
    m.after_reload.cache_holds_marker_at_end = await page.evaluate(async ({ id, marker }) => {
      const c = await caches.open('field-debriefs');
      const r = await c.match(`https://field-local/debrief/${encodeURIComponent(id)}`);
      return r ? (await r.text()).includes(marker) : null;
    }, { id: m.target, marker: MARKER });
  } catch (e) {
    m.problems.push(`probe error: ${String(e.message || e).split('\n')[0]}`);
  }

  const a = m.after_reload;
  if (!a.target_requested) m.problems.push('the relay was not asked for the cached game after the reload');
  if (a.marker_first_seen_ms === null) m.problems.push('the cached copy never rendered after the reload (MARKER never seen)');
  else if (!a.marker_seen_while_held) m.problems.push('the cached copy did not render while the relay request was held');
  if (a.debriefs_with_marker_at_end !== 0) m.problems.push(`the MARKER is still on the page at the end (${a.debriefs_with_marker_at_end} debriefs)`);
  if (a.cache_holds_marker_at_end !== false) m.problems.push(`the Cache API entry still holds the MARKER (${a.cache_holds_marker_at_end})`);
  m.pass = m.problems.length === 0;

  fs.mkdirSync(OUT, { recursive: true });
  const stamp = m.probed_at.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  fs.writeFileSync(`${OUT}/debrief-cache-revalidate-manifest-latest.json`, JSON.stringify(m, null, 2));
  fs.writeFileSync(`${OUT}/debrief-cache-revalidate-manifest-${stamp}.json`, JSON.stringify(m, null, 2));
  console.log(JSON.stringify(m, null, 2));
  await browser.close();
  if (!m.pass) { console.error('\nFAIL:\n  - ' + m.problems.join('\n  - ')); process.exit(1); }
  console.log(`\nPASS: ${m.target}: cached copy rendered first, relay asked, MARKER gone from page and cache.`);
})().catch(e => { console.error(e); process.exit(1); });
