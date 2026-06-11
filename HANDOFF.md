# FIELD HANDOFF — 2026-06-11 (Bracket Trap + Series Dots 6a/6b)

## HEADS
- jubilant-bassoon HEAD: 86f40084 (auto-overlay landed after 6c9d3ee)
- Last dev commit: 6c9d3ee (feat(6b): series arc sparkline glyph)
- SW_VERSION: 2026-06-11b (carried from prior session)
- Smoke: 575/0 (CI green at 6c9d3ee; tool reads 512 due to cache lag — not a regression)
- field-relay-nba HEAD: 6707adb

## WHAT SHIPPED THIS SESSION

### Bracket Trap Detection (relay: 352d56a + 6707adb)

Position-conditional Monte Carlo tracking in wc-tournament-projections.js.

**wc-tournament-projections.js changes:**
- `simulateKnockoutBracket()` now accepts `finishPositions` param
- `countsByPos` tracking: { teamName: { 1: {R32..Champion,total}, 2:..., 3:... } }
- Per-position tally in main simulation loop via `simFinishPos` map
- `detectBracketTraps(countsByPos, N, nameToCtx)` exported:
  - TRAP_THRESHOLD = 0.005 (0.5pp delta minimum)
  - MIN_SAMPLES = 0.05 (position must appear in ≥5% of sims)
  - Returns sorted array: { team, group, fifaCode, pChampIf1st, pChampIf2nd, delta, pFinalIf1st, pFinalIf2nd }
- `computeTournamentProjections()` output now includes `bracketTraps[]`
- `buildMoversBriefPrompt()` BRACKET TRAPS section added (top 3 traps)
- Para 3 of journalism brief targets bracket trap narrative

**Relay routes (6707adb):**
- GET /wc/traps — bracketTraps slice from KV, no full teams array
- Added to probe allowlist

**Live data (N=2000, generated 18:00 UTC):**
7 traps detected:
- Scotland (C): 1st=0.6% → 2nd=3.3% (+2.7pp) ← headline
- Germany (E): 1st=2.3% → 2nd=4.8% (+2.5pp)
- France (I): 1st=2.4% → 2nd=4.9% (+2.5pp)
- Iran (G), Paraguay (D), Japan (F), Egypt (G)

### Injuries investigation: api-sports WC 2026 raw_count=0 — no data available.
Betting odds already encode injury signal implicitly. No injury integration needed.

### Series Dots 6a (client: 03d6f02 + 625a005)

seriesMargins arrays added to all played Finals/SCF games:

**NBA Finals (NYK vs SAS):**
- G1: [10,-1,-1,-1,-1,-1,-1] NYK 105-95
- G2: [10,1,-1,-1,-1,-1,-1] NYK 105-104
- G3: [10,1,4,-1,-1,-1,-1] SAS 115-111
- G4: [10,1,4,1,-1,-1,-1] NYK 107-106 ← largest comeback in Finals history
  - Brunson 36pts, Anunoby 33pts + GW tip-in 1.2s. Down 29. NYK leads 3-1.
  - G5 elimination: SAS @ Frost Bank Center, Sunday Jun 14.

**SCF (VGK vs CAR):**
- G1: [1,-1,-1,-1,-1,-1,-1] VGK 5-4
- G2: [1,1,-1,-1,-1,-1,-1] CAR 4-3 OT (label corrected)
- G3: [1,1,1,-1,-1,-1,-1] VGK 5-4 OT
- G4: [1,1,1,2,-1,-1,-1] CAR 5-3 (result + matchupNote added)
  - Staal 2G/GWG, Bussi first postseason start. Series tied 2-2.
  - G5 Thu Jun 12 at Lenovo Center, Raleigh.
- G5-G7 seriesRecord: Series tied 2-2

### Arc Sparkline 6b (client: 6c9d3ee)

`buildSeriesMarginsArc(seriesMargins)` — 56×20px SVG polyline.
- Inverted margin → tension: margin 1 = tall peak, margin 30+ = low
- Only plots played games (m≥0), n-1 x-spacing across 7-game width
- Color: green (avgTension≥0.85), amber (≥0.5), smoke (<0.5)
- NBA Finals: amber (G1 dip, tight G2/G4, valley G3)
- SCF: green (all 4 games within 2 goals)
- CSS: .series-arc-wrap, .series-arc added
- Feature registry: 'series-arc': '2026-06-11'
- Rendered inline at end of dot row via .series-arc-wrap span

## NEXT SESSION: WHOLE FIELD TOGGLE (6c)

## PRIORITY LIST

1. WHOLE FIELD toggle 6c ← next
2. State transition 6e
3. Drama spectrum 6f
4. WC projections data quality — Ecuador/Ivory Coast still ranking anomalously high
5. M5 score ticker fade (assess severity)
6. Wimbledon draw context (before July 7)
7. Design system (~90 min TYPE C)

## SMOKE
CI green at 6c9d3ee · Deploy gate + Smoke Test + Live Verify both success
Tool reads 512 (cache lag) — not a regression
