// live_score_probe.js — the deployed page's score cells for one league against the scores ESPN and the relay actually served it, on a runner (CI-as-proxy, Rule 90). Default: college football;
// set LEAGUE (cfb | eflchamp | mls | nfl | ...) to read another league the relay serves. The first version of this file was cfb_live_probe.js.
// Task 7 of field-relay-nba docs/CC-CMD-2026-08-08-fa-cup-coverage.md: findScore's fuzzy team match can show a card another game's score; this reads whether the LIVE page does.
// Transport (see fa_cup_live_probe.js): a headless browser on a runner is answered empty by ESPN, so the page's ESPN scoreboard requests are answered here with Node's fetch, body
// unchanged. The relay's /v2/games requests are fetched here too and passed through unchanged, so every score the page was handed for a game is on record.
// Verdict per live CFB card: the card's time-cell score (away-home) must be a score that ESPN or the relay served FOR THAT GAME at some point in the run. A card showing a
// score nobody served for its own game is showing another game's. A '⚠' (the page's own source-mismatch flag) is recorded beside it.
const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const FIELD_URL = BASE + '?wpt';                       // ?wpt skips the first-visit modal (scripts/check-probe-wpt.mjs)
// LEAGUE -> [card sections the page uses, the relay's V2 sport key, whether ESPN's scoreboard is also read for it (the live poller still polls college football from ESPN)]
const LEAGUES = {
  cfb:      { sections: ['College Football', 'CFB', 'NCAA Football'], relay: 'cfb',      espn: 'football/college-football' },
  eflchamp: { sections: ['EFL Championship'],                           relay: 'eflchamp', espn: null },
  mls:      { sections: ['MLS Soccer', 'MLS'],                          relay: 'mls',      espn: null },
  nfl:      { sections: ['NFL'],                                        relay: 'nfl',      espn: 'football/nfl' },
};
const LEAGUE = process.env.LEAGUE === undefined ? 'cfb' : process.env.LEAGUE;
if (LEAGUES[LEAGUE] === undefined) { console.error(`unknown LEAGUE ${LEAGUE}`); process.exit(2); }
const SECTIONS = LEAGUES[LEAGUE].sections;
const SCORE_RX = /(\d+)\s*[–-]\s*(\d+)/;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  const served = {};                                    // 'home|away' -> ['away-home', ...] seen from ESPN or the relay during the run
  const stats = { espn: 0, relay: 0, failures: 0 };
  const note = (home, away, hs, as) => {
    const h = parseInt(hs, 10), a = parseInt(as, 10);
    if (!home || !away || Number.isNaN(h) || Number.isNaN(a)) return;
    const key = `${home}|${away}`, st = `${a}-${h}`;
    if (served[key] === undefined) served[key] = [];
    if (!served[key].includes(st)) served[key].push(st);
  };
  const proxy = (tag, readBody) => async route => {
    stats[tag] += 1;
    let status = 502, body = '{"error":"probe could not read the source"}';
    try {
      const r = await fetch(route.request().url());
      status = r.status; body = await r.text();
      if (r.ok) readBody(body);
    } catch (e) { stats.failures += 1; body = JSON.stringify({ error: 'probe fetch threw: ' + e.message.slice(0, 80) }); }
    await route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body });
  };
  if (LEAGUES[LEAGUE].espn !== null) await ctx.route(new RegExp('^https://site\\.api\\.espn\\.com/apis/site/v2/sports/' + LEAGUES[LEAGUE].espn + '/scoreboard'), proxy('espn', body => {
    let j; try { j = JSON.parse(body); } catch (e) { return; }
    for (const ev of (Array.isArray(j.events) ? j.events : [])) {
      const cs = ev.competitions && ev.competitions[0] ? ev.competitions[0].competitors : null;
      if (!Array.isArray(cs)) continue;
      const h = cs.find(x => x.homeAway === 'home'), a = cs.find(x => x.homeAway === 'away');
      if (h && a && h.team && a.team) note(h.team.displayName, a.team.displayName, h.score, a.score);
    }
  }));
  await ctx.route(new RegExp('^https://field-relay-nba\\.jeffunglesbee\\.workers\\.dev/v2/games\\?sport=' + LEAGUES[LEAGUE].relay + '(&|$)'), proxy('relay', body => {
    let j; try { j = JSON.parse(body); } catch (e) { return; }
    for (const g of (Array.isArray(j.games) ? j.games : [])) if (g.home && g.away) note(g.home.name, g.away.name, g.home.score, g.away.score);
  }));
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  let sawCards = true;
  try { await page.waitForSelector(SECTIONS.map(s => `.game-card[data-sport="${s}"]`).join(','), { timeout: 45000 }); } catch (e) { sawCards = false; }
  // wait until a live CFB card shows a score, or 75 s; then one more render
  let settledAfterSeconds = null;
  for (let t = 3; t <= 75; t += 3) {
    await page.waitForTimeout(3000);
    const ok = await page.evaluate(({ sections, rx }) => {
      const re = new RegExp(rx);
      return [...document.querySelectorAll('.game-card.live')].some(c => sections.includes(c.getAttribute('data-sport')) && !!c.querySelector('.game-time') && re.test(c.querySelector('.game-time').textContent));
    }, { sections: SECTIONS, rx: SCORE_RX.source });
    if (ok) { settledAfterSeconds = t; break; }
  }
  await page.waitForTimeout(8000);

  const cards = await page.evaluate(({ sections }) => [...document.querySelectorAll('.game-card')].filter(c => sections.includes(c.getAttribute('data-sport'))).map(c => ({
    sport: c.getAttribute('data-sport'), home: c.getAttribute('data-home'), away: c.getAttribute('data-away'), live: c.classList.contains('live'),
    cell: (c.querySelector('.game-time') ? c.querySelector('.game-time').textContent : '').replace(/\s+/g, ' ').trim(),
  })), { sections: SECTIONS });

  const rows = cards.filter(c => c.live || SCORE_RX.test(c.cell)).map(c => {
    const m = SCORE_RX.exec(c.cell);
    const card = m ? `${parseInt(m[1], 10)}-${parseInt(m[2], 10)}` : null;
    const s = served[`${c.home}|${c.away}`];
    return { home: c.home, away: c.away, sport: c.sport, cell: c.cell, card, served: s === undefined ? null : s, flagged: c.cell.includes('⚠'), servedForThisGame: card !== null && s !== undefined && s.includes(card) };
  });
  const wrong = rows.filter(r => r.card !== null && !r.servedForThisGame);
  const manifest = {
    league: LEAGUE, at: new Date().toISOString(), url: FIELD_URL, sawCards, settledAfterSeconds, proxied: stats,
    cards: cards.length, liveCards: rows.length, liveWithScore: rows.filter(r => r.card !== null).length,
    liveWithServedScoreForOwnGame: rows.filter(r => r.servedForThisGame).length,
    cardList: cards.map(c => ({ sport: c.sport, home: c.home, away: c.away, live: c.live, cell: c.cell })),
    wrongCards: wrong.length, wrongSilent: wrong.filter(r => !r.flagged).length, wrongFlagged: wrong.filter(r => r.flagged).length, wrong,
    unservedNoScore: rows.filter(r => r.card === null).length,
    coverage: `one viewport, one load; judged ${rows.length} of ${cards.length} ${SECTIONS.join('/')} cards (those live or showing a score; a card still showing a kickoff time is not judged); scores served by ${LEAGUES[LEAGUE].espn === null ? 'no ESPN scoreboard (this league has no ESPN slot) and' : `ESPN's ${LEAGUES[LEAGUE].espn} scoreboard and`} the relay's /v2/games?sport=${LEAGUES[LEAGUE].relay} during the run; the page's other score sources (api-sports through other relay routes, SSE) are not recorded`,
    consoleErrors: errors.slice(0, 5),
  };
  const ts = manifest.at.replace(/[:.]/g, '-').slice(0, 19);
  fs.writeFileSync(`outbox/live-score-probe-manifest-${LEAGUE}-${ts}.json`, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ league: LEAGUE, at: manifest.at, cards: manifest.cards, live: manifest.liveCards, withScore: manifest.liveWithScore, ownGameServed: manifest.liveWithServedScoreForOwnGame, wrong: manifest.wrongCards, silent: manifest.wrongSilent, flagged: manifest.wrongFlagged, proxied: stats, settledAfterSeconds, wrongDetail: wrong.slice(0, 8) }));
  await browser.close();
})();
