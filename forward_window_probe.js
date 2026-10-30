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
//
// Season-aware (2026-10-30): a window with 0 MLB entries is a FAIL only when ESPN's own MLB scoreboard lists
// games on those dates, or cannot be asked. When ESPN lists none, the MLB clause is reported as NOT MEASURED
// and everything else is still asserted. The verdict is scripts/forward-window-judge.cjs.

const { chromium } = require('@playwright/test');
const fs = require('fs');
const { judgeForwardWindow, askEspnMlb } = require('./scripts/forward-window-judge.cjs');
const { readFieldDataMeta } = require('./scripts/probe-meta-read.cjs');

const RAW = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
// ?pl-verify exposes window._plVerify. _fieldDataCache is a module-level `let`
// inside the esbuild bundle, so window._fieldDataCache is undefined by
// construction — run 33907104753 reported cacheAccepted:false for that reason,
// against a client that was working. That API is the only supported way in.
const BASE = RAW + (RAW.includes('?') ? '&' : '?') + 'pl-verify';
const OUT = 'outbox';
const RUN_ID = process.env.GITHUB_RUN_ID || String(Date.now());

// Shared with the crash path below, so a run that dies still leaves a manifest.
// Runs 2026-10-08 through 10-11 died two seconds in on
// `Cannot read properties of undefined (reading 'scheduleForDate')` and
// committed nothing: the workflow promises "commit the manifest either way",
// and a throw before writeFileSync broke that promise four days running.
const STATE = { stage: 'start', navigations: [], readFailures: [], errors: [] };

const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  const errors = STATE.errors;
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  // A main-frame navigation after the first load destroys the context every
  // read below runs in, and the new document has no _plVerify until field.js
  // runs again. Recorded, so whatever navigates is read off the manifest rather
  // than inferred.
  const t0 = Date.now();
  page.on('framenavigated', f => {
    if (f === page.mainFrame()) STATE.navigations.push({ at_ms: Date.now() - t0, url: f.url() });
  });

  // Every _plVerify read waits for the API in the CURRENT document first. If a
  // navigation still lands between the wait and the read, it is retried — at
  // most three attempts, each failure kept in the manifest. What is asserted
  // does not change; only when it is read.
  const readPv = async (fn, arg) => {
    for (let attempt = 1; ; attempt++) {
      try {
        await page.waitForFunction(
          () => !!(window._plVerify && typeof window._plVerify.scheduleForDate === 'function'),
          null, { timeout: 30000 });
        return await page.evaluate(fn, arg);
      } catch (e) {
        STATE.readFailures.push({ attempt, error: String(e && e.message || e).slice(0, 200) });
        if (attempt >= 3) throw e;
      }
    }
  };

  STATE.stage = 'goto';
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  STATE.stage = 'meta';

  // Wait for the field-data file to be accepted into the cache. If the accept
  // gate rejected it (wrong schema, today outside window_dates) this never
  // becomes true and the assertions below fail loudly.
  // The read survives the page reloading itself when its service worker first activates; see
  // scripts/probe-meta-read.cjs. Four of 13 committed runs died on exactly that.
  const meta = await readFieldDataMeta(page, STATE).catch(e => {
    // Kept, not swallowed: a fast rejection here is the first thing the
    // 10-08..10-11 runs did, and the old `catch(() => null)` threw it away.
    STATE.metaError = String(e && e.message || e).slice(0, 300);
    return null;
  });

  const today = meta?.for_date || new Date().toISOString().slice(0, 10);
  const isoDays = [1, 2, 3].map(i => addDays(today, i));
  const days = [];

  // ── ASSERTED: read every forward day BEFORE touching navigation ───────────
  // Run 33907641507 read +1, then called goToDate, and the resulting navigation
  // destroyed the execution context — so +2 and +3 reported "the window did not
  // reach the client" when they had never been asked. The assertion needs no
  // navigation at all: scheduleForDate is a pure lookup over an already-fetched
  // file. Reading all three first removes the dependency instead of chasing
  // whatever navigates.
  STATE.stage = 'window-read';
  const windowRead = await readPv((list) => list.map(d => {
    const sched = window._plVerify.scheduleForDate(d);
    return { iso: d, has: !!sched, mlb: sched && sched.mlb ? sched.mlb.length : 0 };
  }), isoDays);
  STATE.stage = 'render';

  for (const w of windowRead) {
    days.push({ iso: w.iso, windowHasDay: w.has, windowMlbCount: w.mlb,
                navigated: false, cardCount: 0, sectionCount: 0,
                mlbEnrichMatched: 0, mlbEnrichAvailable: 0, error: null });
    console.log(`  [${w.iso}] window=${w.has} mlb=${w.mlb}`);
  }

  // ── REPORTED, NOT ASSERTED: one navigation, at the end ────────────────────
  // Rendering needs site.api.espn.com direct from the browser, which a GitHub
  // runner cannot reach (runs 33907104753 and 33907641507: CORS-blocked on every
  // fixture fetch). A zero here is the runner's network, not the product, so it
  // is recorded and never gates the run. Context loss here costs nothing —
  // everything asserted was already read above.
  const nav = days[0];
  try {
    await page.evaluate(async (d) => { await window.goToDate?.(d); }, nav.iso);
    nav.navigated = true;
    await page.waitForTimeout(2500);
    Object.assign(nav, await page.evaluate(() => {
      const main = document.getElementById('main');
      const pv = window._plVerify;
      const enrich = (pv && pv.enrichCount && pv.enrichCount()) || {};
      return {
        sectionCount: main ? main.querySelectorAll('.sport-section, [data-sport]').length : 0,
        cardCount:    main ? main.querySelectorAll('.game-card').length : 0,
        mlbEnrichMatched:   enrich.matched   || 0,
        mlbEnrichAvailable: enrich.available || 0,
      };
    }));
  } catch (e) { nav.error = String(e && e.message || e); }
  console.log(`  [${nav.iso}] rendered cards=${nav.cardCount} enriched=${nav.mlbEnrichMatched}/${nav.mlbEnrichAvailable}` +
              (nav.error ? ` (nav: ${nav.error.slice(0, 60)})` : ''));

  // A window with 0 MLB entries is either an empty off-season or a generator that dropped games, and the page
  // cannot tell which. ESPN's own MLB scoreboard can, so it is asked — from Node, only when the window is empty
  // (scripts/forward-window-judge.cjs holds the reasoning). null in the manifest means "not asked".
  const windowMlbTotal = days.reduce((n, d) => n + d.windowMlbCount, 0);
  STATE.stage = 'espn-mlb';
  const espn = windowMlbTotal === 0 ? await askEspnMlb(isoDays, fetch) : null;
  STATE.stage = 'verdict';

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
    windowMlbTotal,
    espnMlb: espn,
    // Best-effort only — see the note in the loop. Never a pass condition.
    renderedCardsTotal: days.reduce((n, d) => n + d.cardCount, 0),
    totalEnrichMatched: days.reduce((n, d) => n + d.mlbEnrichMatched, 0),
    totalEnrichAvailable: days.reduce((n, d) => n + d.mlbEnrichAvailable, 0),
    consoleErrors: errors.slice(0, 10),
    mainFrameNavigations: STATE.navigations,
    readFailures: STATE.readFailures,
    metaError: STATE.metaError || null,
    playwrightVersion: require('@playwright/test/package.json').version,
  };

  // Judged before the manifest is written, so the file carries the verdict it was failed or passed on.
  const verdict = judgeForwardWindow(manifest, espn);
  manifest.verdict = verdict;

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${OUT}/forward-window-manifest-latest.json`, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
  await browser.close();

  if (verdict.problems.length) { console.error('\nFAIL:\n  - ' + verdict.problems.join('\n  - ')); process.exit(1); }
  console.log(`\nPASS: schema ${manifest.schema}, ${manifest.windowDaysReachingClient}/3 forward days reached the client, ` +
              `${manifest.windowMlbTotal} MLB entries. Rendering (not asserted): ${manifest.renderedCardsTotal} cards, ` +
              `${manifest.totalEnrichMatched}/${manifest.totalEnrichAvailable} enriched.`);
  for (const n of verdict.notes) console.log(`NOTE: ${n}`);
})().catch(e => {
  console.error(e);
  try {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(`${OUT}/forward-window-manifest-latest.json`, JSON.stringify({
      url: BASE, runId: RUN_ID, commit: process.env.GITHUB_SHA || null,
      timestamp: new Date().toISOString(),
      fatal: String(e && e.message || e).slice(0, 500),
      stage: STATE.stage,
      metaError: STATE.metaError || null,
      playwrightVersion: (() => { try { return require('@playwright/test/package.json').version; } catch (_) { return null; } })(),
      mainFrameNavigations: STATE.navigations,
      readFailures: STATE.readFailures,
      consoleErrors: STATE.errors.slice(0, 10),
    }, null, 2));
  } catch (_) { /* the exit code below still fails the run */ }
  process.exit(1);
});
