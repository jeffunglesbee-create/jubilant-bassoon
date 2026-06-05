# FIELD HANDOFF — 2026-06-05 (Session END)

## State
jubilant-bassoon HEAD: 0779cc8 · Smoke: 504/0 · Unit tests: 66/0
field-relay-nba HEAD: 25d8fbc
SW_VERSION: 2026-06-05a (no bump — no user-facing change this session)
Time: evening ET · G2 tip: 8:30pm ET tonight (NYK @ SAS · ABC)

## Session Ships (chronological)

### Pre-build: Amnesty Zone Definition (Type D — earlier today)
Resolved the "Arc Poster" PPUBS blocker from the prior session.
"Amnesty data" is now canonically defined: game.dramaScore,
drama_score_peak, getDramaHistory() time-series, five vector
final values, historical percentile, arc personality label.
All surfaced at data-state="post". RUWT scope confirmed: in-game
only. Six-hour post-game window framed as FIELD's staked territory.
Drive: 1qyek7_eBtPvrqhVVljnKZhtmHn9GgVF9h1NilaGX9xc

### PM-25a — renderCardBadges() Card Render Slot (0779cc8, A493)
Extracted ~80-line inline badge block from injectDramaBadges() into:
  renderCardBadges(card, eData, sport, gid, smoothed)
Single callsite for all live-card badge mutations: CRUNCH TIME,
WORTH WATCHING, drama tier badge, EMBER, MLBN alert.
Unblocks: confidence glyph, CRUNCH Fan-Out chip, WS Pulse on cards.
DOM-only per A191 rule — stays in index.html, not field_utils.

### PM-25b — Drama Dial categorical tier refactor (0779cc8, A494, A495)
Added _otwGetLiveTier(eData, sport, smoothed) returning named condition
strings (CRUNCH / EXTRA_TIME / CLOSE_FINISH / LIVE_GAME) from binary
factual booleans (period, margin, SPORT_CRUNCH_RULES).
Added _otwTierLabel(tier) for display string mapping.
Wired into OTW FIRE state — replaces dramaTier(score)||'warm'.
OLD: numeric composite score → tier band label
NEW: binary factual conditions → named observation label
Same pattern as _otwFindWCLiveGame. RUWT Rule 51 MODERATE → RESOLVED.
Smoke 501→504 (A493, A494, A495).

## DO NOT ASSUME corrections

Drama Dial categorical tier refactor is SHIPPED (PM-25b, 0779cc8).
Prior HANDOFF listed it as pending Item 12 under "Patent priority."
It is now done. USPTO June 25 filing was cancelled June 4 — that
header framing is stale and has been removed from the priority list.

getDramaHistory(game.id) EXISTS in codebase (~line 24875). Whether
it is being POPULATED during live games (recordDramaHistory() call
chain) is UNVERIFIED. Must confirm before Arc Poster build.

## G2 Verification Checklist (NYK @ SAS · 8:30pm ET · ABC)

1. ~6pm ET — Re-probe NBA CDN scoreboard:
   field-relay-nba/.github/workflows/scoreboard-probe.yml → workflow_dispatch
   Look for: non-empty games array, gameId for NYK@SAS, gameDate = 2026-06-05

2. At G2 tip — PM-24 verification:
   findScore({home:'NYK', away:'SAS'})._pm24_matched
   Expected: array with 2 keys. confidence = 'verified' or 'mismatch'

3. At G2 tip — Finals Desk verification (A489 structural):
   window._lastCompoundPrompt
   Should include "Context: NBA Finals G2 — NYK leads 1-0..."

4. At G2 tip — PM-25b verification (new):
   Open console during live game:
   _otwGetLiveTier(espnData, 'Basketball', getSmoothedDrama(gameId))
   Expected: 'CRUNCH' or 'CLOSE_FINISH' or 'LIVE_GAME' (string, not number)

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

### Subscribers (small, after PM-25 ✓ and PM-27)
  4. Rich-visual confidence glyph (~10 lines into PM-25 hook ✓)
  5. JQ Gate brand-safe fallback (~60 lines, parallel-trackable, no hub dep)
  6. CRUNCH Fan-Out causality chip (~30 lines into PM-27 + PM-25 ✓)
  7. OTW Changeover beat (~25 lines into PM-27)
  8. WS Pulse on cards (~30 lines into PM-25 ✓ + PM-27)
  9. iOS PWA Add-to-Home (~40 lines, parallel-trackable)

### Build items (patent-adjacent — USPTO filing cancelled June 4)
  10. Arc Poster — SVG render from Amnesty data (~200 lines, no backend)
      → YELLOW-GREEN novelty, park filing, build as product feature
      → BLOCKER: verify getDramaHistory() is populated during live games
        (recordDramaHistory() call chain — check in console at live game)
      → getDramaHistory() exists (~line 24875), population unverified
  11. State Transition PerformanceObserver (~30 lines + assertions)
      → Product quality build, not a patent play

### Deferred / maintenance
  12. A399 cleanup — detail string still says "verified unreachable" (now wrong)
  13. field-relay-nba scoreboard-probe.yml — delete or keep as reusable diagnostic

## Key Refs
jubilant-bassoon HEAD: 0779cc8
field-relay-nba HEAD: 25d8fbc
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 504/0 · Unit: 66/0

## Drive Docs (this day)
Amnesty Zone Definition: 1qyek7_eBtPvrqhVVljnKZhtmHn9GgVF9h1NilaGX9xc
Session doc (PM-25):     15ZflDC7r1tbZ7UdFP2ToTjUwJp_bHAAOKXO4IYE46nI
