# Claude Code Command — Make render-surface failures visible in _fieldRefreshDynamicSurfaces

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** `_fieldRefreshDynamicSurfaces()` (index.html ~line 10869) independently try/catch-wraps 6 renderers (`renderESPNScores`, `renderScoreTicker`, `renderWatchWindow`, `renderOneToWatch`, `renderRightNow`, `updateConflictChip`), each with a bare `catch(_) {}` — a real failure in one is completely silent while the others continue updating normally, creating split-brain UI state (e.g. stale scores on cards while the ticker and One To Watch both show correct, different data, page appears healthy). This is the same failure shape as tonight's relay-init-staleness fix, applied to the client render pipeline instead of relay overlays — same principle: don't remove the isolation (one surface crashing shouldn't take down the page), fix the silence.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md and STANDARDS.md's DO NOT INVENT rule before touching this.

Write findings to outbox/cc-render-surface-visibility-2026-07-11.md.

## Do not invent new infrastructure — `captureFieldError` already exists and is already the established pattern

Confirmed via direct read (index.html ~line 4948): `captureFieldError(fn, err, silent=true)` already exists, already writes to `window._fieldErrors`, and is already used consistently across the file (proof:normalizeMLBGame, mlb-momentum, initFIELDBrief, relay-nba/nhl/fpl/fd fetches, renderFieldDesk, getEl misses). `window._fieldErrors` is already read by Playwright tests and the `?debug=1` panel per the existing code comment. Do not add a parallel "markSurfaceDegraded" concept or any other new error-tracking mechanism — reuse what's already there.

## TASK 1 — Confirm the current exact state of `_fieldRefreshDynamicSurfaces`

Re-read the function fresh from HEAD. Confirm it still has exactly this shape (6 bare `catch(_) {}` blocks). Report any drift from what's described above before proceeding.

## TASK 2 — Audit for the same silent-catch shape elsewhere

Before fixing just this one function, check whether this same pattern (multiple independently-wrapped renderers/functions with bare `catch(_){}` and no `captureFieldError` call) appears in other clusters in the file — not just this one. Report what's found. If other genuine instances exist, they're in scope for the same fix; if `_fieldRefreshDynamicSurfaces` is the only one, say so explicitly rather than assuming.

## TASK 3 — Wrap each renderer with `captureFieldError`

For each of the found instance(s), change each bare `catch(_) {}` to call `captureFieldError('surface:{name}', _, silent)` before continuing (e.g. `catch(_) { captureFieldError('surface:espn-scores', _); }`). Decide `silent` true/false per the same judgment already used elsewhere in the file for comparable-stakes failures (compare against how `initFIELDBrief` — silent=false — and the relay fetches — silent=true — are each treated, and match whichever precedent fits render-surface failures better; state which you chose and why, don't default without reasoning). Preserve the existing `typeof X === 'function'` guards and all existing call arguments (e.g. `renderRightNow(_fieldCurrentFilteredSports())`, `allData?.sports` check) exactly as they are — this is additive instrumentation, not a rewrite of the render logic.

## VERIFICATION

- Construct a real test: temporarily make one renderer throw (e.g. reference an undefined variable inside it), confirm `window._fieldErrors` captures the failure with the correct `surface:{name}` tag, confirm the other 5 renderers still ran normally in the same pass. Revert the test change afterward.
- Confirm `node smoke.js` still passes clean.
- Confirm no renderer's actual behavior/arguments changed — only the catch block's contents.

## DONE CONDITION

Every renderer in `_fieldRefreshDynamicSurfaces` (and any other genuine instance TASK 2 finds) reports its real failure into the existing `_fieldErrors` mechanism instead of discarding it silently. Verified with a real forced-failure test, not asserted. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 confirms current state matches, drift reported honestly if any (10 pts)
- TASK 2 genuine audit for the same pattern elsewhere, not assumed to be isolated (20 pts)
- TASK 3 correctly reuses `captureFieldError`, no new parallel mechanism invented, existing call signatures/guards preserved exactly (35 pts)
- Real forced-failure test constructed and verified, correct surface tag captured, other surfaces unaffected (25 pts)
- `node smoke.js` clean (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.