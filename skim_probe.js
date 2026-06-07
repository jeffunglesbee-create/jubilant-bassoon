// skim_probe.js — #the-skim height measurement across 3 viewports
//
// Loads the live FIELD site at three viewport widths (393px phone, 820px iPad,
// 1280px desktop), waits for overlay hydration to complete (the moment #the-skim
// becomes visible and populated), then reads getBoundingClientRect().height.
//
// Output: outbox/skim-probe-{TS}.json with per-viewport heights + recommended
// min-height value (max observed + 10% headroom, rounded to nearest 10px).
//
// The recommended value feeds directly into the CSS fix:
//   .skim-strip { min-height: Xpx; contain: layout; }
// which eliminates the t=891ms score=0.1371 CLS event (dominant ready-phase source).
//
// Usage:
//   FIELD_URL=https://jubilant-bassoon.jeffunglesbee.workers.dev node skim_probe.js
//   (or via skim-probe.yml workflow)

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const OUTBOX    = path.join(__dirname, 'outbox');

// Three canonical viewports matching PM-26 CLS test matrix
const VIEWPORTS = [
  { name: 'phone',   width: 393,  height: 852  },
  { name: 'ipad',    width: 820,  height: 1180 },
  { name: 'desktop', width: 1280, height: 800  },
];

// Wait for #the-skim to become visible and have non-zero height.
// Overlay hydration is what populates it — typically fires 500-1500ms after
// _fieldDataReady. Timeout at 10s; if skim never populates (no data today)
// we record height=0 and note it as empty.
const SKIM_VISIBLE_TIMEOUT_MS = 10000;
const READY_TIMEOUT_MS = 20000;

async function measureViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    serviceWorkers: 'block',
  });
  const page = await context.newPage();

  try {
    await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for _fieldDataReady (cards rendered from hardcoded data)
    await page.waitForFunction(() => !!window._fieldDataReady, {
      timeout: READY_TIMEOUT_MS,
    });

    // Wait for #the-skim to become visible (overlay hydration populates it)
    let skimHeight = 0;
    let skimVisible = false;
    let skimText = '';

    try {
      await page.waitForFunction(() => {
        const el = document.getElementById('the-skim');
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && el.getBoundingClientRect().height > 0;
      }, { timeout: SKIM_VISIBLE_TIMEOUT_MS });

      const metrics = await page.evaluate(() => {
        const el = document.getElementById('the-skim');
        const rect = el.getBoundingClientRect();
        const textEl = document.getElementById('skim-text');
        return {
          height: rect.height,
          width: rect.width,
          text: textEl ? textEl.textContent.trim().slice(0, 120) : '',
          display: window.getComputedStyle(el).display,
          lines: Math.round(rect.height / parseFloat(window.getComputedStyle(el).lineHeight)) || 1,
        };
      });

      skimHeight  = Math.ceil(metrics.height);
      skimVisible = true;
      skimText    = metrics.text;

      console.log(`  [${vp.name}] height=${skimHeight}px  lines≈${metrics.lines}  text="${skimText.slice(0, 60)}..."`);

    } catch (_) {
      // Skim never populated — no overlay data today or skim disabled
      console.log(`  [${vp.name}] skim not visible within ${SKIM_VISIBLE_TIMEOUT_MS}ms — recording height=0`);
    }

    return { viewport: vp.name, width: vp.width, height: vp.height, skimHeight, skimVisible, skimText };

  } finally {
    await context.close();
  }
}

(async () => {
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z';
  const outFile = path.join(OUTBOX, `skim-probe-${ts}.json`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    console.log(`[skim-probe] Measuring #the-skim at ${VIEWPORTS.length} viewports...`);
    const measurements = [];
    for (const vp of VIEWPORTS) {
      const result = await measureViewport(browser, vp);
      measurements.push(result);
    }

    // Recommended min-height: max observed height across all viewports
    // + 10% headroom, rounded up to nearest 10px.
    // If no viewport populated the skim, recommendation is null (no fix needed today;
    // re-run on a day with skim content).
    const populated = measurements.filter(m => m.skimVisible && m.skimHeight > 0);
    let recommendation = null;
    if (populated.length > 0) {
      const maxHeight = Math.max(...populated.map(m => m.skimHeight));
      const withHeadroom = Math.ceil(maxHeight * 1.1);
      const rounded = Math.ceil(withHeadroom / 10) * 10;
      recommendation = {
        maxObserved: maxHeight,
        withHeadroom: withHeadroom,
        minHeightPx: rounded,
        cssRule: `.skim-strip { min-height: ${rounded}px; contain: layout; }`,
        note: `Apply to .skim-strip in index.html CSS. Same pattern as M-1 (#upper-slots). ` +
              `Eliminates t≈891ms score≈0.1371 CLS event (dominant ready-phase source from cls-probe-2026-06-07T0217Z).`,
      };
    }

    const result = {
      probe: 'skim-probe',
      ts,
      url: FIELD_URL,
      measurements,
      recommendation,
    };

    if (!fs.existsSync(OUTBOX)) fs.mkdirSync(OUTBOX, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2));

    console.log(`\n[skim-probe] ── RESULT ──────────────────────────`);
    for (const m of measurements) {
      console.log(`  ${m.viewport.padEnd(8)} ${m.skimVisible ? `height=${m.skimHeight}px` : 'not visible'}`);
    }
    if (recommendation) {
      console.log(`  recommended min-height: ${recommendation.minHeightPx}px`);
      console.log(`  css: ${recommendation.cssRule}`);
    } else {
      console.log(`  no skim content today — re-run on active day`);
    }
    console.log(`  output: ${outFile}`);
    console.log(`[skim-probe] ────────────────────────────────────`);

  } catch (err) {
    console.error('[skim-probe] ERROR:', err.message);
    const result = { probe: 'skim-probe', ts, url: FIELD_URL, error: err.message };
    if (!fs.existsSync(OUTBOX)) fs.mkdirSync(OUTBOX, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
