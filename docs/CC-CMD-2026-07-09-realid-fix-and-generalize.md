# CC-CMD: Fix the broken _gameId comparison, then generalize real ID matching for V2 sources

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Found by verifying an assumption before building on it, per standing
discipline. `scoreSMTCard`'s "Item 6: Live state suppression" compares
`v._gameId === card._gameId` (~line 12947) — a real, exact-equality
check, correctly distinguished from fuzzy matching in an earlier sweep
tonight. But `card._gameId` is set (at the 5 real construction sites in
`buildDynamicPregames()`/`buildWCMediaCards()`) to `game._id` — FIELD's
own internal, per-page-load counter — while `v._gameId` (from
`mapV2ToESPN`, ~line 17654) is `fg.id`, api-sports.io's real external
event ID. These are two different ID spaces that can never be
meaningfully equal. This feature has very plausibly never worked since
it was built — not a matching bug, a wrong-field bug.

**The earlier exclusion of `scoreSMTCard` from tonight's display-
consumer sweep was checked at the wrong depth.** "Uses exact ID
equality, not fuzzy matching" was correct about the code's shape and
wrong about whether it actually functions — nobody confirmed the two
IDs being compared were the same kind of ID. Worth naming so the same
mistake doesn't repeat: confirming a comparison uses `===` is not the
same as confirming both operands are drawn from a source that makes
`===` meaningful.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "_gameId\s*[:=]" index.html
# Full, fresh enumeration of every _gameId assignment (both colon
# object-literal and equals direct-assignment forms) in the current
# file. Confirm the 5 sites this doc names, and report any not
# accounted for here.

grep -n "function mapV2ToESPN" -A 40 index.html
# Re-confirm fg.id -> _gameId: fg.id is still current.

grep -n "V2_RELAY_BASE\|/v2/games\|_v2Poll" index.html | head -20
# Trace where FIELD *game* objects (allData.sports[].games[]) actually
# get constructed from V2 poll responses -- this doc's premise is that
# game construction and espnScores construction both originate from
# the same fg record, but that has not been directly confirmed. If the
# probe shows game objects are NOT built from the same fg record V2
# scores come from, TASK 1's approach needs revisiting before
# proceeding -- report this honestly rather than forcing the plan.

grep -n "function buildDynamicPregames" -A 60 index.html
grep -n "function buildWCMediaCards" -A 60 index.html
# Re-read both in full current form to find the exact 5 construction
# sites and confirm game._id is really what's being assigned.
```

## TASK 1 — Fix the actual break

**If the probe confirms FIELD game objects are constructed from the
same `fg` record `mapV2ToESPN` receives:** stamp a real `_gameId: fg.id`
onto the game object at that same construction point — not derived via
any matching, direct propagation from the shared source record. Then
fix the 5 real sites in `buildDynamicPregames()`/`buildWCMediaCards()`
to set `card._gameId` from the game's own real `_gameId` (when present)
instead of `game._id`.

**If the probe shows game construction is NOT unified with the V2 score
path** (a different, independent code path builds the schedule): do not
force the direct-propagation approach. Instead, at the two builder
functions specifically, look up the matching `espnScores` entry once
(fuzzy match is acceptable here, since it already happens implicitly
today) and propagate *that* entry's real `_gameId` onto the card —
report honestly that this is a one-time-fuzzy-then-stable-reuse
pattern, not a construction-time stamp, and why the probe required it.

Either way: `scoreSMTCard`'s comparison itself does not need to change
— only what `card._gameId` actually contains.

## TASK 2 — Generalize into the shared matcher, not per-caller

Add a real-ID fast path to `findEspnEntry()`/`_eDataMatchesGame()`: if
both `game._gameId` and `eData._gameId` are present and non-empty,
compare them directly and skip fuzzy name matching entirely for that
comparison — real ID equality is strictly stronger evidence than any
name-based heuristic. Fall back to the existing fuzzy path only when
either side lacks a real ID (non-V2 sources, or a V2 entry from before
this fix's game-construction change reaches it). This must live in the
shared matcher, not be re-implemented per caller — every current and
future consumer of `findEspnEntry`/`_eDataMatchesGame` should get this
automatically.

**Explicitly out of scope:** the FD/football-data.org writer's own
`_gameId` field (~line 14613, `game._id || resolveGameIdByHome(...)`)
is a different, FIELD-internal ID, not an external stable one — do not
treat it as equivalent to V2's `fg.id` or attempt to unify them in this
pass.

## TASK 3 — Live verification

Confirm via real or constructed V2-sourced game data that: (a) a game
object's real `_gameId` now matches its corresponding `espnScores`
entry's `_gameId` exactly, (b) `scoreSMTCard`'s live-state suppression
actually fires now for a real live V2-sourced game where it previously
could not, and (c) the new fast path in `findEspnEntry` is actually
taken (not just present in code) for a real V2-sourced match — verify
this observably (a counter, a debug log), not by code inspection alone.

## DONE CONDITIONS

- [x] Root cause of `card._gameId`'s wrong value fixed at its actual
      construction site(s), approach matching what the probe found
- [x] `findEspnEntry`/`_eDataMatchesGame` try real ID equality first
      for V2-sourced entries, fall back to fuzzy matching otherwise —
      implemented once, in the shared matcher
- [x] Live-verified: `scoreSMTCard`'s suppression fires on a real case
      where it previously could not, and the ID fast path is
      demonstrably taken, not just theoretically present

## CONFIDENCE SCORING

- +30 — root construction-site bug fixed, approach matches what the
  probe actually found rather than the doc's assumption
- +30 — real-ID fast path correctly generalized into the shared
  matcher, not duplicated per caller
- +20 — FD writer correctly left alone, not incorrectly unified
- +20 — live verification is observable (counter/log), not inferred

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-realid-fix-and-generalize.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
