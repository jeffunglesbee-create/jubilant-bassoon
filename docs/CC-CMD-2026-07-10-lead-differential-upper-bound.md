# CC-CMD: Lead-differential upper bound — impossible leads are being reported as fact

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Real, observed production bug: a Night Owl/Morning Report brief for a
final 2-0 Marlins-over-Mariners game stated a 4-run lead occurred at
some point — mathematically impossible. In every sport this function
covers (baseball, hockey, soccer, basketball, football), scores are
monotonically non-decreasing — a team's lead at any point in the game
cannot exceed their own final score, because points are never
subtracted. A 2-0 final means neither team could ever have led by more
than 2.

Root cause, confirmed by direct read (~line 40276): the lead-tracking
function already has a LOWER bound — `maxHomeLead = Math.max(maxHomeLead,
finalMargin)` — explicitly added, per its own comment, to fix a related
but opposite bug (artificially low maxLead values from snapshots
captured during "0-0" score outages). There is no corresponding UPPER
bound. One bad snapshot in the log — whether from a transient scoring
glitch during polling, or a mismatched score entry from a different
game (the dominant bug class found repeatedly elsewhere tonight) —
passes through with zero validation that the resulting value is even
mathematically possible given the game's own final score.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "maxHomeLead\|maxAwayLead\|winnerMaxLead\|loserMaxLead" index.html
# Full, fresh enumeration of every real call site and every place this
# function's logic is duplicated or reused — report all of them, not
# just the one this doc cites. If this pattern is copy-pasted anywhere
# else (Morning Report specifically, per the bug report, may be a
# separate code path from Night Owl), it needs the same fix.

grep -n "function.*[Ss]coreNarrative\|buildScoreNarrative" -A 5 index.html
# Re-read the full current function before editing — confirm the exact
# current variable names and structure, this doc's citation may drift.
```

## TASK 1 — Add the symmetric upper bound

Immediately after the existing lower-bound floor logic, add the
mathematical ceiling: a team's tracked max lead cannot exceed their own
final score (since the trailing team's score is always ≥ 0, the widest
possible gap at any point is bounded by the leading team's own final
total).

```js
// Ceiling: a team's lead at any point cannot exceed their own final
// score — points/runs/goals are never subtracted. A bad snapshot
// (transient glitch or mismatched game data) must not report an
// impossible lead as fact.
maxHomeLead = Math.min(maxHomeLead, finalH);
maxAwayLead = Math.min(maxAwayLead, finalA);
```

Apply this to every real call site the probe finds, not just the one
cited here. If `FIELD_DEBUG` is enabled and a snapshot's raw value
exceeded the ceiling before clamping, log a debug warning — this is a
real signal that bad data entered the log, worth surfacing for
investigation even after the display bug itself is fixed.

## TASK 2 — Live verification against the real reported case

Construct a real or realistic test: a game with a final score of 2-0,
and a log array containing at least one snapshot with an impossible
differential (e.g. `{h:6,a:2}` mid-game before settling to `{h:2,a:0}`
at the end). Confirm the function now reports a max lead of 2, not the
impossible inflated value. Confirm a genuinely large, real lead (e.g.
final 8-1, log shows a real 7-run lead mid-game) is NOT incorrectly
clamped — the ceiling must not suppress real large leads, only
mathematically impossible ones.

## DONE CONDITIONS

- [x] Upper bound added at every real call site found by the probe,
      not just the one cited in this doc
- [x] Debug logging added for clamped values, to surface when bad
      snapshot data is entering the log even after display is fixed
- [x] Live-verified: the exact reported scenario (impossible mid-game
      value, 2-0 final) now produces a correct, bounded result
- [x] Live-verified: a real large lead is not incorrectly suppressed
      by the new ceiling

## CONFIDENCE SCORING

- +30 — upper bound correctly added at every real call site
- +20 — debug logging added for clamped/rejected values
- +30 — live test proves the exact reported impossible-lead scenario
  is now fixed
- +20 — live test proves a real large lead is not falsely suppressed

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-10-lead-differential-upper-bound.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
