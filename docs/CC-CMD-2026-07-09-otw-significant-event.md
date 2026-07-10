# CC-CMD: field:otw_changed_significant — a hysteresis-gated event for ceremonial UI

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Confirmed directly against current source: `field:otw_changed` fires on
a bare identity check — `_prevOTWId !== null && _prevOTWId !==
_newOTWId` — no margin, no streak requirement, no cooldown. That's
correct and sufficient for the existing "JUST CHANGED ↑" chip, which is
meant to be a live, frequent signal.

It is not sufficient for anything meant to be rare and ceremonial —
specifically the kind of UI idea explicitly designed that way ("it
should be rare, visible, and short-lived," per its own spec). If OTW
oscillates between two closely-matched live games — realistic near any
genuinely tight one — the raw event fires on every flip, and a
ceremony bound to it directly violates its own stated design intent.

**This is additive, not a replacement.** `field:otw_changed` keeps
firing exactly as it does today, for whatever currently depends on the
raw signal. A new, separate event — `field:otw_changed_significant` —
adds three independent protections raw identity-checking doesn't have:

1. **Streak requirement** — a candidate must win two consecutive
   evaluations before being eligible, filtering a single noisy poll.
2. **Tier-margin significance** — only fires if the new candidate's
   named tier is a real improvement over the last *significant* one,
   not just a different game at the same tier. RUWT-safe: compares
   named tiers only, never raw scores, matching the existing
   `_otwGetLiveTier`/`fieldTierRank` pattern throughout this file.
3. **Cooldown** — a minimum real-time gap between significant fires,
   protecting against fast oscillation even when each individual swap
   technically clears the tier-margin bar (e.g. two games both
   flipping between CRUNCH and EXTRA_TIME in a short window).

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "function renderOneToWatch" -A 90 index.html
# Re-read the full current function — confirm _prevOTWId, _newOTWId,
# _liveTierKey, and the g object are exactly as this doc assumes before
# adding new state alongside them. Report any drift from what's assumed
# here rather than forcing the plan to fit stale line citations.

grep -n "function _otwGetLiveTier" -A 10 index.html
# Confirm the exact current set of named tier values returned — this
# doc assumes CRUNCH, EXTRA_TIME, CLOSE_FINISH, LIVE_GAME specifically;
# verify this is still the complete, current list before building the
# ordinal mapping.

grep -n "field:otw_changed" index.html
# Confirm current subscriber(s) of the existing raw event, to verify
# none of them need to change — this event's behavior must stay
# byte-for-byte identical.
```

## TASK 1 — Add streak, tier-margin, and cooldown state

Alongside the existing `_prevOTWId`, add: a candidate streak tracker
(id + consecutive-win count), the last *significant* winner's id and
tier, and a last-significant-fire timestamp. A tier-ordinal helper for
comparison only (never displayed, never exposed in any payload) —
build it from whatever the probe confirms is the real, current set of
tier names, not assumed from this doc alone if it's drifted.

## TASK 2 — Gate and dispatch the new event

On each `renderOneToWatch()` pass: update the streak tracker first.
Only when the streak requirement is met, the tier is a genuine
improvement over the last significant tier (or no significant winner
exists yet), and the cooldown window has cleared, dispatch
`field:otw_changed_significant` using the exact same PM-27 envelope
shape as `field:crunch`/`field:otw_changed`/`field:ws_fresh`:

```js
{ type: 'field:otw_changed_significant', target: 'otw', source: 'render_otw',
  reason: 'significant_momentum_swap', at: Date.now(),
  payload: { fromId, toId, toHome, toAway, tier: <named tier only> } }
```

The existing `field:otw_changed` dispatch and its exact current
condition must remain completely unchanged — this is a second,
independent check added alongside it, not a modification of it.

## TASK 3 — Live verification

Construct a real or simulated sequence where OTW oscillates rapidly
between two close candidates at the same tier, and confirm
`field:otw_changed_significant` does NOT fire repeatedly — while
`field:otw_changed` still fires on every flip, unchanged. Separately,
construct a sequence with a genuine tier improvement held for at least
two evaluations, and confirm the significant event does fire, with the
correct payload. Verify both behaviors observably (event listener
capturing actual fire count), not by code inspection alone.

## DONE CONDITIONS

- [x] `field:otw_changed`'s existing behavior confirmed byte-for-byte
      unchanged — same condition, same payload, same firing frequency
- [x] `field:otw_changed_significant` added with all three protections
      (streak, tier-margin, cooldown), using the exact PM-27 envelope
- [x] Live-verified: rapid oscillation at the same tier does not
      repeatedly fire the significant event; a genuine held tier
      improvement does
- [x] Tier comparison uses only named tiers, never raw scores, in the
      gate logic or the payload

## CONFIDENCE SCORING

- +25 — existing `field:otw_changed` confirmed completely unchanged
- +40 — all three protections correctly implemented, using the real
  current tier set confirmed by the probe
- +35 — live verification proves both the suppression case and the
  genuine-fire case with an actual listener, not inferred

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-otw-significant-event.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
