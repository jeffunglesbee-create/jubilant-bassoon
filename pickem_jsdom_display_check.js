// pickem_jsdom_display_check.js — CC-CMD-2026-07-05-pickem-coverage-check TASK 2
//
// Post-pick-display check: exercises makePick()/buildPickWidgetHTML() (ported
// verbatim from index.html) against a minimal jsdom DOM, one .pick-widget per
// sport, using real team-name/gameId data pulled from the same real endpoints
// TASK 1 (pickem_circadian_coverage_check.js) uses. DOM-manipulation-dependent
// (querySelector/outerHTML) so a pure-data check can't cover it -- but a full
// visual Playwright browser isn't needed either; jsdom is enough to construct
// the widget, fire a real click-equivalent call, and inspect the resulting
// HTML directly, far faster than a browser probe repeated per sport.
//
// initUserDO()/_userDoRelay() are stubbed as no-ops -- this test is
// specifically about the DOM-manipulation half (the CFL-style bug class),
// not the relay round trip, which the prior CC-CMD already verified live for
// both MLB and CFL. No real network calls are made by makePick() here.

const { JSDOM } = require('jsdom');

const V2_RELAY_BASE = 'https://field-relay-nba.jeffunglesbee.workers.dev';
const SQUIGGLE_RELAY = V2_RELAY_BASE + '/squiggle';

async function fetchJSON(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

// One real game per sport: { sport, id, home, away } or null if none available today.
async function fetchRealGamePerSport() {
  const date = new Date().toISOString().slice(0, 10);
  const out = {};

  const v2Sports = [
    ['mlb', 'MLB'], ['wnba', 'WNBA'], ['nba', 'NBA'], ['nhl', 'NHL'],
    ['mls', 'MLS'], ['wc26', 'WC (Soccer)'], ['epl', 'EPL'], ['nfl', 'NFL'], ['cfb', 'CFB'],
  ];
  await Promise.all(v2Sports.map(async ([key, label]) => {
    const data = await fetchJSON(`${V2_RELAY_BASE}/v2/games?sport=${key}&date=${date}`);
    const g = (data?.games || [])[0];
    out[label] = g ? { id: String(g.id), home: g.home?.name || '', away: g.away?.name || '' } : null;
  }));

  // AFL via Squiggle relay
  try {
    const aflR1 = new Date('2026-03-12T00:00:00Z');
    const weeks = Math.floor((Date.now() - aflR1.getTime()) / (7 * 86400000));
    const round = Math.min(Math.max(1, weeks + 1), 24);
    const [r1, r2] = await Promise.all([
      fetchJSON(`${SQUIGGLE_RELAY}?q=games;year=2026;round=${round}`),
      fetchJSON(`${SQUIGGLE_RELAY}?q=games;year=2026;round=${round + 1}`),
    ]);
    const games = [...(r1?.games || []), ...(r2?.games || [])].filter(g => g.hteam && g.ateam);
    const g = games[0];
    out['AFL'] = g ? { id: 'afl_' + g.id, home: g.hteam, away: g.ateam } : null;
  } catch (e) { out['AFL'] = null; }

  // CFL
  try {
    const data = await fetchJSON(`${V2_RELAY_BASE}/cfl/scoreboard/rounds`);
    const rounds = Array.isArray(data) ? data : [];
    let found = null;
    for (const round of rounds) {
      for (const t of (round.tournaments || [])) {
        if (t.homeSquad?.name && t.awaySquad?.name) { found = t; break; }
      }
      if (found) break;
    }
    out['CFL'] = found ? { id: 'cfl_' + found.id, home: found.homeSquad.name, away: found.awaySquad.name } : null;
  } catch (e) { out['CFL'] = null; }

  return out;
}

(async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test/' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.localStorage = window.localStorage;
  global.CSS = window.CSS || { escape: s => String(s).replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c) };

  // ---- Stubs: this test is about DOM manipulation, not the relay round trip ----
  global.initUserDO = function () {};
  global._userDoRelay = function () { return Promise.resolve(null); };

  // ---- Ported verbatim from index.html ----
  const PICKS_KEY = 'field_picks_v1';
  function _getPickCache() {
    try { return JSON.parse(localStorage.getItem(PICKS_KEY) || '{}'); } catch (_) { return {}; }
  }
  function _savePickCache(cache) {
    try { localStorage.setItem(PICKS_KEY, JSON.stringify(cache)); } catch (_) {}
  }
  function buildPickWidgetHTML(g, sport) {
    const gid = g._id || '';
    if (!gid) return '';
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const cache = _getPickCache();
    const pick = cache[gid];
    if (!pick) {
      return `<div class="pick-widget" data-gameid="${esc(gid)}" data-home="${esc(g.home)}" data-away="${esc(g.away)}">
      <span class="pick-label">🎯 Pick:</span>
      <button class="pick-btn" onclick="event.stopPropagation();makePick('${esc(gid)}','${esc(g.away)}','${esc(sport)}')">${esc(g.away)}</button>
      <button class="pick-btn" onclick="event.stopPropagation();makePick('${esc(gid)}','${esc(g.home)}','${esc(sport)}')">${esc(g.home)}</button>
    </div>`;
    }
    if (!pick.resolved) {
      return `<div class="pick-widget pick-made" data-gameid="${esc(gid)}" data-home="${esc(g.home)}" data-away="${esc(g.away)}">
      <span class="pick-label">🎯 Your pick:</span> <span class="pick-choice">${esc(pick.predictedWinner)}</span>
    </div>`;
    }
    const resultCls = pick.wasCorrect ? 'pick-correct' : 'pick-incorrect';
    const resultIcon = pick.wasCorrect ? '✓' : '✗';
    const probLine = (pick.resolvedProbability != null && pick.probabilityLabel)
      ? `<span class="pick-prob">${esc(pick.probabilityLabel)}: ${esc(pick.resolvedProbability)}%</span>` : '';
    return `<div class="pick-widget pick-resolved ${resultCls}" data-gameid="${esc(gid)}" data-home="${esc(g.home)}" data-away="${esc(g.away)}">
    <span class="pick-label">🎯 ${esc(pick.predictedWinner)}</span> <span class="pick-result">${resultIcon}</span> ${probLine}
  </div>`;
  }
  function makePick(gameId, predictedWinner, sport) {
    if (!gameId || !predictedWinner) return;
    const cache = _getPickCache();
    if (cache[gameId]) return;
    cache[gameId] = {
      predictedWinner, sport: sport || '',
      madeAt: Date.now(), resolved: false,
      wasCorrect: null, resolvedProbability: null, probabilityLabel: null,
    };
    _savePickCache(cache);
    initUserDO();
    _userDoRelay('/user/event', 'POST', { type: 'pick_made', gameId, sport: sport || '', predictedWinner });
    const widget = document.querySelector(`.pick-widget[data-gameid="${CSS.escape(gameId)}"]`);
    if (widget) widget.outerHTML = buildPickWidgetHTML({ _id: gameId, home: widget.dataset.home, away: widget.dataset.away }, sport);
  }

  const gamesPerSport = await fetchRealGamePerSport();

  let anyFail = false;
  console.log("=== Pick 'em jsdom Post-Pick Display Check ===");
  console.log('Run at:', new Date().toISOString());

  for (const [sport, g] of Object.entries(gamesPerSport)) {
    if (!g) {
      console.log(`[${sport}] no real game available today -- N/A`);
      continue;
    }
    // Fresh pick cache per sport, so each test is independent
    localStorage.clear();

    document.body.innerHTML = buildPickWidgetHTML({ _id: g.id, home: g.home, away: g.away }, sport);
    const widgetBefore = document.querySelector(`.pick-widget[data-gameid="${CSS.escape(g.id)}"]`);
    const hadTwoButtons = widgetBefore ? widgetBefore.querySelectorAll('.pick-btn').length === 2 : false;

    makePick(g.id, g.away, sport);

    const widgetAfter = document.querySelector(`.pick-widget[data-gameid="${CSS.escape(g.id)}"]`);
    const foundAfterPick = !!widgetAfter;
    const hasPickMadeClass = foundAfterPick && widgetAfter.classList.contains('pick-made');
    const html = foundAfterPick ? widgetAfter.outerHTML : '';
    const showsConfirmation = html.includes('Your pick:') && html.includes(g.away);

    const pass = hadTwoButtons && foundAfterPick && hasPickMadeClass && showsConfirmation;
    if (!pass) anyFail = true;
    console.log(`[${sport}] gameId=${g.id} away=${g.away} home=${g.home} -> ${pass ? 'PASS' : 'FAIL'}`);
    if (!pass) {
      console.log('  hadTwoButtons:', hadTwoButtons, 'foundAfterPick:', foundAfterPick,
        'hasPickMadeClass:', hasPickMadeClass, 'showsConfirmation:', showsConfirmation);
      console.log('  outerHTML:', html);
    }
  }

  console.log('');
  console.log(anyFail ? 'RESULT: FAIL -- see above' : 'RESULT: PASS');
  process.exit(anyFail ? 1 : 0);
})();
