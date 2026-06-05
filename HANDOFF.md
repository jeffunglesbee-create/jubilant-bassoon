# FIELD HANDOFF — 2026-06-05 (Session END)

## State
jubilant-bassoon HEAD: efeebbe · Smoke: 505/0 · Unit tests: 66/0
field-relay-nba HEAD: 25d8fbc
SW_VERSION: 2026-06-05a

## Session Ships (chronological)

### PM-25a/b/c — Card Render Slot + Tier Refactor + Confidence Glyph
See prior HANDOFF entries. All shipped earlier today.

### Daily update — June 5 2026 (efeebbe)

SCF G2 RESULT: CAR 4, VGK 3 — series tied 1-1
  Andersen rebounded (held VGK to 3 after allowing 5 in G1)
  CAR PK 93.5% — played clean
  G3: Sat June 6, 8pm ET, ABC — T-Mobile Arena, Las Vegas
  G3 matchupNote added, G4-G7 seriesRecord updated to "Series tied 1-1"

NBA Finals G2: Fri June 6, 8:30pm ET, ABC — no result yet (tonight)
  SAS 67.8% win probability (home court, must-win to avoid 0-2)

Apple TV Friday Night Baseball (June 5):
  CLE Guardians @ TEX Rangers — Globe Life Field, 8pm ET
  KCR Royals @ MIN Twins — Target Field, 8pm ET
  Both tagged espnGOTD:true, MLB_APPLE bundle

MLB June 5 slate: 14 games total (2 Apple + 12 regular)
  Notable: NYY vs BOS (Yankee Stadium)

WNBA (7 games added):
  Fri June 5: CHI/CON 7:30pm ION, LAS/DAL 10pm ION, PDX/PHX 10pm ION
  Sat June 6: MIN/SEA 1pm ABC, LVA/GSV 3pm ESPN, ATL/WAS 6pm ION, NYL/IND 8pm ION

CFL Week 1 (NEW SPORT SECTION):
  Fri Jun 5: WPG Blue Bombers @ CGY Stampeders, 9pm ET, CBSSN
  Sat Jun 6: EDM Elks @ OTT Redblacks, 7pm ET, CBSSN
  CFL_CBSSN + CFL_PLUS bundles added
  cbssn + cflplus service entries added
  Canadian Football (CFL) now a FIELD sport section

## DO NOT ASSUME corrections

getDramaHistory(game.id) EXISTS in codebase (~line 24875). Whether
it is being POPULATED during live games (recordDramaHistory() call
chain) is UNVERIFIED. Must confirm before Arc Poster build.

PM-25 Hub 1 completeness:
  renderCardBadges() hub: SHIPPED (0779cc8)
  Rich-visual confidence glyph: SHIPPED (d085cb0)
  CRUNCH Fan-Out chip: needs PM-27 + ~30 lines
  WS Pulse on cards: needs PM-27 + ~30 lines

PM-27 open question (CRUNCH Fan-Out chip):
  "Related card" definition needed — current best answer: same sport +
  same playoff round (derivable from card.dataset.sport + card.dataset.series).
  Confirm before writing the subscriber.

## G2 Verification Checklist (NYK @ SAS · 8:30pm ET · ABC — tonight)

1. ~6pm ET — Re-probe NBA CDN scoreboard (workflow_dispatch scoreboard-probe.yml)
2. At G2 tip — findScore({home:'NYK', away:'SAS'})._pm24_matched → 2 keys
3. At G2 tip — window._lastCompoundPrompt → includes "NBA Finals G2"
4. At G2 tip — _otwGetLiveTier(espnData, 'Basketball', smoothed) → named string
5. At G2 tip — on live card .game-time, confirm .cg span present (grey dot = single source)

## Priority List

### Time-gated (this week)
  1. WC pre-flight — probe all relay endpoints before June 11 opener
     → MEX vs RSA at Azteca, 12pm ET, FOX/Telemundo
     → D1 wc2026 f26669de-e772-4b56-a6d1-f8fdea08a4d4
  2. BALLDONTLIE trial — June 11 opening match data source test

### Infrastructure (unlock 3+ surfaces each)
  3. PM-27 Event Bus Payload Standard (~30 min)
     → field:crunch + field:otw_changed + field:ws_fresh
     → unblocks: CRUNCH cascade chip, otw:changed beat, ws:fresh staleness
     → open question: define "related card" for CRUNCH fan-out before building

### Subscribers (small, after PM-27)
  4. JQ Gate brand-safe fallback (~60 lines, no hub dep, parallel-trackable)
  5. CRUNCH Fan-Out causality chip (~30 lines into PM-27 + PM-25 ✓)
  6. OTW Changeover beat (~25 lines into PM-27)
  7. WS Pulse on cards (~30 lines into PM-25 ✓ + PM-27)
  8. iOS PWA Add-to-Home (~40 lines, parallel-trackable)

### Build items (patent-adjacent — USPTO filing cancelled June 4)
  9. Arc Poster (~200 lines, no backend)
     → BLOCKER: verify getDramaHistory() populated during live games
  10. State Transition PerformanceObserver (~30 lines + assertions)

### Deferred / maintenance
  11. A399 cleanup — detail string still says "verified unreachable" (now wrong)
  12. field-relay-nba scoreboard-probe.yml — delete or keep

## Key Refs
jubilant-bassoon HEAD: efeebbe
field-relay-nba HEAD: 25d8fbc
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 505/0 · Unit: 66/0

## Drive Docs (this day)
Amnesty Zone Definition: 1qyek7_eBtPvrqhVVljnKZhtmHn9GgVF9h1NilaGX9xc
Session doc (PM-25a/b): 15ZflDC7r1tbZ7UdFP2ToTjUwJp_bHAAOKXO4IYE46nI
