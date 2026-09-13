# CC session — odds-line render path closed, and the count that hid two causes

**Date:** 2026-09-13 UTC (2026-09-12 ET)
**CC-CMD:** `CC-CMD-2026-09-12-odds-line-wrong-render-path.md` — **CLOSED**
**Second CC-CMD filed:** `CC-CMD-2026-09-13-no-odds-count-hides-two-causes.md`
**HEAD:** `f6133e3b` → `e2f4ec1e` · Smoke 1049/0 · SW `2026-09-12u` (no bump — probe only)

---

## The CC-CMD was already done, and unclosed

Tasks 0–3 and most of 4 had shipped earlier in the session. Verified at HEAD
rather than trusted from the task list (Rule 72):

| task | evidence |
|---|---|
| 1 `buildOddsMovement` layer | `src/debrief/index.ts:351`, wired `l6` at `:404` |
| 2 A-ODDS repointed | A-ODDS-5/6 inspect the TS; A-ODDS-7 asserts the field.js wiring is gone |
| 3 dead slot removed | `data-slot="odds"` count 0 in both files, held by A-ODDS-7 |
| 4 named game ids | `opened_only espn:401878779`, `unchanged espn:761803`, `moved espn:401879283` |

## Task 4's fourth state was unobtainable as written

`m.states.no_odds = pick(r => r.hidden || !r.text)` scanned
`querySelectorAll('.debrief-odds-movement')`. `buildOddsMovement` returns **null**
for the no-odds state, so no element exists to find. The predicate was left over
from when the line was a `data-slot` that rendered hidden.

Against the `l6` layer it could only ever return `null` — **which reads
identically to "this state was not observed today."** The dominant state, made
permanently invisible by the fix that moved the layer.

A spec defect, not an execution one: the CC-CMD asked for "a named game id for
the no-odds state", and a state defined by the absence of an element has no
element to name. Counted over a denominator instead:

```
debriefs_total 81   with_movement_line 29   no_movement_line 52
states.no_odds { game: "g16", "52 of 81 rendered debriefs" }
```

Absence as a positive count over a known denominator, not a null (Rule 99).

## The count immediately proved to hold two populations

```
of the 81 rendered debriefs: espn: ids 66, synthetic g<N> 12, other 3
of the 29 WITH a movement line: synthetic ids 0
```

**Zero of twenty-nine.** Every card with a movement line has a durable id; all
twelve synthetic-id cards sit in the no-movement set.

`injectDebriefCards` fetches `/context/game/{id}`, and
`CC-CMD-2026-09-12-context-game-slate-id` made the relay refuse unresolvable ids
outright. So ~12 of the 52 **could not ask** for odds, and ~40 **asked and got
none**. One number, two causes, different fixes. Filed as its own CC-CMD with a
Task 1 that can close it as WONTDO if the twelve turn out to be sports with no
odds coverage — the correlation is exact in one run, and one run is not a
population.

## A mistake worth recording

Commit `960a5b52` pushed a line printing `undefined of undefined rendered
debriefs`. My python heredoc asserts every anchor **before** writing the file;
the third assertion failed, so nothing was written — but the `console.log` from a
separate earlier edit had landed, referencing fields that did not exist.

The all-or-nothing write is the right design and it did its job. What I got
wrong was treating `node --check` passing and the push succeeding as evidence the
edits landed. `node --check` cannot see a missing variable, and the commit's own
`1 file changed, 3 insertions` said so in a diffstat I did not read.

Fixed in `e2f4ec1e` and verified on a live run — 81/29/52 — rather than by grep.

## Also, incidentally

That run was **green run 2 of 5** for
`CC-CMD-2026-09-12-v2-sections-in-model-not-in-dom`: `sections_model_not_in_dom
[]`, 148 cards.
