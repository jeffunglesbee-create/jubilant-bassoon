// FIELD Smoke Test — structural assertions (shared by CI and local smoke)
// CI: runs this file directly via `node smoke.js`
// Local: field_smoke.js wraps this with per-day config (NBA_CARDS, TODAY_ISO, etc.)
//
// ADDING A STRUCTURAL ASSERTION:
//   1. Add assert() call here (it runs in both CI and local)
//   2. Add corresponding entry to FIELD_FEATURES in index.html
//   Rule: every feature in FIELD_FEATURES must have a smoke assertion here.
//
// Run: node smoke.js  (from repo root, after checkout)
// Exit 0 = pass; 1 = fail

const fs = require('fs');
const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    pass++;
  } else {
    console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

console.log('\n── FIELD Smoke Test (GitHub Actions) ──────────────\n');

// 1. File size sanity (>500KB, <2MB)
const size = Buffer.byteLength(html, 'utf8');
assert('File size in range', size > 500000 && size < 2000000, `${size} bytes`);

// 2. HTML structure
assert('Has DOCTYPE', html.startsWith('<!DOCTYPE html'));
assert('Has </html>', html.includes('</html>'));
assert('<title>FIELD present', html.includes('<title>FIELD'));

// 3. Core functions
assert('buildTodaySchedule defined', html.includes('function buildTodaySchedule'));
assert('goToDate defined', html.includes('async function goToDate'));
assert('renderAll defined', html.includes('function renderAll'));
assert('fetchESPNScores defined', html.includes('async function fetchESPNScores'));

// 4. MLB Stats API Adapter (Session 1)
assert('MLB_STATS_BASE defined', html.includes("const MLB_STATS_BASE = 'https://statsapi.mlb.com"));
assert('parseBroadcasts defined', html.includes('function parseBroadcasts'));
assert('normalizeMLBGame defined', html.includes('function normalizeMLBGame'));
assert('loadMLBSlate defined', html.includes('async function loadMLBSlate'));
assert('MLB_TEAM_RSN defined', html.includes('const MLB_TEAM_RSN'));
assert('ESPN_GOTD_SCHEDULE defined', html.includes('const ESPN_GOTD_SCHEDULE'));

// 5. RELAY NBA Adapters (Session 3)
assert('RELAY_BASE defined', html.includes("const RELAY_BASE = 'https://field-relay-nba"));
assert('relayHealthCheck defined', html.includes('async function relayHealthCheck'));
assert('fetchNBAScoreboardViaRelay defined', html.includes('async function fetchNBAScoreboardViaRelay'));
assert('fetchNBARelayScores defined', html.includes('async function fetchNBARelayScores'));
assert('RELAY_CUTOVER_DATE defined', html.includes("const RELAY_CUTOVER_DATE = '2026-05-19'"));

// 6. JS syntax check (extract and validate)
const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
let allJs = scripts.map(s => s.replace(/<\/?script[^>]*>/g, '')).join('\n');
// Prepend field_utils.js so helpers are available in syntax/execution checks
const utilsPath = require('path').join(__dirname, 'field_utils.js');
if (require('fs').existsSync(utilsPath)) {
  const utilsJs = require('fs').readFileSync(utilsPath, 'utf8').replace(/if\s*\(typeof module[\s\S]*?^\}$/m, '');
  allJs = utilsJs + '\n' + allJs;
}
let syntaxOk = true;
try { new Function(allJs); } catch(e) { syntaxOk = false; }
assert('JavaScript syntax valid', syntaxOk);

// 7. Bundle registry
assert('resolveBundle defined', html.includes('function resolveBundle'));
assert('NBA_ABC in bundles', html.includes('NBA_ABC'));
assert('MLB_APPLE in bundles', html.includes('MLB_APPLE'));

// 8. Sport sections render
assert('renderAll calls buildTodaySchedule', html.includes('buildTodaySchedule'));
assert('buildFilters defined', html.includes('function buildFilters'));
assert('SPORT_CHIP_LABELS defined', html.includes('const SPORT_CHIP_LABELS'));

// 9. Match brief scoping
assert('MLS excluded from match briefs', !html.includes("'MLS']") || html.includes('BRIEF_LEAGUES'));
assert('BRIEF_LEAGUES defined', html.includes('BRIEF_LEAGUES'));

// 10. Save protocol
assert('fetchNBARelayScores wired into ESPN cycle', 
  html.includes('fetchNBARelayScores().catch'));
assert('relayHealthCheck called at session start',
  html.includes('relayHealthCheck().catch'));

// 10. Bundle key integrity — every bundle key must resolve in SR
const srEntries = [...html.matchAll(/^\s{2}(\w+):\s*\[/gm)].map(m => m[1]);
const bundleStr = html.match(/const BUNDLES\s*=\s*\{([\s\S]*?)\n\};/)?.[1] || '';
const bundleRefs = [...bundleStr.matchAll(/"(\w+)"/g)].map(m => m[1]);
const srSet = new Set(srEntries);
const brokenRefs = bundleRefs.filter(k => !srSet.has(k) && k.length > 2 && k !== k.toUpperCase());
assert('Bundle key integrity — no broken SR refs', brokenRefs.length === 0,
  brokenRefs.length > 0 ? `missing: ${brokenRefs.slice(0,3).join(', ')}` : '');

// 28. SW_VERSION constant present (cache busting)
assert('SW_VERSION constant present', html.includes("const SW_VERSION = '"));

// 29. QW-7: BriefCache key includes status
assert('QW-7: BriefCache key includes game status',
  html.includes('field_epl_brief_') && html.includes('gameStatus'));

// 30. localStorage prune function present
assert('localStorage prune function present', html.includes('pruneOldFieldData'));


          // ── Drama Arc Storage Layer ────────────────────────────────────────────
          assert('Drama Arc storage layer present',
            html.includes('recordDramaHistory') &&
            html.includes('getDramaHistory') &&
            html.includes('getDramaTrend') &&
            html.includes("'drama-arc-storage'"));

          assert('FIELD_FEATURES registry declared', html.includes('const FIELD_FEATURES = {'));
          assert('FIELD_FEATURES contains j-series', html.includes("'j1-anti-hype'") || html.includes('"j1-anti-hype"'));
          // ── Odds API relay (pre-session work) ─────────────────────────────────
          assert('Odds relay adapter present',
            html.includes('ODDS_RELAY_BASE') &&
            html.includes('fetchOddsForSport') &&
            html.includes('getGameOdds') &&
            html.includes("'odds-relay-adapter'"));
          assert('FIELD_FEATURES contains relay-nba', html.includes("'relay-nba'") || html.includes('"relay-nba"'));
          assert('Drama score smoothing present',
            html.includes('getSmoothedDrama') && html.includes("'drama-score-smoothing'"));
          assert('Compound editorial call present',
            html.includes('fetchCompoundEditorial') && html.includes("'compound-editorial-call'"));
          assert('Journalism resilience present',
            html.includes('_compoundRetryAfter') && html.includes("'journalism-resilience'"));
          assert('BNI present',
            html.includes('computeBroadcastNarrativeIndex') && html.includes("'bni'"));
          assert('Watch Window Why present',
            html.includes('buildWatchWindowReason') && html.includes("'watch-window-why'"));
          assert('Standings context in J3/J5 prompts (relay-first)',
            html.includes('buildGameStandingsContext') && html.includes('fetchStandingsForPrompt') &&
            html.includes('_relayStandingsCache') && html.includes("'standings-in-prompts'"));
          assert('Broadcaster Registry (DA-01)',
            html.includes('BROADCASTER_REGISTRY') && html.includes('getCrewForGame') &&
            html.includes("'broadcaster-registry'"));
          assert('Page Visibility API',
            html.includes('visibilitychange') && html.includes("'page-visibility-api'"));
          assert('First Lead Change Drama Burst',
            html.includes('_leadTracker') && html.includes('getLeadChangeBurst') &&
            html.includes("'first-lead-change-burst'"));
          assert('Double Feature Detection',
            html.includes('detectAndRenderDoubleFeature') && html.includes("'double-feature-detection'"));
          assert('NBA relay primary cutover',
            html.includes("'nba-relay-primary'") && html.includes("RELAY_CUTOVER_DATE = '2026-05-19'"));
          assert('French Open 2026 WBD bundle',
            html.includes('"tnt","trutv","max"') && html.includes('TENNIS_FO') &&
            html.includes("FO_START = \"2026-05-24\""));
          assert('NHL ECF entries present',
            html.includes('Carolina Hurricanes') && html.includes('East CF G1'));

// ── SEMANTIC CONTRACT ASSERTIONS — added May 20 2026 ─────────────────────────
// These run in CI and locally. Catch silent failures where features reference
// wrong variable names, mismatched key formats, or incorrect call wiring.
// Pattern: "If this assertion fails, the feature silently does nothing."
// Rule 4 (STANDARDS.md): add one of these for every new feature with
// a specific variable name, key format, or call wiring dependency.

assert('A51 — weather bonus uses wxCache (not _weatherCache)',
  html.includes('wxCache') &&
  !html.includes('_weatherCache') &&
  html.includes('sitBonus += 10'));

assert('A52 — espnScores._gameId stored + used in ticker trend sort',
  html.includes('_gameId: resolveGameIdByHome') &&
  html.includes('function resolveGameIdByHome') &&
  html.includes('e._gameId || gid'));

assert('A53 — bdlInjuryContextSync called once per game in compound prompt',
  (() => {
    const m = html.match(/\/\/ Fix 9: BDL.*?\/\/ Fix 6:/s);
    if (!m) return false;
    return (m[0].match(/bdlInjuryContextSync/g) || []).length === 1;
  })());

assert('A54 — Night Owl save/load uses ET timezone key consistently',
  html.includes("America/New_York") &&
  html.includes("field_tonight_finals_") &&
  html.includes('saveEspnFinal') &&
  html.includes('loadTonightFinals'));
assert('A55 — Runtime capture: _fieldErrors + onerror + debug panel present',
  html.includes('window._fieldErrors') &&
  html.includes('window.onerror') &&
  html.includes('unhandledrejection') &&
  html.includes('fhp-overlay'));
assert('A56 — field_utils.js loaded in index.html',
  html.includes('field_utils.js') &&
  html.includes('<script src="field_utils.js">'));

  // A57 — getEl/$/$$ DOM helpers in utility block
  const hasDomHelpers =
    html.includes('function getEl(id)') &&
    html.includes('window._fieldErrors.push') &&
    html.includes('function $(selector');
  assert('A57 — getEl/$/$$ DOM helpers present in utility block', hasDomHelpers);

  // A58 — no bare document.getElementById().property without null guard
  const jsBlocks2 = (html.match(/<script[^>]*>([\s\S]*?)<\/script>/g)||[]).join('\n');
  const sc2 = jsBlocks2.replace(/\/\/[^\n]*/g,'').replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g,'""').replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g,"''");
  const noBareDOM2 = !/document\.(getElementById|querySelector)\s*\([^)]+\)\s*\.(style|classList|innerHTML|textContent)/.test(sc2);
  assert('A58 — no bare document.getElementById without null guard', noBareDOM2);

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
  assert('A59 — getEl() store-once: no double-call same id on same line', !doubleGetEl);

  // A60 — captureFieldError helper defined
  assert('A60 — captureFieldError: error capture helper present', html.includes('function captureFieldError('));

  // A61 — findOddsForGame helper present (beatTheBook reads from The Odds API cache)
  assert('A61 — findOddsForGame: odds lookup uses The Odds API cache', html.includes('function findOddsForGame') && !html.includes('BETFAIR_RELAY_ENABLED'));

  // A62 — relay score fetches use captureFieldError (not bare .catch(()=>{}))
  assert('A62 — relay fetch captures: NBA relay errors captured', html.includes("captureFieldError('relay-nba'"));

  // A63 — getCalendarContext defined (Seasonal Intelligence Layer 0)
  assert('A63 — Seasonal L0: getCalendarContext defined', html.includes('function getCalendarContext('));

  // A64 — calendarContextSentence defined
  assert('A64 — Seasonal L0: calendarContextSentence defined', html.includes('function calendarContextSentence('));

  // A65 — MLB probable pitcher hydration in fetchMLBSchedule
  assert('A65 — MLB pitcher hydration: probablePitcher(stats) in schedule URL', html.includes('probablePitcher(stats)'));

  // A66 — fetchMLBTeamMomentum defined
  assert('A66 — MLB team momentum: fetchMLBTeamMomentum defined', html.includes('async function fetchMLBTeamMomentum('));

  // A67 — ambient panel HTML present
  assert('A67 — Ambient panel: #ambient-panel element in HTML', html.includes('id="ambient-panel"'));

  // A68 — renderAmbientPanel defined
  assert('A68 — Ambient panel: renderAmbientPanel function defined', html.includes('function renderAmbientPanel('));

  // A69 — Arbitrage Finder: #field-arb element present
  assert('A69 — Arbitrage Finder: #field-arb element in HTML', html.includes('id="field-arb"'));

  // A70 — buildArbitrageReport defined
  assert('A70 — Arbitrage Finder: buildArbitrageReport function defined', html.includes('function buildArbitrageReport('));

  // A71 — renderArbitrageBar defined
  assert('A71 — Arbitrage Finder: renderArbitrageBar function defined', html.includes('function renderArbitrageBar('));

  // A72 — Pipeline B: resolveGameBroadcast defined
  assert('A72 — Pipeline B: resolveGameBroadcast function defined', html.includes('function resolveGameBroadcast('));

  // A73 — OTW Watch button: CSS class exists
  assert('A73 — OTW Watch button: otw-watch-btn CSS class defined', html.includes('.otw-watch-btn{'));



  // ── Feature registry guards: A60-A123 (table-driven) ────────────────────
  // Every FIELD_FEATURES key has a named presence assertion.
  // Schema: [id, label, check] — check is string (includes) or RegExp (test)
  //   or [check, check, ...] for compound assertions (all must pass).
  // Keep A51-A59 above as individual assertions — those are semantic contracts
  // with unique, non-uniform patterns that benefit from individual visibility.
  const chk = (c) => Array.isArray(c)
    ? c.every(p => (p instanceof RegExp) ? p.test(html) : html.includes(p))
    : (c instanceof RegExp) ? c.test(html) : html.includes(c);

  const FEATURE_GUARDS = [
    // ── A60-A64: New features (Standing Velocity, Volatility, MLBN) ─────────
    ['A60', 'standing-velocity: recordStandingsSnapshot defined',     /function recordStandingsSnapshot\s*\(/],
    ['A61', 'standing-velocity: getStandingVelocity defined',         /function getStandingVelocity\s*\(/],
    ['A62', 'volatility-index: getVolatilityIndex defined',           /function getVolatilityIndex\s*\(/],
    ['A63', 'mlbn-live-drama-alert: shouldShowMLBNAlert defined',     /function shouldShowMLBNAlert\s*\(/],
    ['A64', 'mlbn-live-drama-alert: buildMLBNAlertChip defined',      /function buildMLBNAlertChip\s*\(/],
    // ── A65-A77: High-value feature functions ───────────────────────────────
    ['A65', 'bottom-sheet: openBottomSheet defined',                  /function openBottomSheet\s*\(/],
    ['A66', 'card-drama-pulse: applyCardPulse defined',               /function applyCardPulse\s*\(/],
    ['A67', 'card-life-stages: updateCardLifeStages defined',         /function updateCardLifeStages\s*\(/],
    ['A68', 'card-story-moments: detectAndStoreStoryMoment defined',  /function detectAndStoreStoryMoment\s*\(/],
    ['A69', 'comeback-probability: buildComebackProbability defined', /function buildComebackProbability\s*\(/],
    ['A70', 'bdl-relay: bdlPrefetchAll defined',                      /function bdlPrefetchAll\s*\(/],
    ['A71', 'live-score-ticker: renderScoreTicker defined',           /function renderScoreTicker\s*\(/],
    ['A72', 'pin-floating-widget: pinGame defined',                   /function pinGame\s*\(/],
    ['A73', 'share-card: shareGame defined',                          /function shareGame\s*\(/],
    ['A74', 'drama-sparkline: buildDramaSparklineSVG defined',        /function buildDramaSparklineSVG\s*\(/],
    ['A75', 'series-margins: buildSeriesMarginsDots defined',         /function buildSeriesMarginsDots\s*\(/],
    ['A76', 'ember-buried-lead: evaluateEMBER defined',               /function evaluateEMBER\s*\(/],
    ['A76b','ember-patent-fix: dramaScore absent from evaluateEMBER return + compound tag', [/return\s*\{[\s\S]{0,120}ember:\s*true[\s\S]{0,200}lateClose/, /EMBER BURIED LEAD.*lateClose/]],
    ['A77', 'build-game-context: buildGameContext defined',           /function buildGameContext\s*\(/],
    // ── A78-A87: Drama engine + ViewingConditions ────────────────────────────
    ['A78', 'drama-score-live: dramaScoreLive defined',               /function dramaScoreLive\s*\(/],
    ['A79', 'situation-drama-bonus: SPORT_CRUNCH_RULES + isCrunchTime', ['SPORT_CRUNCH_RULES', 'isCrunchTime']],
    ['A80', 'statistical-extreme-notes: getStatisticalExtremes defined', /function getStatisticalExtremes\s*\(/],
    ['A81', "b1plus-crunch-time: ViewingConditions + CRUNCH TIME",    ['ViewingConditions', "'CRUNCH TIME'"]],
    ['A82', 'b1plus-garbage-time: isFinalPeriod + garbage-time cap',  ['isFinalPeriod', 'Math.min(score, 20)']],
    ['A83', 'b1plus-j5-isblowout: isBlowout in ViewingConditions',    ['isBlowout', 'ViewingConditions']],
    ['A84', 'b1plus-pulse: applyCardPulse + badge-pulse',             [/function applyCardPulse\s*\(/, 'badge-pulse']],
    ['A85', 'weather-drama-bonus: wxCache + weather alert bonus',     ['wxCache', 'wx?.alert', 'sitBonus']],
    ['A86', 'ember-fields-compound: EMBER BURIED LEAD in prompt',     ['[EMBER BURIED LEAD', '_emberResultCache']],
    ['A87', 'franchise-misery-index: FRANCHISE_MISERY + getFranchiseMisery', ['FRANCHISE_MISERY', /function getFranchiseMisery\s*\(/]],
    // ── A88-A96: J-Series journalism ─────────────────────────────────────────
    ['A88', 'j1-anti-hype-cards: anti-hype badge present',            ['anti-hype', 'anti-hype-badge']],
    ['A89', 'j2-series-preview: buildSeriesPreviewStatic + card',     [/function buildSeriesPreviewStatic\s*\(/, 'series-preview-card']],
    ['A90', 'j3-field-brief: initFIELDBrief + field-brief slot',      [/function initFIELDBrief\s*\(/, 'field-brief']],
    ['A91', "j3-momentum-briefs: DRAMA: RISING + COOLING in prompt",  ['DRAMA: RISING', 'DRAMA: COOLING']],
    ['A92', "j4-scouts-pick: scout-pick-badge + Scout's Pick",        ['scout-pick-badge', "Scout\\'s Pick"]],
    ['A93', 'j4-scouts-pick-cards: scout-pick-card class',            ['scout-pick-card', '.scout-pick-card']],
    ['A94', 'j5-night-owl: renderNightOwlRecap + night-owl-card',     [/function renderNightOwlRecap\s*\(/, 'night-owl-card']],
    ['A95', 'j6-smt-notes: MEDIA_SPECIALS array',                     ['const MEDIA_SPECIALS', 'MEDIA_SPECIALS']],
    ['A96', 'j7-cdw-notes: cdw-notes + matchupNote',                  ['cdw-notes', 'matchupNote']],
    // ── A97-A104: Night Owl enhancements + BDL + AFL + ATP ───────────────────
    ['A97',  'night-owl-peak-time: getDramaPeakWithTime defined',      /function getDramaPeakWithTime\s*\(/],
    ['A98',  'night-owl-sustained-drama: getDramaSustained defined',   /function getDramaSustained\s*\(/],
    ['A99',  'afl-drama-v5: refreshAFLSection + _aflDramaScore',       [/function refreshAFLSection\s*\(/, '_aflDramaScore']],
    ['A100', 'atp-live-scores: fetchATPLiveScores + atpIntervalId',    [/function fetchATPLiveScores\s*\(/, 'atpIntervalId']],
    ['A101', 'bdl-injury-compound: bdlInjuryContextSync defined',      /function bdlInjuryContextSync\s*\(/],
    ['A102', 'bdl-milestones-p2c: _bdlMilestonesCache present',        '_bdlMilestonesCache'],
    ['A103', 'bni-strength-otw: getBNIStrength + computeBroadcastNarrativeIndex', [/function getBNIStrength\s*\(/, /function computeBroadcastNarrativeIndex\s*\(/]],
    ['A104', 'detect-arc-type: detectArcType defined',                 /function detectArcType\s*\(/],
    // ── A105-A111: Live polling + ESPN infra ─────────────────────────────────
    ['A105', 'halftime-switch-polling: halftime-switch + _quietHourActive', ['halftime-switch', '_quietHourActive']],
    ['A106', 'quiet-hour-detection: _quietHourActive + QUIET_CYCLES_GATE',  ['_quietHourActive', 'QUIET_CYCLES_GATE']],
    ['A107', 'per-league-polling: _espnLeagueState + leaguesToPoll',   ['_espnLeagueState', 'leaguesToPoll']],
    ['A108', 'concurrent-espn-fetch: Promise.all + leaguesToPoll',     ['leaguesToPoll', 'Promise.all']],
    ['A109', 'period-score-extraction: homeLinescores + awayLinescores',['homeLinescores', 'awayLinescores']],
    ['A110', 'ticker-trend-sort: renderScoreTicker defined',           /function renderScoreTicker\s*\(/],
    ['A111', 'qw7-briefcache: fieldBriefCacheKey + field_brief_ key',  [/function fieldBriefCacheKey\s*\(/, 'field_brief_']],
    // ── A112-A114: Relay constants ────────────────────────────────────────────
    ['A112', 'relay-fd: FD_RELAY present',                             'FD_RELAY'],
    ['A113', 'relay-fpl: FPL_RELAY_BASE present',                      'FPL_RELAY_BASE'],
    ['A114', 'relay-nhl: NHL_RELAY_BASE present',                      'NHL_RELAY_BASE'],
    // ── A115-A123: Misc features ─────────────────────────────────────────────
    ['A115', 'mlb-stats-adapter: fetchMLBSchedule + MLB_STATS_BASE',   [/function fetchMLBSchedule\s*\(/, 'MLB_STATS_BASE']],
    ['A116', 'mlb-thin-client: fetchMLBLiveGame + feed/live',          [/function fetchMLBLiveGame\s*\(/, 'feed/live']],
    ['A117', 'my-teams-brief: buildMyTeamsBriefLine defined',          /function buildMyTeamsBriefLine\s*\(/],
    ['A118', 'layer3-templates: buildLayer3Rules defined',             /function buildLayer3Rules\s*\(/],
    ['A119', 'card-mini-dashboard: updatePinWidget + _pinWidgetExpanded', [/function updatePinWidget\s*\(/, '_pinWidgetExpanded']],
    ['A120', 'ics-export: BEGIN:VCALENDAR + .ics download',            ['BEGIN:VCALENDAR', '.ics']],
    ['A121', 'sw-version-cache-bust: SW_VERSION cache-bust query param',['SW_VERSION', '?v=${SW_VERSION}']],
    ['A122', 'auto-deploy-guard-v5: pre-commit smoke gate in repo',    null], // file check — handled below
    ['A123', 'scout-pick-market-tip: fieldVsMarket + scoutTitle',      [/function fieldVsMarket\s*\(/, 'scoutTitle']],
  ];

  FEATURE_GUARDS.forEach(([id, label, check]) => {
    if (check === null) return; // handled separately below
    assert(`${id} \u2014 ${label}`, html && chk(check));
  });

  // A122 requires a file-system check — not expressible as html pattern

  // ── Rule 24 call-site assertions — trigger chain verification ───────────
  // These check that live-data consumers are called FROM their trigger function,
  // not just that they exist somewhere in the file. Uses landmark-anchor pattern
  // to avoid false positives from adjacent functions containing the same name.
  // Anchor: between 'function renderESPNScores' and 'checkForNewFinals' (last
  // known call in that function body before the POLLING CONSUMERS block).
  assert('A124 — Rule24: injectDramaBadges wired to renderESPNScores',
    (() => {
      const renderStart = html.indexOf('function renderESPNScores');
      const anchor      = html.indexOf('POLLING CONSUMERS (Rule 24)', renderStart);
      const callPos     = html.indexOf('injectDramaBadges', anchor);
      return renderStart > 0 && anchor > renderStart &&
             callPos > anchor && callPos < anchor + 400;
    })()
  );

  assert('A122 \u2014 auto-deploy-guard-v5: pre-commit smoke gate exists',
    typeof require !== 'undefined' &&
    require('fs').existsSync(require('path').join(__dirname, 'scripts/pre-commit')));

// ── Governance assertions (Rule 31) ──────────────────────────────────────────
// GOVERNANCE.json must exist and be valid, and FIELD-CURRENT-STATE.md must exist.
// These are Tier A mechanical enforcement: governance metadata in the repo.
const govPath = require('path').join(__dirname, 'GOVERNANCE.json');
const statePath = require('path').join(__dirname, 'FIELD-CURRENT-STATE.md');

assert('A141 — GOVERNANCE.json exists in repo root',
  require('fs').existsSync(govPath),
  'Create GOVERNANCE.json — canonical doc manifest must be in repo');

assert('A142 — GOVERNANCE.json is valid JSON with canonical_docs array',
  (() => {
    try {
      const gov = JSON.parse(require('fs').readFileSync(govPath, 'utf8'));
      return Array.isArray(gov.canonical_docs) && gov.canonical_docs.length >= 8;
    } catch(e) { return false; }
  })(),
  'GOVERNANCE.json malformed or missing canonical_docs');

assert('A143 — FIELD-CURRENT-STATE.md exists in repo root',
  require('fs').existsSync(statePath),
  'Create FIELD-CURRENT-STATE.md — current state file must be in repo');

assert('A144 — GOVERNANCE.json canonical doc IDs are non-empty strings',
  (() => {
    try {
      const gov = JSON.parse(require('fs').readFileSync(govPath, 'utf8'));
      return gov.canonical_docs.every(d => typeof d.id === 'string' && d.id.length > 10);
    } catch(e) { return false; }
  })(),
  'All canonical docs in GOVERNANCE.json must have valid Drive IDs');

assert('A145 — JQ Layer 1: BANNED_PHRASES array defined',
  html.includes('BANNED_PHRASES=') && html.includes('punch their ticket'),
  'BANNED_PHRASES constant with banned cliché phrases must exist');

assert('A146 — JQ Layer 1: FIELD_PROSE_STYLE constant defined',
  html.includes('FIELD_PROSE_STYLE=') && html.includes('specificity over metaphor'),
  'FIELD_PROSE_STYLE style rules constant must exist');

assert('A147 — JQ Layer 2: hasCliche function defined',
  html.includes('function hasCliche('),
  'hasCliche() banned-phrase detection function must exist');

assert('A148 — JQ Layer 2: retryWithoutCliches function defined',
  html.includes('function retryWithoutCliches('),
  'retryWithoutCliches() one-retry wrapper must exist');

assert('A149 — JQ Layer 3: scoreProse function defined',
  html.includes('function scoreProse(') && html.includes('api.datamuse.com'),
  'scoreProse() with Datamuse API integration must exist');

assert('A149b — JQ Layer 3: Statistical Depth 5th dimension present',
  html.includes('statDepth') && html.includes('_JQ_STAT_PATTERNS') && html.includes('_JQ_STAT_NOUNS'),
  'Statistical Depth must be 5th scoring dimension in scoreProse()');

assert('A150 — JQ Layer 3: renderProseScore function defined',
  html.includes('function renderProseScore('),
  'renderProseScore() debug panel display must exist');

assert('A151 — JQ wired: J3 Brief uses FIELD_PROSE_STYLE',
  html.includes("FIELD_PROSE_STYLE,'- VOICE: third person"),
  'J3 FIELD Brief prompt must inject FIELD_PROSE_STYLE');

assert('A152 — JQ wired: J5 Night Owl uses FIELD_PROSE_STYLE',
  html.includes("FIELD_PROSE_STYLE,") && html.includes("renderProseScore(s,'J5 Night Owl')"),
  'J5 Night Owl prompt must inject FIELD_PROSE_STYLE and score prose');

assert('A153 — Wikimedia: WIKI_TITLES has 40+ teams',
  (html.match(/WIKI_TITLES=\{[^}]+\}/s)?.[0]||'').split("'").length > 80,
  'WIKI_TITLES should map 40+ teams across NBA/NHL/MLB/EPL');

assert('A154 — Wikimedia: wiki trending feeds compound prompt',
  html.includes('WIKI TRENDING') && html.includes('WIKI LOW'),
  'Compound editorial prompt must include wiki trending context');

assert('A155 — Wikimedia: editorial rules include wiki instructions',
  html.includes('If [WIKI TRENDING] appears'),
  'Compound prompt rules must instruct AI how to use wiki signals');

assert('A156 — Mobile Intel: mobile-live-bar element in HTML',
  html.includes('id="mobile-live-bar"'),
  'Mobile live bar element must exist in DOM');

assert('A157 — Mobile Intel: renderMobileLiveBar function defined',
  html.includes('function renderMobileLiveBar('),
  'renderMobileLiveBar() must exist for phone intelligence layer');

assert('A158 — Mobile Intel: wired into ESPN polling cycle',
  html.includes('renderMobileLiveBar()') && html.includes('renderOneToWatch()'),
  'renderMobileLiveBar must be called alongside renderOneToWatch in polling');

assert('A159 — Mobile Intel: CSS for mobile-live-bar',
  html.includes('.mobile-live-bar{') && html.includes('.mlb-chip{'),
  'Mobile live bar CSS classes must be defined');

assert('A160 — O(1) L2: JOURNALISM_RELAY constant defined',
  html.includes('JOURNALISM_RELAY') && html.includes('/journalism/tonight'),
  'O(1) Newspaper relay endpoint constant must exist');

assert('A161 — O(1) L2: fetchPrerenderedJournalism function defined',
  html.includes('function fetchPrerenderedJournalism('),
  'fetchPrerenderedJournalism() relay-first function must exist');

assert('A162 — O(1) L2: relay-first wired in initFIELDBrief',
  html.includes('fetchPrerenderedJournalism()') && html.includes('served from relay KV'),
  'initFIELDBrief must try relay before client AI call');

assert('A163 — O(1) L3: delta hash function defined',
  html.includes('function buildJournalismContextHash('),
  'buildJournalismContextHash() delta check function must exist');

assert('A164 — O(1) L3: delta check wired before client AI call',
  html.includes('_lastJournalismHash') && html.includes('Context unchanged'),
  'Delta hash comparison must gate client AI calls');

assert('A165 — O(1) L4: Accept-Encoding Brotli hint in relay fetch',
  html.includes('Accept-Encoding') && html.includes('br, gzip'),
  'Relay journalism fetch must hint Brotli compression');

assert('A166 — Item 1: ESPN leaders extracted into espnScores',
  html.includes('homeLeader') && html.includes('awayLeader') && html.includes('_extractLeader'),
  'ESPN in-game leaders must be extracted per poll into espnScores');

assert('A167 — Item 1: Leaders wired into compound prompt game lines',
  html.includes('Leaders:') && html.includes('homeLeader.name'),
  'ESPN leaders must appear in compound editorial game lines');

assert('A168 — Item 2: MLB pitchers wired into compound prompt',
  html.includes('Pitchers:') && html.includes('homePitcher') && html.includes('awayPitcher'),
  'MLB probable pitchers must be injected into compound prompt game lines');

assert('A169 — Item 3: Cliché check extended to series previews',
  html.includes('Series[${i}] clichés') || html.includes("Series["),
  'Compound series[] entries must be checked for banned phrases');

assert('A170 — Item 4: BDL relay base constant defined',
  html.includes("BDL_RELAY") && html.includes('/bdl'),
  'BDL relay base constant must exist');

assert('A171 — Item 4: fetchBDLPlayerContext function defined',
  html.includes('async function fetchBDLPlayerContext('),
  'fetchBDLPlayerContext() must be defined for season averages');

assert('A172 — Item 5: fetchNHLLiveStats function defined',
  html.includes('async function fetchNHLLiveStats('),
  'fetchNHLLiveStats() must be defined for shot/save context');

assert('A173 — Item 5: NHL live stats wired into compound prompt',
  html.includes('NHL LIVE') && html.includes('_nhlLiveStatsCache'),
  'NHL live stats must inject into compound prompt game lines');

assert('A174 — Item 6: fetchMLBBoxscoreContext function defined',
  html.includes('async function fetchMLBBoxscoreContext('),
  'fetchMLBBoxscoreContext() must be defined for pitcher/batting stats');

assert('A175 — Item 6: MLB boxscore wired into compound prompt',
  html.includes('MLB BOX') && html.includes('_mlbBoxscoreCache'),
  'MLB boxscore stats must inject into compound prompt game lines');

assert('A176 — BUG-01: NBA/NHL teams in _teamAbbr for elimination attribution',
  html.includes("'New York Knicks':'NYK'") && html.includes("'Carolina Hurricanes':'CAR'"),
  '_teamAbbr must include NBA and NHL teams for correct Skim elimination labeling');

assert('A177 — BUG-01: awayLeads uses leadToken not empty-string match',
  html.includes('leadToken') && html.includes('leadMatch'),
  'awayLeads must parse seriesRecord front token, not match empty string');

assert('A178 — BUG-02: chipHTML null-guard for undefined name',
  html.includes("!s.name||s.name==='undefined'") && html.includes("return ''"),
  'chipHTML must return empty string when name is undefined');

assert('A179 — BUG-03: espnPeriodLabel defined — no longer missing function',
  html.includes('function espnPeriodLabel('),
  'espnPeriodLabel must be defined — was called but never defined (TypeError)');

assert('A180 — BUG-03: espnPeriodLabel uses Inn N for baseball not OT',
  html.includes("'Inn '") || html.includes('"Inn "') || html.includes('`Inn ${period}`') || html.includes('Inn ${period}'),
  'Baseball extra innings must render as "Inn N" not "OT"');

assert('A181 — BUG-04: Night Owl explicit sport prohibitions',
  html.includes('NEVER use: points, possession') && html.includes('NEVER use: basket'),
  'Night Owl prompt must explicitly forbid cross-sport vocabulary');

assert('A182 — BUG-07: Conference Finals tier boost in preGameScore',
  html.includes('conference finals') && html.includes('tierBoost'),
  'preGameScore must give tier boost to Conference Finals over lower-tier eliminations');

assert('A183 — BUG-09: Playoff count uses league string not only _gameImportance',
  html.includes('isPlayoffGame') && html.includes('conference|cup final|series'),
  'Betting Intelligence playoff count must detect Conference Finals by league string');

assert('A184 — New banned phrases from screenshots',
  html.includes('salvage pride') && html.includes('clinical execution') && html.includes('dictated the tempo'),
  'Banned phrases must include phrases observed in screenshot audit');

assert('A185 — M1: drama composite number removed from Betting Intelligence display',
  !html.includes('drama ${drama}') && !html.includes('>drama ${'),
  'Betting Intelligence must not display "drama N" composite number (patent Case A risk)');

assert('A186 — M2: isScoutsPick boolean gate function defined',
  html.includes('function isScoutsPick('),
  'isScoutsPick() boolean gate function must replace composite-threshold Scout\'s Pick');

assert('A187 — M2: preGameScore>70 threshold no longer used for Scout\'s Pick classification',
  !html.match(/if\s*\(\s*(?:pgScore|preGameScore\(g\))\s*>\s*70/),
  'All Scout\'s Pick classifications must use isScoutsPick(), not composite threshold');

assert('A188 — M2: isScoutsPick wired into injectJ1J4Badges',
  html.includes('if (isScoutsPick(g))'),
  'Scout\'s Pick badge injection must use isScoutsPick() boolean gate');

assert('A189 — SW_VERSION is current (Rule 23: suffix per deploy, new day resets to a)',
  html.includes("'2026-05-28c'"),
  'SW_VERSION must match current deploy date — update daily per Rule 23');

assert('A190 — Layer 2b: sport vocab violation detection function defined',
  html.includes('function checkSportVocab(') && html.includes('SPORT_VOCAB_VIOLATIONS'),
  'checkSportVocab() must exist with per-sport forbidden term lists');

assert('A191 — Layer 2b: sport vocab retry wired into Night Owl',
  html.includes('retryWithSportVocab') && html.includes("J5 Night Owl"),
  'Night Owl must validate sport vocabulary after cliché check — not just via prompt instruction');

assert('A192 — Layer 2b: baseball forbidden terms include one-possession',
  html.includes('one-possession') && html.includes('transition'),
  'Baseball vocab violations must include basketball crossover terms');

// DA-01: Broadcaster Registry — crew data for journalism prompts
assert('A193 — DA-01: BROADCASTER_REGISTRY declared with NBA/MLB/NHL entries',
  html.includes('BROADCASTER_REGISTRY') && html.includes("'NBA_ESPN'") && html.includes("'MLB_TBS'") && html.includes("'NHL_ESPN'"),
  'BROADCASTER_REGISTRY must cover all three major leagues');
assert('A194 — DA-01: getCrewForGame + isMarqueeBroadcast + getCrewContext functions present',
  html.includes('function getCrewForGame') && html.includes('function isMarqueeBroadcast') && html.includes('function getCrewContext'),
  'DA-01 consumer functions must exist for downstream BNI/EMBER/journalism');
assert('A195 — DA-01: Crew context injected into compound prompt gameLines',
  html.includes('getCrewContext(g)') && html.includes('isMarqueeBroadcast(g)') && html.includes('MARQUEE BROADCAST'),
  'J3 compound prompt must include crew + marquee flag per game');

assert('A196 — UFL-EPA: module functions present',
  html.includes('_epLookup') && html.includes('uflEpaInit') && html.includes('_computeSRPlayEPA'),
  'UFL EPA module must be wired — _epLookup, uflEpaInit, _computeSRPlayEPA required');

assert('A197 — UFL-EPA: EPA table relay route referenced',
  html.includes('/nflverse/epa_table.json'),
  'EPA table must reference nflverse relay route');

assert('A198 — UFL-EPA: SR UFL PBP relay route referenced',
  html.includes('/sportradar-ufl/games/'),
  'SR UFL PBP endpoint must be present in index.html');

assert('A199 — UFL-EPA: card template EPA block present',
  html.includes('_buildUFLEpaHTML') && html.includes('ufl-epa-live'),
  'EPA block must be present in card template and CSS');

assert('A200 — MLB Wave 1: lookup tables present',
  html.includes('UMPIRE_ABS_RATINGS') && html.includes('PARK_FACTORS') && html.includes('PLAYER_SPEED'),
  'Wave 1 MLB lookup tables must be defined');

assert('A201 — MLB Wave 1: getter functions present',
  html.includes('getUmpireABSRating') && html.includes('getParkFactor') && html.includes('getRegressionAlert'),
  'Wave 1 getter functions must be defined');

assert('A202 — MLB Wave 1: analytics wired into compound prompt',
  html.includes('getMLBAnalyticsContext'),
  'MLB analytics context must be injected into compound prompt gameLines');

assert('A203 — MLB Wave 1: park + ump badges in card template',
  html.includes('buildParkFactorBadge') && html.includes('buildUmpWatchBadge') && html.includes('mlb-park-badge'),
  'Park factor and ump watch badges must be in card template and CSS');

assert('A204 — MLB automation: mlbStatsInit present and called at startup',
  html.includes('mlbStatsInit') && html.includes('setTimeout(mlbStatsInit'),
  'mlbStatsInit must exist and be called at startup');

assert('A205 — MLB automation: /mlb-stats/ relay route referenced',
  html.includes('/mlb-stats/'),
  'FIELD must reference the /mlb-stats/ relay route for live table loading');

assert('A206 — MLB umpire: last-name keys + CF Worker endpoint wired',
  html.includes("'bucknor'") && html.includes("'barksdale'") && html.includes('/mlb-umpire-scrape'),
  'Umpire keys must be last-name-only and /mlb-umpire-scrape must be in mlbStatsInit');


// ── A207-A210: NHL Wave 1 Analytics ─────────────────────────────────────────
assert('A207 — NHL Wave 1: NHL_SPECIAL_TEAMS table present with confirmed probe keys',
  html.includes("'VGK'") && html.includes("'CAR'") && html.includes('NHL_SPECIAL_TEAMS') && html.includes("sat:"),
  'NHL_SPECIAL_TEAMS must have VGK/CAR entries with sat (SAT%) field confirmed by probe');

assert('A208 — NHL Wave 1: NHL_GOALIE_RATINGS with probe-confirmed field names',
  html.includes("'hart'") && html.includes("'andersen'") && html.includes('NHL_GOALIE_RATINGS') && html.includes("sv:"),
  'NHL_GOALIE_RATINGS must have hart/andersen entries with sv (savePct) field');

assert('A209 — NHL Wave 1: getNHLAbbrev with accent normalisation',
  html.includes('getNHLAbbrev') && html.includes('normalize') && html.includes('\\u0300'),
  'getNHLAbbrev must normalise unicode accents (Montréal→Montreal)');

assert('A210 — NHL Wave 1: nhlAnalyticsInit wired into startup + compound prompt',
  html.includes('nhlAnalyticsInit') && html.includes('getNHLAnalyticsContext') && html.includes('buildNHLAnalyticsBadges'),
  'nhlAnalyticsInit must be called at startup; context + badges must be wired');

// ── A211-A212: Stats revamp + Betting intelligence revamp ──────────────────
assert('A211 — Stats revamp: buildScoutingReport present in bottom sheet',
  html.includes('buildScoutingReport') && html.includes('bs-scout-table') && html.includes('Scouting Report'),
  'buildScoutingReport must be defined and wired into openBottomSheet()');

assert('A212 — Betting revamp: buildBettingFieldEdge present in betting cards',
  html.includes('buildBettingFieldEdge') && html.includes('bet-field-edge') && html.includes('FIELD Edge'),
  'buildBettingFieldEdge must be defined and wired into renderBetting() card template');

// ── A213-A222: FUNCTIONAL assertions — verify actual data values, not just presence ──
// These catch silent failures: code exists but produces no output for known inputs.
// Pattern: check specific data values that would change if the lookup table broke.

assert('A213 — Functional: NHL_SPECIAL_TEAMS CAR data correct (probe-confirmed values)',
  html.includes("'CAR': { pp:11.1, pk:93.5, sat:58.3") || html.includes("'CAR':{pp:11.1"),
  'CAR special teams data must match probe: PP 11.1, PK 93.5, SAT 58.3');

assert('A214 — Functional: NHL_SPECIAL_TEAMS VGK data correct',
  html.includes("'VGK': { pp:23.9, pk:87.5, sat:47.6") || html.includes("'VGK':{pp:23.9"),
  'VGK special teams data must match probe: PP 23.9, PK 87.5, SAT 47.6');

assert('A215 — Functional: NHL_SPECIAL_TEAMS has all 16 playoff teams',
  ['VGK','CAR','MTL','COL','BUF','MIN','ANA','DAL','PHI','PIT','BOS','LAK','TBL','UTA','OTT','EDM']
    .every(t => html.includes(`'${t}':`)),
  'All 16 2026 playoff teams must be present in NHL_SPECIAL_TEAMS');

assert('A216 — Functional: NHL_GOALIE_RATINGS key goalies with correct sv% values',
  html.includes("'hart':") && html.includes("sv:0.924") &&
  html.includes("'andersen':") && html.includes("sv:0.923") &&
  html.includes("'dobes':") && html.includes("sv:0.911"),
  'Key goalie sv% values must match probe: Hart .924, Andersen .923, Dobes .911');

assert('A217 — Functional: NHL_GOALIE_RATINGS has 19 entries (GP>=3 threshold)',
  (html.match(/'[a-z]+'\s*:\s*\{\s*team\s*:/g)||[]).length >= 19,
  'NHL_GOALIE_RATINGS must have at least 19 goalie entries');

assert('A218 — Functional: Samsung tap fix — no onclick on card-body, data-open present',
  !html.includes('onclick="openBottomSheet') && html.includes('data-open="${g._id}"'),
  'onclick must be removed from card-body; data-open attribute must be present');

assert('A219 — Functional: Samsung tap fix — touchend approach with preventDefault',
  html.includes('touchstart') && html.includes('touchend') && html.includes('touchmove') &&
  html.includes('_tMoved') && html.includes('passive: false') && html.includes('e.preventDefault()'),
  'touchend with non-passive + preventDefault is the Samsung-reliable tap pattern');

assert('A220 — Functional: Exhausted Starter odds key not hardcoded in FIELD',
  !html.includes('8452c3ac6e226ca6eff8b087391d3c76'),
  'Exhausted Starter key must not appear in FIELD — relay uses 20K key via CF Worker secret');

assert('A221 — Functional: --muted CSS variable defined in :root',
  html.match(/--muted\s*:\s*#[0-9a-f]{6}/i) !== null,
  '--muted must be defined in :root (was missing, causing silent colour fallback)');

assert('A222 — Functional: touch-action:manipulation on .card-body directly (not just inherited)',
  /\.card-body\{[^}]*touch-action\s*:\s*manipulation/.test(html),
  'touch-action:manipulation must be on .card-body directly — Samsung does not inherit from .game-card');

// ── A223-A226: Phase 2 — Schedule Automation assertions ──────────────────
assert('A223 — Phase2: _fieldDataCache module-level var declared',
  html.includes('let _fieldDataCache'),
  '_fieldDataCache must be declared at module level for Phase 2 schedule JSON');

assert('A224 — Phase2: _mlbnDataCache module-level var declared',
  html.includes('let _mlbnDataCache'),
  '_mlbnDataCache must be declared at module level for Phase 2 MLBN live data');

assert('A225 — Phase2: fetchScheduleData function defined',
  html.includes('async function fetchScheduleData()'),
  'fetchScheduleData() must exist — Phase 2 async JSON fetch');

assert('A226 — Phase2: _fieldDataCache used in mlbGames source selection',
  html.includes('_fieldDataCache?.schedules?.mlb'),
  'mlbGames must check _fieldDataCache.schedules.mlb (Phase 2 live source)');

// ── World Cup 2026 ──────────────────────────────────────────────────────────
const wc26Match = html.match(/const wc26Raw=\[([\s\S]*?)\];/);
const wc26Count = wc26Match ? (wc26Match[1].match(/_id:"wc26_g/g)||[]).length : 0;
assert('A227 — WC26: wc26Raw contains all 72 group stage games',
  wc26Count === 72,
  `wc26Raw must have 72 entries (found ${wc26Count})`);

assert('A228 — WC26: WC26_FREE bundle used for Mexico-SA and USA-Paraguay',
  html.includes('"WC26_FREE"') && html.includes('wc26_g11_mex_rsa') && html.includes('wc26_g12_usa_par'),
  'Opening match + USMNT opener must use WC26_FREE bundle');

assert('A229 — WC26: Group labels correct (A–L, no repeats from old draft)',
  html.includes('Group E') && html.includes('Group H') && !html.includes('Group C · Opening'),
  'Group labels must be A–L correctly assigned');

assert('A230 — QW-1: applyQW1SituationBonus function defined',
  /function applyQW1SituationBonus\s*\(/.test(html),
  'applyQW1SituationBonus() must be defined (situation drama bonus, named fn)');

assert('A231 — QW-1: dramaScoreLive wired to applyQW1SituationBonus',
  /sitBonus\s*=\s*applyQW1SituationBonus\(eData,\s*sport\)/.test(html),
  'dramaScoreLive must call applyQW1SituationBonus(eData, sport)');

assert('A232 — QW-1: situation bonus uses named game-state facts (not thresholds)',
  html.includes('homeGoaliePulled') && html.includes('isRedZone') && html.includes('eData.situation'),
  'applyQW1SituationBonus must read named situation facts — post-RUWT patent posture');

assert('A234 — console.log gating: ≤4 ungated (line-level FIELD_DEBUG required)',
  html.split('\n').filter(l => /console\.log\(/.test(l) && !/FIELD_DEBUG/.test(l)).length <= 4,
  'New console.log must be line-level FIELD_DEBUG-gated. ≤4 allows verified context-gated cases (Delta15 prior-line if, NHL Analytics FIELD_DEBUG block, renderProseScore early-return); bump deliberately like A189 if a new context-gated log is justified');

assert('A235 — VIBE-A: buildVibeChips defined',
  html.includes('function buildVibeChips('),
  'buildVibeChips() must be a named function — required for card template + smoke assertability');

assert('A236 — VIBE-A: isCrunchTimeGame defined (QW-1 enablement)',
  html.includes('function isCrunchTimeGame('),
  'isCrunchTimeGame() must be a named function — VIBE-A CRUNCH TIME badge + smoke assertability');

assert('A237 — VIBE-A: .vibe class in stylesheet',
  html.includes('.vibe{') && html.includes('.ganalytics{'),
  '.vibe and .ganalytics CSS must be present');

// ── G-INF-1: PGA Tour GraphQL relay infrastructure (May 29 2026) ───────────
assert('A240 — G-INF-1: PGATOUR_RELAY constant defined',
  html.includes("PGATOUR_RELAY    = 'https://field-relay-nba.jeffunglesbee.workers.dev/pgatour'"),
  'PGATOUR_RELAY must point to field-relay-nba /pgatour route');

assert('A241 — G-INF-1: fetchPGATourStat defined',
  html.includes('async function fetchPGATourStat('),
  'fetchPGATourStat() must be defined — PGA Tour GraphQL stats relay fn');

assert('A242 — G-INF-1: ESPN golf leaderboard extraction present',
  html.includes('window._espnGolfLB') && html.includes('competitors.length > 0'),
  'ESPN golf competitors[] must be extracted to window._espnGolfLB — not discarded');

console.log(`\n── Results: ${pass} passed, ${fail} failed ──────────────\n`);
if (fail > 0) process.exit(1);


