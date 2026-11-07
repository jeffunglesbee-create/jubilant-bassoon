// fa_cup_live_probe.js — the deployed page, asked about the FA Cup, against ESPN's REAL scoreboard.
// CC-CMD-2026-08-08-fa-cup-coverage (field-relay-nba), Task 4, the client half. Dispatch-only (workflow fa-cup-live-probe.yml), CI-as-proxy
// (Rule 90): the sandbox cannot load ESPN or the deployed page in a browser. The render harness (outbox/fa-cup-render-harness-2026-11-07.mjs)
// answered with a STUB; this answers with what ESPN serves today.
//
// TRANSPORT, stated because it changes what "the page against real ESPN" means. A headless Chromium on a runner is refused or answered empty by
// ESPN (the first run of this probe: the page's own request AND an in-page fetch both came back with 0 events for a day the relay's runner probe
// read 33 for, minutes apart). So every request the page makes to site.api.espn.com is answered by THIS script, which reads ESPN with Node's fetch
// (the same transport the relay's probe uses) and hands the page the body unchanged. The page's code is the deployed bundle; the data is ESPN's,
// live at that moment; the browser's own network path to ESPN is the one thing not exercised. The manifest counts the requests and their statuses.
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

// ESPN's own listing for a date, read here in the same run with Node's fetch. dates= is YYYYMMDD (the ET calendar day of the page).
async function espnFor(yyyymmdd) {
  const r = await fetch(`${ESPN}?dates=${yyyymmdd}&limit=100`);
  if (!r.ok) return { ok: false, status: r.status };
  const j = await r.json();
  const events = Array.isArray(j.events) ? j.events : [];
  const lists = ev => {
    const bc = ev.competitions && ev.competitions[0] ? ev.competitions[0].broadcasts : null;
    if (!Array.isArray(bc)) return false;
    return bc.some(b => b && Array.isArray(b.names) && b.names.some(n => String(n).toLowerCase() === 'espn+'));
  };
  const states = {};
  for (const ev of events) { const st = ev.status && ev.status.type ? ev.status.type.state : 'none'; states[st] = (states[st] === undefined ? 0 : states[st]) + 1; }
  const plusGames = events.filter(lists).map(ev => {
    const cs = ev.competitions[0].competitors;
    const side = ha => { const c = cs.find(x => x.homeAway === ha); return c && c.team ? c.team.displayName : null; };
    return { id: ev.id, home: side('home'), away: side('away'), state: ev.status && ev.status.type ? ev.status.type.state : null };
  });
  const games = events.map(ev => {
    const cs = ev.competitions[0].competitors;
    const c = ha => cs.find(x => x.homeAway === ha);
    return { home: c('home').team.displayName, away: c('away').team.displayName, homeScore: parseInt(c('home').score, 10), awayScore: parseInt(c('away').score, 10), state: ev.status.type.state };
  });
  return { ok: true, status: r.status, events: events.length, listingEspnPlus: plusGames.length, plusGames, games, states };
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

  const proxied = { requests: 0, byStatus: {} };
  await ctx.route(/^https:\/\/site\.api\.espn\.com\//, async route => {
    proxied.requests += 1;
    let status = 502, body = '{"error":"probe could not read ESPN"}';
    try {
      const r = await fetch(route.request().url());
      status = r.status; body = await r.text();
    } catch (e) { body = JSON.stringify({ error: 'probe fetch threw: ' + e.message.slice(0, 80) }); }
    proxied.byStatus[status] = (proxied.byStatus[status] === undefined ? 0 : proxied.byStatus[status]) + 1;
    await route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body });
  });
  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  let sawCards = true;
  try { await page.waitForSelector('.game-card[data-sport="FA Cup"]', { timeout: 45000 }); } catch (e) { sawCards = false; }
  // The live poller writes scores some seconds after boot, and the score cells follow its next render. Read when at least one live soccer card shows
  // a score in its time cell, or at the cap, and record which (settledAfterSeconds, settledBy). A fixed short wait read the cells BEFORE any
  // league's scores had arrived: the first run's empty time cells were on the Bundesliga, Premier League, La Liga and Serie A cards too.
  const SCORE_RX = /\d+\s*[–-]\s*\d+/;
  const anyScore = () => page.evaluate(rx => {
    const re = new RegExp(rx);
    return [...document.querySelectorAll('.game-card.live')].some(c => { const g = c.querySelector('.game-time'); return !!g && re.test(g.textContent); });
  }, SCORE_RX.source);
  let settledAfterSeconds = null, settledBy = 'cap';
  for (let t = 3; t <= 75; t += 3) {
    await page.waitForTimeout(3000);
    if (await anyScore()) { settledAfterSeconds = t; settledBy = 'a live card showed a score'; break; }
  }
  await page.waitForTimeout(6000);                      // one more render so the rest of the leagues catch up

  const etDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const espn = await espnFor(etDay.replace(/-/g, ''));

  const read = await page.evaluate(({ plusGames, games, rx }) => {
    const re = new RegExp(rx);
    // textContent, not innerText: innerText is '' for an element that is not rendered (a collapsed section, a hidden tier), which read as "no score"
    // and "no stream" on EVERY card, the Bundesliga's included, in the probe's first three runs. textContent does not depend on layout.
    const txt = (c, sel) => { const el = c.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
    const hasPlusChip = c => !!c.querySelector('a.stream-chip[data-srkey="espnplus"]');
    const soccerSections = ['FA Cup', 'EFL Cup', 'EFL Trophy', 'Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'MLS'];
    const card = c => ({
      sport: c.getAttribute('data-sport'), home: c.getAttribute('data-home'), away: c.getAttribute('data-away'), id: c.getAttribute('data-gameid'),
      live: c.classList.contains('live'), timeCell: txt(c, '.game-time'), stageLine: txt(c, '.card-stage-content'),
      espnPlus: hasPlusChip(c), rendered: c.offsetParent !== null,
      streamRow: txt(c, '.stream-row'),
    });
    const fa = [...document.querySelectorAll('.game-card[data-sport="FA Cup"]')].map(card);
    const faAll = [...document.querySelectorAll('.game-card[data-sport="FA Cup"]')];
    const plus = plusGames.map(g => {
      const c = faAll.find(x => x.getAttribute('data-home') === g.home && x.getAttribute('data-away') === g.away);
      return { home: g.home, away: g.away, cardFound: !!c, cardShowsEspnPlus: !!c && hasPlusChip(c), cardRendered: !!c && c.offsetParent !== null, streamRow: c ? txt(c, '.stream-row') : null };
    });
    const others = [...document.querySelectorAll('.game-card')].filter(c => c.classList.contains('live') && soccerSections.includes(c.getAttribute('data-sport')) && c.getAttribute('data-sport') !== 'FA Cup').map(card);
    const withScore = list => list.filter(c => c.timeCell !== null && re.test(c.timeCell)).length;
    // The time cell reads away-home (buildCardTimeDisplay: `${away}-${home}`). Compare it with ESPN's score for the same pair, read seconds apart:
    // a goal between the two reads is the only honest reason for a difference, and the list below names every difference so it can be judged.
    const cmp = fa.filter(c => c.live).map(c => {
      const g = games.find(x => x.home === c.home && x.away === c.away);
      const m = c.timeCell === null ? null : re.exec(c.timeCell);
      const nums = m ? m[0].split(/[–-]/).map(x => parseInt(x.trim(), 10)) : null;
      return { home: c.home, away: c.away, card: nums ? `${nums[0]}-${nums[1]}` : null, espn: g ? `${g.awayScore}-${g.homeScore}` : null, agree: !!nums && !!g && nums[0] === g.awayScore && nums[1] === g.homeScore };
    });
    const faLiveList = fa.filter(c => c.live);
    return {
      espnPlusGames: plus,
      faLiveWithScore: withScore(faLiveList), otherSoccerLiveWithScore: withScore(others),
      faLiveScoreAgreeWithEspn: cmp.filter(x => x.agree).length, faLiveScoreDisagree: cmp.filter(x => !x.agree).slice(0, 10),
      swVersion: window.SW_VERSION === undefined ? null : window.SW_VERSION,
      faSections: document.querySelectorAll('.sport-section[data-sport="FA Cup"]').length,
      faCards: fa.length, faEspnPlus: fa.filter(c => c.espnPlus).length, faLive: fa.filter(c => c.live).length,
      faLiveCards: fa.filter(c => c.live).slice(0, 12), faFirstCards: fa.slice(0, 3),
      otherSoccerLive: others.length, otherSoccerLiveCards: others.slice(0, 8),
    };
  }, { plusGames: espn.ok === true ? espn.plusGames : [], games: espn.ok === true ? espn.games : [], rx: SCORE_RX.source });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const shot = `outbox/fa-cup-live-probe-${ts}.png`;
  try {
    const sec = await page.$('.sport-section[data-sport="FA Cup"]');
    if (sec) await sec.screenshot({ path: shot, timeout: 10000 }); else await page.screenshot({ path: shot });
  } catch (e) { console.log('screenshot failed: ' + e.message.split('\n')[0]); }

  const manifest = {
    at: new Date().toISOString(), url: FIELD_URL, etDay, viewport: '1440x900', sawFaCupCards: sawCards, espnSameRun: espn, espnProxiedToThePage: proxied, page: read,
    coverage: `one viewport, one load, the ET day ${etDay}; ESPN read with Node's fetch in the same run and handed to the page unchanged (espnProxiedToThePage); first ${read.faLiveCards.length} live FA Cup cards and first ${read.otherSoccerLiveCards.length} other live soccer cards listed`,
    settle: { settledAfterSeconds, settledBy },
    verdict: {
      cardsMatchEspn: espn.ok === true && read.faCards === espn.events,
      espnPlusMatchesEspn: espn.ok === true && read.faEspnPlus === espn.listingEspnPlus && read.espnPlusGames.length > 0 && read.espnPlusGames.every(g => g.cardFound && g.cardShowsEspnPlus),
      everyLiveFaCardShowsAScore: read.faLive > 0 && read.faLiveWithScore === read.faLive,
      everyLiveFaScoreAgreesWithEspn: read.faLive > 0 && read.faLiveScoreAgreeWithEspn === read.faLive,
      faScoresAsPopulatedAsOtherLeagues: read.otherSoccerLive > 0 && read.faLive > 0 && read.faLiveWithScore / read.faLive >= read.otherSoccerLiveWithScore / read.otherSoccerLive,
    },
    consoleErrors: errors.slice(0, 5),
  };
  fs.writeFileSync(`outbox/fa-cup-live-probe-manifest-${ts}.json`, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ etDay, espn, faSections: read.faSections, faCards: read.faCards, faEspnPlus: read.faEspnPlus, faLive: read.faLive, faLiveWithScore: read.faLiveWithScore, otherLive: read.otherSoccerLive, otherLiveWithScore: read.otherSoccerLiveWithScore, scoreAgree: read.faLiveScoreAgreeWithEspn, scoreDisagree: read.faLiveScoreDisagree, plusGames: read.espnPlusGames, settle: manifest.settle, verdict: manifest.verdict }));
  await browser.close();
})();
