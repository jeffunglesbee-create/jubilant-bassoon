# CC-CMD: getGameReasonTags() — shared reason vocabulary for Bundles 1 and 3

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

**Foundational, not a bug fix — same category as tonight's other two
generic primitives.** Confirmed by direct grep before writing this: no
shared function currently aggregates multiple simultaneous "why this
game matters" signals into one reusable list. `matchupNote` exists but
is static, pre-written prose for specific marquee games — not computed
live for an arbitrary game. `isMyTeam` is real and correct but inline,
duplicated three times in one local function, not shared. Nothing else
matched a reason-aggregation pattern.

This blocks two separate bundles for the identical reason: Bottom
Sheet items (Coach's Clipboard's single "lever," Pressure Stack's
ranked list, Scout Mode's four one-liners) and Ritual items (Pick'em
Handshake and Field Trips both needing to frame *why* a game matters)
are all asking the same underlying question from different angles. One
shared aggregator serves both.

**Scope discipline: aggregate only, invent nothing.** Every signal this
function consults must already exist and already be verified real —
`isMyTeam`, `_gameImportance`, `_otwGetLiveTier()`'s named tier, and
margin-based closeness. No new signal computation in this pass.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "const isMyTeam" -A 10 index.html
# Re-confirm the exact current isMyTeam pattern and its 3 call sites
# before consolidating — don't break the existing viewer-intel-chip
# behavior that already depends on it.

grep -n "_gameImportance" index.html | head -20
# Confirm the full real set of _gameImportance values in current use
# (clinch, elimination, playoffs, and any others) — don't assume this
# doc's list is exhaustive.

grep -n "function _otwGetLiveTier" -A 12 index.html
# Re-confirm the current tier names and thresholds before consulting
# this function from the new aggregator.
```

## TASK 1 — Build the aggregator

```js
function getGameReasonTags(game, eData) {
  // Returns an ordered array of active named tags, most significant
  // first. Only consult signals confirmed real by the probe above --
  // do not add new heuristics in this pass.
  const tags = [];
  // user_team -- from the real isMyTeam pattern
  // elimination / clinch -- from the real _gameImportance values
  // the live tier from _otwGetLiveTier(), if a live eData exists
  // close_late -- from existing margin/period logic already used
  //   elsewhere in the file for late-and-close detection
  return tags; // e.g. ['user_team', 'elimination', 'close_late']
}
```

Keep ordering fixed and simple for this first version — a static
priority (user_team, then elimination/clinch, then live tier severity,
then closeness) rather than a scored ranking. Callers needing one tag
take `tags[0]`; callers needing several take `tags.slice(0, n)`.

**Explicitly out of scope:** wiring this into Coach's Clipboard, Scout
Mode, Pressure Stack, Pick'em Handshake, or any other bundle item. None
of them are built yet — this task is the aggregator only, proven
generic, matching the same discipline as tonight's other two
foundational CC-CMDs.

## TASK 2 — Consolidate the existing isMyTeam duplication

While touching this exact logic: the probe will show `isMyTeam` computed
identically three times in one function. Extract it once, reuse it in
both the existing chip logic and the new aggregator — a real, small,
in-scope cleanup, not a separate task.

## TASK 3 — Live verification

Construct three real or realistic test games: one where only
`user_team` is true, one where multiple tags are simultaneously true
(e.g. a followed team in an elimination game), and one where nothing
qualifies (empty array, not a guess). Confirm `getGameReasonTags()`
returns the correct ordered list for each, verified against actual
function output, not inferred from reading the code.

## DONE CONDITIONS

- [x] Aggregator built from only the confirmed-real signals, no new
      heuristics invented
- [x] Fixed, documented priority ordering — not an unordered set
- [x] `isMyTeam` triplicate consolidated to one shared computation
- [x] Live-verified against 3 real constructed cases including the
      zero-tags case, actual output checked, not inferred

## CONFIDENCE SCORING

- +30 — aggregator correctly built from only real, probe-confirmed
  signals
- +20 — isMyTeam consolidation done correctly without changing existing
  chip behavior
- +25 — ordering is fixed, documented, and sensible across the 3
  verification cases
- +25 — live verification covers single-tag, multi-tag, and zero-tag
  cases with actual observed output

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-game-reason-tags.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
