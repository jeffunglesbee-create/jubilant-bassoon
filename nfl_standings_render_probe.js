// Rule 90: verify the NFL ▼ Standings dropdown actually works on the LIVE app.
// Finds an NFL game card, clicks its .standings-btn, waits for the ESPN fetch,
// and asserts the .standings-panel table populated with team rows. Boolean manifest.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const URL = BASE + (BASE.includes('?') ? '&' : '?') + 'wpt=1';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 3200 } });
  const m = { url: URL, ts: TS };
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.game-card', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(8000);
    const idx = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.game-card')];
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        if ((c.dataset.sport || '').includes('NFL') && c.querySelector('.standings-btn')) {
          c.scrollIntoView(); return i;
        }
      }
      return -1;
    });
    m.nflCardWithStandingsBtn = idx >= 0;
    if (idx >= 0) {
      await page.evaluate((i) => document.querySelectorAll('.game-card')[i].querySelector('.standings-btn').click(), idx);
      await page.waitForTimeout(6000); // ESPN standings fetch
      const res = await page.evaluate((i) => {
        const c = document.querySelectorAll('.game-card')[i];
        const p = c.querySelector('.standings-panel');
        const rows = p ? [...p.querySelectorAll('.standings-table tr')] : [];
        const teamCells = rows.map(r => r.textContent.trim()).filter(t => t.length > 2);
        return { panelPresent: !!p, panelVisible: p ? getComputedStyle(p).display !== 'none' : false,
                 rowCount: rows.length, sampleRows: teamCells.slice(0, 4) };
      }, idx);
      Object.assign(m, res);
      m.standingsWorks = res.panelPresent && res.panelVisible && res.rowCount >= 16;
      await page.screenshot({ path: `outbox/nfl-standings-${TS}.png`, fullPage: false });
    } else {
      m.standingsWorks = false;
      m.note = 'no NFL game card with a standings button on the slate this run';
    }
  } catch (e) { m.error = String(e && e.message ? e.message : e); }
  finally { await browser.close(); }
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/nfl-standings-manifest-${TS}.json`, JSON.stringify(m, null, 2));
  console.log(JSON.stringify(m, null, 2));
  process.exit(0);
})();
