# FIELD HANDOFF — 2026-06-04 (SESSION END)

## State
jubilant-bassoon HEAD: 7cba853 · Smoke: 477/0
field-relay-nba HEAD: 8236951

## This Session — What Was Built

### GameDO WP State Store (game-do.js · 8236951)

POST /wp handler — new route in GameDO:
  Called by relay V2 polling loop after computing winProb for live games.
  Reads prior DO storage: openingWP (immutable), lastWP, wpHistory.
  Computes wpDelta = {homeWin, awayWin, draw} vs prior poll value.
  Stores openingWP once on first live call (Surprise Layer baseline).
  Appends {elapsed, homeWin, draw} to wpHistory, bounded at 180 entries.
  Fans out {type:'wp', wp, wpDelta} to WebSocket clients.
  Returns {openingWP, wpDelta, recentHistory[last 20], historyLen}.

POST /crunch bug fix:
  Relay fires to 'https://field/crunch'; DO was only handling '/signal/crunch'.
  Added /crunch alias with dedup → _fanoutCrunch. Previously silently 404'd.

wc26 in SPORT_TO_V2:
  WC 2026 games now eligible for GameDO WebSocket fact push.

Parallel WP state updates in relay V2 game loop (index.js):
  After computing winProb for all live games, fires Promise.allSettled() across
  all live games simultaneously. Each awaits POST /wp to game's DO instance.
  Attaches g.openingWP, g.wpDelta, g.recentWPHistory to game object in response.
  Non-blocking on DO failure.

### Level 1 WP bar enhancements (index.html · 7cba853)

wpDelta trend indicator:
  Reads liveGame.wpDelta.homeWin from V2 game object.
  Shows ↑ / ↓ when homeWin shifts ≥2pp since last poll (30s cadence).
  Example: 'Mexico 67% ↑' if Mexico's WP jumped 3pp this cycle.
  <2pp threshold prevents noise on stable games.

openingWP Surprise Layer (Level 3):
  Reads liveGame.openingWP (stored by GameDO on first live poll).
  When current WP diverges ≥5pp from opening, adds to meta line:
  '⚽ Live · 73' · odds-blended · Mexico was 67% pre-match ▼'
  ▼ only on downward surprise (underperformance vs pre-match expectation).

### CI note
smoke.js: gameDoSrc assertions made CI-safe (relay is separate repo in CI).
A463-A465 skip when game-do.js unavailable; A466 tests browser consumption.

## Smoke: 471 → 477 (+6) / Unit tests: 56/0

## Full WP Stack — Status
  ✓ Poisson + Dixon-Coles model (computeLiveWP)
  ✓ lambdaFromTotalsAndH2H (totals market, binary search)
  ✓ oddsToLambda (h2h inversion fallback)
  ✓ lambdaFromShots (SOT proxy)
  ✓ effectiveElapsed + remainingLambda + man-advantage
  ✓ Pre-game lambda cache (getWCPregameLambdas, 5-min TTL)
  ✓ winProb on V2 live game object (source: odds-blended/shots-proxy/default-lambda)
  ✓ Soccer CRUNCH: 4 named conditions, WP-gated late_deficit
  ✓ computeAdvancementProb (single-game v1 on relay)
  ✓ GameDO WP store: openingWP + lastWP + wpHistory + wpDelta
  ✓ Level 1 display: 3-segment bar, source label, pulse
  ✓ Level 1+: wpDelta trend (↑↓), openingWP Surprise Layer
  ✓ Permutations Engine integration (live WP → outcomeProbabilities)
  ✓ Team-name matcher (bidirectional aliases, NFD normalize)
  ○ v1.4 Poisson margin wiring (lambdas in outcomeProbabilities but matchMeta not passed)
  ○ Level 2 sparkline (recentWPHistory now in game object; display not built)
  ○ wpDelta → drama signal (data available; browser hookup not built)
  ○ Advancement prob on Level 1 bar (data in Permutations Engine; not surfaced in bar)

## Outstanding Before June 11
  - v1.4 Poisson margin wiring (~15 min active bug fix)
  - /wc/admin/seed e2e verification
  - BALLDONTLIE 48-hr trial: START June 11 opening match
  - Scoreboard P0 (undiagnosed)
  - Watch Engine WC fix (~line 26190)

## Key Refs
jubilant-bassoon HEAD: 7cba853
field-relay-nba HEAD: 8236951
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 477/0
