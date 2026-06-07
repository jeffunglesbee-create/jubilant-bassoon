// cls_probe.js — CLS cold-load measurement via headless Chromium
//
// Loads the live FIELD site, waits for the full five-frame cold-load sequence
// to complete (skeleton → cards [field:cards mark] → ready [field:ready mark]
// → supplemental [field:supplemental mark]), then reads window.__cls from page
// context and writes structured JSON to outbox/cls-probe-{TS}.json.
//
// PM-26-P marks (field:cards, field:ready, field:supplemental) let us verify
// phase tagging is working and see which load phase produced which CLS events.
//
// Engine: Chromium only (native layout-shift PerformanceObserver).
// The geometric fallback for WebKit/Gecko requires a real device.
// Chromium native data is what matters for budget assertion thresholds.
//
// Usage:
//   FIELD_URL=https://jubilant-bassoon.jeffunglesbee.workers.dev node cls_probe.js
//   (or via cls-probe.yml workflow)

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const OUTBOX    = path.join(__dirname, 'outbox');

// How long to wait after field:ready fires before reading __cls.
// Covers: overlay fetch (~800ms), supplemental fetch (~1.5s), font-swap tail.
// 4s is conservative — supplemental is usually done by 2.5s.
const POST_READY_WAIT_MS = 4000;

// Hard timeout for _fieldDataReady sentinel (same as field_browser.test.js)
const READY_TIMEOUT_MS = 20000;

(async () => {
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z';
  const outFile = path.join(OUTBOX, `cls-probe-${ts}.json`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      // Standard desktop viewport — matches D1/D3 ESSENTIALS mode
      viewport: { width: 1280, height: 800 },
      // Disable service worker caching so every probe is a true cold load
      serviceWorkers: 'block',
    });
    const page = await context.newPage();

    // Collect console output for diagnostics (gated behind ?clsdebug=1 in prod)
    const consoleLines = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.startsWith('[CLS') || text.startsWith('[field:')) {
        consoleLines.push(text);
      }
    });

    console.log(`[cls-probe] Loading ${FIELD_URL}?clsdebug=1`);
    await page.goto(`${FIELD_URL}?clsdebug=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for _fieldDataReady sentinel (set immediately after renderAll)
    console.log('[cls-probe] Waiting for _fieldDataReady...');
    await page.waitForFunction(() => !!window._fieldDataReady, {
      timeout: READY_TIMEOUT_MS,
    });
    console.log('[cls-probe] _fieldDataReady fired. Buffering for supplemental + overlay...');

    // Buffer for async phases: overlay fetch, supplemental, font-swap tail
    await page.waitForTimeout(POST_READY_WAIT_MS);

    // Read __cls from page context
    const clsData = await page.evaluate(() => {
      if (!window.__cls) return { error: '__cls not defined — observer did not initialise' };

      const summary = window.__cls.summary();
      const bySource = window.__cls.bySource ? window.__cls.bySource() : [];
      const events = window.__cls.events || [];

      // Read PM-26-P performance marks
      let marks = [];
      try {
        marks = performance.getEntriesByType('mark')
          .filter(m => m.name.startsWith('field:'))
          .map(m => ({ name: m.name, startTime: Math.round(m.startTime) }));
      } catch (_) {}

      // Phase breakdown: aggregate CLS score by load phase
      const byPhase = {};
      for (const ev of events) {
        const ph = ev.phase || 'unknown';
        if (!byPhase[ph]) byPhase[ph] = { count: 0, total: 0, maxSingle: 0 };
        byPhase[ph].count++;
        byPhase[ph].total = +(byPhase[ph].total + ev.score).toFixed(4);
        if (ev.score > byPhase[ph].maxSingle) byPhase[ph].maxSingle = ev.score;
      }

      return {
        mode: summary.mode,
        supported: window.__cls.supported,
        total: summary.total,
        maxWindow: summary.maxWindow,
        eventCount: summary.events,
        byPhase,
        topSources: bySource.slice(0, 10).map(([src, score]) => ({ src, score })),
        events: events.map(ev => ({
          t: ev.t,
          score: ev.score,
          cumul: ev.cumul,
          window: ev.window,
          phase: ev.phase || 'unknown',
          sources: ev.sources,
          fallback: ev.fallback || false,
        })),
        marks,
        _fieldDataReady: window._fieldDataReady,
        userAgent: navigator.userAgent,
      };
    });

    // Write result
    const result = {
      probe: 'cls-probe',
      ts,
      url: FIELD_URL,
      postReadyWaitMs: POST_READY_WAIT_MS,
      consoleLines,
      cls: clsData,
    };

    if (!fs.existsSync(OUTBOX)) fs.mkdirSync(OUTBOX, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2));

    // Summary to stdout for CI log
    const cls = clsData;
    console.log(`\n[cls-probe] ── RESULT ──────────────────────────`);
    console.log(`  mode:       ${cls.mode}`);
    console.log(`  total:      ${cls.total}`);
    console.log(`  maxWindow:  ${cls.maxWindow}  (= Chrome reported CLS)`);
    console.log(`  events:     ${cls.eventCount}`);
    if (cls.byPhase) {
      console.log(`  by phase:`);
      for (const [phase, data] of Object.entries(cls.byPhase)) {
        console.log(`    ${phase.padEnd(14)} count=${data.count}  total=${data.total}  maxSingle=${data.maxSingle}`);
      }
    }
    if (cls.topSources && cls.topSources.length) {
      console.log(`  top sources:`);
      cls.topSources.slice(0, 5).forEach(({ src, score }) => {
        console.log(`    ${score.toFixed(4)}  ${src}`);
      });
    }
    if (cls.marks && cls.marks.length) {
      console.log(`  PM-26-P marks:`);
      cls.marks.forEach(m => console.log(`    ${m.name} @ ${m.startTime}ms`));
    }
    console.log(`  output: ${outFile}`);
    console.log(`[cls-probe] ────────────────────────────────────`);

  } catch (err) {
    console.error('[cls-probe] ERROR:', err.message);
    // Write error result so the commit step still has something to push
    const result = { probe: 'cls-probe', ts, url: FIELD_URL, error: err.message };
    if (!fs.existsSync(OUTBOX)) fs.mkdirSync(OUTBOX, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
