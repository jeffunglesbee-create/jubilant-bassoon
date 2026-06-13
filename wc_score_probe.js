// wc_score_probe.js — WC live-score diagnostic
// Loads FIELD with FIELD_DEBUG=1, captures all [WC-SCORE] console output,
// waits for V2 polls to run, screenshots the WC cards, writes console log
// + screenshot to outbox/. Claude reads the committed output.
//
// Trigger: workflow_dispatch OR push to outbox/.trigger-wc-score-probe

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const OUTBOX = path.join(__dirname, 'outbox');
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Capture ALL console output, filter for WC-SCORE + V2-WC lines
  const consoleLines = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLines.push(`[${msg.type()}] ${text}`);
  });
  page.on('pageerror', err => {
    consoleLines.push(`[PAGEERROR] ${err.message}`);
  });

  // Set FIELD_DEBUG before the page scripts run
  await page.addInitScript(() => {
    try { localStorage.setItem('FIELD_DEBUG', '1'); } catch (e) {}
  });

  console.log(`Loading ${FIELD_URL} with FIELD_DEBUG=1...`);
  await page.goto(FIELD_URL, { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for initial V2 poll + WC injection (poll runs on load, then every 30-60s)
  console.log('Waiting 90s for V2 polls + WC section injection + score render...');
  await page.waitForTimeout(90000);

  // Capture WC card state from the DOM
  const wcCardState = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.game-card'));
    return cards
      .filter(c => /world cup|fifa|wc26/i.test(c.dataset.sport || ''))
      .map(c => ({
        gameid: c.dataset.gameid,
        home: c.dataset.home,
        away: c.dataset.away,
        starttime: c.dataset.starttime,
        hasScoreWrap: !!c.querySelector('.score-wrap'),
        scoreText: c.querySelector('.score-wrap')?.textContent?.trim() || '(none)',
        isLive: c.classList.contains('espn-live'),
        isFinal: c.classList.contains('espn-final'),
        stageText: c.querySelector('.card-stage-content')?.textContent?.trim() || '(none)',
      }));
  });

  // Also grab the espnScores state for WC games (module-scoped — may be inaccessible)
  const espnScoresState = await page.evaluate(() => {
    try {
      // espnScores lives inside FIELD's module scope; try window first
      const es = (typeof window !== 'undefined' && window.espnScores) ? window.espnScores : null;
      if (!es) return '(espnScores not exposed on window — module-scoped)';
      const out = {};
      for (const [k, v] of Object.entries(es)) {
        if (/world cup|fifa|wc26/i.test(v._sport || v.league || '')) {
          out[k] = { state: v.state, homeScore: v.homeScore, awayScore: v.awayScore, _gameId: v._gameId, clock: v.clock };
        }
      }
      return out;
    } catch (e) {
      return `(error accessing espnScores: ${e.message})`;
    }
  });

  // Screenshot the WC section
  const shotPath = path.join(OUTBOX, `wc-score-probe-${ts}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });

  // Write the diagnostic report
  const wcScoreLines = consoleLines.filter(l => /WC-SCORE|V2-WC/.test(l));
  const report = [
    `WC LIVE SCORE PROBE — ${new Date().toISOString()}`,
    `URL: ${FIELD_URL}`,
    ``,
    `═══ WC-SCORE CONSOLE OUTPUT (${wcScoreLines.length} lines) ═══`,
    ...wcScoreLines,
    ``,
    `═══ WC CARD DOM STATE ═══`,
    JSON.stringify(wcCardState, null, 2),
    ``,
    `═══ espnScores WC ENTRIES ═══`,
    JSON.stringify(espnScoresState, null, 2),
    ``,
    `═══ ALL CONSOLE (last 40 lines) ═══`,
    ...consoleLines.slice(-40),
  ].join('\n');

  const reportPath = path.join(OUTBOX, `wc-score-probe-${ts}.txt`);
  fs.writeFileSync(reportPath, report);

  console.log(`\nReport: ${reportPath}`);
  console.log(`Screenshot: ${shotPath}`);
  console.log(`\nWC-SCORE lines captured: ${wcScoreLines.length}`);
  console.log(`WC cards found: ${wcCardState.length}`);

  await browser.close();
})();
