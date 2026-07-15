# CC Session Outbox — Generalize BSD live pitch activation trigger beyond the WC tab (CC-CMD-2026-07-14-bsd-pitch-trigger-generalize)

**Date:** 2026-07-14
**Dispatched via:** self-authored follow-up from `bsd-pitch-generalize`, authorized by the user ("Automate follow-ups") after being flagged as a real, separately-scoped gap.
**Scope:** wire `_bsdActivate`/`_bsdDeactivate` directly into `openBottomSheet()`/`closeBottomSheet()`. No changes to `_bsdActivateForWC()`, the R2 replay path, or the WC tab's own subscribe/unsubscribe lifecycle.

## TASK 0 — Probe

`grep -n "_bsdActivate(\|_bsdDeactivate(\|function openBottomSheet\|function closeBottomSheet" index.html` re-confirmed the real current call graph (line numbers drifted from the prior CC-CMD's citations, structure unchanged):
- `_bsdActivate(eventId)` — L34142, has a real idempotency guard: `if (_bsdActiveId === eventId) return;` (L34143) — confirms a naive call from a new site is safe even if the same event is already active.
- `_bsdDeactivate()` — L34154, only unsubscribes if `_bsdActiveId` is truthy.
- `openBottomSheet(gameId)` — L42483. Runs once per open (not re-entrant in a way that matters here — it fully rebuilds `content.innerHTML` each call).
- `closeBottomSheet()` — L42742, was a 3-line function with no BSD lifecycle at all.

Confirmed `document.body.classList.contains('wc-mode')` is an established pattern already used elsewhere in this file (5 other call sites) — reused rather than inventing a new WC-mode check.

**No per-consumer reference counting exists on `_bsdActiveId`** — it's a single global slot. This shapes TASK 1's design: the bottom sheet can safely *activate* (idempotent, and switching IDs is `_bsdActivate`'s own existing accepted behavior, unchanged here), but *deactivating* on close needs a real guard so it doesn't tear down a subscription the WC tab still wants.

## TASK 1 — Wired activate/deactivate

**`openBottomSheet()`** (right after `_bsBsdEventId` is computed, L42539): added `if (_bsBsdEventId && eData?.state === 'in') _bsdActivate(_bsBsdEventId);` — gated on the game being genuinely live, matching `_bsdActivateForWC()`'s own `state === 'in'` convention. Post-game views don't need a live subscription (they use the separate, already-generalized R2 replay path) — activating one for a finished game would be a pointless POST with no frames ever arriving.

**`closeBottomSheet()`** (L42742): added `if (!document.body.classList.contains('wc-mode')) _bsdDeactivate();` — the conservative, correct-for-the-current-architecture rule given there's no ref-counting: only tear down the subscription if the WC tab isn't active. If the WC tab is showing, its own `_bsdActivateForWC()` may still want the subscription — err toward leaving it up rather than killing something else depends on, exactly as TASK 1 instructed.

Neither `_bsdActivateForWC()`, the R2 replay path (from `bsd-replay-slug-wire`), nor `_bsdActivate`/`_bsdDeactivate` themselves were modified — confirmed via post-edit re-grep, not just diff review.

## TASK 2 — Verify

- Full-file script-block parse: 2/2 clean.
- `node smoke.js index.html`: **924 passed, 0 failed** — no pre-existing assertion collided with these purely additive lines, so no smoke.js changes were needed this time (unlike the prior two BSD dispatches).
- `node field_unit.js`: 66/66. `node field_smoke.js index.html`: exit 0.
- **9 real forced-condition tests** (Node `vm`, `closeBottomSheet` extracted verbatim; the activate-gate logic tested via a small faithful extraction of the exact real conditional, since the full `openBottomSheet` has heavy DOM/`allData` dependencies unrelated to this specific gate):
  1. Real source confirms the exact activate call and its gate condition (`_bsBsdEventId && eData?.state === 'in'`).
  2. Live MLS game with a real `bsdEventId`, simulating no prior WC-tab visit → `_bsdActivate` called with that event ID — the exact scenario TASK 2 specifies.
  3. Post-game bottom sheet view → `_bsdActivate` **not** called (correctly deferred to the separate R2 replay path).
  4. Live game with no real `bsdEventId` → not called.
  5. Real extracted `closeBottomSheet()`, WC tab NOT active → correctly calls `_bsdDeactivate()`.
  6. Real extracted `closeBottomSheet()`, WC tab IS active → does **not** call `_bsdDeactivate()` (does not kill the WC tab's own subscription) — the second required TASK 2 scenario.
  7. Real source confirms `_bsdActivate`'s own idempotency guard is present, justifying the naive activate call.
  8. Confirmed `_bsdActivateForWC`'s internal filter (prior CC-CMD) untouched.
  9. Confirmed the R2 replay sport-parameterized key (prior CC-CMD) untouched.

  All 9 assertions passed on the first run.
- `git diff -- index.html`: exactly two additive hunks (the activate call in `openBottomSheet`, the guarded deactivate call in `closeBottomSheet`), plus the SW_VERSION bump. No line inside `_bsdActivateForWC`, `_bsdActivate`, `_bsdDeactivate`, or the R2 replay block touched.

## SW_VERSION

This CC-CMD's own instructions (unlike the two prior BSD dispatches) did **not** specify `[skip ci]` — this is a real functional fix intended to deploy normally through the standard gate. Bumped `2026-07-14a` → `2026-07-14b` in both `index.html` and `sw.js`, confirmed against a fresh `TZ='America/New_York' date` check (not assumed), matching today's real ET date.

## DONE CONDITION

Opening any live BSD-covered game's bottom sheet now activates its BSD subscription directly, regardless of whether the WC tab has ever been visited — closing the real execution-path gap found during `bsd-pitch-generalize`. Closing the sheet correctly tears the subscription down when safe to do so, and correctly leaves it alone when the WC tab might still need it. Verified via 9 real forced-condition tests covering the live-activation case and both teardown-safety cases TASK 2 required, not just asserted.

## Confidence score

- TASK 0 (25 pts): confirmed the real current call graph fresh (line numbers re-verified, not assumed from the doc's own citations), confirmed the idempotency guard and the lack of ref-counting that shapes the whole design: 25/25
- TASK 1 (45 pts): wired activate/deactivate correctly — activate gated on live state (avoids a pointless subscribe for post-game views), deactivate gated on WC-tab state (does not fight the WC tab's own lifecycle), reusing the idempotency guard and an established wc-mode check pattern rather than inventing new mechanisms: 45/45
- TASK 2 (30 pts): real forced tests for the no-prior-WC-visit activation case and both required teardown-safety cases, smoke count confirmed unchanged at 924/924: 30/30

**Total: 100/100.**

## Commit

- `index.html`: `openBottomSheet()` now activates the BSD subscription directly when a live, BSD-covered game is opened. `closeBottomSheet()` now deactivates it, guarded against tearing down a subscription the WC tab still wants. `SW_VERSION` bumped `2026-07-14a` → `2026-07-14b`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
