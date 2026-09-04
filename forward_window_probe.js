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

const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
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
  // becomes true and every day below reads as a miss — which is the point.
  const meta = await page.waitForFunction(() => {
    const c = window._fieldDataCache;
    return c && c._meta ? {
      schema: c._meta.schema_version,
      for_date: c._meta.for_date,
      window_dates: c._meta.window_dates || null,
      by_date: c._meta.games_found_by_date || null,
    } : false;
  }, { timeout: 30000 }).then(h => h.jsonValue()).catch(() => null);

  const today = meta?.for_date || new Date().toISOString().slice(0, 10);
  const days = [];

  for (let i = 1; i <= 3; i++) {
    const iso = addDays(today, i);
    let day = { iso, navigated: false, espnSectionsPresent: false, sectionCount: 0,
                cardCount: 0, mlbEnrichMatched: 0, mlbEnrichAvailable: 0, error: null };
    try {
      await page.evaluate(async (d) => { await window.goToDate?.(d); }, iso);
      day.navigated = true;
      await page.waitForTimeout(2500);
      Object.assign(day, await page.evaluate(() => {
        const main = document.getElementById('main');
        const enrich = window._fieldDataEnrichCount || {};
        return {
          sectionCount: main ? main.querySelectorAll('.sport-section, [data-sport]').length : 0,
          cardCount:    main ? main.querySelectorAll('.game-card').length : 0,
          mlbEnrichMatched:   enrich.matched   || 0,
          mlbEnrichAvailable: enrich.available || 0,
        };
      }));
      day.espnSectionsPresent = day.cardCount > 0 || day.sectionCount > 0;
    } catch (e) { day.error = String(e && e.message || e); }
    console.log(`  [${iso}] cards=${day.cardCount} sections=${day.sectionCount} ` +
                `enriched=${day.mlbEnrichMatched}/${day.mlbEnrichAvailable}`);
    days.push(day);
  }

  const manifest = {
    url: BASE, runId: RUN_ID, commit: process.env.GITHUB_SHA || null,
    timestamp: new Date().toISOString(),
    cacheAccepted: !!meta,
    schema: meta?.schema || null,
    for_date: meta?.for_date || null,
    window_dates: meta?.window_dates || null,
    games_found_by_date: meta?.by_date || null,
    days,
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
    problems.push('field-data was never accepted into _fieldDataCache — the accept gate rejected it');
  if (manifest.schema !== '2.1')
    problems.push(`schema is ${manifest.schema}, expected 2.1 — the generator has not run since the change`);
  if (!Array.isArray(manifest.window_dates) || manifest.window_dates.length < 2)
    problems.push('window_dates missing or shorter than 2 — there is no forward window to prove');
  for (const d of days) {
    if (!d.navigated)            problems.push(`${d.iso}: goToDate never ran (${d.error || 'no error reported'})`);
    else if (!d.espnSectionsPresent) problems.push(`${d.iso}: nothing rendered — the ESPN base path regressed`);
  }
  if (manifest.totalEnrichAvailable > 0 && manifest.totalEnrichMatched === 0)
    problems.push('window had MLB entries on every day but matched ZERO ESPN fixtures — home|away name drift');
  if (manifest.totalEnrichAvailable === 0)
    problems.push('no MLB entries available on any forward day — the window never reached the client');

  if (problems.length) { console.error('\nFAIL:\n  - ' + problems.join('\n  - ')); process.exit(1); }
  console.log(`\nPASS: 3 forward days rendered; ${manifest.totalEnrichMatched}/${manifest.totalEnrichAvailable} MLB fixtures enriched.`);
})().catch(e => { console.error(e); process.exit(1); });
