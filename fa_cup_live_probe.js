// fa_cup_live_probe.js — the deployed page, asked about the FA Cup, against ESPN's REAL scoreboard.
// CC-CMD-2026-08-08-fa-cup-coverage (field-relay-nba), Task 4, the client half. Dispatch-only (workflow fa-cup-live-probe.yml), CI-as-proxy
// (Rule 90): the sandbox cannot load ESPN or the deployed page in a browser. The render harness (outbox/fa-cup-render-harness-2026-11-07.mjs)
// answered with a STUB; this answers with what ESPN serves today.
//
// What it reads, as booleans and counts in a manifest, not prose:
//  - how many cards carry data-sport="FA Cup", in how many sections, and how many of them show ESPN+ (ESPN lists ESPN+ on 2 of 33 on 2026-11-07
//    and 4 of 4 on 2026-11-08: the probe prints its own count next to ESPN's, read in the same run, so the page is compared with the source);
//  - for every LIVE or FINAL soccer card on the page, the FA Cup's and every other soccer league's: the time cell (.game-time) and the stage line
//    (.card-stage-content). They must agree on the score; an FA Cup card whose time cell is empty is the defect the independent review found.
// Coverage is printed in the manifest (Rule 91): which dates, which viewport, how many cards were read.
const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const FIELD_URL = BASE + '?wpt';                       // ?wpt skips the first-visit modal (scripts/check-probe-wpt.mjs)
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.fa/scoreboard';

// ESPN's own listing for a date, read here in the same run. dates= is YYYYMMDD (ET calendar day of the page).
async function espnFor(page, yyyymmdd) {
  return page.evaluate(async ({ url, d }) => {
    const r = await fetch(`${url}?dates=${d}&limit=100`);
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    const events = Array.isArray(j.events) ? j.events : [];
    const lists = ev => {
      const bc = ev.competitions && ev.competitions[0] ? ev.competitions[0].broadcasts : null;
      if (!Array.isArray(bc)) return false;
      return bc.some(b => b && Array.isArray(b.names) && b.names.some(n => String(n).toLowerCase() === 'espn+'));
    };
    return {
      ok: true, status: r.status, events: events.length, listingEspnPlus: events.filter(lists).length,
      states: events.reduce((m, ev) => { const s = ev.status && ev.status.type ? ev.status.type.state : 'none'; m[s] = (m[s] === undefined ? 0 : m[s]) + 1; return m; }, {}),
    };
  }, { url: ESPN, d: yyyymmdd });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  let sawCards = true;
  try { await page.waitForSelector('.game-card[data-sport="FA Cup"]', { timeout: 45000 }); } catch (e) { sawCards = false; }
  await page.waitForTimeout(12000);                     // the live poller's first pass, and one render of the score cells

  const etDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const espn = await espnFor(page, etDay.replace(/-/g, ''));

  const read = await page.evaluate(() => {
    const txt = (c, sel) => { const el = c.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim() : null; };
    const soccerSections = ['FA Cup', 'EFL Cup', 'EFL Trophy', 'Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'MLS'];
    const card = c => ({
      sport: c.getAttribute('data-sport'), home: c.getAttribute('data-home'), away: c.getAttribute('data-away'), id: c.getAttribute('data-gameid'),
      live: c.classList.contains('live'), timeCell: txt(c, '.game-time'), stageLine: txt(c, '.card-stage-content'),
      espnPlus: /ESPN\+/.test(c.innerText),
    });
    const fa = [...document.querySelectorAll('.game-card[data-sport="FA Cup"]')].map(card);
    const others = [...document.querySelectorAll('.game-card')].filter(c => c.classList.contains('live') && soccerSections.includes(c.getAttribute('data-sport')) && c.getAttribute('data-sport') !== 'FA Cup').map(card);
    return {
      swVersion: window.SW_VERSION === undefined ? null : window.SW_VERSION,
      faSections: document.querySelectorAll('.sport-section[data-sport="FA Cup"]').length,
      faCards: fa.length, faEspnPlus: fa.filter(c => c.espnPlus).length, faLive: fa.filter(c => c.live).length,
      faLiveCards: fa.filter(c => c.live).slice(0, 12), faFirstCards: fa.slice(0, 3),
      otherSoccerLive: others.length, otherSoccerLiveCards: others.slice(0, 8),
    };
  });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const shot = `outbox/fa-cup-live-probe-${ts}.png`;
  try {
    const sec = await page.$('.sport-section[data-sport="FA Cup"]');
    if (sec) await sec.screenshot({ path: shot, timeout: 10000 }); else await page.screenshot({ path: shot });
  } catch (e) { console.log('screenshot failed: ' + e.message.split('\n')[0]); }

  const manifest = {
    at: new Date().toISOString(), url: FIELD_URL, etDay, viewport: '1440x900', sawFaCupCards: sawCards, espnSameRun: espn, page: read,
    coverage: `one viewport, one load, the ET day ${etDay}; ESPN read from the runner's browser in the same run; first ${read.faLiveCards.length} live FA Cup cards and first ${read.otherSoccerLiveCards.length} other live soccer cards listed`,
    verdict: {
      cardsMatchEspn: espn.ok === true && read.faCards === espn.events,
      espnPlusMatchesEspn: espn.ok === true && read.faEspnPlus === espn.listingEspnPlus,
      everyLiveFaCardHasATimeCell: read.faLiveCards.every(c => c.timeCell !== null && c.timeCell !== ''),
    },
    consoleErrors: errors.slice(0, 5),
  };
  fs.writeFileSync(`outbox/fa-cup-live-probe-manifest-${ts}.json`, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ etDay, espn, faSections: read.faSections, faCards: read.faCards, faEspnPlus: read.faEspnPlus, faLive: read.faLive, verdict: manifest.verdict }));
  await browser.close();
})();
