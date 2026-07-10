# CC-CMD: Ranked-slot primitive — membership needs a margin, order is free, no hysteresis

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

**Foundational infrastructure, same honest framing as `claimCardRegion`
and `field:otw_changed_significant` — nothing in the 75-item UI bundle
list is built yet, so nothing currently calls this.** This closes the
one structural gap identified when the 5 bundles were checked for
readiness: every real gating mechanism built this session
(`claimCardRegion`, `field:otw_changed_significant`) resolves to
exactly one winner. Chaos Ladder, Slate DJ's Second/Background slots,
and Live Window Cards all need a ranked top-N, not a single winner —
a structurally different primitive, not a bigger version of the
existing ones.

**The design, already worked out and explicitly not hysteresis-based:**
swapping the relative order of two items already in the list is
low-stakes and should happen freely, every evaluation, no threshold —
two rows trading places costs nothing. A new candidate bumping an
existing occupant OUT of the list entirely is the high-stakes event,
structurally equivalent to the single-winner case — that requires
clearing a real margin, evaluated fresh each time. No cooldown, no
streak-counting, no waiting period — hysteresis solves a temporal
problem this doesn't have. This is a membership-vs-order distinction,
not a time-based one.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "function claimCardRegion" -A 20 index.html
# Re-confirm current state before building something adjacent to it —
# confirm it hasn't been extended or wired to anything since it shipped
# (STAGED, unwired, per its own CC-CMD). If it has changed, report the
# actual current state rather than assuming this doc's citation holds.

grep -n "field:otw_changed_significant" index.html | head -5
# Re-confirm this event's real payload shape — the ranked-slot
# primitive's priority inputs should be able to consume the same kind
# of tier/margin signal this event already uses, not invent a
# different priority scale.
```

## TASK 1 — Build the primitive

```js
function updateRankedSlots(listId, candidates, { capacity, marginThreshold, priorityFn }) {
  // _rankedSlotState[listId] = { occupants: [{id, priority, source}, ...] }
  // 1. Re-sort current occupants by CURRENT priority (from priorityFn
  //    on their latest candidate data if still present) — free
  //    reordering, no threshold, every call.
  // 2. Fill any empty slots (occupants.length < capacity) with the
  //    best available non-occupant candidate — no margin required,
  //    there's no existing occupant to protect against thrashing.
  // 3. For the lowest-priority current occupant, if the best
  //    non-occupant candidate's priority exceeds it by more than
  //    marginThreshold: swap. Otherwise: keep the current occupant,
  //    even if the challenger is marginally better.
  // 4. Return the new ordered occupant list AND a boolean per slot:
  //    did membership change this call, or only order (useful for
  //    callers deciding whether to animate a swap vs. just re-render
  //    an order change).
}
```

Keep `priorityFn` caller-supplied, same as `claimCardRegion`'s
`render` callback — this primitive doesn't compute priority itself,
it only arbitrates given priorities, matching the existing primitive's
separation of concerns.

**Explicitly out of scope:** wiring this to Chaos Ladder, Slate DJ, or
Live Window Cards. None of them are built yet. This task is the
primitive only, proven generic — same discipline as `claimCardRegion`.

## TASK 2 — Prove it with realistic constructed scenarios

Since nothing real consumes this yet, construct synthetic scenarios
covering the actual decision boundaries:

1. Two occupants whose relative priority order flips between calls —
   confirm order updates immediately, no margin check applied to pure
   reordering.
2. A challenger whose priority exceeds the lowest occupant by MORE
   than `marginThreshold` — confirm it replaces that occupant.
3. A challenger whose priority exceeds the lowest occupant by LESS
   than `marginThreshold` — confirm the existing occupant is kept,
   even though the challenger is technically higher-priority.
4. Rapid oscillation: a challenger crosses the margin threshold, gets
   swapped in, then immediately drops back below threshold relative to
   the item it replaced — confirm this does NOT thrash back and forth
   indefinitely (each evaluation is independent and correct, not that
   swaps are prevented from happening quickly — the margin requirement
   itself should be sufficient to prevent oscillation without any
   added time-based logic; verify this holds empirically, don't assume
   it from the design alone).
5. An empty slot (capacity > current occupant count) — confirm it
   fills immediately from the best candidate, no margin required.

## TASK 3 — Live verification

Run all 5 scenarios above against the actual deployed function, report
real observed behavior for each, not inferred from code review.

## DONE CONDITIONS

- [x] Primitive built generically, `priorityFn`/capacity/margin all
      caller-supplied, no bundle-specific logic
- [x] Order changes confirmed free (no margin check) via real test
- [x] Membership changes confirmed to require the real margin via
      real test, including a below-threshold case that correctly does
      NOT swap
- [x] Oscillation scenario tested empirically, not just asserted safe
      by design
- [x] Empty-slot fill confirmed immediate, no margin required

## CONFIDENCE SCORING

- +20 — primitive built generically, correctly separates order from
  membership
- +25 — order-change and membership-change cases both tested and
  correctly resolved
- +25 — below-threshold non-swap case tested and correctly resolved
- +20 — oscillation scenario tested empirically, real result reported
- +10 — empty-slot fill tested and correct

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-10-ranked-slot-primitive.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
