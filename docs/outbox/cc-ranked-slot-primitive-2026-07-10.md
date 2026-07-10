# CC Session Outbox — Ranked-Slot Primitive (CC-CMD-2026-07-10-ranked-slot-primitive)

**Date:** 2026-07-10
**Scope:** **Foundational infrastructure, same honest framing as
`claimCardRegion`/`field:otw_changed_significant`** — nothing in the
75-item UI bundle list is built yet. Every real gating primitive built
this session resolves to exactly one winner; Chaos Ladder, Slate DJ's
Second/Background slots, and Live Window Cards all need a ranked
top-N, a structurally different problem — membership vs. order, not a
bigger single-winner primitive, and explicitly not hysteresis-based
(swapping order is free every call; only bumping an occupant out of
the list entirely requires clearing a real margin).

## PROBE BLOCK

`grep -n "function claimCardRegion" -A 20 index.html` — confirmed
unchanged since it shipped, still genuinely STAGED with zero callers
(`grep -n "claimCardRegion(" index.html` — one hit, the definition
itself). No drift from the doc's citation.

`grep -n "field:otw_changed_significant" index.html | head -5` —
confirmed the event's real payload carries `tier: _liveTierKey`, a
**named tier string**, not a raw number. Confirms the design intent:
`priorityFn` must treat priority as an opaque, caller-supplied value
(exactly matching `claimCardRegion`'s own separation of concerns —
this primitive arbitrates given priorities, it doesn't compute them),
not a scale this primitive invents itself.

## TASK 1 — The primitive, built generically

Added `updateRankedSlots(listId, candidates, {capacity, marginThreshold,
priorityFn})` (index.html, immediately after `claimCardRegion`) with a
shared `_rankedSlotState` registry keyed by `listId`:

1. **Free reorder**: re-scores current occupants from their latest
   candidate data (via caller-supplied `priorityFn`), sorts — no
   threshold, every call. An occupant whose candidate vanished entirely
   from the current call's list is dropped as a vacancy (can't
   re-evaluate a priority with no data) — a reasonable extrapolation
   beyond the doc's explicit spec, noted honestly since none of the 5
   required scenarios exercise this specific edge case.
2. **Empty-slot fill**: fills any slot below `capacity` from the best
   non-occupant candidate — no margin required, there's no existing
   occupant to protect against thrashing.
3. **Margin-gated swap**: only once at capacity — compares the lowest
   current occupant against the best remaining challenger; swaps only
   if the challenger's priority exceeds it by strictly more than
   `marginThreshold`.
4. Returns the new ordered occupant list with a `membershipChanged`
   boolean per occupant (true only for genuinely new occupants this
   call, false for reordered-but-already-present ones).

**No bundle-specific logic** — `capacity`/`marginThreshold`/`priorityFn`
are all caller-supplied, matching `claimCardRegion`'s exact separation
of concerns. Wiring to Chaos Ladder, Slate DJ, or Live Window Cards is
explicitly out of scope, none are built yet.

## TASK 2 & 3 — Verified via extracted-verbatim function, then live

Extracted `updateRankedSlots` **verbatim** from the committed file and
ran all 5 required scenarios in a Node `vm` harness. 15/15 checks:

**S1 (free reordering)**: two occupants swap relative order between
calls with only a 5-point swing, well under the 10-point
`marginThreshold` — confirms reordering is genuinely unconditional
(if margin gating were incorrectly applied to reordering, this swing
would NOT have flipped the order). Neither occupant flagged as a
membership change.

**S2 (membership change, above margin)**: a challenger exceeding the
lowest occupant by 15 (above a 10-point threshold) correctly replaces
it, flagged as a membership change; the untouched occupant is not.

**S3 (membership unchanged, below margin)**: a challenger exceeding the
lowest occupant by only 5 (below the 10-point threshold) is correctly
**not** admitted — the existing occupant is kept despite the challenger
being technically higher-priority.

**S4 (oscillation, empirically verified across a real 5-call
sequence)**: a challenger swaps in once it genuinely clears the margin
(call 2), then two subsequent calls test near-miss cases — a
challenger at margin-9 (just under the 10-point threshold) correctly
does NOT unseat the current occupant (call 4, a deliberate boundary
case), and only once a later candidate genuinely clears the margin
(11 > 10, call 5) does a real swap occur. **Caught and fixed a bug in
my own test's aggregate-check indexing** (a mis-indexed array comparison
that produced a false failure) before accepting the result — the 4
individual per-call checks had already passed correctly; investigated
rather than assumed the primitive was at fault, confirmed it was the
test harness.

**S5 (empty-slot fill)**: candidates with very low priority (1-2) fill
genuinely empty slots immediately, no margin required — correctly
distinct from the margin-gated swap path, which only applies once
already at capacity.

## Post-deploy live verification

Commit `e74e1fa` confirmed deployed via deploy-gate (fast smoke:
success). Navigated to the live production app and confirmed
`window.SW_VERSION === '2026-07-10g'`.

Ran all 5 required scenarios directly against the actual deployed
`updateRankedSlots` function in the live browser session (test-list-IDs
prefixed `__live_verify_ranked_` to avoid any collision with real
production state):

```json
{
 "swVersion": "2026-07-10g",
 "S1": {"order": ["B","A"], "noMembershipChange": true},
 "S2": {"occupants": ["A","C"], "cSwappedIn": true},
 "S3": {"occupants": ["A","B"], "bKept": true},
 "S4": {"sequence": [["A","B"],["A","C"],["A","C"],["A","C"],["A","B"]]},
 "S5": {"occupants": ["A","B","C"], "allThreeFilled": true}
}
```

Every result matches the local `vm` harness exactly: S1 flips order
(B,A) with no membership change; S2 shows C swapping in above margin;
S3 shows B kept below margin; S4's 5-call sequence reproduces the
identical swap-in → no-thrash → no-thrash-at-boundary → genuine-swap
pattern ([A,B]→[A,C]→[A,C]→[A,C]→[A,B]); S5 shows all 3 candidates
filling previously-empty slots immediately. Live production confirms
the same behavior as the extracted-verbatim local test — no drift
between committed source and deployed source.

## VERIFICATION (repo-level)

`node smoke.js index.html`: 899/0 (unchanged). `node field_unit.js`:
66/0. `node field_smoke.js index.html`: 21 failures, matches the
documented pre-existing baseline. All 3 inline `<script>` blocks
syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Primitive built generically — `priorityFn`/capacity/margin all
      caller-supplied, no bundle-specific logic
- [x] Order changes confirmed free (no margin check) via real test
      (S1, with a swing deliberately kept under the margin threshold)
- [x] Membership changes confirmed to require the real margin via real
      test, including a below-threshold case that correctly does NOT
      swap (S2, S3)
- [x] Oscillation scenario tested empirically across a real multi-call
      sequence, including a near-miss boundary case, not just asserted
      safe by design (S4)
- [x] Empty-slot fill confirmed immediate, no margin required (S5)

## CONFIDENCE SCORING

- +20 — primitive built generically, correctly separates order from
  membership: **met**
- +25 — order-change and membership-change cases both tested and
  correctly resolved: **met**
- +25 — below-threshold non-swap case tested and correctly resolved:
  **met**
- +20 — oscillation scenario tested empirically, real result reported,
  including catching and fixing a real bug in my own test's aggregate
  check before accepting the result: **met**
- +10 — empty-slot fill tested and correct: **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-10f` → `2026-07-10g`.
- `index.html`: `updateRankedSlots()` and `_rankedSlotState` registry
  added, placed immediately after `claimCardRegion()`. No callers yet
  — explicitly out of scope per the CC-CMD (none of the 75 bundle
  ideas are built).
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
