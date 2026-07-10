# CC-CMD: Extend getGameReasonTags() with three real, siloed signals

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Confirmed by direct grep, not assumed: three real, already-computed
signals exist in the current file, each correctly implemented, each
currently consumed by exactly one feature, none reaching
`getGameReasonTags()` (shipped last CC-CMD, verified 100/100):

- `isRivalGame(g)` — real, gated correctly behind `MY_TEAMS.size > 0`
  in every existing usage. Currently only feeds a display badge.
- `isNationalGame(g)` — real, simple, checks `g.nationalBundle`.
  Currently only feeds bundle-chip matching.
- Weather's `extreme` flag — real, computed as
  `temp<20||temp>100||wind>25||precip>0.5` inside the Phase 3 weather
  intelligence block (~line 39692), keyed by `wxCache[game._id]`.
  Currently only feeds `injectWeatherBadges()`.

This is the same structural pattern found three separate times tonight
— a real signal, correctly built, silently unavailable to the shared
reason-vocabulary aggregator. This CC-CMD closes all three at once by
extending the one existing aggregator, not building three separate
consumers.

**Scope discipline, same as the original `getGameReasonTags()` build:
aggregate only, compute nothing new.** All three signals already exist
and are already correct. This task only adds them to the existing
tag-collection sequence.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "function getGameReasonTags" -A 15 index.html
# Re-read the current, live version before extending it — confirm the
# exact tag-push sequence and ordering established in the last CC-CMD.

grep -n "function isRivalGame\|function isNationalGame" -A 5 index.html
# Re-confirm both signatures and exact current behavior.

grep -n "WEATHER INTELLIGENCE" -A 20 index.html
# Re-confirm wxCache's exact current keying (by game._id, per this doc's
# citation) and the extreme flag's exact current formula — this doc's
# citation may have drifted; verify before reusing it.
```

## TASK 1 — Add all three signals to the existing aggregator

Extend `getGameReasonTags()`'s existing sequence with three new checks,
matching the exact style and safety pattern already established
(`typeof X === 'function'` guards, consistent with how the original
function guards its own dependencies):

```js
if (typeof isRivalGame === 'function' && typeof MY_TEAMS !== 'undefined' && MY_TEAMS.size > 0 && isRivalGame(game)) tags.push('rivalry');
if (typeof isNationalGame === 'function' && isNationalGame(game)) tags.push('national_tv');
if (typeof wxCache !== 'undefined' && game._id && wxCache[game._id]?.extreme) tags.push('weather_extreme');
```

Placement in the ordering: after `user_team` and `_gameImportance`
(the highest-signal tags from the original build), before the live-tier
and `close_late` tags — these three are pregame-available facts, not
live-state-dependent, so they belong earlier in priority. Confirm this
ordering makes sense against the probe's re-read of the current
function; adjust only if the probe reveals a reason not assumed here.

## TASK 2 — Live verification

Construct at least one real or realistic test case per new signal:
a rival-team game (with `MY_TEAMS` populated), a `nationalBundle` game,
and a game with a `wxCache` entry flagged `extreme`. Confirm each
correctly appends its tag, and confirm a game matching none of the
three still returns correctly without them (not a false positive).
Also confirm a game matching multiple simultaneously (e.g. a rival
national broadcast) returns all applicable tags in the correct order.

## DONE CONDITIONS

- [x] All three signals added using only real, existing functions/data
      — no new signal computation
- [x] Guard pattern matches the existing function's established style
- [x] Ordering placed correctly relative to the original 4 tags, per
      probe-confirmed current structure
- [x] Live-verified: each signal independently, plus a multi-tag
      combination case, actual output checked

## CONFIDENCE SCORING

- +30 — all three signals correctly added, using only real existing
  functions/data
- +20 — guard pattern and ordering consistent with the original
  function's established conventions
- +25 — live verification covers all three signals independently
- +25 — multi-tag combination case verified with correct tag ordering

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-10-reason-tags-siloed-signals.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
