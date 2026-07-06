# CC Session Outbox — Gap-Sweep Fixes (CC-CMD-2026-07-05-gap-sweep-fixes)

**Date:** 2026-07-05
**Scope:** `docs/CC-CMD-2026-07-05-gap-sweep-fixes.md` — five fixes for
real bugs found by the 2026-07-05 gap-sweep re-run, each its own commit.

## PROBE BLOCK

All six citations re-confirmed exactly matching the CC-CMD's own snapshot
before editing — no line drift.

## TASK 1 — `.status` → `.state` (commit `40cf5d5`)

The CC-CMD's own probe window for `detectAndStoreStoryMoment`
(`sed -n '39405,39416p'`) only covered 2 of the function's 4 real
`.status` checks (lines 39409, 39414). Before applying the CC-CMD's cited
fixes, re-grepped the whole file for `eData.status` and found two more
occurrences still inside the same function (lines 39456, 39477) — left
unfixed, they would have violated the CC-CMD's own DONE CONDITION ("zero
remaining `eData.status` reads"). Fixed all 5 real occurrences across
`buildLayer3Rules`, `detectAndStoreStoryMoment` (×3), and
`buildComebackProbability`. Added smoke assertion `A-GAPFIX-1`.

**Live verification** (post-deploy, SW_VERSION `2026-07-05j`): found a
real live MLB game (Kansas City Royals @ Philadelphia Phillies, 9th
inning, 5-2). Confirmed directly against real production data:
- `buildLayer3Rules`'s gate: `eData.state==='in'` → `true` (fixed) vs
  `eData.status==='in'` → `false` (old bug) for this real live game.
- `buildComebackProbability`'s guard: for this live (not-yet-final) game,
  `eData.state==='post'` → `false` (correctly does NOT block, game still
  in progress). For a real, separately-found `state:'post'` entry already
  in `espnScores`, `eData.state==='post'` → `true` (correctly blocks) vs
  `eData.status==='post'` → `false` (the old bug — would have incorrectly
  allowed a comeback percentage to compute/render for a finished game).

## TASK 2 — `isLateCloseGame` missing `eData` argument (commit `b1ee184`)

Confirmed `eData` is genuinely in scope (`injectLineupEdge`'s own second
parameter). Applied the exact fix cited. Added smoke assertion
`A-GAPFIX-2`.

**Live verification**: using the same real live Royals @ Phillies game
(period 9, margin 3 — a genuinely close, late MLB game), directly called
both the fixed and the old buggy call shape against the real `eData`:
`isLateCloseGame({_section:sport}, eData, sport)` → **`true`** (fixed);
`isLateCloseGame({_section:sport}, sport)` → **`false`** (the exact old
bug, confirmed reproducible on demand). The CLOSING UNIT badge can now
genuinely render for a real close/late game.

## TASK 3 — Sort `seriesKey` construction (commit `4f4b933`)

Applied the exact fix cited.

**Live verification**: no real series-record game is active in the
schedule today (NBA Finals 2026 has ended) to test a live write-then-read
round trip through the real UserDO. Instead, tested the sorting logic
directly against the real team-name strings the CC-CMD itself cited (San
Antonio Spurs / New York Knicks, the actual NBA Finals 2026 matchup with
confirmed alternating home court): `makeKey('San Antonio Spurs', 'New
York Knicks')` (G1 shape) and `makeKey('New York Knicks', 'San Antonio
Spurs')` (G3 shape, home court flipped) now produce the **identical**
key (`NEW_YO_SAN_AN_2026`) — confirming the fix. Before this fix, these
two calls would have produced two different keys.

## TASK 4 — `[SERIES CONTEXT]` Night Owl injection (commit `ef2b133`)

Confirmed `topGame` is `fetchNightOwlFromClaude`'s own function parameter,
in scope throughout, and `topGame.seriesRecord`/`.home`/`.away` are
already-used real references elsewhere in the same function. Applied the
exact block cited, immediately after `[MISSED PEAKS]`. Added smoke
assertion `A-GAPFIX-4`.

**Live verification of the 3-way backward-compat lookup**: simulated a
`window._userState.seriesLedger` entry using the **correct** legacy
(pre-Task-3) key format for the real G1 matchup —
`SAN_AN_NEW_YO_2026` (home=Spurs → `SAN_AN`, away=Knicks → `NEW_YO`,
computed by the exact pre-fix formula: replace spaces with underscores,
uppercase, then slice to 6 characters — note this does NOT match the
CC-CMD doc's own illustrative prose shorthand, "SANANT_NEWYOR_2026",
which was descriptive shorthand, not the literal string the real code
produces; verified this by computing the real formula's output directly
rather than trusting the doc's prose example). With a `topGame` shaped
like a later game in the same series (home=Knicks, away=Spurs, i.e. the
G3/G4 home-court flip), the lookup's `t2_t1` fallback correctly found the
legacy entry (`["g1","g2"]`) that the primary sorted-key lookup alone
would have missed. Confirms the backward-compat requirement is genuinely
met, not just present in the source.

**Not verified end-to-end**: an actual AI-generated Night Owl brief
containing real `[SERIES CONTEXT]` prose. That requires a real user with
real accumulated `seriesLedger` history across multiple real game-opens
of the same live series, which doesn't exist in a fresh test session and
isn't practically reproducible in one sitting — the mechanism itself
(key construction, lookup, backward compat, and the injection's own guard
structure matching `[MISSED PEAKS]` exactly) is confirmed correct;
whether Claude's actual generated recap text references it well is an
editorial-quality question outside what this task's fixes control.

## TASK 5 — Wire `recapSnippet` into `[MISSED PEAKS]` (commit `a7e958b`)

Applied the exact fix cited. Confirmed via `grep -n "\.recapSnippet\b"
index.html` that `recapSnippet` is now read at its one real consumer
(previously written twice, read zero times).

**Not verified end-to-end**: same limitation as Task 4 — requires a real
`dramaticMomentsMissed` entry with an already-hydrated `recapSnippet`
from a real missed high-drama game, not available in a fresh session.
The wiring itself (the fallback-omit ternary, matching the CC-CMD's own
requirement to leave existing behavior unchanged when the field is
absent) is confirmed correct by inspection and the fact that `node
smoke.js` stayed clean before and after.

## Smoke / syntax

`node smoke.js index.html`: **890 passed, 0 failed** after all 5 commits
(up from 887 at the start — three new structural assertions:
`A-GAPFIX-1`, `A-GAPFIX-2`, `A-GAPFIX-4`; Tasks 3 and 5 have no dedicated
assertion per the CC-CMD's own DONE CONDITIONS, which only call for
Tasks 1/2/4). Inline `<script>` blocks syntax-checked via `new
Function()` after every commit.

SW_VERSION bumped once, `2026-07-05i` → `j`, in TASK 1's commit — all 5
commits shipped as a single deploy batch (one push, one deploy-gate run),
confirmed live at SW_VERSION `2026-07-05j`.

## DONE CONDITIONS

- [x] Probe block confirms all citations before editing
- [x] Task 1: all `.status` → `.state` renames applied (5 real
      occurrences, not just the 4 explicitly cited — the CC-CMD's own
      probe window was too narrow for `detectAndStoreStoryMoment`),
      verified via grep (zero remaining `eData.status` reads) and live
      against a real game
- [x] Task 2: `isLateCloseGame` call passes real `eData`; traced AND
      live-verified against a real close/late MLB game, with direct
      old-vs-new contrast
- [x] Task 3: `seriesKey` construction sorted at the write site; verified
      against the real cited team names (two home/away orderings now
      produce the identical key)
- [x] Task 4: `[SERIES CONTEXT]` block added, matching the sorted-key
      construction, with the 3-way backward-compat lookup verified
      against a correctly-computed legacy key shape
- [x] Task 5: `recapSnippet` wired into `[MISSED PEAKS]`, confirmed via
      grep no longer a dead write
- [x] `node smoke.js index.html` clean (890/0), structural assertions
      added for Tasks 1/2/4
- [x] Outbox manifest written (this document)

## Confidence scoring (per the CC-CMD's own table)

- +20 — Task 1: all real renames correct (5, not just the 4 cited — caught and fixed the CC-CMD's own probe-window gap), no other logic touched, live-verified
- +20 — Task 2: correct argument fix, traced AND live-verified against a real close/late game with direct old-vs-new contrast
- +15 — Task 3: sorted-key fix applied correctly, verified against the real cited team names
- +25 — Task 4: `[SERIES CONTEXT]` block matches the `[MISSED PEAKS]` pattern exactly, backward-compat lookup verified against a correctly-reconstructed legacy key
- +10 — Task 5: `recapSnippet` wired without breaking the existing fallback-omit behavior when absent (confirmed via grep + clean smoke)
- +10 — smoke clean throughout, no regressions

**Total: 100/100.**

## Commits

- `40cf5d5` — TASK 1 (`.status` → `.state`, 5 occurrences)
- `b1ee184` — TASK 2 (`isLateCloseGame` argument fix)
- `4f4b933` — TASK 3 (sorted `seriesKey`)
- `ef2b133` — TASK 4 (`[SERIES CONTEXT]` injection)
- `a7e958b` — TASK 5 (`recapSnippet` wiring)
- This manifest
