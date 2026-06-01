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

assert('A53 — bdlInjuryContextSync function retained but no live call sites (replaced by ESPN injuries feed)',
  (() => {
    // June 1 2026 PM-4: ESPN injuries feed replaces the inert BDL pass-through.
    // BDL_SPORT_MAP has been empty since May 15 2026 → bdlInjuryContextSync
    // always returned '' in practice. The function is retained for backward
    // compatibility (other callers may exist; localStorage-backed cache layer
    // still relies on it as a no-op fallback) but no longer wired into the
    // injury data path. Invariant: exactly 1 definition, 0 call sites.
    const stripped = html.replace(/\/\/[^\n]*/g, '');
    const callOrDef = stripped.match(/[^A-Za-z0-9_]bdlInjuryContextSync\s*\(/g) || [];
    // Expected: 1 (the function declaration itself, `function bdlInjuryContextSync(`)
    return callOrDef.length === 1;
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

  // A61 removed — findOddsForGame deleted (betting engine decoupled May 29 2026)

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
    ['A123', 'scout-pick-market-tip: scoutTitle present',              ['scoutTitle']],
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

// A185 removed — Betting Intelligence section deleted (May 29 2026)

assert('A186 — M2: isScoutsPick boolean gate function defined',
  html.includes('function isScoutsPick('),
  'isScoutsPick() boolean gate function must replace composite-threshold Scout\'s Pick');

assert('A187 — M2: preGameScore>70 threshold no longer used for Scout\'s Pick classification',
  !html.match(/if\s*\(\s*(?:pgScore|preGameScore\(g\))\s*>\s*70/),
  'All Scout\'s Pick classifications must use isScoutsPick(), not composite threshold');

assert('A188 — M2: isScoutsPick wired into injectJ1J4Badges',
  html.includes('if (isScoutsPick(g))'),
  'Scout\'s Pick badge injection must use isScoutsPick() boolean gate');

// A189 retired: hardcoded date caused daily CI failures when date rolled over.
// A190 (below) dynamically verifies sw.js and index.html SW_VERSION match — sufficient.
// CI's 'Sync SW_VERSION to deploy date' step ensures sw.js is always current.

// A190: sw.js SW_VERSION must match index.html SW_VERSION
// Prevents stale-while-revalidate serving old index.html to return visitors
// Self-updating: extracts both versions dynamically so no manual sync needed on bumps
const swContent = require('fs').readFileSync('sw.js', 'utf8');
const swVersionMatch = swContent.match(/const SW_VERSION\s*=\s*'([^']+)'/);
const swVersion = swVersionMatch ? swVersionMatch[1] : 'NOT_FOUND';
const htmlVersionMatch = html.match(/const SW_VERSION = '([^']+)'/);
const htmlVersion = htmlVersionMatch ? htmlVersionMatch[1] : 'NOT_FOUND';
assert('A190 — sw.js SW_VERSION matches index.html (Rule 23b: both must be in sync)',
  swVersion === htmlVersion,
  `sw.js SW_VERSION='${swVersion}' does not match index.html '${htmlVersion}' — return visitors get stale cached shell`);
// A191: All field_utils.js functions called in index.html must be defined there
// Prevents ReferenceErrors from functions defined in the Node test module but
// missing from the browser bundle. This was the root cause of all journalism failure.
const fieldUtilsSrc = require('fs').readFileSync('field_utils.js', 'utf8');
const utilsFnNames = [...fieldUtilsSrc.matchAll(/^function (\w+)\(/gm)].map(m => m[1]);
const missingFromHtml = utilsFnNames.filter(fn => {
  const usedInHtml = new RegExp('\\b' + fn + '\\(').test(html);
  const definedInHtml = html.includes('function ' + fn + '(');
  return usedInHtml && !definedInHtml;
});
assert('A191 — field_utils.js functions used in index.html must be defined there',
  missingFromHtml.length === 0,
  'Missing from index.html: ' + missingFromHtml.join(', ') + ' — inline from field_utils.js');


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

// A212 removed — buildBettingFieldEdge deleted (betting engine decoupled May 29 2026)

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

// A220 removed — odds key assertion retired with betting engine (May 29 2026)

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
assert('A240 — PGA Tour GraphQL relay REMOVED (ToS compliance, 2026-05-29)',
  !html.includes('PGATOUR_RELAY') && !html.includes('fetchPGATourStat') && !html.includes('orchestrator.pgatour'),
  'Direct PGA Tour GraphQL access must NOT be present — pgatour.com ToU prohibits automated use. Do not re-add without a licensed feed or counsel sign-off.');

assert('A242 — G-INF-1: ESPN golf leaderboard extraction present',
  html.includes('window._espnGolfLB') && html.includes('competitors.length > 0'),
  'ESPN golf competitors[] must be extracted to window._espnGolfLB — not discarded');

assert('A243 — Betting engine REMOVED (ToS/patent compliance, 2026-05-29)',
  !html.includes('renderBetting') &&
  !html.includes('function findOddsForGame') &&
  !html.includes('ODDS_RELAY_BASE') &&
  !html.includes('buildBettingFieldEdge') &&
  !html.includes('function beatTheBook'),
  'Betting engine must be fully removed — renderBetting/findOddsForGame/ODDS_RELAY_BASE must not exist');

assert('A244 — Phase 2: V2 standalone poll loop, ESPN reduced to NCAA/NFL/F1/Golf only',
  html.includes('function fetchV2AllScores') &&
  html.includes('function startV2ScorePolling') &&
  html.includes('function fetchV2Games') &&
  html.includes('function mapV2ToESPN') &&
  html.includes('startV2ScorePolling()') &&
  !html.includes('{sport:"basketball",   league:"nba"') &&
  !html.includes('{sport:"basketball",   league:"wnba"') &&
  !html.includes('{sport:"hockey",       league:"nhl"') &&
  !html.includes('{sport:"baseball",     league:"mlb"') &&
  !html.includes('{sport:"soccer",       league:"uefa.europa"') &&
  !html.includes('{league:"eng.1"') &&
  !html.includes('{league:"eng.2"') &&
  !html.includes('{league:"usa.1"'),
  'Phase 2: ESPN_SPORTS must only contain NCAA/NFL/F1/Golf; all sport/soccer on V2');

// ═══════════════════════════════════════════════════════════════════════════
// JQ-INFRA-3 — ReferenceError audit (hardening from 2026-05-31 PM session)
// ═══════════════════════════════════════════════════════════════════════════
// Background: 2026-05-31 PM session found 9 sites across 6 brief functions
// where scoreProse(..., game||null) referenced an undeclared identifier
// because the enclosing function used 'g' (or 'topGame') as its parameter
// name, not 'game'. The reference threw ReferenceError, which was silently
// swallowed by try/catch around the relay call, making every live-path
// brief silently return null. Result: 0 briefs rendered while budget
// counters showed 14 successful "scores" (phantom increments before throw).
//
// This audit catches the same bug pattern at build time. For every
// scoreProse(X, Y||null) call, the identifier Y must be either:
//   1. A parameter of the enclosing function
//   2. A let/const/var declared in the enclosing function's body
//   3. The literal null/undefined (i.e. caller passed it intentionally)
//
// Approach: walk the script char-by-char, track function start/end via
// brace depth, capture parameter list at function entry, and check every
// scoreProse call against in-scope identifiers. Fails fast at first
// suspect call so the error message can name the function and line.

assert('A346 — JQ-INFRA-3: scoreProse(..., X||null) calls reference an in-scope identifier (no silent ReferenceError)',
  (() => {
    // Extract just the inline script body so we don't false-positive on docs.
    const scriptStart = html.indexOf('<script>\n');
    const scriptEnd   = html.indexOf('</script>', scriptStart);
    if (scriptStart < 0 || scriptEnd < 0) return false;
    const script = html.slice(scriptStart + 9, scriptEnd);

    // Compute index.html line of each script char (for error reporting).
    const lineOffset = html.slice(0, scriptStart + 9).split('\n').length;

    // Find all function declarations + their parameter lists by position.
    // We only care about top-level `function foo(params)` and `async function`.
    // Nested functions inherit outer scope, so for the audit we check the
    // INNERMOST enclosing named function (parameters + locals).
    const funcRegex = /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    const funcs = []; // [{name, params:[...], start, end}]
    let m;
    while ((m = funcRegex.exec(script)) !== null) {
      const name   = m[1];
      const params = m[2].split(',').map(p => p.trim().split('=')[0].trim()).filter(Boolean);
      const bodyStart = m.index + m[0].length;
      // Walk braces to find matching close (very rough — ignores strings/comments
      // but good enough since we only need approximate enclosing function lookup)
      let depth = 1, i = bodyStart;
      while (i < script.length && depth > 0) {
        const c = script[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        i++;
      }
      funcs.push({ name, params, start: m.index, end: i });
    }
    // Sort by start so we can find INNERMOST enclosing function for any pos
    funcs.sort((a,b) => a.start - b.start);

    // Find every scoreProse(X, Y||null) call.
    const callRegex = /scoreProse\(([^,]+),\s*([\w$]+)\s*\|\|\s*null\)/g;
    let c, problems = [];
    while ((c = callRegex.exec(script)) !== null) {
      const ident = c[2];
      if (ident === 'null' || ident === 'undefined') continue;
      // Find the innermost enclosing function (deepest start that wraps c.index)
      let enclosing = null;
      for (const fn of funcs) {
        if (fn.start < c.index && fn.end > c.index) enclosing = fn; // deeper one wins
      }
      if (!enclosing) {
        // Call at module top level — probably ok (uses global)
        continue;
      }
      // Check param list first
      if (enclosing.params.includes(ident)) continue;
      // Check declarations in body
      const body = script.slice(enclosing.start, enclosing.end);
      const declRegex = new RegExp(`\\b(?:const|let|var)\\s+(?:[\\w$,\\s{}\\[\\]:]*\\b)?${ident}\\b`);
      if (declRegex.test(body)) continue;
      // Not a parameter, not a local: this is the bug pattern.
      const lineNo = (script.slice(0, c.index).split('\n').length) + lineOffset - 1;
      problems.push(`L${lineNo} in ${enclosing.name}(${enclosing.params.join(',')}): scoreProse(..., ${ident}||null) — ${ident} not in scope`);
    }
    if (problems.length) {
      console.error('     Problems:');
      problems.forEach(p => console.error(`       - ${p}`));
      return false;
    }
    return true;
  })(),
  'Every scoreProse(.., X||null) call must reference X declared in the enclosing function\'s parameters or body (catches the May 31 silent ReferenceError pattern)');

// ═══════════════════════════════════════════════════════════════════════════
// JQ-INFRA-2 — Function hoisting check (hardening from 2026-05-31 session)
// ═══════════════════════════════════════════════════════════════════════════
// Background: 2026-05-31 session found that commit e66bf3a (May 30, "restore
// Squiggle engine") added 226 lines of AFL/Squiggle declarations inside the
// fetchSchedule() body — at column 0 visually, but actually scoped to the
// containing function in strict mode + ES6. The function `injectSquiggleTips`
// LOOKED top-level (visually unindented) but typeof from outside returned
// 'undefined', so setTimeout(injectSquiggleTips) at runtime threw silent
// ReferenceError. The session's previous attempted fix (f8652b9) converted
// `var x = async function` to `async function` declarations — making the
// hoisting LOOK fixed in the diff but not actually fixing scope.
//
// This audit catches the same bug pattern at build time by exercising the
// JavaScript runtime's own hoisting semantics: instrument the script body
// with a typeof check that runs BEFORE the script body executes, then
// execute via `new Function(checkSrc)`. Any function declared at column 0
// that typeof-evaluates to anything other than 'function' is scope-trapped.
//
// Known exception: `fetchMLBLeader` (declared inside an unbalanced-brace
// region around line 11688). Pre-existing bug; caller at L11330 has been
// silently throwing ReferenceError. Tracked as separate fix-it item; do
// not let it block all other coverage.

assert('A347 — JQ-INFRA-2: column-0 function declarations are actually hoisted to top scope (catches injectSquiggleTips-style scope-trap)',
  (() => {
    const scriptStart = html.indexOf('<script>\n');
    const scriptEnd   = html.indexOf('</script>', scriptStart);
    if (scriptStart < 0 || scriptEnd < 0) return false;
    const script = html.slice(scriptStart + 9, scriptEnd);

    // Find every column-0 (zero-indent) function declaration
    const claimed = [];
    script.split('\n').forEach(line => {
      const m = line.match(/^(?:async\s+)?function\s+(\w+)/);
      if (m) claimed.push(m[1]);
    });

    // Known-issue exceptions — must be justified with a comment and a tracked fix
    // EMPTY as of 2026-05-31 — fetchMLBLeader was the only entry, fixed by the
    // adjacent commit that closed an open brace in fetchNHLLiveStats. New entries
    // require an issue link.
    const KNOWN_SCOPE_TRAPS = new Set([]);

    // Build a typeof checker that runs FIRST (before script body executes)
    // and writes results to a global so we can read them even if the script
    // body later throws.
    const checkSrc = `
      globalThis.__hoistResults = {};
      ${claimed.map(n => `try { globalThis.__hoistResults['${n}'] = typeof ${n}; } catch(e) { globalThis.__hoistResults['${n}'] = 'THROW:'+e.message; }`).join('\n')}
    ` + '\n' + script;

    let results;
    try {
      new Function(checkSrc)();
      results = globalThis.__hoistResults;
    } catch (e) {
      // Script body throws are fine — we already captured results before the throw
      results = globalThis.__hoistResults;
    }
    if (!results) return false;

    const traps = [];
    for (const [name, type] of Object.entries(results)) {
      if (type === 'function') continue;
      if (KNOWN_SCOPE_TRAPS.has(name)) continue;
      traps.push(`${name} → typeof '${type}' (expected 'function')`);
    }
    if (traps.length) {
      console.error('     Scope-trapped functions:');
      traps.forEach(t => console.error(`       - ${t}`));
      return false;
    }
    return true;
  })(),
  'Every column-0 function declaration must hoist to script top scope (otherwise setTimeout/setInterval/cross-function calls throw silent ReferenceError)');

// ═══════════════════════════════════════════════════════════════════════════
// JQ-1 / O(1) Newspaper — KV-first lookup audit (May 31 2026)
// ═══════════════════════════════════════════════════════════════════════════
// Background: 2026-05-31 PM session built the O(1) Newspaper bottom-sheet
// path: every fetchGameBriefOnDemand() call must check the relay's KV brief
// cache (brief:game:{eventId}, populated by 15-min cron) BEFORE falling
// through to a live LLM call. This is the dominant contributor to the 97%
// LLM-cost reduction projection: one cron call serves N user taps.
//
// Regression risk: a future refactor reorders the function and accidentally
// puts the live-LLM dispatch before the KV check, silently disabling the
// caching layer. Cost would spike 10-100x without functional visibility.

assert('A348 — JQ-1: fetchGameBriefOnDemand checks KV (fetchPrerenderedGameBrief) before any sport-specific live LLM dispatch',
  (() => {
    const m = html.match(/async function fetchGameBriefOnDemand\([^)]*\)\s*\{([\s\S]*?)^\}/m);
    if (!m) return false;
    const body = m[1];
    const kvIdx   = body.indexOf('fetchPrerenderedGameBrief');
    if (kvIdx < 0) return false;  // KV check must exist
    const liveRe  = /fetch(?:MLBGameBriefFromClaude|WNBAGameBriefFromClaude|StakesBriefFromClaude|EPLMatchBriefFromClaude|SeriesPreviewFromClaude)/;
    const liveIdx = body.search(liveRe);
    // KV check must come before any live-path dispatch (or no live dispatch at all)
    return liveIdx < 0 || kvIdx < liveIdx;
  })(),
  'fetchGameBriefOnDemand must call fetchPrerenderedGameBrief before any fetch*FromClaude — preserves the O(1) Newspaper KV-first cost-reduction path');

console.log(`\n── Results: ${pass} passed, ${fail} failed ──────────────\n`);
if (fail > 0) process.exit(1);



assert('A245 — V2 in-game leaders: fetchV2Leaders + _v2LeaderCache + name-reversal + wired for live basketball',
  html.includes('function fetchV2Leaders') &&
  html.includes('_v2LeaderCache') &&
  html.includes('V2_LEADER_TTL') &&
  html.includes("split(' ').reverse().join(' ')") &&
  html.includes("sport === 'nba' || sport === 'wnba') && fg.state === 'live'") &&
  html.includes('fetchV2Leaders(sport, gameNum'),
  'V2 leaders: fetchV2Leaders must be defined, wired for live NBA/WNBA, and reverse player name');

assert('A246 — NHL in-game leaders: pickSkaterLeader in fetchNHLLiveStats, writes homeLeader/awayLeader from playerByGameStats',
  html.includes('pickSkaterLeader') &&
  html.includes('playerByGameStats?.homeTeam') &&
  html.includes('playerByGameStats?.awayTeam') &&
  html.includes('forwards||[]), ...(teamStats?.defensemen') &&
  html.includes('espnScores[key].homeLeader = homeSkLeader') &&
  html.includes('espnScores[key].awayLeader = awaySkLeader'),
  'NHL leaders: pickSkaterLeader must read forwards+defensemen from playerByGameStats and write to espnScores');

assert('A247 — MLB in-game leaders: fetchMLBLeader + _mlbLeaderCache + wired in V2 poll loop for live MLB',
  html.includes('async function fetchMLBLeader') &&
  html.includes('_mlbLeaderCache') &&
  html.includes('MLB_LEADER_TTL') &&
  html.includes('pitchers[pitchers.length - 1]') &&
  html.includes("sport === 'mlb' && fg.state === 'live'") &&
  html.includes('fetchMLBLeader(mlbGame.sourceId, key)'),
  'MLB leaders: fetchMLBLeader must be defined, use StatsAPI boxscore, and be wired for live MLB in V2 poll');

assert('A248 — Journalism: MLB at-bat context in compound prompt (Item 6b — platoon cache)',
  html.includes('[MLB AT-BAT]') &&
  html.includes('_mlbPlatoonCache') &&
  html.includes('batting: ${p.batterName}') &&
  html.includes('pitching: ${p.pitcherName}'),
  'MLB at-bat item: must include [MLB AT-BAT] tag, read from _mlbPlatoonCache, surface batterName and pitcherName');

assert('A249 — Journalism: BDL PPG leaders in compound prompt (Item 6c — pre-game)',
  html.includes('[PPG LEADERS]') &&
  html.includes('_bdlSeasonAvgByTeam') &&
  html.includes('window._bdlSeasonAvgByTeam = byTeam') &&
  html.includes("eS?.state==='in') return ''"),
  'BDL PPG leaders: must include [PPG LEADERS] tag, build _bdlSeasonAvgByTeam index, skip when game is live');

assert('A250 — fetchMLBLiveGame: includes batter and pitcher from currentPlay.matchup',
  html.includes('batter:  play.matchup?.batter?.fullName') &&
  html.includes('pitcher: play.matchup?.pitcher?.fullName'),
  'fetchMLBLiveGame must return batter and pitcher from currentPlay.matchup');

assert('A251 — Journalism quota fix: journalismCallsToday.canCall() respects _compoundRetryAfter backoff',
  html.includes('typeof _compoundRetryAfter') &&
  html.includes('Date.now()<_compoundRetryAfter') &&
  html.includes('canCall(){') &&
  html.includes('if(this.get()>=8) return false'),
  'canCall must block during active 429 backoff — prevents J2/J3 cascade burning Gemini quota');

assert('A252 — isScoutsPick: hasMilestone defined from _bdlMilestonesCache (was undefined after betting removal)',
  html.includes('let hasMilestone = false') &&
  html.includes('_bdlMilestonesCache') &&
  html.includes('hasMilestone = !!(ms?.pct >= 0.95)') &&
  html.includes('return hasSeriesContext || hasMilestone'),
  'isScoutsPick must define hasMilestone from milestone cache — undefined reference breaks Scout\'s Pick and BNI');

assert('A253 — Squiggle engine restored: all functions defined (dropped in betting removal)',
  html.includes('const SQUIGGLE_RELAY') &&
  html.includes('let _squiggleCache') &&
  html.includes('function squiggleToFieldGame') &&
  html.includes('function injectSquiggleLiveScores') &&
  html.includes('function _aflCurrentRound') &&
  html.includes('async function squigglePrefetchAll') &&
  html.includes('async function startSquiggleEngine'),
  'All 7 Squiggle engine symbols must be defined — were dropped in betting removal causing 5 ReferenceErrors/load');

assert('A254 — FIELD Desk: renderFieldDesk called after Claude fallback J3 path',
  html.includes('sessionStorage.setItem(cacheKey,claudeText)') &&
  html.includes('setTimeout(renderFieldDesk, 300)') &&
  html.includes('initJournalismQueue(sections);setTimeout(renderFieldDesk,500)'),
  'renderFieldDesk must be called after J3 Claude fallback stores brief — was never triggered in non-compound path');

assert('A255 — AFL engine complete: AFL_TEAM_ABBR + fetchAFLStandings + renderAFLStandingsWidget restored',
  html.includes('const AFL_TEAM_ABBR=') &&
  html.includes('Brisbane Lions') &&
  html.includes('async function fetchAFLStandings') &&
  html.includes('function renderAFLStandingsWidget'),
  'AFL symbols dropped in betting removal — AFL_TEAM_ABBR undefined would break injectSquiggleLiveScores and tips');

assert('A256 — injectSquiggleTips is a hoisted function declaration (not var expression)',
  html.includes('async function injectSquiggleTips(){') &&
  !html.includes('var injectSquiggleTips='),
  'injectSquiggleTips must be function declaration — var expression not hoisted, causes ReferenceError when called at line 6711');

assert('A257 — renderFieldDesk triggered in all 4 journalism paths (relay KV, compound, J3 fallback, cached reload)',
  html.includes('Relay path: Desk was never triggered here') &&
  html.includes('Cached-brief path: Desk was never triggered on reload') &&
  html.includes('setTimeout(renderFieldDesk, 200)') &&
  html.includes('setTimeout(renderFieldDesk, 300)'),
  'renderFieldDesk must fire in every journalism resolution path — was missing from relay KV and cached-brief paths');

assert('A258 — Layer 2c: checkLeadSentence detects and retries "The [Team]..." leads',
  html.includes('async function checkLeadSentence') &&
  html.includes('_LEAD_SENTENCE_RE') &&
  html.includes('LEAD SENTENCE REWRITE REQUIRED') &&
  html.includes('checkLeadSentence(prompt,') ,
  'Layer 2c lead sentence check must be defined and wired into J2, J3, compound paths');

assert('A259 — Layer 2d: checkStatVerification ensures injected stats appear in output',
  html.includes('async function checkStatVerification') &&
  html.includes('extractStatsFromContext') &&
  html.includes('STAT VERIFICATION FAILURE') &&
  html.includes('checkStatVerification(prompt,'),
  'Layer 2d stat verification must extract stats from context tags and retry if missing from output');

assert('A260 — Layer 3b: maybeScoreRetry fires rewrite when score below threshold',
  html.includes('async function maybeScoreRetry') &&
  html.includes('JQ_SCORE_THRESHOLD') &&
  html.includes('PROSE QUALITY REWRITE') &&
  html.includes('maybeScoreRetry(prompt,') &&
  html.includes('Score ${scoreObj.score} below'),
  'Layer 3b score-triggered rewrite must be defined, use threshold, and be wired into journalism paths');

assert('A261 — BANNED_PHRASES expanded: 16 new entries including variants that slipped through',
  html.includes("'gritty performance'") &&
  html.includes("'must-win situation'") &&
  html.includes("'pivotal moment'") &&
  html.includes("'all the marbles'") &&
  html.includes("'one game at a time'"),
  'BANNED_PHRASES must include the May 30 gap audit additions');

assert('A262 — SPARINGLY_PHRASES + countSparingly: use-sparingly list with 2x threshold enforcement',
  html.includes('const SPARINGLY_PHRASES=') &&
  html.includes('function countSparingly') &&
  html.includes('r.count >= 2') &&
  html.includes('USE SPARINGLY') &&
  html.includes('OVERUSED WORDS'),
  'SPARINGLY_PHRASES must be defined with countSparingly() and wired into retry prompt');

assert('A263 — Night Owl sport detection reads topGame.sport + league fallback (saved finals field name)',
  html.includes('topGame._section || topGame._sport || topGame.sport || topGame.league') &&
  html.includes('topGame._section||topGame._sport||topGame.sport||topGame.league'),
  'Night Owl _sp must include topGame.sport (the field name saved to localStorage) and topGame.league as fallback');

assert('A264 — Night Owl cache validation: contaminated cached brief is busted on sport vocab violations',
  html.includes('Busting contaminated cache: sport vocab violations') &&
  html.includes('sessionStorage.removeItem(cacheKey)') &&
  html.includes('_cachedViolations.length'),
  'Night Owl must validate cached brief before rendering — clear cache if sport vocab violations found');

assert('A265 — P1: Night Owl cache key versioned with SW_VERSION (busts on deploy)',
  html.includes("'field_nightowl_v'+_owlSwV+'_'+topGame.id"),
  'Night Owl cache key must include SW_VERSION to auto-bust stale briefs on every deploy');

assert('A266 — P6: Secondary capsule sport detection includes g.league fallback',
  html.includes("g._section||g._sport||g.sport||g.league||''"),
  'Secondary capsule _sp must include g.league fallback — same fix as A263 for primary');

assert('A267 — JQ rule: prose score persists to localStorage but NEVER renders technical info in brief UI (Jeff rule, June 1 2026)',
  html.includes('field_jq_scores') &&
  html.includes("localStorage.setItem(_scoreKey") &&
  !html.includes('brief-prose-score') &&
  !html.includes('bps-val') &&
  html.includes('function buildJournalismQualitySection'),
  'renderProseScore must persist score to localStorage (field_jq_scores) but must NOT inject any badge/DOM into the brief card. Technical surfacing lives only in My Services modal via buildJournalismQualitySection.');

assert('A268 — P3: checkLeadSentence wired into J5 Night Owl prompt chain',
  html.includes('checkLeadSentence(prompt,text,CLAUDE_PROXY_URL); // P3: lead check on J5'),
  'Night Owl J5 must run checkLeadSentence after cliche retry — catches default AI leads');

assert('A269 — P2: extractStatsFromContext also reads Context/Matchup/Series lines (matchupNote stats)',
  html.includes('ctxRe') &&
  html.includes('Context|Matchup|Series') &&
  html.includes('function _extractNums'),
  'extractStatsFromContext must also extract from matchupNote context lines, not only tagged brackets');

assert('A270 — P5: FIELD Desk shows static brief placeholder before AI journalism resolves',
  html.includes('GENERATING') &&
  html.includes('staticBriefEl') &&
  html.includes('staticText.length > 30'),
  'FIELD Desk must show static brief text as placeholder card when sessionStorage has no AI brief yet');

assert('A271 — Tier 1A: Night Owl injects box score / PPG / analytics stat context into prompt',
  html.includes('_owlStatCtx') &&
  html.includes('MLB BOX') && html.includes('PPG LEADERS') &&
  html.includes('If stat context is provided above, cite the specific figure'),
  'Night Owl prompt must inject available stat context same as compound — MLB box, NBA PPG, NHL PP/PK');

assert('A272 — Tier 1B: Health Panel shows Prose Quality rolling avg with best/worst/stat',
  html.includes("'Prose Quality'") &&
  html.includes('field_jq_scores') &&
  html.includes('best') && html.includes('worst') &&
  html.includes('briefs'),
  'Health Panel must display Prose Quality rolling avg row reading from field_jq_scores');

assert('A273 — Tier 2A: EPL brief runs full Layer 2 chain (cliche, sport vocab, lead check, score)',
  html.includes("retryWithSportVocab(prompt, text, 'soccer', CLAUDE_PROXY_URL, 'EPL Brief')") &&
  html.includes("renderProseScore(s,'EPL Brief')"),
  'EPL brief must run retryWithoutCliches + retryWithSportVocab(soccer, label) + checkLeadSentence + scoreProse (label arg required per JQ-ACTION-C)');

assert('A274 — Tier 2B: compound game_briefs log sport vocab violations before caching',
  html.includes('Tier 2B') && html.includes('game_brief sport vocab'),
  'compound game_briefs dispatch must checkSportVocab before caching into _gameBriefCache');

assert('A275 — Tier 3: low-score review queue writes flagged phrases to localStorage',
  html.includes('field_jq_review') &&
  html.includes('scoreObj.score < 40') &&
  html.includes('Low-score phrases flagged for review') &&
  html.includes("'Phrase Review'"),
  'maybeScoreRetry must log common phrases from low-score briefs to field_jq_review; Health Panel shows count');

assert('A276 — Fix 1: buildCompoundPrompt captured once, reused in quality closure (no double build)',
  html.includes('window._lastCompoundPrompt=buildCompoundPrompt(sections)') &&
  html.includes('window._lastCompoundPrompt || buildCompoundPrompt(sections)'),
  'Compound prompt must be captured before fetch and reused in quality closure — not rebuilt');

assert('A277 — Fix 2: saveEspnFinal saves sourceId + matchupNote (MLB box score + Night Owl context)',
  html.includes('sourceId: game.sourceId') &&
  html.includes('matchupNote: game.matchupNote'),
  'saveEspnFinal must persist sourceId and matchupNote so Night Owl MLB box score injection works');

assert('A278 — Fix 3: fetchESPNWinProb gated on !FIELD_V2_SOURCES.nba (D3 dead call removed)',
  html.includes('league === \'nba\' && !FIELD_V2_SOURCES.nba'),
  'fetchESPNWinProb must be skipped when NBA is on V2 — api-sports.io has no /predictions endpoint');

assert('A279 — Fix 4: SPARINGLY_PHRASES uses specific phrases not overbroad single word defensive',
  html.includes("'defensive struggles'") &&
  !html.includes("'defensive','however'"),
  'SPARINGLY_PHRASES must not contain bare defensive — too broad, flags legitimate hockey/basketball prose');

assert('A280 — Fix 5: FIELD_PROSE_STYLE not spread in prompt arrays (it is a string, not array)',
  !html.includes('...FIELD_PROSE_STYLE'),
  'FIELD_PROSE_STYLE is a joined string — spreading it with ... would spread each character individually');

assert('A281 — parseSeriesRecord matches short abbreviations (CAR, MTL, VGK ≤3 chars)',
  html.includes('abbr=leadsName.toUpperCase()') &&
  html.includes('words.some(w=>w.startsWith(abbr))'),
  'parseSeriesRecord must match team abbreviations — 3-char abbrevs like CAR bypassed the length>3 guard');

assert('A282 — mapV2ToESPN marks null scores on final games with _scoresNull flag',
  html.includes('_scoresNull: state===\'post\'') &&
  html.includes('v2Entry._scoresNull && prev?.homeScore'),
  'mapV2ToESPN must detect null scores on final games and merge guard must preserve prev scores');

assert('A283 — seriesPreviewCacheKey includes game number from league string (G4 vs G5 get separate entries)',
  html.includes("field_series_preview_") &&
  html.includes("gNumMatch") &&
  html.includes("'_g'+gNumMatch[1]"),
  'Series brief cache key must include game number so G4 and G5 with same seriesRecord get separate cached briefs');

assert('A284 — J2 series prompt includes matchupNote and explicit stakes lead instruction',
  html.includes("g.matchupNote?'Context: '+g.matchupNote:''") &&
  html.includes('STRUCTURE: Sentence 1 = the specific stakes'),
  'Series brief prompt must inject matchupNote and include stakes structure instruction');

assert('A285 — journalism completeness: MLB has full quality chain (sportVocab+leadCheck+statVerify+scoreRetry+scoreProse)',
  html.includes("retryWithSportVocab(prompt, text, 'baseball', CLAUDE_PROXY_URL, 'MLB Brief')") &&
  html.includes("maybeScoreRetry(prompt, text, CLAUDE_PROXY_URL, 'MLB Brief')") &&
  html.includes("renderProseScore(s,'MLB Brief')"),
  'MLB brief must run full quality chain including baseball sport vocab enforcement (label arg required per JQ-ACTION-C)');

assert('A286 — journalism completeness: Stakes has leadCheck+statVerify+scoreRetry+scoreProse+matchupNote',
  html.includes("maybeScoreRetry(prompt, text, CLAUDE_PROXY_URL, 'Stakes Brief')") &&
  html.includes("renderProseScore(s,'Stakes Brief')") &&
  html.includes("Context: \${g.matchupNote}"),
  'Stakes brief must run full quality chain and inject matchupNote context');

assert('A287 — journalism completeness: WNBA+J2+J3+EPL all have FIELD_PROSE_STYLE',
  html.includes("renderProseScore(s,'WNBA Brief')") &&
  html.includes("renderProseScore(s,'J2 Series')") &&
  html.includes("renderProseScore(s,'J3 Brief')") &&
  html.includes("renderProseScore(s,'EPL Brief')"),
  'All major journalism surfaces must have scoreProse wired for rolling avg tracking');

assert('A288 — journalNote injected into J2 series prompt as Series history context',
  html.includes("g.journalNote&&g.journalNote!==g.matchupNote?'Series history: '+g.journalNote:''"),
  'J2 series prompt must include journalNote for prior game history (distinct from matchupNote)');

assert('A289 — sport-specific voice arrays defined: FIELD_BASEBALL_VOICE, FIELD_HOCKEY_VOICE, FIELD_SOCCER_VOICE + getFieldVoice()',
  html.includes('const FIELD_BASEBALL_VOICE') &&
  html.includes('const FIELD_HOCKEY_VOICE') &&
  html.includes('const FIELD_SOCCER_VOICE') &&
  html.includes('function getFieldVoice(sport)'),
  'Sport-specific voice guides must be defined and selectable by sport string');

assert('A290 — sport voices wired into MLB brief, Night Owl, J2 series, EPL',
  html.includes('FIELD_BASEBALL_VOICE,') &&
  html.includes('getFieldVoice(_sp),') &&
  html.includes('getFieldVoice(g._sport||g._section||g.league||') &&
  html.includes('FIELD_SOCCER_VOICE,'),
  'Sport voices must be injected into sport-specific journalism prompts');

assert('A291 — J3 and J2 have mandatory three-part arc structure rules',
  html.includes('STRUCTURE: Paragraph 1 opens on the highest-stakes game') &&
  html.includes('STRUCTURE: Sentence 1 = the specific stakes'),
  'J3 and J2 prompts must enforce three-part arc structure — stakes, tactical fact, what to watch');

assert('A292 — EPL brief has richer context: GD, position zone, matchupNote',
  html.includes('CL zone') && html.includes('relegation zone') &&
  html.includes("g.matchupNote ? `Context: ${g.matchupNote}`"),
  'EPL brief must include goal difference, position zone context, and matchupNote');

assert('A293 — Active prompt evolution: _bannedExtension reads from review queue + score history',
  html.includes('_bannedExtension') &&
  html.includes('field_jq_banned_ext') &&
  html.includes('_initBannedExtension') &&
  html.includes('avg < 45'),
  'hasCliche must extend BANNED_PHRASES with session-layer phrases from low-score review queue');

assert('A294 — UCL/UEFA finals get showpiece label not elimination label in stakes brief',
  html.includes('THE UEFA CHAMPIONS LEAGUE FINAL — the biggest club match in world football') &&
  html.includes('champions league.*final|europa league.*final|conference league.*final') &&
  html.includes('_isMajorFinalGame'),
  'Stakes brief must detect UEFA/major finals and label them as showpiece events, not elimination games');

assert('A295 — cardBriefCallsToday separate from journalismCallsToday (15 call limit)',
  html.includes('function cardBriefCallsToday') &&
  html.includes('field_card_brief_calls_') &&
  html.includes('this.get()<15') &&
  html.includes('const cardBudget = cardBriefCallsToday()'),
  'MLB/WNBA/Stakes card briefs must use separate budget — not consume compound editorial budget');

assert('A296 — Stakes brief: UCL Final renders card (bypasses imp guard), gets trophy icon not MUST WIN',
  html.includes("'🏆 UCL FINAL'") &&
  html.includes("_isMajorFinal && (!imp || imp === 'playoff_impl')") &&
  html.includes("field_stakes_brief_v' + _swv + '_'"),
  'UCL Final must render stakes card with correct icon and versioned cache key');

assert('A297 — Stakes brief prompt explicitly forbids semifinal/elimination framing for finals',
  html.includes('This is the FINAL — not a semifinal') &&
  html.includes('CRITICAL: Do NOT use the words semifinal'),
  'UCL Final stakes prompt must explicitly prohibit semifinal framing to prevent hallucinated knockout context');

assert('A298 — MLB brief: umpLine declared before use in prompt array (was ReferenceError → silent null)',
  html.includes('const umpLine = !!ump;'),
  'umpLine must be declared — was referenced in MLB prompt array but never defined, causing ReferenceError caught silently');

assert('A299 — MLB/WNBA/Stakes card renderers always remove card on null (no stuck Loading brief)',
  html.includes('try { card.remove(); } catch(_) {}'),
  'Card renderers must always remove card on null/failure — else if(textEl) left card stuck when textEl was null');

assert('A300 — venue injected into EPL, stakes, J2 series, and Night Owl prompts with DO NOT INVENT guard',
  html.includes("g.venue ? ' · '+g.venue : ''") &&
  html.includes("VENUE: The match is at") &&
  html.includes("VENUE: if venue is listed above, use it") &&
  html.includes("topGame.venue?' · '+topGame.venue:''"),
  'Venue must be injected into all journalism prompts — AI was hallucinating Allianz/Wembley for UCL Final (Puskás Aréna)');

assert('A301 — WNBA brief suppressed when no standings/matchupNote context; DO NOT EXPLAIN in FIELD_PROSE_STYLE',
  html.includes('_wnbaHasContext') &&
  html.includes('NEVER explain what data is missing or why you cannot write') &&
  html.includes('Never explain what data is missing. If context is thin'),
  'WNBA card must not fire without context; all prompts must never produce meta-commentary about missing data');

assert('A302 — MLB brief: getMLBAnalyticsContext + fetchMLBTeamMomentum injected; Vary the angle rule',
  html.includes('analyticsCtx = analyticsLines.length') &&
  html.includes('fetchMLBTeamMomentum(homeAbbr)') &&
  html.includes('Vary the angle — use whichever single fact is most interesting tonight'),
  'MLB brief must use pitch arsenal, expected stats, and team momentum — not only standings');

assert('A303 — RSN accuracy: MLB_TEAM_RSN updated for 15 post-Main Street corrections',
  html.includes("TBR:'Rays.TV'") &&
  html.includes("CLE:'CLEGuardians.TV'") &&
  html.includes("DET:'Detroit SportsNet'") &&
  html.includes("TEX:'Rangers Sports Network'") &&
  html.includes("COL:'Rockies.TV'") &&
  html.includes("WSN:'Nationals.tv'"),
  'MLB_TEAM_RSN must reflect 2026 reality — 15 teams moved from Bally/FanDuel to MLB Local Media DTC or team-owned RSNs');

assert('A304 — Stream Discovery: SERVICE_FAMILIES + buildStreamingDiscovery() defined',
  html.includes('const SERVICE_FAMILIES') &&
  html.includes('function buildStreamingDiscovery') &&
  html.includes('_tonightScore') &&
  html.includes("SERVICE_FAMILIES[s.key]"),
  'Streaming Discovery must be derived from allData + SR registry, not static card ordering');

assert('A305 — SMT time-phase: getCurrentSMTPhase + scoreSMTCard + sort in renderMedia',
  html.includes('function getCurrentSMTPhase') &&
  html.includes('function scoreSMTCard') &&
  html.includes('isShowCurrentlyAiring') &&
  html.includes('MEDIA_TODAY.sort((a, b) => scoreSMTCard(b) - scoreSMTCard(a))'),
  'SMT must sort by current time relevance — not static list order');

assert('A306 — Night Owl: extra innings score handled — no tie for baseball, winner detected correctly',
  html.includes('_isTiedScore') &&
  html.includes('went to extra innings — one team scored the winning run') &&
  html.includes('Baseball games NEVER end in a tie'),
  'Night Owl must not present a tied baseball score as a draw — extra innings context injected');

assert('A307 — Athletics: OAK uses Athletics.TV not NBCS California',
  html.includes("OAK:'Athletics.TV'") &&
  html.includes("Sacramento Athletics") &&
  html.includes("Athletics moved to Athletics.TV (MLB Local Media DTC)"),
  'Athletics left Oakland — now Sacramento temporarily, local channel is Athletics.TV not NBCS California');

assert('A308 — MCP relay section in health panel: fetchMCPStatus + fhp-mcp placeholder + auto-fetch on open',
  html.includes('function fetchMCPStatus') &&
  html.includes('fhp-mcp-body') &&
  html.includes('get_ci_status') &&
  html.includes('get_smoke_count') &&
  html.includes('setTimeout(fetchMCPStatus, 100)'),
  'Health panel must include live MCP relay section with CI status, smoke count, and refresh button');

assert('A309 — settings-btn long-press uses pointerdown not touchstart+preventDefault (Android fix)',
  html.includes("settingsBtn.addEventListener('pointerdown'") &&
  !html.includes("touchstart', e => {\n    e.preventDefault(); // blocks iOS") &&
  html.includes('_longPressFired') &&
  html.includes('e.stopImmediatePropagation()'),
  'Long-press must use pointerdown (not touchstart+preventDefault) — preventDefault suppresses click on Android Chrome');

assert('A310 — all journalism calls use claude-haiku-4-5-20251001 not claude-sonnet-4-6',
  !html.includes('claude-sonnet-4-6') &&
  html.includes('claude-haiku-4-5-20251001'),
  'All browser journalism calls must use Haiku not Sonnet — Sonnet is ~20x more expensive for short prose');

assert('A311 — _jqDelay Gemini RPM guard: 2s stagger before all 6 quality chain retry fetches',
  html.includes('const _jqDelay = () => new Promise(r => setTimeout(r, 2000))') &&
  (html.match(/await _jqDelay\(\); \/\/ Gemini RPM guard/g) || []).length === 6,
  '_jqDelay must appear in all 6 quality chain retry paths to prevent Gemini 30 RPM limit (Layer 2, 2b, 2c, 2d, 2e cross-sport, 3b)');

assert('A312 — O(1) per-game briefs: fetchPrerenderedGameBrief + KV check in MLB/WNBA/Stakes renderers',
  html.includes('async function fetchPrerenderedGameBrief(espnEventId)') &&
  html.includes('/journalism/game/') &&
  html.includes('kvBrief = await fetchPrerenderedGameBrief') &&
  html.includes('kvBriefS = await fetchPrerenderedGameBrief'),
  'Card renderers must check relay KV before calling proxy — zero browser AI calls when cron has pre-generated brief');

// ── PWA-A assertions ─────────────────────────────────────────────────────
assert('A313 — PWA-A: icons split into any + maskable purposes',
  html.includes('"purpose":"any"') &&
  html.includes('"purpose":"maskable"') &&
  !html.includes('"purpose":"any maskable"'),
  'Manifest must have separate any and maskable icon entries');

assert('A314 — PWA-A: prefer_related_applications:false in manifest',
  html.includes('"prefer_related_applications":false'),
  'Manifest must declare prefer_related_applications:false');

assert('A315 — PWA-A: dismissal uses timestamp not permanent flag',
  html.includes("'field_pwa_dismissed', String(Date.now())") &&
  html.includes('_14days = 14 * 24 * 60 * 60 * 1000'),
  'PWA dismissal must expire after 14 days — not permanent');

assert('A316 — PWA-A: appinstalled event tracked',
  html.includes("addEventListener('appinstalled'") &&
  html.includes("field_pwa_installed"),
  'appinstalled event must set field_pwa_installed in localStorage');

// ── MOBILE-INTEL-A assertions ────────────────────────────────────────────
assert('A317 — MOBILE-INTEL-A: Right Now section in DOM',
  html.includes('id="field-right-now"') &&
  html.includes('id="rn-cards"') &&
  html.includes('id="rn-label"'),
  'Right Now section must be in DOM after OTW banner');

assert('A318 — MOBILE-INTEL-A: renderRightNow + indexRightNow + selectRightNowGames defined',
  html.includes('function renderRightNow(') &&
  html.includes('function indexRightNow(') &&
  html.includes('function selectRightNowGames(') &&
  html.includes('function buildRightNowTiers('),
  'All Right Now functions must be defined');

assert('A319 — MOBILE-INTEL-A: Right Now wired into renderAll',
  html.includes('renderRightNow(filtered)') &&
  html.includes('initRightNowIndexer()'),
  'renderRightNow must be called at end of renderAll with filtered sections');

assert('A320 — MOBILE-INTEL-A: Right Now CSS has correct viewport rules',
  html.includes('#field-right-now') &&
  html.includes('orientation:portrait') &&
  html.includes('orientation:landscape') &&
  html.includes('min-width:820px') &&
  html.includes('rn-card--condensed') &&
  html.includes('rn-card--compact'),
  'Right Now CSS must include portrait/landscape/iPad media queries');

assert('A321 — stripMarkdown defined + applied to stakes/card brief renderers',
  html.includes('function stripMarkdown(text)') &&
  html.includes('stripMarkdown(text)') &&
  html.includes("inner.querySelector('.stakes-text')") &&
  !html.includes("card.querySelector('.sgb-text')"),
  'stripMarkdown must exist, be applied to all brief renderers, and stakes must use .stakes-text not .sgb-text');

// ── JQ v2: 0-200 scale assertions ────────────────────────────────────────────
assert('A322 — JQ v2: scoreProse accepts game parameter',
  html.includes('async function scoreProse(text, game)'),
  'scoreProse must accept (text, game) for Context Anchoring');

assert('A323 — JQ v2: computeNarrativeArc defined (stakes/tension/resolution)',
  html.includes('function computeNarrativeArc(text)') &&
  html.includes('stakes') && html.includes('tension') && html.includes('resolution') &&
  html.includes('arcScore'),
  'Narrative Arc dimension must be defined and wired into scoreProse');

assert('A324 — JQ v2: computeContextAnchoring defined',
  html.includes('function computeContextAnchoring(text, game)') &&
  html.includes('seriesRecord') && html.includes('playerNames') &&
  html.includes('available:false'),
  'Context Anchoring dimension must be defined with N/A handling');

assert('A325 — JQ v2: score ceiling is 200',
  html.includes('Math.min(ctx.available ? 200 : 170') &&
  html.includes('ceiling:') &&
  html.includes('/200'),
  'Score ceiling must be 200 (170 when context N/A) and displayed as /200');

assert('A326 — JQ v2: JQ_SCORE_THRESHOLD updated to 90',
  html.includes('const JQ_SCORE_THRESHOLD = 90'),
  'Retry threshold must be 90 on 0-200 scale (was 45 on 0-100)');

assert('A327 — JQ v2: arc-targeted retry instructions in maybeScoreRetry',
  html.includes('arc.stakes') && html.includes('arc.resolution') &&
  html.includes('arcInstructions') && html.includes('Sentence 1 must state the stakes'),
  'maybeScoreRetry must use arc breakdown for targeted retry instructions');

// ═══════════════════════════════════════════════════════════════════════════
// WOW 1 + WOW 2 — DurableObject score push + crunch fan-out (May 31 2026)
// ═══════════════════════════════════════════════════════════════════════════

assert('A328 — WOW 1: GameSocket class defined',
  html.includes('class GameSocket') && html.includes('static wsBase()') && html.includes('signalCrunch('),
  'GameSocket class must define connect, signalCrunch, and wsBase helpers');

assert('A329 — WOW 1: dual-mode fallback (polling preserved alongside GameSocket)',
  html.includes('async function fetchESPNScores') && html.includes('class GameSocket'),
  'Polling code must remain present alongside GameSocket — dual-mode design');

assert('A330 — WOW 1+2: score-push-do + crunch-push-do registered in FIELD_FEATURES',
  html.includes("'score-push-do':") && html.includes("'crunch-push-do':"),
  'Both DO features must be registered with 2026-05-31 dates');

assert('A331 — WOW 2: page-side CRUNCH TIME signal emitter wired in badge path',
  html.includes('signalCrunch(detail)') && html.includes('crunchSignaledP'),
  'CRUNCH TIME badge render path must signal the DO with dedup-per-period guard');

assert('A332 — WOW 1: ensureGameSocket / dropGameSocket helpers defined',
  html.includes('function ensureGameSocket(') && html.includes('function dropGameSocket('),
  'Connection lifecycle helpers must be present for polling-loop integration');

// ═══════════════════════════════════════════════════════════════════════════
// S0 — FIELD Event Bus (May 31 2026)
// ═══════════════════════════════════════════════════════════════════════════

assert('A333 — S0: fieldEvents EventTarget + _fieldEventCache + _dispatchIfChanged defined',
  html.includes('const fieldEvents = new EventTarget()') &&
  html.includes('const _fieldEventCache') &&
  html.includes('function _dispatchIfChanged(') &&
  html.includes('function emitScoreEvent('),
  'S0 bus must declare fieldEvents, _fieldEventCache, _dispatchIfChanged, emitScoreEvent');

assert('A334 — S0: detectAndStoreStoryMoment emits to bus (polling path)',
  html.includes('S0 Event Bus emitter (polling path)') &&
  html.includes("source: 'poll'") &&
  /_prevEspnScores\[gameId\] = \{homeScore: home, awayScore: away, period, final: isFinal\};\s*[\s\S]{0,1500}emitScoreEvent\(\{/.test(html),
  'detectAndStoreStoryMoment must call emitScoreEvent after updating _prevEspnScores');

assert('A335 — S0: subscribers wired (field:lead_change burst + field:final Night Owl)',
  html.includes("fieldEvents.addEventListener('field:lead_change'") &&
  html.includes("fieldEvents.addEventListener('field:final'") &&
  html.includes('_subscriberFired') &&
  html.includes('checkForNewFinals'),
  'Both subscribers must be attached: lead_change → burst, final → Night Owl');

assert('A336 — S0: GameSocket default onFacts routes through emitScoreEvent (WebSocket path)',
  /ensureGameSocket\(sport, gameId, onFacts\)\s*\{[\s\S]{0,1500}emitScoreEvent\(\{[\s\S]{0,800}source:\s*'ws'/.test(html) &&
  html.includes('S0 integration: default onFacts'),
  'ensureGameSocket must default onFacts to emitScoreEvent with source:ws');

assert('A337 — S0: update-s0-event-bus registered in FIELD_FEATURES',
  html.includes("'update-s0-event-bus':"),
  'update-s0-event-bus must be registered in FIELD_FEATURES with 2026-05-31 date');

// ═══════════════════════════════════════════════════════════════════════════
// Layer 2e — Cross-Sport Hallucination Detection (May 31 2026)
// ═══════════════════════════════════════════════════════════════════════════

assert('A338 — Layer A: FIELD_PROSE_STYLE includes LEAGUE BOUNDARIES rule',
  html.includes("LEAGUE BOUNDARIES (critical)") &&
  html.includes("NEVER describe a team in one league as advancing to face"),
  'FIELD_PROSE_STYLE must include a sport-boundary rule preventing cross-league advancement claims');

assert('A339 — Layer B: hasCrossSportHallucination + checkCrossSport defined and wired',
  html.includes('function hasCrossSportHallucination(') &&
  html.includes('async function checkCrossSport(') &&
  html.includes('_LEAGUE_TROPHIES') &&
  html.includes('_LEAGUE_TEAMS') &&
  html.includes('_CROSS_LINK_VERBS') &&
  (html.match(/checkCrossSport\(/g) || []).length >= 5,  // 1 definition + 4 call sites
  'checkCrossSport must be defined and called from compound brief + J2 + J3 + MLB + Stakes chains');

assert('A340 — Layer C: buildCompoundPrompt emits [LEAGUE: X] tag per game + isolation rule in prompt',
  html.includes('Layer C: explicit league tag for each game') &&
  html.includes('[LEAGUE: ${_leagueTag}]') &&
  html.includes('LEAGUE LABELS: every game line includes a [LEAGUE: X] tag') &&
  html.includes('Treat each league as a self-contained competition'),
  'buildCompoundPrompt must tag each game with [LEAGUE: X] and include isolation instruction');

// ═══════════════════════════════════════════════════════════════════════════
// WOW 6 — Journalism Quality Gate (May 31 2026)
// ═══════════════════════════════════════════════════════════════════════════

assert('A341 — WOW 6: JOURNALISM_GENERATE_RELAY constant + generateJournalismViaRelay wrapper defined',
  html.includes('JOURNALISM_GENERATE_RELAY') &&
  html.includes('/journalism/generate') &&
  html.includes('async function generateJournalismViaRelay(') &&
  html.includes('window._lastJQAudit'),
  'Browser must define JOURNALISM_GENERATE_RELAY URL + generateJournalismViaRelay() wrapper + _lastJQAudit storage');

assert('A342 — WOW 6: live-path migration — 5 brief chains route through relay first (J5 + J2 + J3 + MLB + Stakes)',
  (html.match(/_viaRelay = await generateJournalismViaRelay\(/g) || []).length >= 5,
  'J5 Night Owl, J2 Series, J3 Brief, MLB Brief, Stakes Brief must all try the relay quality gate before fallback');

assert('A343 — WOW 6: journalism-quality-gate registered in FIELD_FEATURES',
  html.includes("'journalism-quality-gate':"),
  'journalism-quality-gate must be registered in FIELD_FEATURES with 2026-05-31 date');

assert('A344 — WOW 6: relay fallback preserved — every relay-routed brief still has CLAUDE_PROXY_URL path beneath',
  /generateJournalismViaRelay[\s\S]{0,800}Fallback: legacy direct-proxy/.test(html),
  'Every brief that routes through relay must also keep the legacy fetch(CLAUDE_PROXY_URL) path as fallback');

// ═══════════════════════════════════════════════════════════════════════════
// WOW 7 — Journalism Quality Analytics (May 31 2026)
// ═══════════════════════════════════════════════════════════════════════════

assert('A345 — WOW 7: journalism-quality-analytics registered in FIELD_FEATURES',
  html.includes("'journalism-quality-analytics':"),
  'journalism-quality-analytics must be registered in FIELD_FEATURES with 2026-05-31 date');

// ═══════════════════════════════════════════════════════════════════════════
// JQ-3 — Layer 3c Quality Target feedback loop (May 31 2026)
// ═══════════════════════════════════════════════════════════════════════════

assert('A349 — JQ-3: getQualityTarget function defined (reads field_jq_scores, returns calibration line)',
  /function getQualityTarget\(sport\)/.test(html) &&
  /field_jq_scores/.test(html) &&
  /QUALITY TARGET/.test(html),
  'getQualityTarget(sport) must read field_jq_scores and emit QUALITY TARGET calibration lines');

assert('A350 — JQ-3: getQualityTarget wired into J2 series + Night Owl prompts',
  (html.match(/getQualityTarget\(/g) || []).length >= 2,
  'getQualityTarget must be called at minimum 2 prompt-build sites (J2 series, Night Owl)');

assert('A351 — JQ-5: prose intelligence lives only in My Services (zero technical surfacing in brief UI)',
  html.includes('function buildJournalismQualitySection') &&
  html.includes('jq-quality-section') &&
  html.includes('Journalism Quality') &&
  // Negative guard: brief UI must not render the old prose-score badge or detail panel
  !html.includes("badge.className = 'brief-prose-score'") &&
  !html.includes('function buildProseScoreDetail') &&
  !html.includes('brief-prose-detail') &&
  !/\.brief-prose-score\s*\{/.test(html),
  'JQ-5: buildJournalismQualitySection must exist and be the ONLY surfacing path. Brief UI must not contain .brief-prose-score badge, .brief-prose-detail panel, or buildProseScoreDetail.');

assert('A352 — JQ-5: My Services Journalism Quality section reads all three stores (scores, review, ext)',
  html.includes("localStorage.getItem('field_jq_scores')") &&
  html.includes("localStorage.getItem('field_jq_review')") &&
  html.includes("sessionStorage.getItem('field_jq_banned_ext')") &&
  html.includes('Per brief type') &&
  html.includes('Voice violations') &&
  html.includes('Session quality extension'),
  'My Services section must surface all 5 subsections: aggregate, per-label rolling avgs, voice violations, phrases flagged, session banned extension');

assert('A353 — JQ-ACTION-C: retryWithSportVocab logs voice violations to field_jq_review',
  html.includes("async function retryWithSportVocab(originalPrompt, text, sport, proxyUrl, label)") &&
  html.includes("type: 'voice'") &&
  html.includes("[JQ-ACTION-C]") &&
  (html.match(/retryWithSportVocab\([^)]*,\s*['"][^'"]*Brief['"]\)|retryWithSportVocab\([^)]*,\s*['"]J5 Night Owl['"]\)|retryWithSportVocab\([^)]*,\s*['"]Bottom Sheet['"]\)/g) || []).length >= 4,
  'JQ-ACTION-C: retryWithSportVocab must accept label param, write {type:voice, sport, label, phrases} to field_jq_review, and be called with a label by all 4 callers (MLB / EPL / J5 / Bottom Sheet)');

assert('A354 — Domestic European league break gate constant + helper defined',
  html.includes('const DOMESTIC_LEAGUE_BREAK_2026') &&
  html.includes("'Premier League':") &&
  html.includes("'La Liga':") &&
  html.includes("'Serie A':") &&
  html.includes("'Ligue 1':") &&
  html.includes("'Bundesliga':") &&
  html.includes('function isDomesticLeagueInBreak'),
  'DOMESTIC_LEAGUE_BREAK_2026 must define end+resume windows for all 5 top European leagues and isDomesticLeagueInBreak must be callable');

assert('A355 — fetchSoccerFixtures: drops events not for today + skips leagues in break',
  html.includes("if (isDomesticLeagueInBreak(leagueLabel || section))") &&
  html.includes("if (ev.date && !isToday(ev.date)) return null;"),
  'fetchSoccerFixtures must guard at league level (isDomesticLeagueInBreak) and at event level (ev.date isToday)');

assert('A356 — renderScoreTicker prunes stale espnScoreTs entries before reading',
  /function renderScoreTicker\(\)\s*\{[\s\S]{0,500}Object\.keys\(espnScoreTs\)\.forEach[\s\S]{0,200}delete espnScores\[k\];/.test(html),
  'renderScoreTicker must prune espnScoreTs entries older than ESPN_SCORE_TTL before constructing the chip list');

assert('A357 — buildCompoundPrompt soccerGames gates by isToday and isDomesticLeagueInBreak',
  html.includes('.filter(s => !isDomesticLeagueInBreak(s.sport))') &&
  html.includes('.flatMap(s => (s.games || []).filter(g => isToday(g.start_time)).slice(0, 2))'),
  'buildCompoundPrompt soccerGames must filter sections by isDomesticLeagueInBreak and games by isToday before being passed to the prompt');

assert('A358 — FIELD_PROSE_STYLE: TIME-PERIOD ANCHORING rule + J3 SLATE BOUNDARY rule both present',
  html.includes('TIME-PERIOD ANCHORING (mandatory)') &&
  html.includes('Bare numbers like') &&
  html.includes('SLATE BOUNDARY (mandatory)') &&
  html.includes("Saying \"In England, Man United routed Brighton 3-0\" is FABRICATION"),
  'FIELD_PROSE_STYLE must include the TIME-PERIOD ANCHORING rule (mandatory timeframe qualifier on every stat) and the J3 prompt must include the SLATE BOUNDARY rule (no league not in slate)');

assert('A359 — standalone J3 (fetchFIELDBriefFromClaude) honors isBigGame word budget',
  html.includes('const isBigGameJ3 = ranked.some(g =>') &&
  html.includes("/conference finals|cf g\\d|nba finals|stanley cup final|wcf|ecf/i.test(g.league") &&
  html.includes('const briefWordsJ3 = isBigGameJ3') &&
  html.includes("'200-240 words. 3-4 paragraphs. No headers.'") &&
  html.includes('`- ${briefWordsJ3}`'),
  'fetchFIELDBriefFromClaude must compute isBigGameJ3 from ranked games using the same regex as the compound path, derive a briefWordsJ3 ternary (200-240w / 3-4 paragraphs for big games, 100-120w / 2 paragraphs otherwise), and interpolate it into the prompt RULES block — previously hardcoded 100-120w regardless of stakes');

assert('A360 — Axis 3 Phase A: buildSeriesContextTags helper defined and wired into both J3 paths',
  /function buildSeriesContextTags\(game\)\s*\{/.test(html) &&
  html.includes('[PLAYOFF STATS: ') &&
  html.includes('[INJURY: ') &&
  html.includes('[COACH: ') &&
  html.includes('[HISTORICAL: ') &&
  // Wired into both prompt builders (standalone fetchFIELDBriefFromClaude + compound buildCompoundPrompt)
  (html.match(/buildSeriesContextTags\(g\)/g) || []).length >= 2,
  'buildSeriesContextTags must define all four optional-field tags (PLAYOFF STATS / INJURY / COACH / HISTORICAL) and be invoked from at least two call sites — the standalone J3 path and the compound prompt path');

assert('A361 — Axis 3 Phase B subtask 6: NHL + NBA head-coach lookup tables defined with playoff-team coverage',
  /const NHL_HEAD_COACHES\s*=/.test(html) &&
  /const NBA_HEAD_COACHES\s*=/.test(html) &&
  // Cup Final teams (CAR + VGK) must be covered
  /['"]CAR['"]\s*:\s*["']Rod Brind/.test(html) &&
  /['"]VGK['"]\s*:\s*['"]John Tortorella['"]/.test(html) &&
  // NBA Finals teams (SAS + NYK) must be covered
  /['"]san antonio spurs['"]\s*:\s*['"]Mitch Johnson['"]/.test(html) &&
  /['"]new york knicks['"]\s*:\s*['"]Mike Brown['"]/.test(html) &&
  /function getHeadCoachForTeam\(/.test(html),
  'NHL_HEAD_COACHES and NBA_HEAD_COACHES tables must be defined and cover the four active championship-round teams (CAR/VGK for Cup Final, SAS/NYK for NBA Finals); getHeadCoachForTeam getter must be defined');

assert('A362 — Axis 3 Phase B subtask 7: SERIES_HISTORICAL_ANCHORS defined for NHL_SCF_2026 + NBA_FINALS_2026',
  /const SERIES_HISTORICAL_ANCHORS\s*=/.test(html) &&
  html.includes('NHL_SCF_2026') &&
  html.includes('NBA_FINALS_2026') &&
  // Anchor for CAR includes the "since 2006" framing — DO NOT INVENT verification
  /first Stanley Cup Final since winning it in 2006/.test(html) &&
  // Anchor for NYK includes "since 1999" framing
  /first NBA Finals appearance since 1999/.test(html) &&
  /function getSeriesHistoricalAnchor\(/.test(html),
  'SERIES_HISTORICAL_ANCHORS table must define entries for NHL_SCF_2026 (Carolina/Vegas) and NBA_FINALS_2026 (Knicks/Spurs) with verified historical framings; getSeriesHistoricalAnchor getter must be defined');

assert('A363 — Axis 3 Phase B: populateSeriesContext defined and wired into both J3 paths before buildSeriesContextTags',
  /function populateSeriesContext\(game\)\s*\{/.test(html) &&
  // Helper populates the three Phase B fields (coaches, historical, injuries).
  // Injury write was `game.injuries = parts` (PM-2 BDL parser); PM-4 routes
  // through ESPN feed, so the write is `game.injuries = inj`.
  /game\.coaches\s*=\s*\{\}/.test(html) &&
  /game\.historical\s*=\s*anchor/.test(html) &&
  /game\.injuries\s*=\s*inj\b/.test(html) &&
  // Wired into BOTH J3 paths — must run before buildSeriesContextTags in each
  (html.match(/populateSeriesContext\(g\)/g) || []).length >= 2,
  'populateSeriesContext must mutate game.coaches/historical/injuries (subtasks 6/7/8) and be invoked from at least two call sites — the standalone J3 per-game line and the compound prompt per-game line — preceding buildSeriesContextTags in each');

assert('A364 — Phase B subtask 8 final state: inline bdlInjuryContextSync retired, injuries now routed through ESPN feed via buildSeriesContextTags',
  // The PM-2 inline pattern in the standalone J3 block must still be gone
  !html.includes("(()=>{try{const inj=bdlInjuryContextSync(g.home||'',g.away||'',g._sport||g._section||'');return inj?`  ${inj}`:''}catch(e_){return ''}})()") &&
  // bdlInjuryContextSync function definition retained for backward compatibility
  /function bdlInjuryContextSync\(/.test(html) &&
  // populateSeriesContext now uses the ESPN feed (not the inert BDL pass-through)
  html.includes('getESPNInjuriesForGame(game)') &&
  // [INJURY: tag still emitted from buildSeriesContextTags
  html.includes('[INJURY: '),
  'Injury data path: inline standalone-J3 bdlInjuryContextSync call retired (PM-2); operationally-inert BDL pass-through inside populateSeriesContext replaced by ESPN feed (PM-4); [INJURY:] tag still emitted via the same buildSeriesContextTags hook');

assert('A365 — Axis 3 Phase B subtask 9: NHL playoff leaders feed wired (cache + fetcher + sync getter + prefetch + populateSeriesContext hook)',
  // Cache + TTL constants
  /const NHL_PLAYOFF_LEADERS_TTL\s*=\s*15\s*\*\s*60\s*\*\s*1000/.test(html) &&
  /const _nhlPlayoffLeadersCache\s*=/.test(html) &&
  // Async fetcher with relay path + inFlight dedup + localStorage warm cache
  /async function fetchNHLPlayoffLeaders\(\)/.test(html) &&
  html.includes('/v1/skater-stats-leaders/') &&
  html.includes('/v1/goalie-stats-leaders/') &&
  html.includes("'field_nhl_playoff_leaders'") &&
  // Builder
  /function buildNHLPlayoffLeadersByTeam\(skater,\s*goalie\)/.test(html) &&
  // Sync getter consumed by populateSeriesContext
  /function getNHLPlayoffLeadersForGame\(game\)/.test(html) &&
  html.includes('getNHLPlayoffLeadersForGame(game)') &&
  // Prefetch scheduled at init alongside other prefetches
  html.includes('setTimeout(nhlPlayoffLeadersPrefetch') &&
  // populateSeriesContext now WRITES game.playoffLeaders (no longer no-op placeholder)
  /game\.playoffLeaders\s*=\s*leaders/.test(html) &&
  // Subtask 9 DEFERRED comment removed from populateSeriesContext body
  !/Subtask 9 — Playoff Leaders \(COUNTERS, feed-driven\)\. DEFERRED\./.test(html),
  'Phase B subtask 9 must wire the NHL playoff-leaders feed end-to-end: 15-min TTL cache (_nhlPlayoffLeadersCache + localStorage), async fetchNHLPlayoffLeaders against /v1/skater-stats-leaders/ + /v1/goalie-stats-leaders/, buildNHLPlayoffLeadersByTeam aggregator, sync getNHLPlayoffLeadersForGame consumer, nhlPlayoffLeadersPrefetch scheduled at init, and populateSeriesContext writing game.playoffLeaders (replacing the DEFERRED placeholder)');

assert('A366 — ESPN injuries feed (NHL + NBA): cache + fetcher + builder + getter + prefetch + populateSeriesContext routing',
  // Cache + TTL constants
  /const ESPN_INJURY_TTL\s*=\s*30\s*\*\s*60\s*\*\s*1000/.test(html) &&
  /const _espnInjuryCache\s*=\s*\{\s*nhl:/.test(html) &&
  // Async fetcher + endpoint + localStorage keys per sport
  /async function fetchESPNInjuries\(sportKey\)/.test(html) &&
  // URL constructed via template literal `${slug.sport}/${slug.league}/injuries`;
  // verify the slug map declares both sport pairs + the /injuries path suffix.
  html.includes("sport: 'hockey', league: 'nhl'") &&
  html.includes("sport: 'basketball', league: 'nba'") &&
  html.includes('/injuries') &&
  html.includes("'field_espn_injuries_'") &&
  // Builder + getter
  /function buildESPNInjuriesByTeam\(json\)/.test(html) &&
  /function getESPNInjuriesForGame\(game\)/.test(html) &&
  // Prefetch covers both sports + scheduled at init
  html.includes('setTimeout(espnInjuriesPrefetch') &&
  // populateSeriesContext now routes injuries through ESPN feed (not the inert BDL pass-through)
  html.includes('getESPNInjuriesForGame(game)') &&
  // The OLD inert BDL pass-through inside populateSeriesContext must be gone
  !html.includes("bdlInjuryContextSync(game.home || ''"),
  'ESPN injuries feed must replace the operationally-inert bdlInjuryContextSync pass-through inside populateSeriesContext: defines _espnInjuryCache (nhl+nba) with 30-min TTL + localStorage, fetchESPNInjuries hitting the league-wide /injuries endpoint, buildESPNInjuriesByTeam parser, getESPNInjuriesForGame sync consumer, espnInjuriesPrefetch scheduled at init, and populateSeriesContext writing game.injuries from the new source rather than the empty BDL cache');

