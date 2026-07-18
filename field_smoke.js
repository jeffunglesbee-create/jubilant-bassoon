// FIELD local smoke — per-day INVARIANT assertions (wraps structural smoke.js)
// Structural assertions (feature presence, function existence): → smoke.js in repo
// Per-day INVARIANTS (render well-formedness, no stale/dupe/corrupt cards): → this file
// Per-day SNAPSHOT ACCURACY (exact slate counts/teams/networks): → field_smoke_daily.js
//
// ARCHITECTURE: smoke.js + field_smoke.js BLOCK every commit (neither can false-fail —
// structural presence + self-syncing invariants). field_smoke_daily.js runs in the
// daily-update workflow only. See STANDARDS.md → "Smoke Gate Architecture (2026-05-28)".
// When adding a STRUCTURAL assertion: add to smoke.js + FIELD_FEATURES in index.html
// When adding a PER-DAY assertion: add here only
//
// Run: node /home/claude/field_smoke.js
// Exit 0 = pass; 1 = fail. Log: /tmp/field_smoke.log

const fs = require('fs');

// ── PER-DAY INVARIANT CONFIG ────────────────────────────────────────────────
// This file runs INVARIANT checks only: it renders the REAL current day and
// asserts the output is internally well-formed (no stale / duplicate / corrupt
// cards, resolvable networks, well-formed series records). It has NO hardcoded
// answer-key, so it CANNOT go stale and never needs --no-verify.
//
// Snapshot ACCURACY for a specific day (exact card counts, specific teams &
// networks, series-active flag) lives in field_smoke_daily.js, run by the
// daily-update workflow where the real slate is known.
// See STANDARDS.md → "Smoke Gate Architecture (2026-05-28)".
//
// TODAY_ISO is derived from the system clock (America/New_York) — never pinned.
const _nyNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
const TODAY_ISO = _nyNow.getFullYear() + '-' +
  String(_nyNow.getMonth() + 1).padStart(2, '0') + '-' +
  String(_nyNow.getDate()).padStart(2, '0');
// ─────────────────────────────────────────────────────────────────────────────

const LOG = '/tmp/field_smoke.log';
fs.writeFileSync(LOG, '');
const log = (...a) => fs.appendFileSync(LOG, a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\n');

let failures = 0;
const fail = (msg) => { failures++; log('FAIL:', msg); };
const pass = (msg) => log('PASS:', msg);

const INDEX_PATH = process.argv[2] || '/home/claude/index.html';
const BASE_DIR = require('path').dirname(require('path').resolve(INDEX_PATH));
const html = fs.readFileSync(INDEX_PATH, 'utf8');
// Fixed 2026-07-11: was html.match(...) (non-global) -- only ever captured
// the FIRST bare <script> tag. index.html has two: a small ~389-line
// early-boot snippet, and the ~37,500-line main application script where
// virtually all real feature code (FIELD_FEATURES, MY_TEAMS, Scout's Pick,
// etc.) actually lives. Every js.includes(...) check below was silently
// searching only the small, mostly-irrelevant first block -- concatenating
// all bare <script> blocks fixes every affected assertion at once.
const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
if (!scriptMatches.length) { log('FATAL: no <script> tag found'); process.exit(1); }
const js = scriptMatches.map(x => x[1]).join('\n');

// 1. Syntax check — strip import/export (module syntax invalid in Function constructor)
const jsForCheck = js.split('\n').filter(l => !/^(?:import|export)\b/.test(l)).join('\n');
try { new Function(jsForCheck); pass('Syntax: parses cleanly'); }
catch(e) { fail('Syntax: ' + e.message); }

// 2. console.log gating check — MOVED to smoke.js (A234, single source of truth).
//    smoke.js counts UNGATED console.log lines (no line-level FIELD_DEBUG).

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
// window === global (fixed 2026-07-11, matches real browser semantics --
// window IS globalThis). The real app follows the codebase's own
// "window.X = X" convention throughout (e.g. "window.SW_VERSION =
// SW_VERSION; // expose globally"), then reads X back as a bare global
// elsewhere -- only correct if window is the SAME binding as the global
// scope, not a separate mock object. This was invisible before the
// <script>-extraction fix above, since the untested main script is what
// exercises this pattern.
global.window = global;
global.addEventListener = ()=>{};
global.removeEventListener = ()=>{};
global.matchMedia = ()=>({matches:false, addEventListener:()=>{}, removeEventListener:()=>{}});
global.innerWidth = 1920;
global.innerHeight = 1080;
global.location = { href:'https://jubilant-bassoon.jeffunglesbee.workers.dev/', search:'',
  hostname:'jubilant-bassoon.jeffunglesbee.workers.dev', protocol:'https:', pathname:'/', reload:()=>{} };
global.fetch = () => Promise.reject(new Error('smoke-mock'));
global.AbortSignal = { timeout: () => ({}) };
global.AbortController = function(){ return { signal:{}, abort:()=>{} }; };
global.IntersectionObserver = function(){ return { observe:()=>{}, disconnect:()=>{}, unobserve:()=>{} }; };
global.MutationObserver = function(){ return { observe:()=>{}, disconnect:()=>{}, takeRecords:()=>[] }; };
global.requestAnimationFrame = cb => 0;
global.setTimeout = ()=>0;
global.setInterval = ()=>0;
global.maybeShowSetup = ()=>{};
// Stubs for functions extracted to src/identity/index.ts (Phase 4).
// Import lines are stripped before new Function() execution, so bare-name
// call sites in field.js would throw without these no-op stubs.
global.initIdentityModule = ()=>{};
global.findGameById = ()=>undefined;
global._resolveRealGameId = ()=>null;
global.resolveGameIdByHome = ()=>null;

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
    const raw = fs.readFileSync(BASE_DIR + '/field_utils.js', 'utf8');
    return raw.replace(/if\s*\(typeof module[^}]+\}[^}]+\}/s, '');
  } catch(e) { return ''; }
})();

let bootstrapError = null;
let evalThis;
try {
  const wrapped = utilsJs + '\n' + jsForCheck + ';\n;return {' +
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

  // ── PER-DAY INVARIANTS (4–6): render the REAL today, check well-formedness ──
  // No exact counts / specific teams / networks — that is snapshot accuracy and
  // lives in field_smoke_daily.js. These pass on an empty (pre-update) render and
  // fail only on genuinely malformed output → never a false block, never a bypass.
  const main = getEl('main');
  const mainHTML = main.innerHTML || '';
  const sportSections = (mainHTML.match(/class="sport-section"/g)||[]).length;
  pass('Schedule: ' + sportSections + ' sport section(s) for ' + TODAY_ISO +
       (sportSections === 0 ? ' (empty/pre-update — OK)' : ''));

  // Every rendered card must carry a matchup (data-home) — no corrupt/blank cards.
  const cardOpen  = (mainHTML.match(/class="game-card/g)||[]).length;
  const homeAttrs = (mainHTML.match(/data-home="[^"]+"/g)||[]).length;
  if (cardOpen > 0 && homeAttrs === 0)
    fail('Per-day invariant: ' + cardOpen + ' card(s) rendered but none carry data-home (malformed)');
  else
    pass('Per-day invariant: card matchups well-formed (' + cardOpen + ' card(s))');

  // MLB / NBA sections, IF present today, must contain ≥1 card (no empty shells).
  for (const [label, marker] of [['MLB','data-sport="Baseball (MLB)"'], ['NBA','data-sport="NBA Playoffs"']]) {
    const idx = mainHTML.indexOf(marker);
    if (idx === -1) { pass(label + ': no section today (OK)'); continue; }
    const next = mainHTML.indexOf('class="sport-section"', idx + 30);
    const sec  = mainHTML.slice(idx, next === -1 ? mainHTML.length : next);
    const cards = (sec.match(/class="game-card/g)||[]).length;
    if (cards === 0) fail(label + ' section rendered but contains 0 cards (empty shell)');
    else pass(label + ' section well-formed (' + cards + ' card(s))');
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

  // 23: Series record invariant — IF a rendered card claims a playoff series,
  // the record must be well-formed (no empty data-series). No "a series must
  // exist today" requirement — that is snapshot accuracy → field_smoke_daily.js.
  {
    const seriesAttrs = (innerHTML.match(/data-series="[^"]*"/g)||[]);
    const blankSeries = seriesAttrs.filter(s => /data-series=""/.test(s)).length;
    if (blankSeries > 0)
      fail('Assertion 23 — ' + blankSeries + ' card(s) with empty data-series (corrupt series record)');
    else
      pass('Assertion 23 — series records well-formed (' + seriesAttrs.length + ' checked)');
  }

  // 24: Scout's Pick infrastructure (J4)
  const hasScoutPick = js.includes("Scout's Pick") || js.includes('scout=ranked');
  if (!hasScoutPick)
    fail("Assertion 24 — Scout's Pick infrastructure missing (Scout's Pick or scout=ranked not found in JS)");
  else
    pass("Assertion 24 — Scout's Pick infrastructure present (confirmed in JS)");

  // 25: Anti-Hype infrastructure (J1) — structural presence check.
  {
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

  // Assertion 30 — Odds API relay adapter REMOVED (ToS/patent compliance)
  // Inverted 2026-07-11: this used to check PRESENCE. Betting-content
  // removal confirmed deliberate, approved, permanent (matches smoke.js
  // A243 "Betting engine REMOVED", 2026-05-29) -- but A243 only covers
  // ODDS_RELAY_BASE, not fetchOddsForSport/getGameOdds/ODDS_SPORT_MAP.
  // Removing this assertion outright (rather than inverting) would leave
  // those 3 with no absence-guard anywhere in the repo -- inverted here,
  // not removed, so a silent regression (one of these creeping back in)
  // still gets caught.
  {
    const hasBase = js.includes('ODDS_RELAY_BASE');
    const hasFetch = js.includes('fetchOddsForSport');
    const hasGet = js.includes('getGameOdds');
    const hasMap = js.includes('ODDS_SPORT_MAP');
    if (hasBase || hasFetch || hasGet || hasMap)
      fail('Assertion 30 — Odds relay adapter present but must stay removed (ODDS_RELAY_BASE / fetchOddsForSport / getGameOdds / ODDS_SPORT_MAP found — betting content removal, ToS/patent compliance, must not regress)');
    else
      pass('Assertion 30 — Odds relay adapter correctly absent (ToS/patent compliance removal holds)');
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
    (html.includes('function resolveGameIdByHome') || /import\s*\{[^}]*\bresolveGameIdByHome\b/.test(html)) &&
    html.includes('e._gameId || gid');
  if(espnStoresGameId) pass('A52 — espnScores._gameId stored + ticker uses it');
  else fail('A52 — espnScores._gameId missing — trend sort always returns 0');

  // A53 — bdlInjuryContextSync called at most once per game (not twice)
  // Structural check, not comment-anchored (fixed 2026-07-11): the original
  // check matched real invocations only between a "// Fix 9: BDL" and
  // "// Fix 6:" comment pair -- those comments no longer exist verbatim
  // anywhere in the file (naming convention drifted to lowercase "fix9"),
  // so the old check failed unconditionally regardless of the real code.
  // This counts real invocation call sites directly: lines containing
  // "bdlInjuryContextSync(" that are neither the function's own
  // definition nor a comment-only mention. (Currently 0 real call sites --
  // surrounding comments elsewhere in the file describe this function as
  // "operationally-inert", replaced by a later fix -- flagged separately,
  // not this assertion's concern; 0 calls still satisfies "at most once".)
  const bdlCalledOnce = (() => {
    const calls = js.split('\n').filter(line => {
      if (!line.includes('bdlInjuryContextSync(')) return false;
      const codePart = line.split('//')[0];
      if (!codePart.includes('bdlInjuryContextSync(')) return false; // only in the comment part
      if (/function\s+bdlInjuryContextSync\(/.test(codePart)) return false; // its own definition
      return true;
    }).length;
    return calls <= 1;
  })();
  if(bdlCalledOnce) pass('A53 — bdlInjuryContextSync called at most once per game');
  else fail('A53 — bdlInjuryContextSync called multiple times — double injury cache traversal');

  // A54 — Night Owl save/load uses ET timezone consistently
  const nightOwlETKey =
    html.includes("America/New_York") &&
    html.includes("field_tonight_finals_") &&
    html.includes('saveEspnFinal') &&
    html.includes('loadTonightFinals');
  if(nightOwlETKey) pass('A54 — Night Owl save/load: ET timezone key consistent');
  else fail('A54 — Night Owl: timezone key mismatch — finals may not be found');

  // A55 — Runtime error capture: structural assertion. Single source of truth =
  // smoke.js (this divergent duplicate required 'field-debug-panel' and drifted).

  // A56 — field_utils.js loaded as separate script
  const hasUtils = html.includes('field_utils.js') && html.includes('<script src="field_utils.js">');
  if(hasUtils) pass('A56 — field_utils.js loaded in index.html');
  else fail('A56 — field_utils.js not loaded — pure functions missing from browser');

  // A57 — getEl DOM helper in utility block. $/$$ removed 2026-07-15
  // (CC-CMD-2026-07-15-orphan-cleanup-dead, tree-sitter orphan sweep):
  // confirmed zero real call sites -- same fix as smoke.js's own A57.
  const hasDomHelpers =
    html.includes('function getEl(id)') &&
    html.includes('window._fieldErrors.push');
  if(hasDomHelpers) pass('A57 — getEl DOM helper present');
  else fail('A57 — getEl DOM helper missing — bare getElementById calls unguarded');

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

  // ── Working Class assertions ──────────────────────────────────
  const hasBuildTheSkim = html.includes('function buildTheSkim(');
  if(hasBuildTheSkim) pass('A60 — buildTheSkim() defined');
  else fail('A60 — buildTheSkim() missing — Working Class Skim not built');

  const hasBuildCheapSeats = html.includes('function buildCheapSeats(');
  if(hasBuildCheapSeats) pass('A61 — buildCheapSeats() defined');
  else fail('A61 — buildCheapSeats() missing — Working Class Cheap Seats not built');

  const hasCheapSeatsCopy = html.includes('CHEAP_SEATS_COPY');
  if(hasCheapSeatsCopy) pass('A62 — CHEAP_SEATS_COPY template const present');
  else fail('A62 — CHEAP_SEATS_COPY missing — Cheap Seats copy templates not defined');

  const hasSkimDOM = html.includes('id="the-skim"');
  if(hasSkimDOM) pass('A63 — The Skim DOM element present');
  else fail('A63 — The Skim #the-skim DOM element missing');

  const hasSkimWiring = html.includes('buildTheSkim(filtered)');
  if(hasSkimWiring) pass('A64 — The Skim wired into render cycle');
  else fail('A64 — buildTheSkim not called during renderAll');

  const hasCheapSeatsWiring = html.includes('buildCheapSeats(g)');
  if(hasCheapSeatsWiring) pass('A65 — Cheap Seats wired into card template');
  else fail('A65 — buildCheapSeats not called in card template');

  const hasStayUp = html.includes('function buildStayUpSignal(');
  if(hasStayUp) pass('A66 — buildStayUpSignal() defined');
  else fail('A66 — buildStayUpSignal() missing');

  // A67 removed 2026-07-11: was a presence check for beatTheBook(), which
  // was deliberately, permanently removed (ToS/patent compliance,
  // 2026-05-29 -- matches smoke.js A243 "Betting engine REMOVED").
  // Fully redundant with A243's existing !html.includes('function
  // beatTheBook') absence-check -- no unique tracking value in a
  // duplicate presence-check for something confirmed gone for good.

  const hasStayUpDOM = html.includes('id="stay-up"');
  if(hasStayUpDOM) pass('A68 — Stay Up Signal DOM element present');
  else fail('A68 — Stay Up #stay-up DOM element missing');

  // A69 removed 2026-07-11: was a presence check for beatTheBook(g)'s
  // card-template wiring. Once the function itself cannot exist (A243
  // guarantees that), a call site to it structurally cannot exist
  // either -- checking for absent wiring to an absent function is
  // tautological, no unique tracking value.

  const hasPrivacyBanner = html.includes('id="privacy-banner"');
  if(hasPrivacyBanner) pass('A70 — Privacy banner DOM present');
  else fail('A70 — Privacy banner #privacy-banner missing');

  const hasPrivacyModal = html.includes('id="privacy-modal-overlay"');
  if(hasPrivacyModal) pass('A71 — Privacy policy modal present');
  else fail('A71 — Privacy policy modal missing');

  const hasInitPrivacy = html.includes('function initPrivacyBanner()');
  if(hasInitPrivacy) pass('A72 — initPrivacyBanner() defined');
  else fail('A72 — initPrivacyBanner missing');

  const hasPrivacyGate = html.includes("field_privacy_v1") && html.includes("'no-geo'");
  if(hasPrivacyGate) pass('A73 — C2 consent gate (field_privacy_v1) wired');
  else fail('A73 — C2 consent gate missing from autoGeolocate');

  const hasEUPushConsent = html.includes('id="eu-push-consent"');
  if(hasEUPushConsent) pass('A74 — EU push consent DOM present');
  else fail('A74 — EU push consent element missing');

  const hasIsEU = html.includes('function isEUTimezone()');
  if(hasIsEU) pass('A75 — isEUTimezone() EU detection function present');
  else fail('A75 — EU timezone detection missing');

  const hasInjuryIntel = html.includes('function assessInjuryPriceImpact(');
  if(hasInjuryIntel) pass('A76 — assessInjuryPriceImpact() defined (Injury Intel)');
  else fail('A76 — assessInjuryPriceImpact missing');

  const hasWatchEngine = html.includes('function computeWatchValue(');
  if(hasWatchEngine) pass('A77 — computeWatchValue() defined (Pipeline C / Watch Engine)');
  else fail('A77 — computeWatchValue missing');

  const hasInjuryWiring = html.includes('assessInjuryPriceImpact(g)');
  if(hasInjuryWiring) pass('A78 — Injury Intel wired into card template');
  else fail('A78 — assessInjuryPriceImpact not called in card template');

  const hasWatchInStayUp = html.includes('computeWatchValue(g');
  if(hasWatchInStayUp) pass('A79 — Watch Engine feeds Stay Up Signal');
  else fail('A79 — computeWatchValue not connected to buildStayUpSignal');

  const hasInsightsLayer = html.includes('function computeInsights(');
  if(hasInsightsLayer) pass('A80 — computeInsights() defined (Stage 3.5 Insights Layer)');
  else fail('A80 — computeInsights missing');

  const hasInsightsWiring = html.includes('g._insights=computeInsights(');
  if(hasInsightsWiring) pass('A81 — Insights Layer wired into card render loop');
  else fail('A81 — computeInsights not called during renderAll');

  const hasNarrativeGrade = html.includes('narrativeGrade');
  if(hasNarrativeGrade) pass('A82 — Composite narrativeGrade (semantic vocabulary mapping) present');
  else fail('A82 — narrativeGrade missing from insights composite');

  // ── Assertions 41-55 + UFL/Weather (moved here 2026-07-11) ──────────────
  // BUG FIX: these used to sit textually AFTER this async IIFE's closing
  // ())(); and its process.exit() calls below. Since this IIFE never hits a
  // real await pause (fetch is mocked to reject; renderBetting is
  // undefined), its body runs synchronously to completion and
  // process.exit() fires before any top-level code after the IIFE ever
  // runs -- meaning these ~20 checks had NEVER executed, in any
  // invocation of this file, ever. Moved inside the IIFE, before the
  // final tally, so they actually run and count toward Failures.
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

// Assertion 48 removed 2026-07-12: a 4th stale presence-check from the
// same betting-content Tier-1 removal as A67/A69/Assertion 30 (confirmed
// via chat history -- "journalism betting context" was explicitly in
// that removal plan). Confirmed via full-file grep: 'journalism-odds-
// context' has zero matches anywhere; all 12 'favored'/'underdog'
// matches are unrelated (Upset Archaeology, NBA defensive-mismatch
// analysis, WC26 ranking drama, static team-history text, and one
// stale comment example in buildWatchWindowReason whose real
// implementation has no odds/moneyline logic). Not inverted (unlike
// Assertion 30): journalism-odds-context inherently requires odds data
// to build a "favored"/"underdog" line, and smoke.js A243 already
// guards ODDS_RELAY_BASE's absence -- transitively redundant.

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

// Assertion 54 — Story Engine: computeGameNarrative() with scoreline + statusLine
// enrichGame (the never-adopted RichGame orchestrator shell that wrapped this)
// removed 2026-07-15 (CC-CMD-never-adopted-utilities-disposal) -- zero real
// callers, its own Stage 4 concept independently reimplemented elsewhere as
// computeWatchValue(). computeGameNarrative/scoreline/statusLine remain real
// and live on their own; this assertion now checks them directly rather than
// the removed orchestrator that merely called computeGameNarrative once.
const hasStoryEngine = html.includes('function computeGameNarrative(') &&
  html.includes('scoreline') && html.includes('statusLine') &&
  html.includes('leaderNick') && html.includes('trailerNick') &&
  html.includes('def. ') && html.includes('lead ');
if(hasStoryEngine) pass('Assertion 54 — Story Engine: computeGameNarrative() + Story Score strings');
else fail('Assertion 54 — Story Engine missing (computeGameNarrative/scoreline/statusLine)');

// Assertion 55 — Story Score: .score-status CSS + scoreHTML uses _n.statusLine + previousScores uses _sl
const hasStoryScore = html.includes('score-status') &&
  html.includes('_n.statusLine') &&
  html.includes('_n.scoreline') &&
  html.includes('"_sl"') &&
  html.includes('_n.periodLabel');
if(hasStoryScore) pass('Assertion 55 — Story Score: score-status CSS + _n.statusLine + _n.scoreline + _sl cache key');
else fail('Assertion 55 — Story Score wiring missing (score-status/_n.statusLine/_n.scoreline/_sl)');

// ── UFL 2026 ────────────────────────────────────────────────────────────

// ── Weather Intelligence (Session K) ────────────────────────────────────
if(html.includes('const PARK_ORIENTATION =')) pass('PARK_ORIENTATION defined');
else fail('PARK_ORIENTATION defined');
if((html.includes('function isOutdoorVenue(') || /import\s*\{[^}]*\bisOutdoorVenue\b/.test(html)) &&
  (html.includes('function getVenueCoords(') || /import\s*\{[^}]*\bgetVenueCoords\b/.test(html)) &&
  html.includes('function wxBadge(') &&
  (html.includes('function wxAlert(') || /import\s*\{[^}]*\bwxAlert\b/.test(html)) &&
  (html.includes('function weatherDramaModifier(') || /import\s*\{[^}]*\bweatherDramaModifier\b/.test(html))) pass('weather helper functions defined');
else fail('weather helper functions defined');
if(html.includes('async function fetchAQI(')) pass('fetchAQI defined');
else fail('fetchAQI defined');
if(html.includes('function windContextNote(')) pass('windContextNote defined');
else fail('windContextNote defined');
if(html.includes('wind_gusts_10m') &&
  html.includes('direct_radiation,snowfall') &&
  html.includes('apparent_temperature')) pass('fetchWeather extended params');
else fail('fetchWeather extended params');
if(html.includes("'weather-intelligence'")) pass('weather-intelligence FIELD_FEATURES');
else fail('weather-intelligence FIELD_FEATURES');
if(html.includes('weatherDramaModifier(wxEntry)')) pass('weatherDramaModifier wired to drama');
else fail('weatherDramaModifier wired to drama');
if(html.includes('UFL_FOX') && html.includes('UFL_ABC') && html.includes('UFL_ESPN2')) pass('UFL bundles registered');
else fail('UFL bundles registered');
if(html.includes("'ufl-2026'")) pass('UFL FIELD_FEATURES entry present');
else fail('UFL FIELD_FEATURES entry present');

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

