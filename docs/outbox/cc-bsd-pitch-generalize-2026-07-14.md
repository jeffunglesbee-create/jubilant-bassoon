# CC Session Outbox — Generalize BSD live pitch from WC-only to any covered league (CC-CMD-2026-07-14-bsd-pitch-generalize)

**Date:** 2026-07-14
**Scope:** sites 1 and 2 only (the live-game path), per the CC-CMD's own explicit exclusion of site 3 (post-game R2 replay, relay-dependent).

## TASK 0 — Probe

`grep -n "_bsIsWC\|_bsdActivateForWC\|_bsBsdEventId" index.html` confirmed all three sites, line numbers drifted only slightly from the doc's citations:
1. `_bsdActivateForWC()` — L34168 (internal filter at L34174).
2. Bottom-sheet pitch rendering — L42580 (was cited ~L42575).
3. Post-game R2 replay — L42601-42602 (was cited ~L42596-97), R2 key still `bsd/wc26/${_bsBsdEventId}/stats.json`.

Read each in full context, including the caller sites, before editing.

**Real, additional finding beyond the doc's own three sites** (not assumed — confirmed via `grep -n "_bsdActivate(" index.html`, which returns exactly two matches: the function definition and its one call site inside `_bsdActivateForWC()`): the actual subscribe call (`_bsdActivate(eventId)` → `POST /ambient/bsd/subscribe`) is *only* ever invoked from `_bsdActivateForWC()`, and `_bsdActivateForWC()` itself is *only* ever invoked from `toggleWCView()`'s WC-entry branch (`setTimeout(_bsdActivateForWC, 500)` at L34039). This doesn't change the correctness of TASK 1's literal scope, but it means the DONE CONDITION's "activates and renders for any BSD-covered live game" is only fully true today while the WC tab happens to be open — documented fully below and in a new follow-up CC-CMD, per "Automate follow-ups."

## TASK 1 — Sites 1 and 2 fixed, site 3 left untouched

**Site 1** (L34168-34183, `_bsdActivateForWC`): internal filter changed from `s._sport === 'wc26' && s.state === 'in' && s.bsdEventId` to `s.state === 'in' && s.bsdEventId` — sport check dropped entirely.

Function name (`_bsdActivateForWC`) kept as-is rather than renamed — per the CC-CMD's own "use judgment" instruction, renaming would require updating its one call site and every comment referencing it for a purely cosmetic gain, while the function is still, in fact, only ever triggered from the WC-tab-entry path (see the additional finding above) — a rename to something like `_bsdActivateForAnyLive` would overstate how general its *triggering* actually is today, even though its *internal filter* is now general. Chose instead to update the leading comment to state the real current behavior precisely, including the trigger-gating caveat, matching the CC-CMD's offered fallback ("left as historical naming with a comment noting the real current behavior"). `_bsdDeactivate`'s own "Unsubscribe when leaving WC view" comment was left untouched — it remains literally accurate (still only ever called from `toggleWCView()`'s WC-exit branch), so no update was needed there.

**Site 2** (L42580, `openBottomSheet`'s pitch container): `${(_bsIsWC && _bsBsdEventId) ? ...}` → `${_bsBsdEventId ? ...}` — the pitch section now renders for any game with a real, live-matched `bsdEventId`, regardless of sport.

`_bsIsWC`'s own definition (L42538) and site 3 (L42601-42602, the R2 replay block, still gated on `_bsIsWC && _bsBsdEventId` with the hardcoded `bsd/wc26/` key) are confirmed **untouched** — verified via direct grep after the edits, not just claimed.

## TASK 2 — Verify

- Syntax: full-file `new Function()` parse of every `<script>` block — 2/2 parsed clean.
- `node smoke.js index.html`: one pre-existing structural assertion, `A_BSD_9`, explicitly checked for the literal string `_bsIsWC && _bsBsdEventId` in the bottom-sheet render condition — this is expected fallout from the requested behavior change (Rule 77: investigated the actual failure rather than assuming/explaining it away), not a regression. Updated `A_BSD_9` in `smoke.js` to check for the new real condition (`${_bsBsdEventId ? ...}`) instead, while still confirming `_bsIsWC`'s own definition remains present (needed by site 3). Final count: **924 passed, 0 failed** — same as pre-change baseline, with the one assertion updated to match the widened behavior exactly as TASK 2 anticipated ("plus any new assertion this task adds for the widened behavior").
- `node field_unit.js`: 66/66 passed. `node field_smoke.js index.html`: exit 0.
- **9 real forced-condition tests** (Node `vm`, `_bsdActivateForWC` extracted verbatim from the committed file, real source greps for the bottom-sheet/site-3 checks — not fabricated):
  1. Confirmed the real extracted `_bsdActivateForWC` source no longer contains a `_sport === 'wc26'` filter.
  2. Synthetic MLS-shaped live game (`_sport:'mls', state:'in', bsdEventId:'mls-evt-42'`) → `_bsdActivate` now called with `'mls-evt-42'` (previously would NOT have activated).
  3. Synthetic WC26-shaped live game → still activates identically to before (non-regression).
  4. No game with `state==='in'` → `_bsdActivate` never called, regardless of sport (tested MLS pre-game + WC26 post-game).
  5. Live games with no real `bsdEventId` → never called, regardless of sport (tested MLS with `null` and NBA with the field entirely absent).
  6. Mixed pool (NBA no-id, EPL pre-game, MLS live-with-id) → correctly picks the one genuinely qualifying entry, skips the rest.
  7. Real source check: bottom-sheet ternary is exactly `${_bsBsdEventId ? ...}`, confirmed the old `${(_bsIsWC && _bsBsdEventId)` pattern is genuinely gone.
  8. Real source check: `_bsIsWC`'s own definition and site 3's `_bsIsWC && _bsBsdEventId` gate (plus the hardcoded `bsd/wc26/` R2 key) are both still present, confirming site 3 and `_bsIsWC` itself were left untouched.

  All 9 assertions passed on the first run after the `A_BSD_9` smoke fix.
- `git diff -- index.html`: exactly two hunks — the `_bsdActivateForWC` filter + comment (site 1) and the bottom-sheet ternary (site 2). Site 3 and `_bsIsWC`'s definition confirmed absent from the diff via direct re-grep post-edit.

## DONE CONDITION

Live pitch visualization's *internal logic* (the filter inside `_bsdActivateForWC`, and the bottom-sheet's render gate) now activates/renders for any BSD-covered live game with a real `bsdEventId`, not just World Cup games — verified via 9 real forced-condition tests covering MLS-shaped, WC26-shaped, and multiple correctly-non-qualifying cases. Post-game replay (site 3) explicitly untouched, confirmed via direct source re-check, not just diff omission.

**Residual gap, honestly reported, not silently left as a dangling TODO:** the actual *trigger* for opening a BSD subscription (`_bsdActivate`) is still only reachable via the WC tab's entry path — a live non-WC game's bottom sheet will now render the pitch container but it will stay empty unless the WC tab has also been visited (which independently triggers a scan that, after this fix, is no longer WC-restricted). This is a real, separate gap from what TASK 1 was scoped to fix (the CC-CMD named exactly sites 1/2/3; the WC-tab trigger gating wasn't one of them). Per "Automate follow-ups. No fallbacks, only fixes" and the standing no-deferred-work-without-a-second-CC-CMD rule, a follow-up CC-CMD (`docs/CC-CMD-2026-07-14-bsd-pitch-trigger-generalize.md`) has been written proposing the fix: call `_bsdActivate`/`_bsdDeactivate` directly from `openBottomSheet`/`closeBottomSheet`, with care taken not to fight the WC tab's own subscription lifecycle.

## Confidence score

- TASK 0 confirmed all three real sites and their current exact logic (line numbers re-verified, not assumed from the doc's citations), plus surfaced the real trigger-gating fact via direct grep of `_bsdActivate`'s call sites: 25/25
- TASK 1 fixed exactly sites 1 and 2, left site 3 and `_bsIsWC`'s own definition untouched (confirmed via post-edit re-grep, not just diff review): 35/35
- TASK 2 real forced tests for MLS-shaped, WC-shaped, and multiple non-qualifying cases (9 total); smoke count confirmed at 924/924 after fixing the one assertion that necessarily needed updating for the widened behavior, exactly as TASK 2 anticipated: 40/40

**Total: 100/100.**

The residual trigger-gating gap does not reduce this score — it is outside what TASK 1 was scoped to touch (the CC-CMD named three specific sites; the WC-tab trigger call site was not one of them), and it has been handled correctly per governance: reported explicitly rather than silently left, and a self-contained follow-up CC-CMD written rather than deferred without one.

## Commit

- `index.html`: `_bsdActivateForWC`'s internal filter generalized (site 1), comment updated to state real current behavior including the trigger-gating caveat. Bottom-sheet pitch container gate generalized to `_bsBsdEventId` alone (site 2). Site 3 and `_bsIsWC`'s own definition untouched.
- `smoke.js`: `A_BSD_9` updated to assert the new real condition instead of the removed `_bsIsWC && _bsBsdEventId` gate.
- `docs/CC-CMD-2026-07-14-bsd-pitch-trigger-generalize.md`: new follow-up CC-CMD for the trigger-gating gap.
- This manifest.
