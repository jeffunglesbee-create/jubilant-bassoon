// m5_ticker_probe.js — audit score ticker desktop right-edge fade (M5)
// Checks: computed styles, overflow, mask-image, pseudo-elements,
// scroll metrics, and whether ticker chips are clipped at right edge.
// Writes: outbox/m5-ticker-audit-<ts>.json

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';
const WAIT_MS = 5000;

const VIEWPORTS = [
  { name: 'desktop-1440',  viewport: { width: 1440, height: 900 } },
  { name: 'desktop-1280',  viewport: { width: 1280, height: 800 } },
  { name: 'desktop-1920',  viewport: { width: 1920, height: 1080 } },
];

(async () => {
  const browser = await chromium.launch();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: vp.viewport,
      isMobile: false,
      hasTouch: false,
    });
    const page = await context.newPage();
    await page.goto(FIELD_URL, { waitUntil: 'networkidle', timeout: 25000 }).catch(e => {
      console.error(`  nav error ${vp.name}: ${e.message}`);
    });
    await page.waitForTimeout(WAIT_MS);

    const audit = await page.evaluate(() => {
      const wrap = document.getElementById('score-ticker-wrap');
      const ticker = document.querySelector('.score-ticker');

      if (!wrap) return { error: 'score-ticker-wrap not found' };

      const wrapCS  = getComputedStyle(wrap);
      const tickerCS = ticker ? getComputedStyle(ticker) : null;

      // Scroll metrics on the ticker element itself
      const scrollMetrics = ticker ? {
        scrollWidth:  ticker.scrollWidth,
        clientWidth:  ticker.clientWidth,
        scrollLeft:   ticker.scrollLeft,
        overflows:    ticker.scrollWidth > ticker.clientWidth,
      } : null;

      // Check if any chips are partially or fully outside the visible rect
      const chips = Array.from(document.querySelectorAll('.ticker-chip'));
      const tickerRect = ticker ? ticker.getBoundingClientRect() : null;
      const chipOverflow = chips.map(c => {
        const r = c.getBoundingClientRect();
        return {
          text: c.textContent.trim().slice(0, 30),
          rightEdge: Math.round(r.right),
          tickerRight: tickerRect ? Math.round(tickerRect.right) : null,
          clipped: tickerRect ? r.right > tickerRect.right + 2 : null,
        };
      }).filter(c => c.clipped); // only report clipped chips

      // Pseudo-element check — getComputedStyle with ::after
      let wrapAfter = null;
      try {
        const after = getComputedStyle(wrap, '::after');
        wrapAfter = {
          content:    after.content,
          position:   after.position,
          background: after.background,
          backgroundImage: after.backgroundImage,
          width:      after.width,
          display:    after.display,
        };
      } catch(e) { wrapAfter = { error: e.message }; }

      let tickerAfter = null;
      if (ticker) {
        try {
          const after = getComputedStyle(ticker, '::after');
          tickerAfter = {
            content:    after.content,
            position:   after.position,
            background: after.background,
            backgroundImage: after.backgroundImage,
            width:      after.width,
            display:    after.display,
          };
        } catch(e) { tickerAfter = { error: e.message }; }
      }

      return {
        wrapVisible: wrapCS.display !== 'none' && wrapCS.visibility !== 'hidden',
        wrapDisplay: wrapCS.display,
        wrapStyles: {
          maxWidth:      wrapCS.maxWidth,
          margin:        wrapCS.margin,
          overflow:      wrapCS.overflow,
          maskImage:     wrapCS.maskImage,
          webkitMask:    wrapCS.webkitMask,
          position:      wrapCS.position,
        },
        tickerStyles: tickerCS ? {
          display:       tickerCS.display,
          overflow:      tickerCS.overflow,
          overflowX:     tickerCS.overflowX,
          maskImage:     tickerCS.maskImage,
          webkitMask:    tickerCS.webkitMask,
          maxWidth:      tickerCS.maxWidth,
          scrollSnapType: tickerCS.scrollSnapType,
        } : null,
        scrollMetrics,
        chipCount: chips.length,
        clippedChips: chipOverflow,
        wrapAfterPseudo:   wrapAfter,
        tickerAfterPseudo: tickerAfter,
        // Does a right-edge fade gradient exist anywhere?
        hasFadeGradient: (
          (wrapCS.maskImage && wrapCS.maskImage !== 'none') ||
          (wrapAfter?.backgroundImage && wrapAfter.backgroundImage.includes('gradient')) ||
          (tickerCS?.maskImage && tickerCS.maskImage !== 'none') ||
          (tickerAfter?.backgroundImage && tickerAfter.backgroundImage.includes('gradient'))
        ),
      };
    });

    results.push({ viewport: vp.name, width: vp.viewport.width, audit });
    console.log(`  ${vp.name}: hasFade=${audit.hasFadeGradient} overflows=${audit.scrollMetrics?.overflows} chips=${audit.chipCount} clipped=${audit.clippedChips?.length}`);
    await context.close();
  }

  await browser.close();

  const outPath = path.join('outbox', `m5-ticker-audit-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nwritten: ${outPath}`);
})();
