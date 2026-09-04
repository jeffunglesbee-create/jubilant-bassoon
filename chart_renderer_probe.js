// chart_renderer_probe.js — the chart renderer's contract, against the SHIPPED
// bundle in a real browser.
//
// WHAT THIS CAN AND CANNOT PROVE. The two real call sites cannot be driven from
// CI: the EPA chart needs a live NFL game through the relay, the WP chart needs
// an SSE wp_update, and a GitHub runner reaches neither — site.api.espn.com is
// CORS-blocked from the page, measured across three earlier probe runs. So this
// does NOT claim "the EPA chart appeared on a card". It claims the narrower
// things that are true, checkable, and the ones that would actually break:
//
//   1. uPlot is really IN the deployed bundle and really draws (a canvas).
//      No local check can prove this — esbuild tree-shook the module out
//      entirely when it had no consumer, and that was invisible until the
//      bundle was grepped.
//   2. A second call with new data takes setData and does NOT rebuild the
//      canvas. This is the Rule 89 claim, and it is the one that decays
//      silently: a remount still LOOKS correct on a screenshot.
//   3. The fixed domain is honoured, so two charts stay comparable.
//   4. A detached mount is reclaimed rather than leaked.
//
// Every assertion runs before any navigation, and the harness fails on
// all-zero rather than reading silence as success.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const RAW  = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const BASE = RAW + (RAW.includes('?') ? '&' : '?') + 'pl-verify';
const OUT = 'outbox';
const RUN_ID = process.env.GITHUB_RUN_ID || String(Date.now());

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const apiReady = await page.waitForFunction(
    () => !!(window._plVerify && window._plVerify.fieldChart && window._plVerify.sweepDetachedCharts),
    { timeout: 30000 }).then(() => true).catch(() => false);

  let r = { error: 'test API never appeared' };
  if (apiReady) {
    r = await page.evaluate(async () => {
      const V = window._plVerify;
      const out = {
        mounted: false, canvasCount: 0, hasAriaLabel: false, ariaLabel: null,
        sameCanvasAfterUpdate: false, canvasCountAfterUpdate: 0,
        instanceReused: false, rangeHonoured: false,
        // Reported, not just the boolean. Run 33923552707 said rangeHonoured
        // false and that was the probe reading too early: uPlot leaves
        // scales.y.min/max null until the first draw resolves them, so the
        // three states are unresolved / wrong / right and a bare false
        // collapses the first two. Measured locally in a real browser:
        // null immediately, 0 and 1 after two animation frames.
        yMin: null, yMax: null, scaleResolved: false,
        sweptOnDetach: false, error: null,
      };
      try {
        const host = document.createElement('div');
        host.style.cssText = 'width:300px;height:60px';
        document.body.appendChild(host);

        // ── 1. it draws ────────────────────────────────────────────────────
        const xs = [0, 1, 2, 3, 4, 5];
        const u1 = V.fieldChart(host, [xs, [0.5, 0.52, 0.48, 0.61, 0.55, 0.6]],
          { height: 60, range: [0, 1], labels: ['probe series'] });
        out.mounted = !!u1;
        out.canvasCount = host.querySelectorAll('canvas').length;
        out.hasAriaLabel = host.hasAttribute('aria-label');
        out.ariaLabel = host.getAttribute('aria-label');

        // ── 2. setData, not remount ────────────────────────────────────────
        // Identity of the canvas node is the check. A remount replaces it; a
        // setData call leaves the same node in place. Comparing counts alone
        // would pass for a destroy-and-rebuild, which is the failure.
        const canvasBefore = host.querySelector('canvas');
        const u2 = V.fieldChart(host, [xs, [0.4, 0.42, 0.38, 0.71, 0.65, 0.7]],
          { height: 60, range: [0, 1], labels: ['probe series'] });
        const canvasAfter = host.querySelector('canvas');
        out.sameCanvasAfterUpdate = !!canvasBefore && canvasBefore === canvasAfter;
        out.canvasCountAfterUpdate = host.querySelectorAll('canvas').length;
        out.instanceReused = !!u1 && u1 === u2;

        // ── 3. the fixed domain is the one asked for ───────────────────────
        // The series spans 0.38-0.71. An auto-scaled chart would report that
        // as its y range; a fixed one reports 0-1.
        //
        // Two frames, not zero: uPlot resolves scales during the draw, so
        // reading synchronously after construction returns null for both.
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        try {
          const sc = u2 && u2.scales && u2.scales.y;
          out.yMin = sc ? sc.min : null;
          out.yMax = sc ? sc.max : null;
          out.scaleResolved = typeof out.yMin === 'number' && typeof out.yMax === 'number';
          out.rangeHonoured = out.scaleResolved && out.yMin === 0 && out.yMax === 1;
        } catch (_) {}

        // ── 4. a detached mount is reclaimed ───────────────────────────────
        const ghost = document.createElement('div');
        ghost.style.cssText = 'width:200px;height:40px';
        document.body.appendChild(ghost);
        V.fieldChart(ghost, [[0, 1, 2], [1, 2, 3]], { height: 40, labels: ['ghost'] });
        ghost.remove();                       // the innerHTML-rebuild shape
        const swept = V.sweepDetachedCharts();
        out.sweptOnDetach = swept >= 1 && !ghost._uplot;

        host.remove();
        V.sweepDetachedCharts();
      } catch (e) { out.error = String(e && e.message || e); }
      return out;
    });
  }

  const manifest = {
    url: BASE, runId: RUN_ID, commit: process.env.GITHUB_SHA || null,
    timestamp: new Date().toISOString(),
    testApiReady: apiReady,
    ...r,
    consoleErrors: errors.slice(0, 10),
  };

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${OUT}/chart-renderer-manifest-latest.json`, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
  await browser.close();

  const problems = [];
  if (!manifest.testApiReady)     problems.push('_plVerify.fieldChart never appeared — the module is not in the deployed bundle, or ?pl-verify is not honoured');
  if (!manifest.mounted)          problems.push('fieldChart returned nothing — uPlot did not construct');
  if (manifest.canvasCount < 1)   problems.push('no canvas — uPlot is bundled but did not draw');
  if (!manifest.hasAriaLabel)     problems.push('no aria-label — the canvas is silent to assistive tech');
  if (!manifest.sameCanvasAfterUpdate)
    problems.push('the canvas node CHANGED on the second call — a remount, not setData (Rule 89)');
  if (manifest.canvasCountAfterUpdate !== manifest.canvasCount)
    problems.push(`canvas count went ${manifest.canvasCount} -> ${manifest.canvasCountAfterUpdate} — canvases are accumulating`);
  if (!manifest.instanceReused)   problems.push('a different uPlot instance came back — the update path did not run');
  if (!manifest.scaleResolved)
    problems.push(`the y scale never resolved (min=${manifest.yMin}, max=${manifest.yMax}) — the chart did not draw, so nothing below was measured`);
  else if (!manifest.rangeHonoured)
    problems.push(`y scale is [${manifest.yMin}, ${manifest.yMax}], not [0, 1] — the fixed domain was ignored and the chart auto-scaled`);
  if (!manifest.sweptOnDetach)    problems.push('a detached mount was NOT reclaimed — uPlot listeners are leaking');
  if (manifest.error)             problems.push(`in-page error: ${manifest.error}`);

  if (problems.length) { console.error('\nFAIL:\n  - ' + problems.join('\n  - ')); process.exit(1); }
  console.log(`\nPASS: uPlot draws from the bundle, updates via setData on the same canvas, honours its fixed domain, and reclaims detached mounts.`);
})().catch(e => { console.error(e); process.exit(1); });
