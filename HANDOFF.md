# FIELD HANDOFF — 2026-06-06 (Session END — CFL odds display complete)

## State
jubilant-bassoon HEAD: 4dbcd40 · Smoke: 509/0 · Unit: 66/0
field-relay-nba HEAD: 981d474
SW_VERSION: 2026-06-05a

## CFL Odds — COMPLETE ✅

### Full stack shipped
- Relay `/cfl/odds-probs` (field-relay-nba 981d474): americanfootball_cfl h2h+spreads+totals
- Client `fetchCFLOddsProbs()` + `_cflMatchOdds()` (f727c04): attaches wp/spread/total to CFL games
- Card display chip (4dbcd40): 🏈 spread/O/U badge in badge-row, gold color, hover shows % home
- Compound prompt injection (4dbcd40): `[CFL ODDS]` tag with spread + O/U + home% for journalism
- Cleanup: relay-worker-deploy.yml deleted (vestigial from failed bundled-worker approach)

### Live data confirmed (probe 2026-06-06)
```
Calgary Stampeders vs Winnipeg Blue Bombers:
  pHome=0.4722  spread=+1.5  O/U=47.7  bookmakers=19
  Card chip: 🏈 +1.5 · O/U 47.7

Ottawa Redblacks vs Edmonton Elks:
  pHome=0.5692  spread=-2.4  O/U=51.0  bookmakers=19
  Card chip: 🏈 -2.4 · O/U 51.0
```

### What remains
- CFL schedule is still hardcoded (2 Week 1 games + filter). Needs weekly update.
- No live CFL scores (api.cfl.ca key not obtained — free registration at tech@cfl.ca)

## Priority List
1. JQ Gate brand-safe fallback (~60 lines)
2. Drama Dial header chip (~20 lines)
3. Arc Poster (~200 lines, BLOCKER: verify getDramaHistory() populated live)
4. State Transition PerformanceObserver (~30 lines)
5. iOS PWA Add-to-Home (~40 lines)
6. CFL schedule automation (weekly hardcode update or api.cfl.ca key)

## Key Refs
jubilant-bassoon HEAD: 4dbcd40
field-relay-nba HEAD: 981d474
Smoke: 509/0 · Unit: 66/0
