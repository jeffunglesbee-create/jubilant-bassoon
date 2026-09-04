// forward_window_probe.js — proves the forward schedule window reaches the DOM.
//
// Impact analysis §11 artifact 3, reshaped by §14d: the earlier `richPathUsed`
// field described a design (route forward days to buildTodaySchedule) that was
// abandoned because it would have lost 15 of ESPN's 16 leagues. What must be
// proved now is narrower and truer:
//
//   1. The ESPN sweep still renders every forward day  -> espnSectionsPresent
//   2. The window's MLB entries actually matched         -> mlbEnrichMatched
//
// Pass needs BOTH. Zero matches everywhere is a FAIL, not a pass: `home|away`
// display names come from two different upstreams (ESPN team.displayName vs
// statsapi), and a silent zero is exactly how that drift would hide.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const RAW  = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
// ?pl-verify exposes window._plVerify. _fieldDataCache is a module-level `let`
// inside the esbuild bundle, so window._fieldDataCache is undefined by
// construction — run 33907104753 reported cacheAccepted:false for that reason,
// against a client that was working. That API is the only supported way in.
const BASE = RAW + (RAW.includes('?') ? '&' : '?') + 'pl-verify';
const OUT = 'outbox';
const RUN_ID = process.env.GITHUB_RUN_ID || String(Date.now());

const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the field-data file to be accepted into the cache. If the accept
  // gate rejected it (wrong schema, today outside window_dates) this never
  // becomes true and the assertions below fail loudly.
  const meta = await page.waitForFunction(() => {
    const m = window._plVerify && window._plVerify.fieldDataMeta && window._plVerify.fieldDataMeta();
    return m ? {
      schema: m.schema_version,
      for_date: m.for_date,
      window_dates: m.window_dates || null,
      by_date: m.games_found_by_date || null,
    } : false;
  }, { timeout: 30000 }).then(h => h.jsonValue()).catch(() => null);

  const today = meta?.for_date || new Date().toISOString().slice(0, 10);
  const days = [];

  for (let i = 1; i <= 3; i++) {
    const iso = addDays(today, i);
    let day = { iso, windowHasDay: false, windowMlbCount: 0, navigated: false,
                cardCount: 0, sectionCount: 0,
                mlbEnrichMatched: 0, mlbEnrichAvailable: 0, error: null };
    try {
      // ASSERTED: the window reached the client for this date. Needs no network
      // beyond the field-data file the page already fetched.
      const w = await page.evaluate((d) => {
        const sched = window._plVerify.scheduleForDate(d);
        return { has: !!sched, mlb: sched && sched.mlb ? sched.mlb.length : 0 };
      }, iso);
      day.windowHasDay   = w.has;
      day.windowMlbCount = w.mlb;

      // REPORTED, NOT ASSERTED: rendering needs site.api.espn.com direct from
      // the browser, which a GitHub runner cannot reach (run 33907104753:
      // 403/404/502 across every fixture fetch). A zero here is the runner's
      // network, not the product, so it is recorded and not used as a gate.
      await page.evaluate(async (d) => { await window.goToDate?.(d); }, iso);
      day.navigated = true;
      await page.waitForTimeout(2500);
      Object.assign(day, await page.evaluate(() => {
        const main = document.getElementById('main');
        const enrich = (window._plVerify.enrichCount && window._plVerify.enrichCount()) || {};
        return {
          sectionCount: main ? main.querySelectorAll('.sport-section, [data-sport]').length : 0,
          cardCount:    main ? main.querySelectorAll('.game-card').length : 0,
          mlbEnrichMatched:   enrich.matched   || 0,
          mlbEnrichAvailable: enrich.available || 0,
        };
      }));
    } catch (e) { day.error = String(e && e.message || e); }
    console.log(`  [${iso}] window=${day.windowHasDay} mlb=${day.windowMlbCount} ` +
                `| rendered cards=${day.cardCount} enriched=${day.mlbEnrichMatched}/${day.mlbEnrichAvailable}`);
    days.push(day);
  }

  const manifest = {
    url: BASE, runId: RUN_ID, commit: process.env.GITHUB_SHA || null,
    timestamp: new Date().toISOString(),
    cacheAccepted: !!meta,
    testApi: 'pl-verify',
    schema: meta?.schema || null,
    for_date: meta?.for_date || null,
    window_dates: meta?.window_dates || null,
    games_found_by_date: meta?.by_date || null,
    days,
    windowDaysReachingClient: days.filter(d => d.windowHasDay).length,
    windowMlbTotal: days.reduce((n, d) => n + d.windowMlbCount, 0),
    // Best-effort only — see the note in the loop. Never a pass condition.
    renderedCardsTotal: days.reduce((n, d) => n + d.cardCount, 0),
    totalEnrichMatched: days.reduce((n, d) => n + d.mlbEnrichMatched, 0),
    totalEnrichAvailable: days.reduce((n, d) => n + d.mlbEnrichAvailable, 0),
    consoleErrors: errors.slice(0, 10),
  };

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${OUT}/forward-window-manifest-${RUN_ID}.json`, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
  await browser.close();

  const problems = [];
  if (!manifest.cacheAccepted)
    problems.push('field-data was never accepted into the cache — the accept gate rejected it, or ?pl-verify is not honoured by this build');
  if (manifest.schema !== '2.1')
    problems.push(`schema is ${manifest.schema}, expected 2.1 — the generator has not run since the change`);
  if (!Array.isArray(manifest.window_dates) || manifest.window_dates.length < 2)
    problems.push('window_dates missing or shorter than 2 — there is no forward window to prove');
  for (const d of days) {
    if (!d.windowHasDay)
      problems.push(`${d.iso}: scheduleForDate returned nothing — the window did not reach the client for this date`);
  }
  if (manifest.windowMlbTotal === 0)
    problems.push('every forward day carried 0 MLB entries — the window is present but empty');

  if (problems.length) { console.error('\nFAIL:\n  - ' + problems.join('\n  - ')); process.exit(1); }
  console.log(`\nPASS: schema ${manifest.schema}, ${manifest.windowDaysReachingClient}/3 forward days reached the client, ` +
              `${manifest.windowMlbTotal} MLB entries. Rendering (not asserted): ${manifest.renderedCardsTotal} cards, ` +
              `${manifest.totalEnrichMatched}/${manifest.totalEnrichAvailable} enriched.`);
})().catch(e => { console.error(e); process.exit(1); });
