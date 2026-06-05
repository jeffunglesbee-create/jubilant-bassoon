# FIELD HANDOFF — 2026-06-05 (PM-24 SHIPPED)

## State
jubilant-bassoon HEAD: 79cee15 · Smoke: 497/0 · Unit tests: 60/0
field-relay-nba HEAD: b888a5f
SW_VERSION: 2026-06-05a (was 2026-06-04k)

## Session Summary

### PM-24: Read-time witness aggregation (79cee15)
findScore now aggregates witnesses across all fuzzy-matched _scoresBySource
entries before evaluating confidence. The 'verified' state is reachable.

Problem: PM-20 writers used literal team-name keys. ESPN wrote
"New York Knicks|San Antonio Spurs"; api-sports wrote "Knicks|Spurs".
Two entries per game, one witness each. findScore returned on first match
→ always 'single'. Documented as structurally unreachable in A399 detail.

Fix: invert control flow inside findScore.
  - Iterate all _scoresBySource entries
  - For each fuzzy-matched entry, accumulate freshest witness per source
    (espnWitness, apiWitness)
  - After loop completes, evaluate confidence on the unioned witnesses
  - Return _pm24_matched: [...keys] diagnostic field for verification

No writer refactor. 20+ callers of _scoresBySource[key] = ... unchanged.
Sport-guards (gameSoccer periodPrefix check) preserved per-entry as before.
Write-side canonicalization can come later as a separate clean-up.

Smoke: 494 → 497
  A486 — PM-24 comment block documents read-time aggregation fix
  A487 — findScore aggregates witnesses before evaluating confidence
  A488 — _pm24_matched diagnostic field in return shape

## Unanswered Questions — Resolved

Q: PM-20 verified confidence — when does it become reachable?
A: NOW. PM-24 (79cee15) ships the read-time aggregator. Verify in console
   during NYK@SAS G2 tonight:
     findScore({home:'NYK',away:'SAS'})._pm24_matched
   Should return array with both ESPN and api-sports keys for the same game.
   Confidence field should flip from 'single' to 'verified' or 'mismatch'.

## Carry-Forward (unchanged from prior HANDOFF)

P0 — Scoreboard probe allow-list: still pending. First step next session:
  add /nba/liveData/scoreboard to probe allow-list, then diagnose
  _nbaGameIdMap population. NBA Finals G2 tonight 8:30p ET is the live test.

P0 — R2 Finals Narrative Context Phase 1: still pending verification.
  Check window._lastCompoundPrompt during G2. Could be converted to synthetic
  smoke assertion #498 next session (per viewport spec design doc novel-thinking
  path #1) — converts 'wait for live moment' into CI gate.

## Priority List (resequenced after PM-24)

  1. Scoreboard P0 — NBA Finals daily dependency
  2. R2 Finals Narrative Context verify (or convert to synthetic smoke)
  3. BALLDONTLIE trial — June 11 Mexico vs SA 7pm ET opening match
  4. WC pre-flight — probe all endpoints before June 11
  5. Drama Dial — patent-priority June 25, dual-ship with _otwFindLiveGame RUWT fix
  6. wpDelta → drama signal
  7. Level 2 sparkline
  8. Cleanup: simplify A399 (PM-22 band-aid) detail string — verified is now reachable

## Follow-on Surfaces Now Unblocked by PM-24

Per the viewport spec design doc (Drive 1TLsSG5nXcM6vBH3DzILLJbVCqogNmdFL+,
field-viewport-2026-06-05.html), three Class-C surfaces become Class-A
candidates with PM-24 in place:

  - Confidence glyph card-time rendering — verified branch now reachable
  - WS Pulse staleness (binds to _lastWSMessageTime[canonical] — canonical now
    well-defined via aggregator's matched keys)
  - Future write-side canonicalization (deferred — read-time aggregator
    sufficient until writer churn justifies it)

## Session Doc
Drive (viewport spec refresh, includes PM-24 novel-thinking path):
1TLsSG5nXcM6vBH3DzILLJbVCqogNmdFL

## Key Refs
jubilant-bassoon HEAD: 79cee15
field-relay-nba HEAD: b888a5f (unchanged)
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 497/0 · Unit tests: 60/0
