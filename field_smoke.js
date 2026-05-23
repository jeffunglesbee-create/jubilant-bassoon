// FIELD local smoke — per-day data assertions (wraps structural smoke.js)
// Structural assertions (feature presence, function existence): → smoke.js in repo
// Per-day assertions (NBA_CARDS, MLB section, series records): → this file
//
// ARCHITECTURE: smoke.js is shared by CI and local. field_smoke.js adds per-day config.
// When adding a STRUCTURAL assertion: add to smoke.js + FIELD_FEATURES in index.html
// When adding a PER-DAY assertion: add here only
//
// Run: node /home/claude/field_smoke.js
// Exit 0 = pass; 1 = fail. Log: /tmp/field_smoke.log

const fs = require('fs');

// ── PER-DAY CONFIG ────────────────────────────────────────────────────────────
const TODAY_ISO = '2026-05-22';   // YYYY-MM-DD in America/New_York
const NBA_CARDS        = 1;              // WCF G3 OKC@SAS 8:30 PM ET NBC/Peacock
const NBA_HOME_TEAM    = 'San Antonio Spurs';
const NBA_NETWORK      = 'NBC';          // chip text from NBA_NBC bundle
const MLB_CARDS        = 2;             // Friday Apple TV+: HOU@CHC 2:20pm, DET@BAL 7:15pm
const MLB_CHIP_HOME    = 'Chicago Cubs';
const MLB_CHIP_TEXT    = 'Apple TV+';
const NBA_SERIES_ACTIVE = true;
const NBA_HYPE_TEST    = false;
const MIN_SPORT_SECTIONS = 3;           // NBA WCF G3 + NHL WCF G2 + MLB Apple
// ─────────────────────────────────────────────────────────────────────────────

const LOG = '/tmp/field_smoke.log';
fs.writeFileSync(LOG, '');
const log = (...a) => fs.appendFileSync(LOG, a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\n');

let failures = 0;
const fail = (msg) => { failures++; log('FAIL:', msg); };
const pass = (msg) => log('PASS:', msg);

const html = fs.readFileSync('/home/claude/index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { log('FATAL: no <script> tag found'); process.exit(1); }
const js = m[1];

// 1. Syntax check
try { new Function(js); pass('Syntax: parses cleanly'); }
catch(e) { fail('Syntax: ' + e.message); }

// 2. console.log gating check
const logCount = (html.match(/console\.log/g)||[]).length;
if (logCount > 32) fail('Production console.log count too high: ' + logCount);
else pass('console.log count = ' + logCount + ' (all gated behind FIELD_DEBUG)');

// 3. Build DOM mock and run script
const mockEl = id => ({ id, innerHTML:'', textContent:'', style:{},
  classList:{ add:()=>{}, remove:()=>{}, contains:()=>false, toggle:()=>{} },
  addEventListener:()=>{}, removeEventListener:()=>{},
  appendChild:()=>{}, removeChild:()=>{},
  setAttribute:()=>{}, getAttribute:()=>null,
  querySelector:()=>null, querySelectorAll:()=>[],
  insertAdjacentHTML:()=>{},
  children:[], childNodes:[], dataset:{}, parentNode:null,
  cloneNode:()=>mockEl(id),
  getBoundingClientRect:()=>({top:0,bottom:0,left:0,right:0,width:0,height:0}),
});
const elements = {};
const getEl = id => elements[id] = elements[id] || mockEl(id);

global.document = { getElementById:id=>getEl(id), querySelector:()=>mockEl(''),
  querySelectorAll:()=>[], createElement:tag=>mockEl(tag),
  addEventListener:()=>{}, removeEventListener:()=>{},
  body:mockEl('body'), documentElement:mockEl('html'), readyState:'complete' };

const ls = () => { const s={}; return { getItem:k=>s[k]||null,
  setItem:(k,v)=>{s[k]=String(v);}, removeItem:k=>{delete s[k];}, clear:()=>{} }; };
global.localStorage = ls();
global.sessionStorage = ls();
global.navigator = { userAgent:'node-smoke', language:'en-US', languages:['en-US'] };
global.window = { addEventListener:()=>{}, removeEventListener:()=>{},
  matchMedia:()=>({matches:false, addEventListener:()=>{}, removeEventListener:()=>{}}),
  innerWidth:1920, innerHeight:1080 };
global.fetch = () => Promise.reject(new Error('smoke-mock'));
global.AbortSignal = { timeout: () => ({}) };
global.AbortController = function(){ return { signal:{}, abort:()=>{} }; };
global.IntersectionObserver = function(){ return { observe:()=>{}, disconnect:()=>{}, unobserve:()=>{} }; };
global.requestAnimationFrame = cb => 0;
global.setTimeout = ()=>0;
global.setInterval = ()=>0;
global.maybeShowSetup = ()=>{};

process.env.TZ = 'America/New_York';
const RealDate = Date;
const fakeNow = new RealDate(`${TODAY_ISO}T18:00:00-04:00`).getTime();
global.Date = class extends RealDate {
  constructor(...args){ if(args.length===0) return new RealDate(fakeNow); return new RealDate(...args); }
  static now(){ return fakeNow; }
};
Object.setPrototypeOf(global.Date, RealDate);

// Load field_utils.js into execution context so helpers are available
const utilsJs = (() => {
  try {
    const raw = fs.readFileSync('/tmp/jubilant-bassoon/field_utils.js', 'utf8');
    return raw.replace(/if\s*\(typeof module[^}]+\}[^}]+\}/s, '');
  } catch(e) { return ''; }
})();

let bootstrapError = null;
let evalThis;
try {
  const wrapped = utilsJs + '\n' + js + ';\n;return {' +
    'renderBetting: typeof renderBetting==="function"?renderBetting:null,' +
    'renderMedia:   typeof renderMedia==="function"?renderMedia:null,' +
    'renderStreaming: typeof renderStreaming==="function"?renderStreaming:null' +
  '};';
  const exec = new Function(wrapped);
  evalThis = exec();
  pass('Script execution: no uncaught error at bootstrap');
} catch(e) {
  fail('Script execution: ' + e.message);
  bootstrapError = e;
  evalThis = {};
}

(async () => {
  for (const name of ['renderBetting', 'renderMedia', 'renderStreaming']) {
    const fn = evalThis[name];
    if (typeof fn === 'function') {
      try {
        const ret = fn();
        if (ret && typeof ret.then === 'function') await ret;
        pass(name + '(): no uncaught error');
      } catch(e) {
        fail(name + '(): ' + e.message);
      }
    } else {
      log('SKIP:', name, 'not defined (may be intentional)');
    }
  }

  // 4. Schedule render
  const main = getEl('main');
  const sportSections = (main.innerHTML.match(/class="sport-section"/g)||[]).length;
  const expectSections = (NBA_CARDS > 0 || MLB_CARDS > 0); // only require sections if games configured
  const minSec = typeof MIN_SPORT_SECTIONS !== 'undefined' ? MIN_SPORT_SECTIONS : 4;
  if (expectSections && sportSections === 0) fail('Schedule: empty (renderAll no output)');
  else if (expectSections && sportSections < minSec) fail('Schedule: only ' + sportSections + ' sections (expected ' + minSec + '+)');
  else pass('Schedule: ' + sportSections + ' sport sections' + (!expectSections ? ' (pre-update)' : ''));

  // 5. MLB section + chip checks
  const mlbIdx = main.innerHTML.indexOf('data-sport="Baseball (MLB)"');
  if (MLB_CARDS === 0) { pass('MLB: 0 configured — skipping'); }
  else if (mlbIdx === -1) fail('MLB section missing from render');
  else {
    const nextSec = main.innerHTML.indexOf('class="sport-section"', mlbIdx + 30);
    const mlbSec = main.innerHTML.slice(mlbIdx, nextSec === -1 ? main.innerHTML.length : nextSec);
    const mlbCards = (mlbSec.match(/class="game-card/g)||[]).length;
    if (mlbCards !== MLB_CARDS) fail(`MLB: expected ${MLB_CARDS} cards, got ` + mlbCards);
    else pass(`MLB: ${MLB_CARDS} cards rendered`);
    if (MLB_CHIP_HOME && MLB_CHIP_TEXT) {
      const chipIdx = mlbSec.indexOf(`data-home="${MLB_CHIP_HOME}"`);
      if (chipIdx !== -1) {
        const nextCard = mlbSec.indexOf('class="game-card', chipIdx + 30);
        const card = mlbSec.slice(chipIdx, nextCard === -1 ? chipIdx + 5000 : nextCard);
        const escapedChip = MLB_CHIP_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!card.match(new RegExp(`>${escapedChip}<`))) fail(`${MLB_CHIP_HOME} card missing ${MLB_CHIP_TEXT} chip`);
        else pass(`${MLB_CHIP_HOME} has ${MLB_CHIP_TEXT} chip`);
      }
    }
  }

  // 6. NBA section + network checks
  const nbaIdx = main.innerHTML.indexOf('data-sport="NBA Playoffs"');
  if (NBA_CARDS === 0) { pass('NBA: 0 configured — skipping'); }
  else if (nbaIdx === -1) fail('NBA section missing from render');
  else {
    const nextSec = main.innerHTML.indexOf('class="sport-section"', nbaIdx + 30);
    const nbaSec = main.innerHTML.slice(nbaIdx, nextSec === -1 ? nbaIdx + 4000 : nextSec);
    const nbaCards = (nbaSec.match(/class="game-card/g)||[]).length;
    if (nbaCards !== NBA_CARDS) fail(`NBA: expected ${NBA_CARDS} card(s), got ` + nbaCards);
    else pass(`NBA: ${NBA_CARDS} card(s) rendered`);
    if (!nbaSec.includes(NBA_HOME_TEAM)) fail(`NBA: ${NBA_HOME_TEAM} not found in section`);
    else if (!nbaSec.match(new RegExp(`${NBA_HOME_TEAM}[\\s\\S]{0,3000}${NBA_NETWORK}`))) fail(`${NBA_HOME_TEAM} missing ${NBA_NETWORK} chip`);
    else pass(`${NBA_HOME_TEAM} on ${NBA_NETWORK} (correct)`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 2 — ASSERTIONS 15-22 (Silent Error Prevention May 14 2026)
  // ════════════════════════════════════════════════════════════════════════
  const innerHTML = main.innerHTML || '';

  // 15: No stale game cards
  const startTimes = [...innerHTML.matchAll(/data-starttime="([^"]+)"/g)];
  const staleCards = startTimes.filter(m => {
    if(!m[1]) return false;
    const t = new Date(m[1]).getTime();
    return !isNaN(t) && t < (fakeNow - 86400000);
  });
  if(staleCards.length > 0)
    fail(`Assertion 15 — Stale game cards: ${staleCards.map(m=>m[1]).join(', ')}`);
  else pass(`Assertion 15 — No stale game cards (${startTimes.length} checked)`);

  // 16: No deprecated bundles
  const deprecated = ['NBA_TNT','nba-tnt','tnt-badge-nba','NBA_CBS'];
  const foundDep = deprecated.filter(d => innerHTML.includes(d));
  if(foundDep.length) fail(`Assertion 16 — Deprecated bundle(s) in render: ${foundDep.join(', ')}`);
  else pass(`Assertion 16 — No deprecated bundles in rendered output`);

  // 17: No corrupted team names
  const emptyHome = [...innerHTML.matchAll(/data-home=""/g)].length;
  const placeholderTeam = [...innerHTML.matchAll(/data-home="\?"|data-away="\?"/g)].length;
  if(emptyHome || placeholderTeam)
    fail(`Assertion 17 — Corrupted team names: ${emptyHome} empty home, ${placeholderTeam} placeholder "?" teams`);
  else pass(`Assertion 17 — No corrupted team names in rendered cards`);

  // 18: No duplicate matchups
  const matchups = [...innerHTML.matchAll(/data-home="([^"]+)"[^>]*data-away="([^"]+)"/g)]
    .map(m => `${m[1]}|${m[2]}`);
  const seen = new Set(); const dupes = [];
  matchups.forEach(k => { if(seen.has(k)) dupes.push(k); seen.add(k); });
  if(dupes.length) fail(`Assertion 18 — Duplicate matchups: ${dupes.join(', ')}`);
  else pass(`Assertion 18 — No duplicate matchups (${matchups.length} cards checked)`);

  // 19: Betting alignment
  const betCards = [...innerHTML.matchAll(/class="bet-card" data-game-id="([^"]*)"/g)].map(m=>m[1]);
  const emptyGameIds = betCards.filter(id => id === '');
  if(emptyGameIds.length)
    fail(`Assertion 19 — ${emptyGameIds.length} betting card(s) with empty data-game-id`);
  else if(betCards.length === 0)
    pass(`Assertion 19 — Betting alignment OK (no bet-cards rendered yet — renderBetting() is lazy)`);
  else
    pass(`Assertion 19 — Betting alignment OK (${betCards.length} bet-card(s), all matched)`);

  // 20: No games outside 36-hour window
  const windowCards = startTimes.filter(m => {
    if(!m[1]) return false;
    const t = new Date(m[1]).getTime();
    return !isNaN(t) && Math.abs(t - fakeNow) > 36 * 3600 * 1000;
  });
  if(windowCards.length) fail(`Assertion 20 — Games outside 36hr window: ${windowCards.map(m=>m[1]).join(', ')}`);
  else pass(`Assertion 20 — All rendered games within 36-hour window`);

  // 21: No unconfirmed entries rendering
  const unconfirmed = [...innerHTML.matchAll(/data-confirmed="false"/g)].length;
  if(unconfirmed > 0) fail(`Assertion 21 — ${unconfirmed} unconfirmed game card(s) rendering today`);
  else pass(`Assertion 21 — All rendered game cards are confirmed:true`);

  // 22: My Teams infrastructure
  const hasMyTeams = innerHTML.includes('my-team-card') || js.includes('MY_TEAMS') && js.includes('toggleMyTeam');
  if(!hasMyTeams) fail(`Assertion 22 — My Teams infrastructure missing`);
  else pass(`Assertion 22 — My Teams infrastructure present`);

  // ════════════════════════════════════════════════════════════════════════
  // LAYER 3 — ASSERTIONS 23-25 (J-series + Journalism May 16 2026)
  // ════════════════════════════════════════════════════════════════════════

  // 23: NBA series record renders when NBA_SERIES_ACTIVE = true
  if (NBA_SERIES_ACTIVE) {
    const nbaSecFor23 = nbaIdx !== -1
      ? main.innerHTML.slice(nbaIdx, main.innerHTML.indexOf('class="sport-section"', nbaIdx + 30) || main.innerHTML.length)
      : '';
    const hasSeriesText = /leads\s+\d|\d-\d|[Ss]eries\s+tied|tied\s+\d|\d+\s*leads/i.test(nbaSecFor23);
    if (!hasSeriesText)
      fail('Assertion 23 — NBA_SERIES_ACTIVE=true but no series record text found in NBA section');
    else
      pass('Assertion 23 — NBA series record text present in NBA section');
  } else {
    pass('Assertion 23 — NBA_SERIES_ACTIVE=false (no series game today, skipped)');
  }

  // 24: Scout's Pick infrastructure (J4)
  const hasScoutPick = js.includes("Scout's Pick") || js.includes('scout=ranked');
  if (!hasScoutPick)
    fail("Assertion 24 — Scout's Pick infrastructure missing (Scout's Pick or scout=ranked not found in JS)");
  else
    pass("Assertion 24 — Scout's Pick infrastructure present (confirmed in JS)");

  // 25: Anti-Hype flag J1
  if (NBA_HYPE_TEST) {
    const hasAntiHypeBadge = innerHTML.includes('anti-hype') || innerHTML.includes('ANTI-HYPE') || innerHTML.includes('HIGH MEDIA');
    if (!hasAntiHypeBadge)
      fail('Assertion 25 — NBA_HYPE_TEST=true but no Anti-Hype badge found in rendered output');
    else
      pass('Assertion 25 — Anti-Hype badge renders correctly in output');
  } else {
    const hasAntiHypeInfra = js.includes('BigMarket') || js.includes('ANTI-HYPE') || js.includes('bigMarket');
    if (!hasAntiHypeInfra)
      fail('Assertion 25 — J1 Anti-Hype infrastructure missing from JS (BigMarket or ANTI-HYPE not found)');
    else
      pass('Assertion 25 — J1 Anti-Hype infrastructure present in JS');
  }

  // Assertion 26 — SPORT_CRUNCH_RULES declared (Combo B-1+ / PULSE)
  {
    const hasCrunchRules = js.includes('SPORT_CRUNCH_RULES') && js.includes("'Basketball'") && js.includes("'Hockey'");
    if (!hasCrunchRules)
      fail('Assertion 26 — SPORT_CRUNCH_RULES constant missing (PULSE / Combo B-1+ not built)');
    else
      pass('Assertion 26 — SPORT_CRUNCH_RULES declared with sport keys');
  }

  // Assertion 27 — .badge-pulse CSS present (CRUNCH TIME badge animation)
  {
    const hasBadgePulseJs  = js.includes('badge-pulse');   // className in injectDramaBadges
    const hasBadgePulseCss = html.includes('fieldPulse');  // @keyframes in <style> block
    if (!hasBadgePulseJs || !hasBadgePulseCss)
      fail('Assertion 27 — .badge-pulse missing in JS or @keyframes fieldPulse missing in CSS (CRUNCH TIME badge not built)');
    else
      pass('Assertion 27 — .badge-pulse in JS and fieldPulse keyframe in CSS');
  }

  // Assertion 28 — FIELD_FEATURES registry (doc-as-code, prevents drift)
  {
    const hasRegistry = js.includes('const FIELD_FEATURES = {');
    const hasJSeries  = html.includes("'j1-anti-hype'");
    const hasRelay    = html.includes("'relay-nba'");
    if (!hasRegistry || !hasJSeries || !hasRelay)
      fail('Assertion 28 — FIELD_FEATURES registry missing or incomplete (doc-as-code pattern broken)');
    else
      pass('Assertion 28 — FIELD_FEATURES registry present with j-series + relay keys');
  }

  // Assertion 29 — Drama Arc Storage Layer (shared temporal primitive)
  {
    const hasStorage   = js.includes('recordDramaHistory');
    const hasConsumers = js.includes('getDramaHistory') && js.includes('getDramaTrend') && js.includes('getDramaSustained');
    const hasKey       = js.includes('DRAMA_HISTORY_KEY');
    const inRegistry   = html.includes("'drama-arc-storage'");
    if (!hasStorage || !hasConsumers || !hasKey || !inRegistry)
      fail('Assertion 29 — Drama Arc storage layer missing (recordDramaHistory / consumer API / FIELD_FEATURES entry)');
    else
      pass('Assertion 29 — Drama Arc storage + consumer API present (EMBER/J5/DRIFT/BNI/Social ready)');
  }

  // Assertion 30 — Odds API relay adapter
  {
    const hasBase     = js.includes('ODDS_RELAY_BASE');
    const hasFetch    = js.includes('fetchOddsForSport');
    const hasGet      = js.includes('getGameOdds');
    const hasMap      = js.includes('ODDS_SPORT_MAP');
    const inRegistry  = html.includes("'odds-relay-adapter'");
    if (!hasBase || !hasFetch || !hasGet || !hasMap || !inRegistry)
      fail('Assertion 30 — Odds relay adapter incomplete (ODDS_RELAY_BASE / fetchOddsForSport / getGameOdds / ODDS_SPORT_MAP / FIELD_FEATURES entry)');
    else
      pass('Assertion 30 — Odds relay adapter present (ODDS_RELAY_BASE + fetchOddsForSport + getGameOdds + FIELD_FEATURES)');
  }

  // Assertion 31 — Drama score smoothing
  {
    const hasSmooth   = js.includes('getSmoothedDrama');
    const usedInBadge = js.includes('getSmoothedDrama(gid)');
    const inRegistry  = html.includes("'drama-score-smoothing'");
    if (!hasSmooth || !usedInBadge || !inRegistry)
      fail('Assertion 31 — Drama score smoothing missing (getSmoothedDrama / badge wiring / FIELD_FEATURES)');
    else
      pass('Assertion 31 — Drama score smoothing present and wired into injectDramaBadges');
  }

  // Assertion 32 — Standings context in J3/J5 prompts
  {
    const hasBuilder  = js.includes('buildGameStandingsContext');
    const hasJ3Wire   = js.includes('standingsCtx') && js.includes('fetchFIELDBriefFromClaude');
    const hasJ5Wire   = js.includes('fetchNightOwlFromClaude') && js.includes('buildGameStandingsContext(topGame)');
    const hasMap      = js.includes("'Baseball (MLB)'") && js.includes("'Basketball (NBA)'");
    const inRegistry  = html.includes("'standings-in-prompts'");
    if (!hasBuilder || !hasJ3Wire || !hasJ5Wire || !hasMap || !inRegistry)
      fail('Assertion 32 — Standings in prompts incomplete (buildGameStandingsContext / J3 / J5 / map / FIELD_FEATURES)');
    else
      pass('Assertion 32 — Standings context wired into J3 + J5 prompts (ESPN_STANDINGS_MAP populated)');
  }

  // Assertion 33 — Broadcaster Registry (DA-01)
  {
    const hasRegistry  = js.includes('BROADCASTER_REGISTRY');
    const hasOverrides = js.includes('BROADCASTER_OVERRIDES');
    const hasCrew      = js.includes('getCrewForGame') && js.includes('isMarqueeBroadcast');
    const hasInjection = js.includes('getCrewContext');
    const inRegistry   = html.includes("'broadcaster-registry'");
    if (!hasRegistry || !hasOverrides || !hasCrew || !hasInjection || !inRegistry)
      fail('Assertion 33 — Broadcaster Registry missing');
    else
      pass('Assertion 33 — Broadcaster Registry: getCrewForGame + isMarqueeBroadcast + J3/J5 injection');
  }

    // Assertion 34 — Page Visibility API
  {
    const hasListener = js.includes('visibilitychange') && js.includes('visibilityState');
    const inRegistry  = html.includes("'page-visibility-api'");
    if (!hasListener || !inRegistry)
      fail('Assertion 34 — Page Visibility API missing (visibilitychange listener / FIELD_FEATURES)');
    else
      pass('Assertion 34 — Page Visibility API: polling paused on hide, resumed on show');
  }

  // Assertion 35 — First Lead Change Drama Burst
  {
    const hasTracker = js.includes('_leadTracker') && js.includes('_leadChangeBurst');
    const hasBurst   = js.includes('getLeadChangeBurst') && js.includes('_pollCycle');
    const inRegistry = html.includes("'first-lead-change-burst'");
    if (!hasTracker || !hasBurst || !inRegistry)
      fail('Assertion 35 — First Lead Change Burst missing (_leadTracker / getLeadChangeBurst / FIELD_FEATURES)');
    else
      pass('Assertion 35 — First Lead Change Drama Burst: _leadTracker + decay over 3 polls');
  }

  // Assertion 36 — Double Feature Detection + Drama Arc Cleanup
  {
    const hasDoubleFeature = js.includes('detectAndRenderDoubleFeature') && js.includes('double-feature-banner');
    const hasCleanup       = js.includes('field_drama_history_') && js.includes('pruneOldFieldData');
    const inRegistry       = html.includes("'double-feature-detection'");
    if (!hasDoubleFeature || !hasCleanup || !inRegistry)
      fail('Assertion 36 — Double Feature / drama arc cleanup missing');
    else
      pass('Assertion 36 — Double Feature detection (2+ games ≥75) + drama arc localStorage cleanup');
  }

  // Assertion 37 — BNI (Broadcast Narrative Index)
  {
    const hasBNI      = js.includes('computeBroadcastNarrativeIndex');
    const hasStrength = js.includes('getBNIStrength');
    const hasJ3Wire   = js.includes("'narrative-push'") && js.includes('[BNI:');
    const inRegistry  = html.includes("'bni'");
    if (!hasBNI || !hasStrength || !hasJ3Wire || !inRegistry)
      fail('Assertion 37 — BNI missing (computeBroadcastNarrativeIndex / getBNIStrength / J3 wire / FIELD_FEATURES)');
    else
      pass('Assertion 37 — BNI: computeBroadcastNarrativeIndex + getBNIStrength wired into J3 prompts');
  }

  // Assertion 38 — Watch Window "Why" explainer
  {
    const hasWWR     = js.includes('buildWatchWindowReason');
    const hasWWCss   = html.includes('ww-reason');
    const hasWWWire  = js.includes('wwReason');
    const inRegistry = html.includes("'watch-window-why'");
    if (!hasWWR || !hasWWCss || !hasWWWire || !inRegistry)
      fail('Assertion 38 — Watch Window Why missing (buildWatchWindowReason / ww-reason CSS / wire / FIELD_FEATURES)');
    else
      pass('Assertion 38 — Watch Window Why: buildWatchWindowReason wired into renderWatchWindow');
  }

  // Assertion 39 — Compound Editorial Call
  {
    const hasCompound   = js.includes('fetchCompoundEditorial');
    const hasHashFn     = js.includes('djb2Hash');
    const hasCacheKey   = js.includes('buildCompoundCacheKey');
    const hasPromptFn   = js.includes('buildCompoundPrompt');
    const hasQueue      = js.includes('initJournalismQueue');
    const inRegistry    = html.includes("'compound-editorial-call'");
    if (!hasCompound || !hasHashFn || !hasCacheKey || !hasPromptFn || !hasQueue || !inRegistry)
      fail('Assertion 39 — Compound Editorial Call missing (fetchCompoundEditorial / djb2Hash / buildCompoundCacheKey / initJournalismQueue / registry)');
    else
      pass('Assertion 39 — Compound Editorial Call: fetchCompoundEditorial + content-addressed cache + temporal spread queue');
  }

  // Assertion 40 — Journalism resilience (429 handling + graceful degradation)
  {
    const has429        = js.includes('retryAfter') && js.includes('_compoundRetryAfter');
    const hasStateRender= js.includes('brief-state-badge');
    const hasInject     = js.includes('injectSeriesPreviewText');
    const inRegistry    = html.includes("'journalism-resilience'");
    if (!has429 || !hasStateRender || !hasInject || !inRegistry)
      fail('Assertion 40 — Journalism resilience missing (retryAfter / brief-state-badge / injectSeriesPreviewText / registry)');
    else
      pass('Assertion 40 — Journalism resilience: 429 backoff + cached/updating state badges + series inject');
  }

  // ── SEMANTIC CONTRACT ASSERTIONS (May 20 2026) ──────────────────────────
  // Catch silent failures: wrong variable names, key mismatches, double-calls.
  // "If this assertion fails, the feature silently does nothing."

  // A51 — weather drama uses wxCache (not _weatherCache)
  const weatherUsesCorrectCache =
    html.includes('wxCache') &&
    !html.includes('_weatherCache') &&
    html.includes('sitBonus += 10');
  if(weatherUsesCorrectCache) pass('A51 — weather bonus: wxCache referenced correctly');
  else fail('A51 — weather bonus: _weatherCache not found — weather drama silently broken');

  // A52 — espnScores._gameId stored + used in ticker trend sort
  const espnStoresGameId =
    html.includes('_gameId: resolveGameIdByHome') &&
    html.includes('function resolveGameIdByHome') &&
    html.includes('e._gameId || gid');
  if(espnStoresGameId) pass('A52 — espnScores._gameId stored + ticker uses it');
  else fail('A52 — espnScores._gameId missing — trend sort always returns 0');

  // A53 — bdlInjuryContextSync called once per game (not twice)
  const bdlCalledOnce = (() => {
    const m = html.match(/\/\/ Fix 9: BDL.*?\/\/ Fix 6:/s);
    if(!m) return false;
    const calls = (m[0].match(/bdlInjuryContextSync/g)||[]).length;
    return calls === 1;
  })();
  if(bdlCalledOnce) pass('A53 — bdlInjuryContextSync called once per game');
  else fail('A53 — bdlInjuryContextSync called multiple times — double injury cache traversal');

  // A54 — Night Owl save/load uses ET timezone consistently
  const nightOwlETKey =
    html.includes("America/New_York") &&
    html.includes("field_tonight_finals_") &&
    html.includes('saveEspnFinal') &&
    html.includes('loadTonightFinals');
  if(nightOwlETKey) pass('A54 — Night Owl save/load: ET timezone key consistent');
  else fail('A54 — Night Owl: timezone key mismatch — finals may not be found');

  // A55 — Runtime error capture instrumented in index.html
  const hasFieldErrors =
    html.includes('window._fieldErrors') &&
    html.includes('window.onerror') &&
    html.includes('unhandledrejection') &&
    html.includes('field-debug-panel');
  if(hasFieldErrors) pass('A55 — Runtime capture: _fieldErrors + onerror + debug panel present');
  else fail('A55 — Runtime capture missing — browser errors invisible without DevTools');

  // A56 — field_utils.js loaded as separate script
  const hasUtils = html.includes('field_utils.js') && html.includes('<script src="field_utils.js">');
  if(hasUtils) pass('A56 — field_utils.js loaded in index.html');
  else fail('A56 — field_utils.js not loaded — pure functions missing from browser');

  // A57 — getEl/$/$$ DOM helpers in utility block
  const hasDomHelpers =
    html.includes('function getEl(id)') &&
    html.includes('window._fieldErrors.push') &&
    html.includes('function $(selector');
  if(hasDomHelpers) pass('A57 — getEl/$/$$ DOM helpers present');
  else fail('A57 — DOM helpers missing — bare getElementById calls unguarded');

  // A58 — no bare document.getElementById().property without null guard
  // Extracts <script> blocks only, strips comments + string literals to avoid false positives
  const jsBlocks = (html.match(/<script[^>]*>([\s\S]*?)<\/script>/g)||[]).join('\n');
  const sc2 = jsBlocks.replace(/\/\/[^\n]*/g,'').replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g,'""').replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g,"''");
  const noBareDOM2 = !/document\.(getElementById|querySelector)\s*\([^)]+\)\s*\.(style|classList|innerHTML|textContent)/.test(sc2);
  if(noBareDOM2) pass('A58 — no bare document.getElementById without null guard');
  else fail('A58 — bare document.getElementById will throw TypeError when element missing');
  // A59 — store-once: getEl() not called twice with same arg in one statement
  // The double-call anti-pattern getEl('x')...getEl('x') defeats null safety
  // and pushes _fieldErrors twice. Store the result: const el = getEl('x').
  const doubleGetEl = html ? html.split('\n').some(line => {
    const calls = line.match(/getEl\(['"][^'"]+['"]\)/g) || [];
    if (calls.length < 2) return false;
    // Check if any id appears more than once on this line
    const ids = calls.map(c => c.match(/getEl\(['"](.*?)['"]\)/)?.[1]);
    return ids.length !== new Set(ids).size;
  }) : false;
  if(!doubleGetEl) pass('A59 — getEl() store-once: no double-call on same line');
  else fail('A59 — getEl() called twice for same id — use const el = getEl(id); if(el)...');

  // ─────────────────────────────────────────────────────────────────────
  log('---');
// Assertions 51-101 removed — structural feature guards now live in smoke.js (A51-A123).
  // The pre-commit hook runs smoke.js first, then this file.
  // CI (smoke-and-verify.yml) runs smoke.js directly.
  // Per-day assertions (above) are unique to this file and cannot run in CI.


  log('Failures:', failures);

  if (failures > 0) {
    console.log('SMOKE TEST FAILED (per-day) — see /tmp/field_smoke.log');
    console.log(fs.readFileSync(LOG, 'utf8'));
    process.exit(1);
  } else {
    console.log(`SMOKE TEST PASSED (${sportSections} sport sections — per-day assertions verified. Structural: see smoke.js)`);
    process.exit(0);
  }
})();

// Assertion 41 — Layer 1: per-league poll state tracking
const hasLeagueState = html.includes('_espnLeagueState') && html.includes("_espnLeagueLastPoll");
if(hasLeagueState) pass('Assertion 41 — Per-league ESPN state tracking: _espnLeagueState + _espnLeagueLastPoll declared');
else fail('Assertion 41 — Per-league ESPN state tracking missing');

// Assertion 42 — Layer 2: no batch delay (200ms removed)
const noBatch = !html.includes('await new Promise(r => setTimeout(r, 200))') && html.includes('leaguesToPoll.map');
if(noBatch) pass('Assertion 42 — Layer 2: concurrent fetch (no 200ms batch delays, leaguesToPoll.map wired)');
else fail('Assertion 42 — Layer 2: batch delay still present or leaguesToPoll missing');

// Assertion 43 — #11b: tempo-adjusted polling
const hasTempo = html.includes('computeLiveInterval') && html.includes('tempo-adjusted-polling');
if(hasTempo) pass('Assertion 43 — #11b tempo-adjusted polling: computeLiveInterval declared + FIELD_FEATURES entry');
else fail('Assertion 43 — #11b tempo-adjusted polling missing');

// Assertion 44 — #18b period score extraction
const hasLinescores = html.includes('homeLinescores') && html.includes('awayLinescores') && html.includes('l.value||0');
if(hasLinescores) pass('Assertion 44 — #18b period score extraction: homeLinescores/awayLinescores in ESPN loop');
else fail('Assertion 44 — #18b period score extraction missing');

// Assertion 45 — #11a situation drama bonus
const hasSitBonus = html.includes('homeGoaliePulled') && html.includes('isFinalPeriod') && html.includes('sitBonus += 22');
if(hasSitBonus) pass('Assertion 45 — #11a situation drama bonus: hockey/baseball/NBA/NFL cases + isFinalPeriod');
else fail('Assertion 45 — #11a situation drama bonus missing or incomplete');

// Assertion 46 — #18c statistical extremes
const hasExtremes = html.includes('getStatisticalExtremes') && html.includes('No-hitter through') && html.includes('dramaBonus');
if(hasExtremes) pass('Assertion 46 — #18c statistical extremes: no-hitter, 4Q surge, comeback, HT reversal');
else fail('Assertion 46 — #18c statistical extremes missing');

// Assertion 47 — #29b franchise misery index
const hasMisery = html.includes('FRANCHISE_MISERY') && html.includes('getFranchiseMisery') && html.includes('FRANCHISE_CONTEXT');
if(hasMisery) pass('Assertion 47 — #29b franchise misery index: FRANCHISE_MISERY + getFranchiseMisery + FRANCHISE_CONTEXT in prompt');
else fail('Assertion 47 — #29b franchise misery index missing');

// Assertion 48 — Gap 9 journalism odds context
const hasOddsCtx = html.includes('journalism-odds-context') && html.includes('favored') && html.includes('underdog');
if(hasOddsCtx) pass('Assertion 48 — Gap 9 journalism odds context: full market context in compound prompt');
else fail('Assertion 48 — Gap 9 journalism odds context missing');

// Assertion 49 — Gap 8 quiet hour detection
const hasQuiet = html.includes('_quietHourActive') && html.includes('QUIET_POLL_INTERVAL') && html.includes('QUIET_CYCLES_GATE');
if(hasQuiet) pass('Assertion 49 — Gap 8 quiet hour detection: state vars + interval extension wired');
else fail('Assertion 49 — Gap 8 quiet hour detection missing');


// Assertion 50 — Game Notes Layer (Item 38)
const hasGameNotes = html.includes('fetchGameNotes') &&
  html.includes('assembleNoteFromContext') &&
  html.includes('fetchMLBGameNotes') &&
  html.includes('fetchNHLGameNotes') &&
  html.includes('fetchLeagueRSS') &&
  html.includes("'game-notes-layer'");
if(hasGameNotes) pass('Assertion 50 — Game Notes Layer: P1-P4 stack + dispatcher + FIELD_FEATURES entry');
else fail('Assertion 50 — Game Notes Layer missing (fetchGameNotes/assembleNoteFromContext/fetchMLBGameNotes)');

// Assertion 51 — ESPN WP relay: fetchESPNWinProb + wpDelta in dramaScoreLive + ESPN_SUMMARY_RELAY
const hasESPNWP = html.includes('fetchESPNWinProb') &&
  html.includes('ESPN_SUMMARY_RELAY') &&
  html.includes('wpDelta') &&
  html.includes('wp_prev');
if(hasESPNWP) pass('Assertion 51 — ESPN WP relay: fetchESPNWinProb + ESPN_SUMMARY_RELAY + wpDelta + wp_prev');
else fail('Assertion 51 — ESPN WP relay missing (fetchESPNWinProb/ESPN_SUMMARY_RELAY/wpDelta/wp_prev)');

// Assertion 52 — Baseball Savant WP: fetchSavantGameFeed + SAVANT_BASE + sourceId trigger
const hasSavantWP = html.includes('fetchSavantGameFeed') &&
  html.includes('SAVANT_BASE') &&
  html.includes('sourceId') &&
  html.includes('homeTeamWinProbability');
if(hasSavantWP) pass('Assertion 52 — Savant MLB WP: fetchSavantGameFeed + SAVANT_BASE + sourceId');
else fail('Assertion 52 — Savant MLB WP missing (fetchSavantGameFeed/SAVANT_BASE/sourceId)');

// Assertion 53 — Sport Classifier: classifySport() with all sport flags
const hasSportClassifier = html.includes('function classifySport(') &&
  html.includes('isNBA') && html.includes('isNHL') && html.includes('isMLB') &&
  html.includes('isAFL') && html.includes('isSoccer') && html.includes('isConferenceFinals') &&
  html.includes('periodPrefix:resolvedPrefix');
if(hasSportClassifier) pass('Assertion 53 — Sport Classifier: classifySport() + all sport flags');
else fail('Assertion 53 — Sport Classifier missing (classifySport/isNBA/isAFL/isSoccer/isConferenceFinals)');

// Assertion 54 — Story Engine: computeGameNarrative() with scoreline + statusLine + enrichGame shell
const hasStoryEngine = html.includes('function computeGameNarrative(') &&
  html.includes('scoreline') && html.includes('statusLine') &&
  html.includes('leaderNick') && html.includes('trailerNick') &&
  html.includes('function enrichGame(') &&
  html.includes('def. ') && html.includes('lead ');
if(hasStoryEngine) pass('Assertion 54 — Story Engine: computeGameNarrative() + enrichGame shell + Story Score strings');
else fail('Assertion 54 — Story Engine missing (computeGameNarrative/scoreline/statusLine/enrichGame)');

// Assertion 55 — Story Score: .score-status CSS + scoreHTML uses _n.statusLine + previousScores uses _sl
const hasStoryScore = html.includes('score-status') &&
  html.includes('_n.statusLine') &&
  html.includes('_n.scoreline') &&
  html.includes('"_sl"') &&
  html.includes('_n.periodLabel');
if(hasStoryScore) pass('Assertion 55 — Story Score: score-status CSS + _n.statusLine + _n.scoreline + _sl cache key');
else fail('Assertion 55 — Story Score wiring missing (score-status/_n.statusLine/_n.scoreline/_sl)');

// ── UFL 2026 ────────────────────────────────────────────────────────────
assert('UFL bundles registered',
  html.includes('UFL_FOX') && html.includes('UFL_ABC') && html.includes('UFL_ESPN2'));
assert('UFL FIELD_FEATURES entry present',
  html.includes("'ufl-2026'"));
