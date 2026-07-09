# CC-CMD: WC advancement-probability mutation bug + the .keys() search blind spot

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Found by chasing a single flagged finding (a parallel, lower-rigor
analysis pass on this file identified a WC advancement-probability
mutation bug) — verifying it directly surfaced two more real gaps the
same search pattern had been missing all night.

**Bug 1 — real, confirmed, most severe of the three.**
`fetchWCLiveGames()` (~line 33100) merges `advancementProb` onto
`espnScores` entries via `Object.keys(espnScores).find(...)`, matched
on home-team-suffix only — no away-team check, no date check at all,
not even the baseline staleness guard `findEspnEntry()` provides
everywhere else. Worse than a read-path mismatch: this **mutates** the
shared cache entry (`espnScores[_eKey]._wcAdvProb = ...`), and per the
adjacent comment that value directly feeds `applyQW1SituationBonus()`
"as a drama signal." A wrong match here doesn't cause one bad display —
it plants a false value that persists on that entry and can bias drama
scoring for a different game until overwritten.

**Bug 2 — two functions never actually migrated, despite tonight's own
outbox claiming "One To Watch and mobile live bar" were done.**
`_otwFindLiveGame()` (~line 37041) and `renderMobileLiveBar()`
(~line 37368) both still use `Object.keys(espnScores).find(...)`, with
an even looser match than anything else in the file — comparing just
the last whitespace-split word of team names (`hL===eL`), which risks
colliding on generic name fragments ("City," "United," "Rovers"). Only
`_otwFindWCLiveGame()` — a different, WC-specific function with a
similar name — was actually migrated earlier tonight. The outbox's
summary-level description was trusted without checking that every
function actually matching "One To Watch" was covered.

**Root cause of both misses, stated explicitly so it doesn't recur a
fifth time:** every sweep tonight searched for
`Object.values(espnScores).find(`. None searched for
`Object.keys(espnScores).find(` — the identical risk shape, different
method name. This CC-CMD's probe block requires both patterns by name.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "Object.keys(espnScores)" index.html
# Full, fresh enumeration of every hit — not just the three named
# above. Report each as: migrated in this CC-CMD, a mutation risk
# requiring the write-mode pattern, a read-only risk requiring
# display/derived pattern, or explicitly excluded with a stated reason
# (matching how scoreSMTCard was correctly excluded from the earlier
# .values()-only sweep for using exact _gameId equality, not fuzzy
# matching).

grep -n "function fetchWCLiveGames" -A 30 index.html
grep -n "function _otwFindLiveGame" -A 25 index.html
grep -n "function renderMobileLiveBar" -A 15 index.html
# Re-read all three in full current form before editing — this doc's
# line citations may already be stale.

grep -n "function findEspnEntry\|function findScoreForCard" -A 15 index.html
# Confirm current signatures of both helpers before reusing them here.
```

## TASK 1 — Fix the WC advancement-probability mutation (write-adjacent, highest priority)

This isn't a display read, but it's not a pure display consumer either
— it mutates a cache entry that feeds downstream scoring. Treat it with
write-level rigor: resolve the actual FIELD game the WC live entry
corresponds to (via whatever identifier `_g` genuinely carries — check
the probe for what `fetchWCLiveGames`'s source data actually exposes,
don't assume a `_id` exists if the probe shows otherwise), then use
`findEspnEntry(resolvedGame, { requireSameDate: true })` to get the
verified cache entry before mutating it. If the game can't be resolved
or verified, skip the merge for that live entry entirely rather than
falling back to the old suffix scan.

## TASK 2 — Migrate `_otwFindLiveGame()` and `renderMobileLiveBar()`

Both to `findEspnEntry(game, { requireSameDate: true })` or
`findScoreForCard()` as appropriate given each function's actual
available context (game object vs. card element) — matching the exact
pattern already proven correct in `_otwFindWCLiveGame()` and the rest
of tonight's real migrations. Preserve each function's existing
downstream logic (tier ranking, display formatting) exactly — only the
match source changes.

## TASK 3 — Complete `.keys()` sweep beyond the three named here

Per the probe's full enumeration: migrate or explicitly exclude every
real hit, not just the three this doc anticipated. If a fourth exists
that wasn't named here, that's expected — report it honestly rather
than treating this doc's scope as exhaustive.

## TASK 4 — Live verification

For the WC mutation fix: construct a real test with two live WC games
sharing a name-suffix collision risk, confirm `_wcAdvProb` only attaches
to the correctly-resolved game's cache entry, not a suffix-matched
wrong one. For `_otwFindLiveGame`/`renderMobileLiveBar`: confirm via
real or constructed data that a stale/mismatched entry no longer gets
selected as a live candidate. Report actual before/after behavior, not
just that the code compiles.

## DONE CONDITIONS

- [x] WC mutation resolved via a verified match, not a suffix scan;
      unresolvable entries skip the merge rather than guessing
- [x] `_otwFindLiveGame()` and `renderMobileLiveBar()` both migrated,
      matching the proven pattern from `_otwFindWCLiveGame()`
- [x] Full `.keys(espnScores)` sweep completed, every real hit
      accounted for explicitly, not assumed complete from this doc's
      three named sites
- [x] Live test proves the WC mutation now targets the correct entry
      under a real collision scenario, not just that a function runs

## CONFIDENCE SCORING

- +35 — WC mutation fixed with genuine verification, unresolvable
  entries skip rather than guess
- +25 — both un-migrated functions correctly fixed, matching the
  proven sibling pattern
- +20 — full sweep completed and reported honestly, including if a
  fourth site exists beyond this doc's list
- +20 — live test proves the WC fix under a real constructed collision,
  not inferred from code review alone

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-wc-advprob-and-keys-sweep.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
