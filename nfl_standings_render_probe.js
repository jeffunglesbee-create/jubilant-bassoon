// Rule 90: verify the NFL ▼ Standings dropdown works on the LIVE app.
// Finds the standings-btn whose onclick carries 'Football (NFL)', clicks it,
// waits for the ESPN fetch, asserts the panel populated. Diagnostic: dumps every
// standings-btn's sport so a false negative is explainable, not silent.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const URL = BASE + (BASE.includes('?') ? '&' : '?') + 'wpt=1';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 3600 } });
  const m = { url: URL, ts: TS };
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.game-card', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(8000);
    // Diagnostic: what sports render a standings button, and what card sports exist
    m.diag = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.standings-btn')];
      const sportOf = (b) => (b.getAttribute('onclick') || '').match(/toggleStandings\(this,'([^']+)'/)?.[1] || '?';
      return {
        standingsBtnCount: btns.length,
        standingsBtnSports: [...new Set(btns.map(sportOf))],
        cardSports: [...new Set([...document.querySelectorAll('.game-card')].map(c => c.dataset.sport || '?'))],
      };
    });
    // Click the NFL standings button
    const clicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.standings-btn')];
      const nfl = btns.find(b => (b.getAttribute('onclick') || '').includes("toggleStandings(this,'NFL'"));
      if (!nfl) return false;
      nfl.scrollIntoView(); nfl.click(); return true;
    });
    m.nflStandingsBtnFound = clicked;
    if (clicked) {
      await page.waitForTimeout(6000); // ESPN standings fetch
      m.render = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('.standings-btn')].find(b => (b.getAttribute('onclick') || '').includes("toggleStandings(this,'NFL'"));
        const card = btn?.closest('.game-card');
        const p = card?.querySelector('.standings-panel');
        const rows = p ? [...p.querySelectorAll('.standings-table tr')] : [];
        return { buttonLabel: (btn?.textContent || '').trim(),
                 panelPresent: !!p, panelVisible: p ? getComputedStyle(p).display !== 'none' : false,
                 rowCount: rows.length, sampleRows: rows.map(r => r.textContent.trim().replace(/\s+/g, ' ')).filter(t => t.length > 2).slice(0, 4) };
      });
      m.standingsWorks = !!(m.render.panelPresent && m.render.panelVisible && m.render.rowCount >= 30);
    } else {
      m.standingsWorks = false;
      m.note = "no standings-btn for sport 'NFL' on the slate this run";
    }
    await page.screenshot({ path: `outbox/nfl-standings-${TS}.png`, fullPage: false }); // ALWAYS
  } catch (e) { m.error = String(e && e.message ? e.message : e); }
  finally { await browser.close(); }
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/nfl-standings-manifest-${TS}.json`, JSON.stringify(m, null, 2));
  console.log(JSON.stringify(m, null, 2));
  process.exit(0);
})();
