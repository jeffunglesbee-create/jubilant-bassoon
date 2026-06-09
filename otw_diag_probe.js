// otw_diag_probe.js — reads window._otwNetDiag from live FIELD to diagnose C1
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(FIELD_URL, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(5000); // allow OTW to render

  const diag = await page.evaluate(() => {
    return {
      otwNetDiag: window._otwNetDiag || null,
      otwBannerText: document.getElementById('otw-banner')?.innerText?.slice(0, 200) || '',
      otwWhyText: document.querySelector('.otw-why')?.innerText?.slice(0, 200) || '',
    };
  });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = path.join('outbox', `otw-diag-${ts}.json`);
  fs.writeFileSync(out, JSON.stringify(diag, null, 2));
  console.log('diag:', JSON.stringify(diag, null, 2));
  console.log('written:', out);
  await browser.close();
})();
