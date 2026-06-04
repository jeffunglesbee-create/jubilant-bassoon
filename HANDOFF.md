# FIELD HANDOFF — 2026-06-04 (SESSION END)

## State
jubilant-bassoon HEAD: 5c412ec · Smoke: 432/0
field-relay-nba HEAD: 209f760

## This Session — What Was Built
TYPE C/D: WP gaps, enrichment analysis, Odds API probe

### 1. WC Live Win Probability — 6 Gaps (relay 209f760)
All 6 gaps closed in src/soccer-wp.js (new, 295 lines):
  Gap 1: /fixtures/statistics for live WC games (parallel, non-blocking)
  Gap 2: Poisson + Dixon-Coles WP model
         computeLiveWP(), oddsToLambda(), lambdaFromShots()
         winProb: {homeWin, draw, awayWin, source} on all live football V2
         situation object on adaptFootball() — parallel to baseball
  Gap 3: Advancement probability (D1 scenario simulation)
  Gap 4: /wc/wp/verify endpoint
  Gap 5: Stoppage time elapsed correction (effectiveElapsed())
  Gap 6: Soccer CRUNCH: penalty_shootout | man_advantage | added_time | late_deficit
  8/8 unit tests passing

### 2. Drive Docs Created
  1LqG8P1WSTA9fx8ncAztApNqA32eodPOH  WP Unified Spec v2 (CANONICAL)
  1N04XHtEnanD-OiOv6nwxtg5AwiASrBNl  Soccer Data Enrichment Deep Analysis
  1fAmxQ0DVsfNrYEg5VWdIhQ34dA8swGcn  Odds API Probe Findings + Action Items
  1wXOmmnD5qdXrbUnqgEeSvbUwYJdGLKS9  BALLDONTLIE FIFA WC API Evaluation
  1TgH2TPuFhItWPYgM8KIm4oSahCsEmD9l  Session Documentation

### 3. Odds API Probe Findings (CI-as-proxy)
  soccer_fifa_world_cup: active=True, all 72 games priced
  Opening: Mexico vs South Africa 2026-06-11T19:00 UTC
  Totals market: CONFIRMED for WC (Mexico vs SA: O/U 2.5, Under @ 1.71)
  Betfair Exchange: CONFIRMED via h2h_lay (betfair_ex_eu + matchbook present)
  Mexico back/lay: 1.44/1.45 — no-vig prob = 69.2%
  Budget: 19,993/20,000 credits remaining (fresh cycle)
  Probe: jubilant-bassoon/outbox/odds/probe-20260604T205654Z.txt

### 4. Odds API Probe Infrastructure (jubilant-bassoon)
  scripts/odds_probe.py — new
  .github/workflows/odds-probe.yml — new
  Trigger: push outbox/.trigger-odds-probe

## WC 2026 — READY FOR JUNE 11
All infrastructure complete:
  - wc26Raw 72 games + WC_TEAMS confirmed
  - D1 wc2026 live + wc_third_place_standings VIEW
  - Groups tab Phase 1
  - WC team narrative context (48 teams)
  - Live win probability (6 gaps, 8/8 tests)
  - Odds API confirmed: 72 games live, totals + Betfair already available

## Tonight / Tomorrow
- SCF G2: VGK @ CAR — tonight Jun 4, 8pm ET, ABC · VGK leads 1-0
- NBA Finals G2: NYK @ SAS — tomorrow Jun 5, 8:30pm ET, ABC · NYK leads 1-0

## Immediate Actions Before June 11 (priority order)
RELAY:
  [ ] Odds API: change to markets=h2h,totals,h2h_lay and regions=us,eu (~15 min)
  [ ] oddsToLambda(): upgrade to use totals market for exact λ (~15 min)
  [ ] Add /v4/usage to ODDS_ALLOWED_EXACT (~5 min)
  [ ] Betfair back price as no-vig prior (~10 min)
  [ ] /fixtures/lineups pre-game fetch (~30 min)
  [ ] /injuries endpoint (~25 min)
  [ ] Referee xF lookup (~15 min)
  [ ] CRUNCH precision: WP-based added_time trigger (~5 min)

JUBILANT-BASSOON:
  [ ] Soccer wpDelta drama bonus (~15 min)
  [ ] Drama from Poisson WP — replace score-margin (~30 min)
  [ ] recordProbHistory() + storeOpeningProb() (~30 min)
  [ ] Level 1 display: winProb on game card (~45 min)

EVALUATION (June 11):
  [ ] Start BALLDONTLIE GOAT 48-hr trial
      Test xG vs SOT proxy during Mexico vs SA opening game
      Commit at $39.99/mo if xG values update live

## Remaining WC Optional Depth
  [ ] Permutations Engine A1 (~110 min)
  [ ] Final Matchday Advantage Calculator (~60 min)
  [ ] Third-place tracker on Groups tab (~30 min)

## P1 Carry-Forwards (unchanged)
  [ ] Watch Engine WC fix (RUWT violations line ~26190)
  [ ] Odds Budget date staleness (shows 2026-05-29)
  [ ] 7th inning stretch callout
  [ ] Final outcome display low-drama games
  [ ] meta-description tag + My Services Install App button
  [ ] iPad CLS LIVE verification

## Key Refs
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
soccer-wp.js: relay/src/soccer-wp.js (relay 209f760)
WP Unified Spec v2: Drive 1LqG8P1WSTA9fx8ncAztApNqA32eodPOH
Enrichment Analysis: Drive 1N04XHtEnanD-OiOv6nwxtg5AwiASrBNl
Odds Probe Findings: Drive 1fAmxQ0DVsfNrYEg5VWdIhQ34dA8swGcn
BALLDONTLIE Eval: Drive 1wXOmmnD5qdXrbUnqgEeSvbUwYJdGLKS9
Odds probe results: jubilant-bassoon/outbox/odds/probe-20260604T205654Z.txt
