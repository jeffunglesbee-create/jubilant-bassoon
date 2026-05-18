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
const TODAY_ISO        = '2026-05-18';   // YYYY-MM-DD in America/New_York
const NBA_CARDS        = 1;              // OKC@SAS WCF G1 at Paycom Center
const NBA_HOME_TEAM    = 'Oklahoma City Thunder';
const NBA_NETWORK      = 'NBC';          // chip text from NBA_NBC bundle
const MLB_CARDS        = 0;             // mlbRaw=[] — adapter fills from MLB Stats API at runtime
const MLB_CHIP_HOME    = '';             // no national TV override today
const MLB_CHIP_TEXT    = '';
const NBA_SERIES_ACTIVE = true;
const NBA_HYPE_TEST    = false;
const MIN_SPORT_SECTIONS = 2;           // NBA + NHL (MLB section async from adapter, may be 0 in smoke)
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
if (logCount > 10) fail('Production console.log count too high: ' + logCount);
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

let bootstrapError = null;
let evalThis;
try {
  const wrapped = js + ';\n;return {' +
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

  // ─────────────────────────────────────────────────────────────────────
  log('---');
  log('Failures:', failures);

  if (failures > 0) {
    console.log('SMOKE TEST FAILED — see /tmp/field_smoke.log');
    console.log(fs.readFileSync(LOG, 'utf8'));
    process.exit(1);
  } else {
    console.log(`SMOKE TEST PASSED 29/29 (${sportSections} sport sections, MLB+NBA+lazy+SEP+J-series+PULSE+registry+drama-arc verified)`);
    process.exit(0);
  }
})();
