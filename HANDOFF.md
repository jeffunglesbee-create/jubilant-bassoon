# FIELD HANDOFF — 2026-06-05 (Session END)

## State
jubilant-bassoon HEAD: 538532e · Smoke: 501/0 · Unit tests: 66/0
field-relay-nba HEAD: 25d8fbc (scoreboard probe workflow + allow-list)
SW_VERSION: 2026-06-05a
Time: ~3:45pm ET · G2 tip: 8:30pm ET tonight (NYK @ SAS · ABC)

## Session Ships (chronological)

### PM-24: verified confidence reachable (79cee15 → 89b765e)
findScore aggregates witnesses across fuzzy-matched _scoresBySource keys.
ESPN "New York Knicks|San Antonio Spurs" + api-sports "Knicks|Spurs" now
both contribute → verified branch reachable. _pm24_matched diagnostic field.
Smoke 494→497 (A486, A487, A488).

### Scoreboard P0 probe allow-list (relay e0b44e7)
/nba/liveData/scoreboard/todaysScoreboard_00.json added to probe_relay_route
ALLOWED_EXACT. Probe confirmed HTTP 200, valid JSON. CDN returns games:[]
at 10am ET — normal early-day state, not a bug.

### A489: Finals Desk CI gate (4f021cc)
Converted "verify at G2 via window._lastCompoundPrompt" from human-loop check
to structural smoke assertion. matchupNote → buildCompoundPrompt Context line
now CI-gated. Smoke 497→498.

### Drama Dial OTW wiring A490 (00e9d25)
Both OTW FIRE callsites replaced _otwFindLiveGame(50) → getDramaDial().
Badges and OTW selection now governed by same user preference. RUWT Rule 51
MODERATE resolved (user-controlled threshold, not fixed). Smoke 498→499.

### Scoreboard P0 fully resolved (bcae437, A491)
parseNBAScoreboardGames extracted to field_utils.js + index.html (A191 rule).
fetchNBAScoreboard delegates to it. 6 synthetic unit tests (60→66): NYK@SAS
4-key map, teamNick path, missing gameId skip, empty array, null CDN state,
multiple games. Smoke 499→500.

### RUWT compliance: manifest + dial preview (538532e, A492)
RISK 1: PWA manifest "drama scores" → "drama intelligence" (public admission fix)
RISK 2: Dial preview "Badges at 65+" → "Close games get badges" (no threshold exposure)
Smoke 500→501.

## DO NOT ASSUME corrections from this session

Drama Dial was incorrectly classified as Class D ("no code"). The "Drama
Sensitivity" slider in My Services IS the Drama Dial — fully built, localStorage
+ IDB + SW sync, controls getDramaScore() thresholds. OTW wiring added A490.
Missing: header chip (main-view discoverability) + categorical tier refactor.

Scoreboard P0: prior HANDOFF said "RESOLVED" after just the probe allow-list.
That was imprecise — parsing was unverified. Now fully resolved with unit tests.

## G2 Verification Checklist (NYK @ SAS · 8:30pm ET · ABC)

1. ~6pm ET — Re-probe NBA CDN scoreboard:
   field-relay-nba/.github/workflows/scoreboard-probe.yml → workflow_dispatch
   Look for: non-empty games array, gameId for NYK@SAS, gameDate = 2026-06-05
   If populated: _nbaGameIdMap will fill at tip, PBP features active for G2

2. At G2 tip — PM-24 verification:
   Open console:
     findScore({home:'NYK', away:'SAS'})._pm24_matched
   Expected: array with 2 keys (ESPN + api-sports). confidence = 'verified' or
   'mismatch' (either beats 'single'). Card text: "62-58 Q3 ✓" or "62-58 Q3 ⚠"

3. At G2 tip — Finals Desk verification (A489 structural, this is runtime):
   Open console:
     window._lastCompoundPrompt
   Should include "Context: NBA Finals G2 — NYK leads 1-0..."

## Priority List

### Time-gated (today/this week)
  1. Re-probe NBA CDN scoreboard at ~6pm ET
     → workflow_dispatch field-relay-nba/scoreboard-probe.yml
  2. WC pre-flight — probe all relay endpoints before June 11 opener
     → MEX vs RSA at Azteca, 12pm ET, FOX/Telemundo
     → D1 wc2026 f26669de-e772-4b56-a6d1-f8fdea08a4d4
  3. BALLDONTLIE trial — June 11 opening match data source test

### Infrastructure (unlock 3+ surfaces each)
  4. PM-25 Card Render Slot
     → renderCardBadges(card, eData) ~45 min
     → unblocks: rich-visual confidence glyph, WS Pulse on cards, CRUNCH Fan-Out chip
  5. PM-27 Event Bus Payload Standard
     → standardize {type, target, source, reason, at, payload} ~30 min
     → unblocks: CRUNCH cascade chip, otw:changed beat, ws:fresh staleness

### Subscribers (small, after hubs)
  6. Rich-visual confidence glyph (~10 lines into PM-25 hook)
  7. JQ Gate brand-safe fallback (~60 lines, parallel-trackable, no hub dep)
  8. CRUNCH Fan-Out causality chip (~30 lines into PM-27 + PM-25)
  9. OTW Changeover beat (~25 lines into PM-27)
  10. WS Pulse on cards (~30 lines into PM-25 + PM-27)
  11. iOS PWA Add-to-Home (~40 lines, parallel-trackable)

### Patent priority (Jun 25 USPTO — ~20 days)
  12. Drama Dial categorical tier refactor
      → _otwFindLiveGame → named-condition tiers like _otwFindWCLiveGame
      → RUWT Rule 51 MODERATE → resolved
      → Also ships header chip discoverability (~20 lines)
  13. Arc Poster — SVG render from existing Amnesty data (~200 lines, no backend)
  14. State Transition PerformanceObserver (~30 lines + assertions)

### Deferred / maintenance
  15. A399 cleanup — detail string still says "verified unreachable" (now wrong)
  16. field-relay-nba scoreboard-probe.yml — delete or keep as reusable diagnostic

## Key Refs
jubilant-bassoon HEAD: 538532e
field-relay-nba HEAD: 25d8fbc
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Viewport spec: field-viewport-2026-06-05.html (outputs/)
Smoke: 501/0 · Unit: 66/0
