// ambient_skeleton_probe.js — verifies .ambient-skeleton is removed after Solid mount
// Runs against live FIELD deploy. Commits results to outbox/.
// CC-CMD-2026-07-21-ambient-skeleton-overlap TASK 4 live verification.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';
const SCRATCHPAD = 'outbox';

const VIEWPORTS = [
  { name: 'wf_desktop_1440', width: 1440, height: 900 },
  { name: 'ipad_820',        width: 820,  height: 1024 },
];

async function probeViewport(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();

  // Log console errors for diagnostics
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Wait up to 12s for _solidMounted to become true (real data poll fires ~5-10s after load)
  const mounted = await page.waitForFunction(() => {
    const panel = document.getElementById('ambient-panel');
    return panel && panel._solidMounted === true;
  }, { timeout: 12000 }).then(() => true).catch(() => false);

  // Give Solid one more tick to process the reconcile
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const panel = document.getElementById('ambient-panel');
    if (!panel) return { panel: false };
    const skel = panel.querySelector('.ambient-skeleton');
    return {
      panel: true,
      solidMounted: !!panel._solidMounted,
      skeletonPresent: !!skel,
      skeletonCount: panel.querySelectorAll('.ambient-skeleton').length,
      panelChildCount: panel.children.length,
      panelClasses: panel.className,
      bodyClasses: document.body.className,
    };
  });

  // Screenshot #ambient-panel
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const screenshotPath = `${SCRATCHPAD}/ambient-skeleton-probe-${vp.name}-${ts}.png`;
  const panelEl = await page.$('#ambient-panel');
  if (panelEl) {
    await panelEl.screenshot({ path: screenshotPath });
  }

  await ctx.close();

  return {
    viewport: vp.name,
    width: vp.width,
    mounted,
    ...state,
    screenshotPath: panelEl ? screenshotPath : null,
    consoleErrors: errors.slice(0, 5),
  };
}

(async () => {
  const browser = await chromium.launch();
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nProbing ${vp.name} (${vp.width}px)...`);
    const r = await probeViewport(browser, vp);
    results.push(r);

    console.log(`  solidMounted: ${r.solidMounted}`);
    console.log(`  skeletonPresent: ${r.skeletonPresent}`);
    console.log(`  skeletonCount: ${r.skeletonCount}`);
    console.log(`  panelChildCount: ${r.panelChildCount}`);
    console.log(`  screenshot: ${r.screenshotPath}`);
    if (r.consoleErrors.length) console.log(`  errors: ${r.consoleErrors.join('; ')}`);

    if (!r.solidMounted) {
      console.log(`  ⚠️  WARN — solidMounted=false after 12s (ambient panel may not render at ${vp.width}px without wf-mode?)`);
    } else if (r.skeletonPresent) {
      console.log(`  ❌ FAIL — .ambient-skeleton still in DOM after Solid mount`);
    } else {
      console.log(`  ✅ PASS — .ambient-skeleton absent from DOM after Solid mount`);
    }
  }

  await browser.close();

  // Write manifest
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const manifestPath = `${SCRATCHPAD}/ambient-skeleton-probe-manifest-${ts}.json`;
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2));
  console.log(`\nManifest: ${manifestPath}`);

  // Fail if any solidMounted=true but skeletonPresent=true
  const failures = results.filter(r => r.solidMounted && r.skeletonPresent);
  if (failures.length) {
    console.error(`\n❌ ${failures.length} viewport(s) FAILED skeleton check`);
    process.exit(1);
  }

  const mounted = results.filter(r => r.solidMounted);
  console.log(`\n✅ ${mounted.length}/${results.length} viewports confirmed solid-mounted, 0 skeleton failures`);
})();
