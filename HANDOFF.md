# FIELD HANDOFF — 2026-06-04 (SESSION END)

## State
jubilant-bassoon HEAD: 9ea54a9 · Smoke: 471/0
field-relay-nba HEAD: a6d13aa (relay) / HANDOFF anchor: 045e91b (HANDOFF write)

## This Session — What Was Built

### Verification
- Probed all Level 1 endpoints via probe_relay_route MCP:
  /health ✓, /wc/odds-probs ✓ (72 games, 26 bkm avg, 19,991 credits), 
  /wc/standings ✓ (empty, pre-tournament), /wc/results ✓ (empty, pre-tournament),
  /v2/games?sport=wc26&date=today ✓ (empty, WC starts June 11)
- Confirmed team-name mismatches from live data:
  Odds API "Czech Republic" ↔ wc26Raw "Czechia"
  Odds API "Turkey" ↔ wc26Raw "Türkiye" (ü stripped wrong in old matcher)
  Odds API "USA" ↔ wc26Raw "United States"
  Odds API "DR Congo" ↔ wc26Raw "Congo DR"

### lambdaFromTotalsAndH2H (soccer-wp.js — new export)
  Binary-search over λ_h on [0.05, λ_total-0.05], 20 iterations, 5dp convergence.
  winProbsFromLambda(λ_h, λ_total-λ_h) vs pHome from h2h market.
  Replaces 25-iter 2-param gradient descent for WC path.
  λ_total comes directly from O/U line (totals market `point` field).
  lambdaSource: 'totals' vs 'h2h-inversion' (fallback when no totals coverage).

### handleWCOddsProbs + getWCPregameLambdas: markets=h2h,totals
  Both now fetch markets=h2h,totals (was h2h only).
  /wc/odds-probs response now includes lambdaHome, lambdaAway, lambdaTotal, lambdaSource.
  Budget: 2 credits/call → ~576 credits/day during WC. 19,991 credits remaining.
  VERIFIED LIVE: 72 games with lambdaSource:"totals" in probe output.
  Spot checks: Mexico λH=1.878/λA=0.591 ✓, Germany/Curaçao λH=3.649/λA=0.385 ✓

### Team-name matcher fixes
  Relay wcTeamNameMatch: NFD normalize (ü→u, removes diacritics) + confirmed alias table.
  Browser _wcMatchTeamName: same fix + complete bidirectional alias table.
  Both cover: Turkey↔Türkiye, Czech Republic↔Czechia, DR Congo↔Congo DR, USA↔United States.
  Previous "Turkey" vs "Türkiye": norm stripped ü → "trkiye" ≠ "turkey" (bug). Fixed.

### Level 1 display + Permutations integration (from prior sub-session)
  fetchWCLiveGames() → /v2/games?sport=wc26, live filter → outcomeProbabilities injection
  _wcBuildWPBar(): 3-segment flex bar (home/draw/away), pulse animation, source label
  buildWCGroupRows(): splices WP bar between playing teams in group standings
  _wcMatchOdds: now returns {pHome, pDraw, pAway, lambdaHome, lambdaAway}
  lambda fields flow through to outcomeProbabilities → wcApplyOutcome v1.4 Poisson margins

### CI issue (fixed in session)
  Relay deploy failed: JSDoc comment fragment left dangling in soccer-wp.js.
  `/**` marker split from body when inserting lambdaFromTotalsAndH2H before oddsToLambda.
  Fixed in commit a6d13aa. Wrangler dry-run always catches this: run before push.

## Smoke: 468 → 471 (+3, A460-A462) / Unit tests: 56/0

## Outstanding Before June 11
  - /wc/admin/seed: D1 write chain needs e2e test (auto-write fires at game final)
  - BALLDONTLIE 48-hr trial: START June 11 opening match (Mexico vs SA 7pm ET)
  - Scoreboard P0: not diagnosed (first live exposure NBA Finals G1)
  - Watch Engine WC fix (RUWT violations ~line 26190)
  - v1.4 Poisson margin model: lambdaHome/lambdaAway now flow through outcomeProbabilities
    to wcApplyOutcome — verify engine actually picks them up (matchMeta param path)

## Key Refs
jubilant-bassoon HEAD: 9ea54a9
field-relay-nba HEAD: a6d13aa
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 471/0
Credits remaining: 19,991 (as of probe, June 4)
