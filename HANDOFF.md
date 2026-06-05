# FIELD HANDOFF — 2026-06-05 (Session END)

## State
jubilant-bassoon HEAD: d085cb0 · Smoke: 505/0 · Unit tests: 66/0
field-relay-nba HEAD: 25d8fbc
SW_VERSION: 2026-06-05a (no bump — no user-facing change this session)

## Session Ships (chronological)

### PM-25a — renderCardBadges() Card Render Slot (0779cc8, A493)
Extracted inline badge block from injectDramaBadges() into named function.
Single callsite for CRUNCH TIME / WORTH WATCHING / drama tier / EMBER / MLBN.

### PM-25b — Drama Dial categorical tier refactor (0779cc8, A494, A495)
_otwGetLiveTier() + _otwTierLabel() — OTW FIRE label now factual named
condition, not numeric band. RUWT Rule 51 MODERATE → RESOLVED.

### PM-25c — Rich-visual confidence glyph (d085cb0, A496)
.cg CSS (4 rules) + renderCardBadges injection into .game-time element.
  verified  → green halo dot (rgba(74,222,128,.6) box-shadow)
  mismatch  → red ring + ::after radial-gradient dot
  single    → grey dot (var(--muted))
  null/undef → no dot (backwards-compat)
Additive alongside PM-20 text glyph (✓/⚠) in buildCardTimeDisplay.
Title tooltips on all three states. DOM-safe: removes prior .cg before inject.
Smoke 504→505 (A496).

## DO NOT ASSUME corrections

getDramaHistory(game.id) EXISTS in codebase (~line 24875). Whether
it is being POPULATED during live games (recordDramaHistory() call
chain) is UNVERIFIED. Must confirm before Arc Poster build.

PM-25 Hub 1 completeness status:
  renderCardBadges() hub: SHIPPED (0779cc8)
  Rich-visual confidence glyph: SHIPPED (d085cb0) ← new
  CRUNCH Fan-Out chip: needs PM-27 + ~30 lines
  WS Pulse on cards: needs PM-27 + ~30 lines

## G2 Verification Checklist (NYK @ SAS · 8:30pm ET · ABC)

1. ~6pm ET — Re-probe NBA CDN scoreboard (workflow_dispatch scoreboard-probe.yml)
2. At G2 tip — findScore({home:'NYK', away:'SAS'})._pm24_matched → 2 keys
3. At G2 tip — window._lastCompoundPrompt → includes "NBA Finals G2"
4. At G2 tip — _otwGetLiveTier(espnData, 'Basketball', smoothed) → named string
5. At G2 tip — PM-25c: on live card .game-time, confirm .cg span present
   Expected: grey dot (single source) before PM-24 verified; green halo if verified

## Priority List

### Time-gated (today/this week)
  1. WC pre-flight — probe all relay endpoints before June 11 opener
     → MEX vs RSA at Azteca, 12pm ET, FOX/Telemundo
     → D1 wc2026 f26669de-e772-4b56-a6d1-f8fdea08a4d4
  2. BALLDONTLIE trial — June 11 opening match data source test

### Infrastructure (unlock 3+ surfaces each)
  3. PM-27 Event Bus Payload Standard
     → standardize {type, target, source, reason, at, payload} ~30 min
     → unblocks: CRUNCH cascade chip, otw:changed beat, ws:fresh staleness

### Subscribers (small)
  4. JQ Gate brand-safe fallback (~60 lines, no hub dep, parallel-trackable)
  5. CRUNCH Fan-Out causality chip (~30 lines into PM-27 + PM-25 ✓)
  6. OTW Changeover beat (~25 lines into PM-27)
  7. WS Pulse on cards (~30 lines into PM-25 ✓ + PM-27)
  8. iOS PWA Add-to-Home (~40 lines, parallel-trackable)

### Build items (patent-adjacent — USPTO filing cancelled June 4)
  9. Arc Poster — SVG render from Amnesty data (~200 lines, no backend)
     → YELLOW-GREEN novelty, park filing, build as product feature
     → BLOCKER: verify getDramaHistory() is populated during live games
  10. State Transition PerformanceObserver (~30 lines + assertions)

### Deferred / maintenance
  11. A399 cleanup — detail string still says "verified unreachable" (now wrong)
  12. field-relay-nba scoreboard-probe.yml — delete or keep as reusable diagnostic

## Key Refs
jubilant-bassoon HEAD: d085cb0
field-relay-nba HEAD: 25d8fbc
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 505/0 · Unit: 66/0

## Drive Docs (this day)
Amnesty Zone Definition: 1qyek7_eBtPvrqhVVljnKZhtmHn9GgVF9h1NilaGX9xc
Session doc (PM-25a/b): 15ZflDC7r1tbZ7UdFP2ToTjUwJp_bHAAOKXO4IYE46nI
