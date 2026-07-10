# CC Session Outbox — field:otw_changed_significant, a Hysteresis-Gated Event for Ceremonial UI (CC-CMD-2026-07-09-otw-significant-event)

**Date:** 2026-07-09
**Scope:** `field:otw_changed` fires on a bare identity check — no
margin, streak, or cooldown — correct for its existing "JUST CHANGED ↑"
chip, wrong for anything meant to be rare and ceremonial. Adds a second,
independent event, `field:otw_changed_significant`, with three
protections raw identity-checking doesn't have.

## PROBE BLOCK

`grep -n "function renderOneToWatch" -A 90 index.html` — re-read the
full FIRE-state branch. Confirmed `_prevOTWId` (declared ~37147),
`_newOTWId` (local, `g._id`), `_liveTierKey` (computed once per FIRE
pass from `_otwGetLiveTier`), and the `g` object are exactly as the doc
assumed. Confirmed `field:otw_changed` dispatches from exactly one site
(~37373-37378), inside this same FIRE branch — the separate `wcFire`
(WC high-drama) branch does not dispatch it at all and has no
`_otwGetLiveTier`-style named tier, so the new event correctly lives in
the same, single FIRE branch as the raw one.

`grep -n "function _otwGetLiveTier" -A 10 index.html` — confirmed the
complete, current set of named tiers is exactly `CRUNCH`, `EXTRA_TIME`,
`CLOSE_FINISH`, `LIVE_GAME` (or `null`), matching the doc's assumption.

**Real drift found and reported, not silently worked around.** While
building the tier-ordinal helper, found `fieldTierRank()` — an existing
"single source of truth for game-tier classification" function the doc
never mentioned. Its case list uses `CLOSE_LATE`/`LIVE`, **not**
`CLOSE_FINISH`/`LIVE_GAME`, which is what `_otwGetLiveTier` (the actual
tier source for this event) returns. Reusing `fieldTierRank()` directly
here would have silently collapsed `CLOSE_FINISH` and `LIVE_GAME` both
to its `default: return 0` case, destroying the ordinal distinction
between two of the four real tiers. Built a small, correctly-scoped
local helper (`_otwSigTierRank`) instead, matching the doc's own
instruction to build from "whatever the probe confirms is the real,
current set of tier names."

`grep -n "field:otw_changed" index.html` — confirmed exactly one
dispatch site and one subscriber (the "OTW Changeover beat," ~29112),
untouched by this change.

## TASK 1 — Streak, tier-margin, and cooldown state

Added alongside `_prevOTWId` (index.html ~37147): `_otwSigCandidateId`/
`_otwSigCandidateStreak` (streak tracker), `_otwLastSigId`/
`_otwLastSigTier` (last significant winner), `_otwLastSigFireAt`
(cooldown timestamp), and `OTW_SIG_COOLDOWN_MS = 90000` — chosen to
span several `renderOneToWatch()` poll cycles (~15-30s live-score poll
cadence) so cooldown is a real, independent gate beyond the streak
requirement, without suppressing a genuinely new significant swap for
unreasonably long. Added `_otwSigTierRank(tier)` (index.html, right
after `_otwGetLiveTier`) as the correctly-scoped local ordinal helper —
never displayed, never in any payload, comparison only.

## TASK 2 — Gate and dispatch, additive only

Added a second, independent `try` block immediately after the existing
`field:otw_changed` dispatch (index.html ~37383), inside the same FIRE
branch, reusing the already-computed `_liveTierKey` and `g`:

1. **Streak** updates unconditionally on every FIRE-state pass (same
   `g._id` as last pass → increment; different → reset to 1) — before
   any gate check, exactly as specified.
2. **Gate**: `streak >= 2` AND (`_otwLastSigId === null` OR
   `_otwSigTierRank(_liveTierKey) > _otwSigTierRank(_otwLastSigTier)`)
   AND `Date.now() - _otwLastSigFireAt >= OTW_SIG_COOLDOWN_MS`.
3. On pass: dispatches `field:otw_changed_significant` with the exact
   PM-27 envelope from the doc's template, then updates
   `_otwLastSigId`/`_otwLastSigTier`/`_otwLastSigFireAt`.

**Confirmed via `git diff` that the existing `field:otw_changed` block
is untouched at the byte level** — zero lines modified, only pure
additions immediately before and after it. This is the strongest
possible evidence for "completely unchanged," stronger than any runtime
re-test could offer.

## TASK 3 — Live-style verification, both cases, real listener

Extracted the tier-ordinal helper, the state-variable declarations, and
the gate+dispatch `try` block **verbatim** from the committed file
(not reimplemented), wrapped as a callable per-pass function closing
over the same `g`/`_liveTierKey` locals the real `renderOneToWatch()`
FIRE branch closes over, and ran it in a Node `vm` harness with a real
`fieldEvents.dispatchEvent` listener capturing actual fired events.
11/11 checks:

**Suppression, two ways:**
- Pure oscillation (10 passes flip-flopping between two distinct game
  ids at the same tier, id never repeating twice consecutively): **0**
  significant fires — the streak requirement alone already blocks it.
- **Stronger case**: `AABBAABBAABB` — each side genuinely *does* build
  a 2-streak multiple times, same tier throughout. **At most 1**
  significant fire total, proving tier-margin (and cooldown) are doing
  real suppression work on subsequent same-tier streaks — not just
  relying on the streak counter never reaching 2.

**Genuine fire case**: a held candidate at `LIVE_GAME` tier — pass 1
(streak=1) correctly does not fire; pass 2 (streak=2, no prior
significant winner) fires exactly once, with the correct event type,
correct PM-27 envelope shape (`type`/`target`/`source`/`reason`/`at`),
and correct payload (`toId`, `toHome`, `toAway`, `tier` — named tier
only, `fromId: null` since no prior significant winner existed).

**Cooldown as an independent gate, not decorative**: pass 3 (same game,
same tier, immediately after firing) correctly does not re-fire —
cooldown active. Pass 4 (same game, tier **genuinely improves**
`LIVE_GAME` → `CRUNCH`, but cooldown still active in real wall-clock
time) is **correctly suppressed** — proving cooldown gates even a
genuine further tier improvement, exactly the risk scenario the CC-CMD
itself named ("two games both flipping between CRUNCH and EXTRA_TIME in
a short window").

## VERIFICATION (repo-level)

`node smoke.js index.html`: 899/0 (unchanged). `node field_unit.js`:
66/0. `node field_smoke.js index.html`: 21 failures, matches the
documented pre-existing baseline. All 3 inline `<script>` blocks
syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] `field:otw_changed`'s existing behavior confirmed byte-for-byte
      unchanged via `git diff` — same condition, same payload, same
      firing frequency, zero lines touched
- [x] `field:otw_changed_significant` added with all three protections
      (streak, tier-margin using a correctly-scoped local ordinal — not
      the mismatched `fieldTierRank`, cooldown), using the exact PM-27
      envelope
- [x] Live-verified: rapid oscillation (both a naive case and a
      stronger streak-building case) does not repeatedly fire the
      significant event; a genuine held tier improvement does, with
      correct payload; cooldown independently gates even a further
      genuine improvement
- [x] Tier comparison uses only named tiers, never raw scores, in both
      the gate logic and the payload

## CONFIDENCE SCORING

- +25 — existing `field:otw_changed` confirmed completely unchanged,
  proven via `git diff` (zero lines modified), the strongest available
  evidence: **met**
- +40 — all three protections correctly implemented, using the real
  current 4-tier set confirmed by the probe — and correctly avoiding a
  real drift trap found during the probe (`fieldTierRank()`'s mismatched
  `CLOSE_LATE`/`LIVE` case names, which would have silently broken the
  tier-margin gate for 2 of 4 real tiers): **met**
- +35 — live verification proves both the suppression case (two
  variants, including the stronger streak-building one) and the
  genuine-fire case (with full envelope/payload verification and a
  cooldown-independence check) via an actual listener capturing real
  fired events, not inferred from code reading: **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-09k` → `2026-07-09l`.
- `index.html`: `_otwSigTierRank()` and 5 new state variables added;
  `field:otw_changed_significant` gate+dispatch added as a second,
  independent block inside `renderOneToWatch()`'s FIRE branch;
  `field:otw_changed` untouched.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
