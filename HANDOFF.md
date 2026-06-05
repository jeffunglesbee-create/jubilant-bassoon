# FIELD HANDOFF — 2026-06-05 (SESSION END)

## State
jubilant-bassoon HEAD: eb77bce · Smoke: 494/0 · Unit tests: 60/0
field-relay-nba HEAD: b888a5f

## Session Summary

### 1. Advancement Probability (d932e81 browser / 78618f6 relay)
  computeAdvancementProb v2: estimateThirdPlaceRate from D1 cross_group_rank
  _wcAdvancementProb: Permutations primary, relay g.advancementProb fallback
  _wcBuildAdvBar: dedicated two-tone bar below WP bar, opening delta from GameDO
  _wcScenarioBadge: true P(advance) = pQualifyTop2 + pQualifyAsBest3rd combined
  relay g.advancementProb: first consumed anywhere in browser display
  Smoke: 479→484

### 2. D1 Write Chain — E2E Verified
  INSERT/recompute/probe full cycle confirmed ready for June 11.
  Sandbox access confirmed: D1 MCP ✅, probe ✅, api.github.com ✅
  *.workers.dev direct ❌, api.cloudflare.com ❌

### 3. Watch Engine WC Fix (bbd41b0)
  _wcLiveGamesCache global + fetchWCLiveGames populates it.
  _otwFindWCLiveGame: categorical tier hierarchy T1-T6 (Rule 48).
  STATE 1/2 injection for WC live games.
  STATE 5 QUIET guard: never fires when WC is live.
  preGameScore: WC +40 boost, WC bundles in nationalKeys.
  Smoke: 484→490

### 4. RUWT Deep Analysis (5ff7ede)
  getOTWMomentum: HIGH → FIXED (drama score delta → score-event detector, Rule 49)
  _otwFindWCLiveGame: MODERATE → FIXED (composite sel → categorical tiers, Rule 48)
  _otwFindLiveGame(50): MODERATE → DOCUMENTED/DEFERRED (Drama Dial session)
  GameDO: CLEAR (extended ADR-002 comment)
  Permutations Engine: CLEAR (RUWT PATENT DEFENSE comment added)
  Smoke: 490→493

### 5. CI Speedup (1a01349)
  workers:4 + fullyParallel:true + _fieldDataReady sentinel + awaitReady() helper
  9 fixed waits replaced with event-based sentinel waits.
  Measured: 301s → 155s Playwright (49%); 433s → 292s total (33%).
  Remaining: CF wait (25s), dual Playwright install (44s), editorial tests (12s each)
  Smoke: 493→494

### 6. STANDARDS.md Rules 48-52 (eb77bce)
  Rule 48: WC categorical tier hierarchy
  Rule 49: OTW momentum score-event only
  Rule 50: _fieldDataReady sentinel permanent contract
  Rule 51: RUWT risk register
  Rule 52: Sandbox access matrix

## Unanswered Questions — Resolved

Q: Scoreboard P0 — what is it?
A: fetchNBAScoreboard() fetches from NBA_CDN_RELAY/liveData/scoreboard/todaysScoreboard_00.json.
   This route is NOT in probe allow-list → can't test from sandbox.
   FIRST STEP IN NEXT SESSION: add /nba/liveData/scoreboard to probe allow-list.
   Then probe to check if route returns games → check _nbaGameIdMap population.

Q: R2 Finals Narrative Context Phase 1 — shipped?
A: fetchFinalsDesk() exists and renders a Finals Desk ambient card.
   buildCompoundPrompt() uses matchupNote for series context.
   PM-23 likely delivered matchupNote-based context (now working).
   VERIFY: check window._lastCompoundPrompt in console during G2 (June 6).

## Priority List
  1. Scoreboard P0 — add probe allow-list + diagnose (NBA Finals daily)
  2. R2 Finals Narrative Context — verify via console window._lastCompoundPrompt
  3. BALLDONTLIE trial — June 11 Mexico vs SA 7pm ET opening match
  4. WC pre-flight — probe all endpoints before June 11
  5. Drama Dial — patent-priority June 25, also completes _otwFindLiveGame RUWT fix
  6. wpDelta → drama signal
  7. Level 2 sparkline

## Session Doc
Drive: FIELD Session 2026-06-05 — Advancement, RUWT, CI Speedup, WC WE Fix
ID: 1TLsSG5nXcM6vBH3DzILLJbVCqogNmdFL

## Key Refs
jubilant-bassoon HEAD: eb77bce
field-relay-nba HEAD: b888a5f
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 494/0 · Unit tests: 60/0
