# Claude Code Command — Bottom sheet: reorganize existing post-game content, wire in Night Owl narrative

**Date:** 2026-07-16
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull; git log --oneline -5.

Write findings to docs/outbox/cc-amnesty-bottom-sheet-2026-07-16.md. Commit with `[skip ci]` unless confirmed working end-to-end, in which case commit normally so it deploys.

## CONTEXT

The "Post-Game Card Face + Tap Spec (Amnesty Zone)" doc (May 27 2026) specifies a rich post-game bottom-sheet sequence: arc sparkline hero → arc score + personality → game result header → historical percentile → Night Owl narrative paragraph → key moments → final stats → season leaderboard position → Arc Poster CTA.

**Real finding, confirmed via source read: this is much closer to done than the doc's own framing suggests.** `openBottomSheet` (index.html ~L42844-42954) already branches on `_bsIsFinal = eData?.state==='post'` (~L42895) and already renders, for finished games specifically: a drama summary block (peak/sustained/trend, ~L42909-42921), a real inline-SVG arc sparkline via `buildDramaSparklineSVG(gameId,w,h)` (~L43140-43163, reads `getDramaHistory()`, draws a real polyline with a peak dot + label), `buildDramaArcDescription` text (~L42943), and R2 shot-map fetch for BSD-covered games. The live-only "Live Intelligence" section is already correctly suppressed when final (~L42942).

**What's genuinely missing:** the Night Owl narrative (`buildNightOwlStatic()` ~L41127, `fetchNightOwlFromClaude()` ~L41149) currently only renders into the separate standalone `#night-owl` card (via `renderNightOwlRecap()` ~L43234) — it is not wired into this sheet for the specific tapped game. The doc's content *sequence* (sparkline hero first, then score/personality, then narrative, then key moments) is also not the current order.

This CC-CMD is reorganization + one real wiring gap, not new data plumbing — confirm this framing is still accurate before writing any code (re-probe the real current state; it may have shifted since this was written).

## TASK 1 — Probe

Re-read `openBottomSheet` in full at its real current line numbers. Confirm the exact current content order for `_bsIsFinal===true`, confirm `buildDramaSparklineSVG`'s real signature and what `getDramaHistory()` actually returns, confirm `buildNightOwlStatic`/`fetchNightOwlFromClaude`'s real signatures and what DOM element `renderNightOwlRecap` currently targets.

## TASK 2 — Reorder existing content

Reorder the finished-game sheet content to: sparkline hero (existing, reuse verbatim) → arc score + personality (reuse CC-CMD-2026-07-16-amnesty-card-face.md's `renderArcBadge` if that CC-CMD has landed first — check via `git log`/grep before assuming; if not landed, build the score/personality line locally in this sheet without duplicating logic that CC-CMD will also add) → game result header → drama summary/narrative (existing) → final stats/R2 shot-map (existing). Do not touch the live-game sheet's own content or order.

## TASK 3 — Wire in Night Owl narrative for the tapped game

Call `buildNightOwlStatic()`/`fetchNightOwlFromClaude()` (or reuse cached output if `renderNightOwlRecap` already computed it this session) for the SPECIFIC game the sheet is open for, and render it into the sheet. Do not duplicate the async-fetch-and-cache logic `renderNightOwlRecap` already has — reuse it (check whether a shared cache/helper can be called from both places, or whether `renderNightOwlRecap`'s internals need a small real refactor to expose a per-game accessor; probe this precisely before deciding).

## TASK 4 — Explicitly out of scope

Historical percentile, season leaderboard position, Arc Poster CTA — separate CC-CMDs. Do not touch the R2 shot-map fetch logic itself, only its position in the sequence.

## TASK 5 — Verify

Real forced test: extract `openBottomSheet`'s finished-game path against a real game's data shape (reuse this session's established `outbox/field-data-today.json` pattern, or a live D1/relay probe for a genuinely completed game if one exists at execution time). Confirm the Night Owl narrative renders without duplicating a fetch already in flight from the standalone card. `node smoke.js index.html` baseline + delta.

## DONE CONDITION

Tapping a real finished game's card shows, in the specified order, the existing sparkline + drama summary (unchanged content, reordered) plus the Night Owl narrative for that specific game — verified against a real completed game, not only a synthetic fixture.

**Confidence scoring:**
- TASK 1 (20 pts): accurate re-probe of current line numbers/signatures
- TASK 2 (25 pts): reorder correct, live-game sheet unaffected
- TASK 3 (35 pts): Night Owl narrative wired in without duplicating the existing fetch/cache logic
- TASK 5 (20 pts): real forced test + smoke baseline

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
