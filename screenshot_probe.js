// screenshot_probe.js — viewport screenshots of live FIELD site
// Commits PNGs to outbox/ following cls-probe pattern.
// Devices: iPhone SE, Pixel 8 (custom), Galaxy A36 (custom), standard mobile
// Viewports: portrait + landscape for mobile/tablet, portrait only for desktop
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';
const WAIT_MS = 4000;

// Pixel 8 and Galaxy A36 not in Playwright registry — defined manually
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
  // Mobile — 4 devices, portrait + landscape
  { name: 'iphone-se-portrait',     device: 'iPhone SE (3rd gen)' },
  { name: 'iphone-se-landscape',    device: 'iPhone SE (3rd gen) landscape' },
  { name: 'pixel8-portrait',        custom: 'Pixel 8' },
  { name: 'pixel8-landscape',       custom: 'Pixel 8', landscape: true },
  { name: 'galaxy-a36-portrait',    custom: 'Galaxy A36' },
  { name: 'galaxy-a36-landscape',   custom: 'Galaxy A36', landscape: true },
  { name: 'standard-mobile-portrait',  viewport: { width: 390, height: 844 } },
  { name: 'standard-mobile-landscape', viewport: { width: 844, height: 390 } },
  // Tablet — portrait + landscape
  { name: 'tablet-portrait',  viewport: { width: 820,  height: 1180 } },
  { name: 'tablet-landscape', viewport: { width: 1180, height: 820  } },
  // Desktop — portrait only
  { name: 'desktop',          viewport: { width: 1440, height: 900  } },
];

(async () => {
  const browser = await chromium.launch();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const results = [];

  for (const vp of VIEWPORTS) {
    let context;
    if (vp.device) {
      context = await browser.newContext({ ...devices[vp.device] });
    } else if (vp.custom) {
      const cfg = { ...CUSTOM_DEVICES[vp.custom] };
      if (vp.landscape) {
        cfg.viewport = { width: cfg.viewport.height, height: cfg.viewport.width };
      }
      context = await browser.newContext(cfg);
    } else {
      context = await browser.newContext({
        viewport: vp.viewport, isMobile: vp.viewport.width <= 820,
        hasTouch: vp.viewport.width <= 820,
      });
    }

    const page = await context.newPage();
    await page.goto(FIELD_URL, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(WAIT_MS);
    // Scroll to bottom repeatedly until page stops growing — handles content-visibility:auto
    // sections that expand as they enter the viewport, increasing scrollHeight each pass.
    await page.evaluate(async () => {
      let lastHeight = 0;
      for (let pass = 0; pass < 8; pass++) {
        const step = window.innerHeight;
        const end = document.body.scrollHeight;
        for (let y = 0; y <= end; y += step) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 120));
        }
        await new Promise(r => setTimeout(r, 300));
        if (document.body.scrollHeight === lastHeight) break;
        lastHeight = document.body.scrollHeight;
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 300));
    });
    const file = path.join('outbox', `screenshot-${vp.name}-${ts}.png`);
    await page.screenshot({ path: file, fullPage: true });
    results.push(file);
    console.log(`✓ ${vp.name} → ${file}`);
    await context.close();
  }

  await browser.close();
  fs.writeFileSync(path.join('outbox', `screenshot-manifest-${ts}.txt`), results.join('\n'));
  console.log(`done — ${results.length} screenshots`);
})();
