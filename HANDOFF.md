# FIELD HANDOFF — 2026-06-04 (SESSION END)

## State
jubilant-bassoon HEAD: caf3429 · Smoke: 479/0 · Unit tests: 60/0
field-relay-nba HEAD: e52d184

## This Session — What Was Built

### v1.4 Poisson Margin Wiring Fix
Active bug: wcEnumerateScenarios called wcApplyOutcome without matchMeta.
lambdaHome/lambdaAway were present in outcomeProbabilities objects (from
/wc/odds-probs totals market) but never extracted and passed to the engine.

Fix: in wcEnumerateScenarios inner loop:
  `const matchMeta = (useProbs && outcomeProbs[k]?.lambdaHome != null)
       ? { lambdaHome: outcomeProbs[k].lambdaHome, lambdaAway: outcomeProbs[k].lambdaAway }
       : null;
   wcApplyOutcome(tm, home, away, code, playedCopy, matchMeta);`
Fixed in both field_utils.js and inlined engine copy in index.html.

4 new unit tests (total 60/0):
  - wcPoissonExpectedGoals: dominant λH=3.649 gives >2.5 home goals
  - wcPoissonExpectedGoals: symmetric draw gives equal goals both sides
  - wcApplyOutcome with matchMeta: λH=3.0/λA=0.4 produces GD>1 (not 1-0)
  - computeGroupScenarios with lambdas: Germany >90% qualify, Curaçao <10%

### openingAdvanceProb in GameDO (game-do.js + index.js)
relay: POST /wp body now includes advanceProb (g.advancementProb from D1).
DO: stores openingAdvanceProb once at first live poll (immutable kickoff baseline).
DO: returns openingAdvanceProb in POST /wp response.
browser: g.openingAdvanceProb attached from DO response.
Used by L3c Qual Surprise layer for "vs kickoff" qualification baseline.

### Full Surprise Layer — _wcBuildWPBar(liveGame, wp, {scenarios, groupId})
buildWCGroupRows now passes {scenarios, groupId} context to _wcBuildWPBar.
_wcBuildWPBar rewritten with 4 display layers:
  L1:  3-segment WP bar (home/draw/away), source, pulse animation
  L1+: wpDelta trend ↑↓ (≥2pp per 30s poll)
  L3a: WP Surprise — current vs GameDO openingWP (≥5pp → shows delta)
       'Mexico was 67% (+15pp)'
  L3b: Qualification context from Permutations Engine pQualifyTop2:
       'Qual: Mexico 82%, South Africa 23%'
       Fuzzy team-name lookup via _wcMatchTeamName
  L3c: Qual Surprise — pQualifyTop2 vs openingAdvanceProb (≥8pp → shows delta)
       'Qual: Mexico 82%, South Africa 23% (+16pp vs kickoff)'

Full integration chain complete:
  Odds API h2h,totals → lambdaFromTotalsAndH2H → pregameLh/La → computeLiveWP
  → winProb{source:'odds-blended'} → GameDO POST /wp
  → {openingWP, wpDelta, openingAdvanceProb, recentHistory}
  → browser g.openingWP / g.wpDelta / g.openingAdvanceProb / g.recentWPHistory
  → _wcBuildWPBar: L1+L1++L3a+L3b+L3c
  + outcomeProbabilities[live fixture] → computeGroupScenarios(weighted+Poisson)
  → pQualifyTop2 → L3b qualification display

## Smoke: 477→479 / Unit tests: 56→60

## Full WP Stack — Final Status
  ✓ Poisson + Dixon-Coles model
  ✓ lambdaFromTotalsAndH2H (20-step binary search)
  ✓ oddsToLambda (25-step gradient descent fallback)
  ✓ lambdaFromShots (SOT proxy, trust-blended)
  ✓ effectiveElapsed + remainingLambda + man-advantage
  ✓ Pre-game lambda cache (5-min TTL, module-level)
  ✓ winProb on V2 live game (source: odds-blended/shots-proxy/default-lambda)
  ✓ Soccer CRUNCH: 4 conditions, WP-gated late_deficit, /crunch route fixed
  ✓ computeAdvancementProb (single-game v1, D1 standings, thirdPlaceRate)
  ✓ GameDO WP store: openingWP, lastWP, wpHistory, openingAdvanceProb
  ✓ GameDO WebSocket fan-out: {type:'wp', wp, wpDelta}
  ✓ Level 1: 3-segment bar + source label + pulse
  ✓ Level 1+: wpDelta trend ↑↓ (≥2pp)
  ✓ Level 3a: WP Surprise — openingWP vs current (≥5pp)
  ✓ Level 3b: Qual context — Permutations pQualifyTop2 both teams
  ✓ Level 3c: Qual Surprise — openingAdvanceProb vs current (≥8pp)
  ✓ v1.4 Poisson margin model — FIXED (matchMeta now wired correctly)
  ✓ v1.5 fair-play tiebreaker (fairPlayPoints param threaded)
  ✓ v1.6 bracket implications (WC26_R32 constant, Match 73-88)
  ✓ v1.7 simultaneous-kickoff banner
  ○ Level 2 sparkline (recentWPHistory in game object; display not built)
  ○ wpDelta → drama dial (data available; hook not built)
  ○ Full Permutations Engine advancement prob on relay (engine is browser-side)

## Outstanding Before June 11
  - /wc/admin/seed e2e test (auto-write verified to fire, need test of write chain)
  - BALLDONTLIE trial: START June 11 (Mexico vs SA 7pm ET)
  - Scoreboard P0 (undiagnosed)
  - Watch Engine WC fix (~line 26190)

## Key Refs
jubilant-bassoon HEAD: caf3429
field-relay-nba HEAD: e52d184
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 479/0 · Unit tests: 60/0
