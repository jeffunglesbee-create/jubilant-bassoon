# FIELD HANDOFF — 2026-06-05 (PM-24 + Scoreboard P0)

## State
jubilant-bassoon HEAD: 89b765e · Smoke: 497/0 · Unit tests: 60/0
field-relay-nba HEAD: 25d8fbc (scoreboard probe added; one-shot diagnostic captured)
SW_VERSION: 2026-06-05a

## Session Summary

### 1. PM-24: Read-time witness aggregation (79cee15 → 89b765e)
findScore now aggregates witnesses across all fuzzy-matched _scoresBySource
entries before evaluating confidence. The 'verified' state is reachable.

Problem: PM-20 writers used literal team-name keys. ESPN wrote
"New York Knicks|San Antonio Spurs"; api-sports wrote "Knicks|Spurs".
Two entries per game, one witness each. findScore returned on first match
→ always 'single'.

Fix: invert control flow. Iterate, accumulate freshest witness per source
via espnTeamMatch fuzzy lookup. Evaluate confidence after the loop.
Returns _pm24_matched diagnostic showing contributing keys.

Smoke 494→497 (A486 comment block, A487 aggregation logic, A488 diagnostic).
Unit tests 60/0 unchanged.

### 2. Scoreboard P0 — RESOLVED (relay e0b44e7, probe 25d8fbc)
The probe allow-list carry-forward is closed. /nba/liveData/scoreboard/
todaysScoreboard_00.json added to ALLOWED_EXACT in probe_relay_route tool
(src/index.js:3481-3495 of field-relay-nba). Deployed e0b44e7 14:01 UTC.

DIAGNOSTIC (probe at 14:06:35 UTC = 10:06 AM ET):
  HTTP 200, application/json, 375 bytes, 156ms
  scoreboard.gameDate = "2026-06-04" (yesterday)
  scoreboard.games = [] (empty)
  meta.request = nba-prod-...amazonaws.com/.../todaysScoreboard_00.json

Interpretation: NBA's CDN is in normal early-day state. todaysScoreboard
rolls forward as teams arrive at arenas (typically mid-afternoon ET).
The relay chain is fully healthy — route forwards correctly, returns
valid JSON. The empty games array is expected at this hour.

CORRECTION TO PRIOR FRAMING:
  My earlier statement that PM-24 verification depends on this route
  was wrong. Re-tracing: _scoresBySource[key].espn is written by the
  ESPN-native scoreboard writer (index.html:14900-15044), .apisports
  by the api-sports V2 writer (~13200, 14900). NBA CDN scoreboard only
  populates _nbaGameIdMap for PBP routing (fetchNBAPBP). PM-24's
  verified branch fires independently.

  What this NBA CDN scoreboard DOES gate: any feature using NBA CDN
  PBP, including in-game scoring-run detection, possession-by-possession
  analytics, late-game timing precision. None of these are PM-24.

NEW CARRY-FORWARD (small): re-probe scoreboard at ~6pm ET tonight to
  confirm CDN has populated G2 (NYK@SAS). Workflow is reusable:
  re-trigger field-relay-nba/.github/workflows/scoreboard-probe.yml
  via workflow_dispatch. Result lands in outbox/.

### 3. Doc artifact (out-of-repo)
Viewport spec refresh shipped earlier this session:
/mnt/user-data/outputs/field-viewport-2026-06-05.html
~2000 lines, 12-state coverage incl. NEW W1 WC variant, surface library,
Status Ledger (DO NOT ASSUME, four-class), Novel Thinking paths.
PM-24 section now annotated "SHIPPED 79cee15" with verification path.

## Verification at G2 (NYK @ SAS · 8:30p ET · ABC)

PM-24 verification path:
  Open console at game time:
    findScore({home:'NYK', away:'SAS'})._pm24_matched
  Expected: array with 2 keys (one ESPN-shaped, one api-sports-shaped)
  Confidence field flips to 'verified' (scores agree) or 'mismatch' (diverge)
  Card text reads "62-58 Q3 ✓" or "62-58 Q3 ⚠" for first time

NBA CDN re-probe (after the scoreboard-probe workflow re-runs):
  Look for non-empty games array containing gameId for NYK@SAS
  _nbaGameIdMap should then populate when fetchNBAScoreboard fires
  Enables PBP features for G2

## Priority List (resequenced post-session)

  1. R2 Finals Narrative Context verify at G2 tonight
       Convert to synthetic smoke #498 (see viewport spec Novel Thinking #1)
  2. Re-probe NBA CDN scoreboard at ~6pm ET (workflow exists)
  3. BALLDONTLIE trial — June 11 Mexico vs SA 7pm ET opening match
  4. WC pre-flight — probe all endpoints before June 11
  5. Drama Dial — patent-priority June 25, dual-ship with _otwFindLiveGame RUWT fix
  6. Rich-visual confidence glyph (item 2b in viewport spec) — ~30 lines, follow-on to PM-24
  7. wpDelta → drama signal
  8. Level 2 sparkline
  9. Cleanup: simplify A399 (PM-22 band-aid) detail string — verified is now reachable

## Key Refs
jubilant-bassoon HEAD: 89b765e
field-relay-nba HEAD: 25d8fbc
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 497/0 · Unit tests: 60/0
Probe diagnostic: field-relay-nba/outbox/scoreboard-probe-20260605T140635Z.body
