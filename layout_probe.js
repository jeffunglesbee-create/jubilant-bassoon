// layout_probe.js — diagnoses C4 by checking computed styles at different viewports
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';

const CONFIGS = [
  { name: 'pixel8-landscape',    viewport: {width:892, height:412}, isMobile:true  },
  { name: 'galaxya36-landscape', viewport: {width:915, height:412}, isMobile:true  },
  { name: 'stdmobile-landscape', viewport: {width:844, height:390}, isMobile:false },
];

(async () => {
  const browser = await chromium.launch();
  const results = {};
  for (const cfg of CONFIGS) {
    const ctx = await browser.newContext({ viewport: cfg.viewport, isMobile: cfg.isMobile, hasTouch: cfg.isMobile });
    const page = await ctx.newPage();
    await page.goto(FIELD_URL, { waitUntil:'networkidle', timeout:20000 }).catch(()=>{});
    await page.waitForTimeout(4000);
    const diag = await page.evaluate(() => {
      const main = document.querySelector('.main');
      const gamesList = document.querySelectorAll('.games-list');
      const gameCards = document.querySelectorAll('.game-card');
      const ambientPanel = document.getElementById('ambient-panel');
      const getStyle = el => el ? window.getComputedStyle(el) : null;
      return {
        vw: window.innerWidth,
        vh: window.innerHeight,
        mainDisplay: getStyle(main)?.display,
        mainMarginRight: getStyle(main)?.marginRight,
        mainWidth: main?.offsetWidth,
        gamesListCount: gamesList.length,
        gamesListDisplays: [...gamesList].map(gl => ({
          display: getStyle(gl)?.display,
          offsetHeight: gl.offsetHeight,
          offsetWidth: gl.offsetWidth,
          childCount: gl.children.length,
        })),
        gameCardCount: gameCards.length,
        visibleCardCount: [...gameCards].filter(c => getStyle(c)?.display !== 'none').length,
        ambientDisplay: getStyle(ambientPanel)?.display,
        bodyWidth: document.body.offsetWidth,
      };
    });
    results[cfg.name] = diag;
    console.log(cfg.name, JSON.stringify(diag, null, 2));
    await ctx.close();
  }
  const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const out = path.join('outbox', `layout-diag-${ts}.json`);
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('written:', out);
  await browser.close();
})();
