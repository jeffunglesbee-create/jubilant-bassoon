# CC-CMD: Migrate remaining display-only espnScores consumers to findEspnEntry()

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Confirmed tonight via direct read, not assumed: `findEspnEntry()` exists
and is real, but only 4 call sites currently use it, all traced to
2026-07-07's pick'em stale-final CC-CMD. `checkForNewFinals()` and
`renderNightOwlRecap()`'s fallback — the two write paths — are already
migrated (see the sibling CC-CMD,
`CC-CMD-2026-07-09-saveespnfinal-internal-guard.md`, for that half).

**This CC-CMD covers the display-only side**, per the July-9-dated
optimization doc's "Commit 2": `updatePinWidget()`,
`renderHalftimeSwitch()`, and enrichment call sites
(`injectMLBPlatoon()`, `injectLineupEdge()`) — none of these four
appeared among the 4 confirmed `findEspnEntry` call sites tonight,
meaning they very likely still use the older unguarded
`Object.values(espnScores).find(...)` team-name-suffix scan.

**Do not stop at the doc's named list.** Three separate times tonight
(finals-desk's identical enqueue-context-gap bug, the missing
anti-fabrication guard, and now this exact same shape) a fix or risk
got correctly identified for the specific call site that surfaced it
and never checked against every sibling sharing the identical pattern.
This CC-CMD requires a full, fresh grep for every remaining
`Object.values(espnScores).find(` occurrence in the file — the doc's
four named functions are a floor, not a ceiling.

**Different failure mode than the write-path CC-CMD — be precise about
this, don't copy that one's logic wholesale.** These are display
consumers. On a failed/unverifiable match, the correct behavior is
"show nothing or omit the enrichment," not "block a write" — there is
no write to block here. Follow the optimization doc's own framing:
showing `--` or omitting a chip is strictly better than showing a
plausible-looking wrong score.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "Object.values(espnScores).find(" index.html
# Full, fresh sweep — enumerate every real remaining occurrence, not
# just the doc's four named functions. Report each as migrated in this
# CC-CMD, or explicitly excluded with a stated reason (e.g. genuinely
# already using a different, safe lookup this doc's author didn't know
# about) — do not silently skip any hit found.

grep -n "function updatePinWidget\|function renderHalftimeSwitch\|function injectMLBPlatoon\|function injectLineupEdge" -A 15 index.html
# Re-read each of the doc's four named functions' current real bodies
# before editing — confirm they still contain the pattern the doc
# describes, word for word matching may have drifted since 2026-07-07.

grep -n "function findEspnEntry" -A 20 index.html
# Re-confirm current signature/behavior — this doc's citation may be
# stale by the time this runs.
```

## TASK 1 — Migrate every real occurrence found by the sweep

For each confirmed `Object.values(espnScores).find(...)` occurrence
(the probe's full list, not just the doc's four names): replace with
`findEspnEntry(game, { requireSameDate: true })` where a `game` object
is available in scope, following the exact same pattern already proven
correct in `checkForNewFinals()`. On a null/failed match, the calling
UI code should render its existing empty/omitted state — do not invent
a new "unavailable" UI pattern if one doesn't already exist; find and
reuse whatever this codebase already does elsewhere for "no data for
this game."

## TASK 2 — Confirm every migrated site degrades correctly, not silently

For each site migrated: confirm what currently happens when
`findEspnEntry` returns `null` — does the surrounding code already
handle a missing/undefined `eData` gracefully (most likely, given these
are display paths that already deal with games lacking live scores), or
does it need a small added guard to avoid a runtime error on null.
Report this per site in the outbox, not just for the sweep as a whole.

## TASK 3 — Live verification

For at least the pinned widget and halftime-switch paths specifically
(the two most user-visible): construct a real scenario with a
deliberately mismatched or absent `espnScores` entry and confirm the UI
shows its degraded/empty state rather than a wrong score. Confirm a
correctly-matched real case still displays normally. For the enrichment
call sites, confirm at minimum that they no longer receive `eData` from
an unguarded scan — direct code inspection of the call site is
sufficient here if a live rendering test isn't practical for these
specifically; state which verification method was used for each.

## DONE CONDITIONS

- [x] Full fresh sweep performed, every real occurrence found reported
      as migrated or explicitly excluded with a stated reason — not
      just the doc's four named functions
- [x] Each migrated site's null-handling confirmed correct, adjusted
      where the probe showed it wasn't already
- [x] Live test for pinned widget + halftime switch proves graceful
      degradation on mismatch, normal display on match
- [x] Enrichment call sites confirmed no longer fed by unguarded scans,
      verification method stated per site

## CONFIDENCE SCORING

- +20 — full sweep performed, every hit accounted for explicitly
- +30 — all real occurrences correctly migrated, matching the proven
  `checkForNewFinals()` pattern
- +20 — null-handling confirmed/fixed per site, not assumed safe
- +30 — live test proves graceful degradation for the two most visible
  surfaces, verification stated for the rest

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-espnscores-display-consumer-sweep.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
