# FIELD HANDOFF — 2026-06-04

## State
HEAD (jubilant-bassoon): c932ff3 · SW: 2026-06-04k · Smoke: 432/0
HEAD (field-relay-nba): 209f760

## WC2026 — FULLY READY FOR JUNE 11 ✅
All infrastructure complete:
  - wc26Raw 72 games verified (c932ff3)
  - WC_TEAMS confirmed draw (c932ff3)
  - D1 wc2026 live + wc_third_place_standings VIEW (f26669de)
  - ⚽ Groups tab Phase 1 (69cee53)
  - WC team narrative context 48 teams (relay 4165bb0)
  - Live win probability 6 gaps (relay 209f760)

## WC Live Win Probability (relay 209f760)
All 6 gaps closed:
  Gap 1: /fixtures/statistics fetch for live WC games (parallel, non-blocking)
  Gap 2: Poisson + Dixon-Coles WP model (soccer-wp.js)
         winProb: {homeWin, draw, awayWin, source} on all live football V2 games
         situation object on adaptFootball() — parallel to baseball {inning,isTop,outs}
  Gap 3: Advancement probability via D1 scenario simulation
         advancementProb: {homeAdvance, awayAdvance, homePositions, awayPositions}
  Gap 4: /wc/wp/verify endpoint — verify Odds API WC coverage (hit before June 11)
  Gap 5: Stoppage time elapsed correction in effectiveElapsed()
  Gap 6: Soccer CRUNCH: penalty_shootout | man_advantage | added_time | late_deficit
  8/8 unit tests passing

## Tonight / Tomorrow
- SCF G2: VGK @ CAR — tonight Jun 4, 8pm ET, ABC · Lenovo Center · VGK leads 1-0
- NBA Finals G2: NYK @ SAS — tomorrow Jun 5, 8:30pm ET, ABC · NYK leads 1-0

## Remaining WC (pre-June 11 optional depth)
- [ ] Permutations Engine A1 (~110 min) — highest priority unbuilt
- [ ] Final Matchday Advantage Calculator (~60 min)
- [ ] Third-place tracker on Groups tab (~30 min, D1+endpoint ready)
- [ ] Soccer Drama Layer 1 (~45 min)
- [ ] WC-specific journalism rules (~20 min)
- [ ] Round of 32+ game stubs (~15 min)
- [ ] /wc/wp/verify — hit manually before June 11

## P1 Carry-Forwards (jubilant-bassoon)
- [ ] Odds Budget date staleness (shows 2026-05-29)
- [ ] Watch Engine WC fix (RUWT violations ~line 26190)
- [ ] 7th inning stretch callout
- [ ] Final outcome display low-drama games
- [ ] meta-description tag + My Services Install App button

## Canonical Refs
CI/Deploy: Drive 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
WC Team Context spec v2: Drive 1A4y6NVdHhRcMXJvWQ0k1Pa71AnDgZwYk
D1 database: f26669de-e772-4b56-a6d1-f8fdea08a4d4
soccer-wp.js: relay/src/soccer-wp.js (new, 209f760)
Relay HEAD: 209f760
