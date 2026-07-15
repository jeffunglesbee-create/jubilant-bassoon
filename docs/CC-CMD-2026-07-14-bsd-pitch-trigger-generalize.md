# Claude Code Command — Generalize BSD live pitch *activation trigger* beyond the WC tab

**Date:** 2026-07-14
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-bsd-pitch-trigger-generalize-2026-07-14.md.

## CONTEXT — real gap found while executing CC-CMD-2026-07-14-bsd-pitch-generalize

That CC-CMD generalized two sites from WC-only to any BSD-covered game:
1. `_bsdActivateForWC()` (index.html, ~L34168) — internal filter now `s.state === 'in' && s.bsdEventId` (sport check dropped).
2. `openBottomSheet()`'s pitch container (~L42580) — now `${_bsBsdEventId ? ...}` (no `_bsIsWC` gate).

**Real, confirmed (not assumed) execution-path gap those two fixes don't close:** the *only* code path that ever actually opens a BSD subscription — `_bsdActivate(eventId)` → `POST /ambient/bsd/subscribe` (~L34142-34150), which makes the relay start fanning out `bsd:ball`/`bsd:stats` frames over the existing SSE stream — is called from exactly one place: inside `_bsdActivateForWC()`. And `_bsdActivateForWC()` itself is called from exactly one place: `toggleWCView()`'s WC-entry branch (~L34039, `setTimeout(_bsdActivateForWC, 500)`), fired only when the user toggles *into* the WC tab.

`closeBottomSheet()` (~L42726) has no BSD lifecycle at all — no activate, no deactivate.

**Net effect today:** if a user opens the bottom sheet for a live, BSD-covered MLS/EPL/UCL/etc. game *without ever having visited the WC tab*, `openBottomSheet()` will now render the `#bsd-pitch` container (per the generalize fix), but no subscription was ever opened for that game's `bsdEventId` — no `bsd:ball`/`bsd:stats` frames arrive, `_bsdRepaint()` never fires, and the container sits empty indefinitely. This only actually populates today if the user happened to have the WC tab open (which triggers `_bsdActivateForWC()`'s scan of `espnScores`, which will now pick up any live BSD game, not just WC — but only while sitting in that specific tab).

This is real, verified via direct read of `_bsdActivate`'s only two call sites (`grep -n "_bsdActivate(" index.html` → exactly the definition and the one call inside `_bsdActivateForWC`) and `closeBottomSheet`'s full body (no BSD reference).

## TASK 0 — Probe

```bash
grep -n "_bsdActivate(\|_bsdDeactivate(\|function openBottomSheet\|function closeBottomSheet" index.html
```
Re-confirm the call graph above still holds (line numbers will have drifted). Confirm whether `openBottomSheet`/`closeBottomSheet` already run per-game (once per open, not re-entrant) — needed to decide whether a naive `_bsdActivate`/`_bsdDeactivate` pair added there could double-subscribe or race against the WC-tab path if both are open at once.

## TASK 1 — Activate/deactivate BSD subscription from the bottom sheet directly

In `openBottomSheet()`, once `_bsBsdEventId` is computed and confirmed truthy, call `_bsdActivate(_bsBsdEventId)` (matching the exact function `_bsdActivateForWC()` already calls — reuse it, don't duplicate the subscribe fetch logic). In `closeBottomSheet()`, call `_bsdDeactivate()` — but only if the sheet's own activation was the thing that opened it, not if the WC tab is *also* currently active and separately relying on the same subscription (check `_bsdActiveId`/`document.body.classList.contains('wc-mode')` before tearing it down, so closing a game's bottom sheet while the WC tab is still open doesn't kill a subscription the WC tab still wants). Read `_bsdActivate`'s own idempotency guard (`if (_bsdActiveId === eventId) return;`) before assuming a naive double-call is unsafe — it may already be safe.

## TASK 2 — Verify

- Real forced-condition test: opening the bottom sheet for a live MLS game with a real `bsdEventId` (no prior WC-tab visit) results in `_bsdActivate` being called with that event ID.
- Closing that sheet while WC tab is NOT active correctly calls `_bsdDeactivate()`.
- Closing that sheet while WC tab IS active does NOT kill the WC tab's own subscription.
- `node smoke.js index.html`: same pass count as baseline plus any new assertion for this behavior.

## DONE CONDITION

Opening any live BSD-covered game's bottom sheet — regardless of whether the WC tab has ever been visited — results in a real, populated pitch visualization, not an empty container. Verified via real forced-condition tests, not asserted.

**Confidence scoring:**
- TASK 0 confirms the real current call graph, not assumed from this doc's citations (25 pts)
- TASK 1 correctly wires activate/deactivate without double-subscribing or fighting the WC-tab path (45 pts)
- TASK 2 real forced tests for the no-prior-WC-visit case, plus the two teardown-safety cases; smoke count confirmed (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
