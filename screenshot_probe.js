// screenshot_probe.js — content-aware viewport screenshots of live FIELD site
// Strategy (Option B): scroll to force content-visibility:auto expansion, query
// getBoundingClientRect for each .sport-section + key UI regions, then jump
// directly to each content zone and capture one viewport-height screenshot.
// No fullPage — produces only content-bearing frames at readable DPR.
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';
const WAIT_MS = 4000;
const SCROLL_PAUSE = 120;
const SCROLL_PASSES = 8;

const CUSTOM_DEVICES = {
  'Pixel 8': {
    viewport: { width: 412, height: 892 },
    deviceScaleFactor: 2.625,
    isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  },
  'Galaxy A36': {
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.25,
    isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A366B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  },
};

const VIEWPORTS = [
  { name: 'iphone-se-portrait',        device: 'iPhone SE (3rd gen)' },
  { name: 'iphone-se-landscape',       device: 'iPhone SE (3rd gen) landscape' },
  { name: 'pixel8-portrait',           custom: 'Pixel 8' },
  { name: 'pixel8-landscape',          custom: 'Pixel 8', landscape: true },
  { name: 'galaxy-a36-portrait',       custom: 'Galaxy A36' },
  { name: 'galaxy-a36-landscape',      custom: 'Galaxy A36', landscape: true },
  { name: 'standard-mobile-portrait',  viewport: { width: 390, height: 844 } },
  { name: 'tablet-portrait',           viewport: { width: 820, height: 1180 } },
  { name: 'tablet-landscape',          viewport: { width: 1180, height: 820 } },
  { name: 'desktop',                   viewport: { width: 1440, height: 900 } },
];

// Force content-visibility:auto expansion by scrolling through the full page
// multiple passes, re-reading scrollHeight each pass until stable.
async function forceExpand(page) {
  await page.evaluate(async (pause) => {
    let lastHeight = 0;
    for (let pass = 0; pass < 8; pass++) {
      const step = window.innerHeight;
      const end = document.body.scrollHeight;
      for (let y = 0; y <= end; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, pause));
      }
      await new Promise(r => setTimeout(r, 300));
      if (document.body.scrollHeight === lastHeight) break;
      lastHeight = document.body.scrollHeight;
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 300));
  }, SCROLL_PAUSE);
}

// Query the page for content zones: above-fold UI + each sport section.
// Returns array of { label, scrollY } — the scrollY to place that zone
// at the top of the viewport.
async function getContentZones(page) {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const zones = [];

    // Zone 0: top of page (header, OTW, filter bar)
    zones.push({ label: 'top', scrollY: 0 });

    // Zone 1: FIELD Brief / Desk area — find first .card or #field-brief
    const brief = document.querySelector('#field-brief, .field-brief, [data-section="brief"]');
    if (brief) {
      const r = brief.getBoundingClientRect();
      zones.push({ label: 'brief', scrollY: Math.max(0, window.scrollY + r.top - 16) });
    }

    // Sport sections — each gets its own capture
    const sportSections = document.querySelectorAll('.sport-section');
    sportSections.forEach(sec => {
      const sport = sec.dataset.sport || sec.id || 'unknown';
      const r = sec.getBoundingClientRect();
      const absTop = window.scrollY + r.top;
      // One capture at section start
      zones.push({ label: `sport-${sport}-start`, scrollY: Math.max(0, absTop - 16) });
      // If section is taller than 2 viewports, add a mid capture
      if (r.height > vh * 2) {
        zones.push({ label: `sport-${sport}-mid`, scrollY: absTop + vh });
      }
    });

    // Fallback: if no sport sections found, sample every 600px of content
    if (sportSections.length === 0) {
      const totalH = document.body.scrollHeight;
      for (let y = 0; y < totalH; y += Math.floor(vh * 0.9)) {
        zones.push({ label: `scroll-${y}`, scrollY: y });
      }
    }

    return zones;
  });
}

(async () => {
  const browser = await chromium.launch();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const results = [];
  const manifest = [];

  for (const vp of VIEWPORTS) {
    let context;
    if (vp.device) {
      context = await browser.newContext({ ...devices[vp.device] });
    } else if (vp.custom) {
      const cfg = { ...CUSTOM_DEVICES[vp.custom] };
      if (vp.landscape) cfg.viewport = { width: cfg.viewport.height, height: cfg.viewport.width };
      context = await browser.newContext(cfg);
    } else {
      context = await browser.newContext({
        viewport: vp.viewport,
        isMobile: vp.viewport.width <= 820,
        hasTouch: vp.viewport.width <= 820,
      });
    }

    const page = await context.newPage();
    await page.goto(FIELD_URL, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(WAIT_MS);

    // Force all content-visibility:auto sections to expand
    await forceExpand(page);

    // Query content zones after expansion
    const zones = await getContentZones(page);
    console.log(`  ${vp.name}: ${zones.length} zones`);

    const vpFiles = [];
    for (const zone of zones) {
      await page.evaluate(y => window.scrollTo(0, y), zone.scrollY);
      await page.waitForTimeout(80); // allow paint
      const label = zone.label.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase();
      const file = path.join('outbox', `screenshot-${vp.name}-${label}-${ts}.png`);
      await page.screenshot({ path: file, fullPage: false }); // viewport only
      vpFiles.push({ zone: zone.label, file });
      results.push(file);
      console.log(`  ✓ ${vp.name}/${zone.label}`);
    }

    manifest.push({ viewport: vp.name, zones: vpFiles });
    await context.close();
  }

  await browser.close();

  // Write manifest with zone → file mapping for each viewport
  const manifestPath = path.join('outbox', `screenshot-manifest-${ts}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\ndone — ${results.length} screenshots across ${VIEWPORTS.length} viewports`);
  console.log(`manifest: ${manifestPath}`);
})();
