# CC-CMD: saveEspnFinal() has no internal guard — protected by convention, not construction

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Confirmed by direct read tonight, not assumed: `checkForNewFinals()` and
`renderNightOwlRecap()`'s fallback — the two known callers of
`saveEspnFinal(game, eData)` — were both already migrated to
`findEspnEntry(game)` on 2026-07-07
(`CC-CMD-2026-07-07-pickem-stale-final-resolution-fix-v6`).
`saveEspnFinal()` is therefore currently safe, but only because both of
its callers happen to behave correctly today — the function itself has
zero verification of its own. Read its full body directly: it trusts
whatever `eData` it's handed, unconditionally, for pick resolution,
drama-peak lookup, and D1 archive writes. A third caller added later
with unverified `eData` — even by accident, in an unrelated future
change — would sail straight through with no guard catching it.

**Real complication the fix must not break, confirmed via a real call
site found tonight:** `saveEspnFinal(game, game)` — the CFL fallback
path calls this with `eData` literally being the same object as `game`
itself (CFL's one-time fetch sets fields directly on the game object,
never populating `espnScores`). This is trivially "same event" by
construction, no scan involved, and must never be blocked.

**A real gap in the optimization doc's own proposed code, found by
checking it against actual source:** the doc's suggested guard calls a
`verifyEspnCandidate()` helper. That function does not exist anywhere
in the current codebase — only `findEspnEntry()` exists, which combines
matching and verification internally rather than exposing them as
separate composable pieces. Do not invent `verifyEspnCandidate()` from
the doc's pseudocode. Build the guard from what actually exists.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "function saveEspnFinal" -A 40 index.html
# Re-read the full current function body before editing — confirm no
# other production code path already added protection since tonight's
# read.

grep -n "saveEspnFinal(" index.html
# Re-confirm every real call site, not just the two already known.
# Report any found beyond checkForNewFinals and the renderNightOwlRecap
# fallback explicitly — if a third genuinely exists, this CC-CMD's
# premise (currently-safe-by-convention) needs revisiting before
# proceeding, not silently assumed still true.

grep -n "function findEspnEntry" -A 20 index.html
# Confirm its exact current signature and matching logic — this is what
# the new guard must build from, not a helper that doesn't exist.

grep -n "saveEspnFinal(game, game)" index.html
# Re-confirm the CFL same-object call pattern still exists exactly as
# found tonight, and find any other identical same-object calls that
# also need the same carve-out.
```

## TASK 1 — Internal guard, built from what actually exists

Add a check at the top of `saveEspnFinal(game, eData)`: if `eData` is
not the same object as `game` (preserving the CFL same-object carve-out
exactly), verify `eData` genuinely corresponds to `game` using
`findEspnEntry`'s own real matching logic — either by calling
`findEspnEntry(game)` again and confirming it returns the same entry,
or by extracting the equivalent home/away/date-compatibility check
`findEspnEntry` already performs, whichever the probe reveals is
cleaner given the function's actual current structure. If verification
fails, return `false` and do not proceed with the save — matching the
optimization doc's "write mode must fail closed" principle. Log via
`FIELD_DEBUG` console.warn on rejection, matching this codebase's
existing debug-logging convention for blocked writes.

## TASK 2 — Confirm callers handle the new false return correctly

`checkForNewFinals()` and the `renderNightOwlRecap()` fallback both
already call `saveEspnFinal()` without checking its return value in
some cases — confirm via the probe whether either needs a small
adjustment to skip its own follow-up logic (e.g. adding to in-memory
`finals`) when the new guard returns `false`, rather than proceeding as
if the save succeeded. Do not change either caller's own matching logic
— both are already correct — only adjust what happens after a `false`
return if the probe shows it's currently unhandled.

## TASK 3 — Live verification

Construct a real test case where `eData` and `game` are deliberately
mismatched (different teams, or same teams different date) and confirm
`saveEspnFinal` now returns `false` and does not write to `FINALS_KEY`
or trigger pick resolution. Construct a second real case with correctly
matched data and confirm it still saves normally, including the CFL
same-object case specifically. Confirm via a fresh read of the actual
stored data (not just the return value) that a rejected save genuinely
wrote nothing.

## DONE CONDITIONS

- [x] Guard added, built from `findEspnEntry`'s real existing logic —
      no reference to a `verifyEspnCandidate()` function that doesn't exist
- [x] CFL same-object carve-out (`eData === game`) confirmed preserved,
      not accidentally blocked
- [x] Both known callers confirmed to correctly handle a `false` return
      (adjusted if the probe shows they don't already)
- [x] Live test proves both a real rejection (nothing written) and a
      real success (CFL case included), not just one or the other

## CONFIDENCE SCORING

- +35 — guard correctly built from real existing logic, no invented helper
- +20 — CFL same-object carve-out confirmed preserved via real test
- +20 — both callers confirmed to handle false correctly
- +25 — live test proves both rejection and success cases with real
  stored-data checks, not just return values

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-saveespnfinal-internal-guard.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
