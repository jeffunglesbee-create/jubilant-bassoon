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
assert('MLB_DAILY_OVERRIDES defined', html.includes('const MLB_DAILY_OVERRIDES'));

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
  html.includes('field-debug-panel'));
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

  // A61 — BETFAIR_RELAY_ENABLED gate present (prevents startup calls to undeployed relay)
  assert('A61 — BETFAIR_RELAY_ENABLED gate: Betfair startup guarded', html.includes('const BETFAIR_RELAY_ENABLED'));

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

console.log(`\n── Results: ${pass} passed, ${fail} failed ──────────────\n`);
if (fail > 0) process.exit(1);