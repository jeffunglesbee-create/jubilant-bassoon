// screenshot_probe.js — takes viewport screenshots of live FIELD site
// Commits PNGs to outbox/ following cls-probe pattern
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const VIEWPORTS = [
  { name: 'mobile',  width: 390,  height: 844 },
  { name: 'tablet',  width: 820,  height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];
const WAIT_MS = 4000; // allow schedule + live data to render

(async () => {
  const browser = await chromium.launch();
  const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const results = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(FIELD_URL, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(WAIT_MS);
    const file = path.join('outbox', `screenshot-${vp.name}-${ts}.png`);
    await page.screenshot({ path: file, fullPage: false });
    results.push(file);
    console.log(`✓ ${vp.name} → ${file}`);
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(path.join('outbox', `screenshot-manifest-${ts}.txt`), results.join('\n'));
  console.log('done');
})();
