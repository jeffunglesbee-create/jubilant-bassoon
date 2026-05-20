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





  // ── SMOKE-1 batch: new features (A60-A64) ────────────────────────────────
  assert('A60 — standing-velocity: recordStandingsSnapshot defined',
    html && /function recordStandingsSnapshot\s*\(/.test(html));
  assert('A61 — standing-velocity: getStandingVelocity defined',
    html && /function getStandingVelocity\s*\(/.test(html));
  assert('A62 — volatility-index: getVolatilityIndex defined',
    html && /function getVolatilityIndex\s*\(/.test(html));
  assert('A63 — mlbn-live-drama-alert: shouldShowMLBNAlert defined',
    html && /function shouldShowMLBNAlert\s*\(/.test(html));
  assert('A64 — mlbn-live-drama-alert: buildMLBNAlertChip defined',
    html && /function buildMLBNAlertChip\s*\(/.test(html));

  // ── SMOKE-1 batch: high-value pre-existing features (A65-A77) ────────────
  assert('A65 — bottom-sheet: openBottomSheet defined',
    html && /function openBottomSheet\s*\(/.test(html));
  assert('A66 — card-drama-pulse: applyCardPulse defined',
    html && /function applyCardPulse\s*\(/.test(html));
  assert('A67 — card-life-stages: updateCardLifeStages defined',
    html && /function updateCardLifeStages\s*\(/.test(html));
  assert('A68 — card-story-moments: detectAndStoreStoryMoment defined',
    html && /function detectAndStoreStoryMoment\s*\(/.test(html));
  assert('A69 — comeback-probability: buildComebackProbability defined',
    html && /function buildComebackProbability\s*\(/.test(html));
  assert('A70 — bdl-relay: bdlPrefetchAll defined',
    html && /function bdlPrefetchAll\s*\(/.test(html));
  assert('A71 — live-score-ticker: renderScoreTicker defined',
    html && /function renderScoreTicker\s*\(/.test(html));
  assert('A72 — pin-floating-widget: pinGame defined',
    html && /function pinGame\s*\(/.test(html));
  assert('A73 — share-card: shareGame defined',
    html && /function shareGame\s*\(/.test(html));
  assert('A74 — drama-sparkline: buildDramaSparklineSVG defined',
    html && /function buildDramaSparklineSVG\s*\(/.test(html));
  assert('A75 — series-margins: buildSeriesMarginsDots defined',
    html && /function buildSeriesMarginsDots\s*\(/.test(html));
  assert('A76 — ember-buried-lead: evaluateEMBER defined',
    html && /function evaluateEMBER\s*\(/.test(html));
  assert('A77 — build-game-context: buildGameContext defined',
    html && /function buildGameContext\s*\(/.test(html));


  // ── BATCH 1 — Drama Engine + ViewingConditions (A78-A87) ─────────────────

  assert('A78 — drama-score-live: dramaScoreLive defined',
    html && /function dramaScoreLive\s*\(/.test(html));

  assert('A79 — situation-drama-bonus: SPORT_CRUNCH_RULES + isCrunchTime present',
    html && html.includes('SPORT_CRUNCH_RULES') && html.includes('isCrunchTime'));

  assert('A80 — statistical-extreme-notes: getStatisticalExtremes defined',
    html && /function getStatisticalExtremes\s*\(/.test(html));

  assert("A81 — b1plus-crunch-time: ViewingConditions + CRUNCH TIME badge present",
    html && html.includes('ViewingConditions') && html.includes("'CRUNCH TIME'"));

  assert('A82 — b1plus-garbage-time: isFinalPeriod + garbage-time cap present',
    html && html.includes('isFinalPeriod') && html.includes('Math.min(score, 20)'));

  assert('A83 — b1plus-j5-isblowout: isBlowout in ViewingConditions result',
    html && html.includes('isBlowout') && html.includes('ViewingConditions'));

  assert('A84 — b1plus-pulse: applyCardPulse + badge-pulse present',
    html && /function applyCardPulse\s*\(/.test(html) && html.includes('badge-pulse'));

  assert('A85 — weather-drama-bonus: wxCache + weather alert outdoor bonus in dramaScoreLive',
    html && html.includes('wxCache') && html.includes('wx?.alert') && html.includes('sitBonus'));

  assert('A86 — ember-fields-compound: EMBER BURIED LEAD in compound prompt',
    html && html.includes('[EMBER BURIED LEAD') && html.includes('_emberResultCache'));

  assert('A87 — franchise-misery-index: FRANCHISE_MISERY + getFranchiseMisery defined',
    html && html.includes('FRANCHISE_MISERY') && /function getFranchiseMisery\s*\(/.test(html));

  // ── BATCH 2 — J-Series Journalism (A88-A96) ───────────────────────────────

  assert('A88 — j1-anti-hype-cards: anti-hype badge present',
    html && html.includes('anti-hype') && html.includes('anti-hype-badge'));

  assert('A89 — j2-series-preview: buildSeriesPreviewStatic + series-preview-card',
    html && /function buildSeriesPreviewStatic\s*\(/.test(html) && html.includes('series-preview-card'));

  assert('A90 — j3-field-brief: initFIELDBrief + field-brief slot present',
    html && /function initFIELDBrief\s*\(/.test(html) && html.includes('field-brief'));

  assert("A91 — j3-momentum-briefs: DRAMA: RISING + DRAMA: COOLING in compound prompt",
    html && html.includes('DRAMA: RISING') && html.includes('DRAMA: COOLING'));

  assert('A92 — j4-scouts-pick: scout-pick-badge present',
    html && html.includes('scout-pick-badge') && html.includes('Scout\'s Pick'));

  assert('A93 — j4-scouts-pick-cards: scout-pick-card CSS + DOM class present',
    html && html.includes('scout-pick-card') && html.includes('.scout-pick-card'));

  assert('A94 — j5-night-owl: renderNightOwlRecap + night-owl-card present',
    html && /function renderNightOwlRecap\s*\(/.test(html) && html.includes('night-owl-card'));

  assert('A95 — j6-smt-notes: MEDIA_SPECIALS array present',
    html && html.includes('MEDIA_SPECIALS') && html.includes('const MEDIA_SPECIALS'));

  assert('A96 — j7-cdw-notes: cdw-notes + matchupNote present',
    html && html.includes('cdw-notes') && html.includes('matchupNote'));

  // ── BATCH 3 — Night Owl Enhancements + BDL + AFL + ATP (A97-A104) ────────

  assert('A97 — night-owl-peak-time: getDramaPeakWithTime defined',
    html && /function getDramaPeakWithTime\s*\(/.test(html));

  assert('A98 — night-owl-sustained-drama: getDramaSustained defined',
    html && /function getDramaSustained\s*\(/.test(html));

  assert('A99 — afl-drama-v5: refreshAFLSection + _aflDramaScore present',
    html && /function refreshAFLSection\s*\(/.test(html) && html.includes('_aflDramaScore'));

  assert('A100 — atp-live-scores: fetchATPLiveScores + atpIntervalId present',
    html && /function fetchATPLiveScores\s*\(/.test(html) && html.includes('atpIntervalId'));

  assert('A101 — bdl-injury-compound: bdlInjuryContextSync defined',
    html && /function bdlInjuryContextSync\s*\(/.test(html));

  assert('A102 — bdl-milestones-p2c: _bdlMilestonesCache present',
    html && html.includes('_bdlMilestonesCache'));

  assert('A103 — bni-strength-otw: getBNIStrength + computeBroadcastNarrativeIndex defined',
    html && /function getBNIStrength\s*\(/.test(html) && /function computeBroadcastNarrativeIndex\s*\(/.test(html));

  assert('A104 — detect-arc-type: detectArcType defined',
    html && /function detectArcType\s*\(/.test(html));

  // ── BATCH 4 — Live Polling + ESPN Infra (A105-A111) ──────────────────────

  assert('A105 — halftime-switch-polling: halftime-switch DOM element present',
    html && html.includes('halftime-switch') && html.includes('_quietHourActive'));

  assert('A106 — quiet-hour-detection: _quietHourActive + QUIET_CYCLES_GATE present',
    html && html.includes('_quietHourActive') && html.includes('QUIET_CYCLES_GATE'));

  assert('A107 — per-league-polling: _espnLeagueState + leaguesToPoll present',
    html && html.includes('_espnLeagueState') && html.includes('leaguesToPoll'));

  assert('A108 — concurrent-espn-fetch: Promise.all + leaguesToPoll.map present',
    html && html.includes('leaguesToPoll') && html.includes('Promise.all'));

  assert('A109 — period-score-extraction: homeLinescores + awayLinescores present',
    html && html.includes('homeLinescores') && html.includes('awayLinescores'));

  assert('A110 — ticker-trend-sort: renderScoreTicker defined',
    html && /function renderScoreTicker\s*\(/.test(html));

  assert('A111 — qw7-briefcache: fieldBriefCacheKey + field_brief_ storage key present',
    html && /function fieldBriefCacheKey\s*\(/.test(html) && html.includes('field_brief_'));

  // ── BATCH 5 — Relay Constants (A112-A114) ────────────────────────────────

  assert('A112 — relay-fd: FD_RELAY base constant present',
    html && html.includes('FD_RELAY'));

  assert('A113 — relay-fpl: FPL_RELAY_BASE present',
    html && html.includes('FPL_RELAY_BASE'));

  assert('A114 — relay-nhl: NHL_RELAY_BASE present',
    html && html.includes('NHL_RELAY_BASE'));

  // ── BATCH 6 — Misc Features (A115-A123) ──────────────────────────────────

  assert('A115 — mlb-stats-adapter: fetchMLBSchedule + MLB_STATS_BASE present',
    html && /function fetchMLBSchedule\s*\(/.test(html) && html.includes('MLB_STATS_BASE'));

  assert('A116 — mlb-thin-client: fetchMLBLiveGame + feed/live endpoint present',
    html && /function fetchMLBLiveGame\s*\(/.test(html) && html.includes('feed/live'));

  assert('A117 — my-teams-brief: buildMyTeamsBriefLine defined',
    html && /function buildMyTeamsBriefLine\s*\(/.test(html));

  assert('A118 — layer3-templates: buildLayer3Rules defined',
    html && /function buildLayer3Rules\s*\(/.test(html));

  assert('A119 — card-mini-dashboard: updatePinWidget + _pinWidgetExpanded present',
    html && /function updatePinWidget\s*\(/.test(html) && html.includes('_pinWidgetExpanded'));

  assert('A120 — ics-export: BEGIN:VCALENDAR + .ics download present',
    html && html.includes('BEGIN:VCALENDAR') && html.includes('.ics'));

  assert('A121 — sw-version-cache-bust: SW_VERSION cache-bust query param present',
    html && html.includes('SW_VERSION') && html.includes('?v=${SW_VERSION}'));

  assert('A122 — auto-deploy-guard-v5: pre-commit smoke gate exists in repo',
    typeof require !== 'undefined' &&
    require('fs').existsSync(require('path').join(__dirname, 'scripts/pre-commit')));

  assert('A123 — scout-pick-market-tip: fieldVsMarket + scoutTitle enrichment present',
    html && /function fieldVsMarket\s*\(/.test(html) && html.includes('scoutTitle'));


console.log(`\n── Results: ${pass} passed, ${fail} failed ──────────────\n`);
if (fail > 0) process.exit(1);