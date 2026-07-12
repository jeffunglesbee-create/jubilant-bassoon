# Claude Code Command — Replace _otwGetLiveTier's composite-score thresholds with categorical conditions

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** `_otwGetLiveTier()` (index.html ~line 36931) determines the live-game tier label (CRUNCH/EXTRA_TIME/CLOSE_FINISH/LIVE_GAME) shown for FIELD's flagship One To Watch feature. Two of its four branches use a raw composite drama score compared against hardcoded thresholds: `if (margin <= 3 && smoothed >= 60) return 'CLOSE_FINISH'` and `if (smoothed >= 40) return 'LIVE_GAME'`. This is the exact RUWT claim structure (composite scalar → threshold comparison → categorical output) that Rules 92/93 already eliminated elsewhere in this same file, using named categorical conditions instead of a synthesized score. This function still carries the risk those rules exist to remove — and it's higher-leverage than the prose-quality fixes made earlier tonight, since it drives the label a user directly sees on the flagship feature, not journalism copy.

**Also correct a real, separate finding along the way:** STANDARDS.md Rule 95 (RUWT risk register) currently describes `_otwFindLiveGame()`'s game-selection logic as "MODERATE — documented, refactor deferred... planned fix: replace with buildOTWStateLabel() category-based selection." That refactor has already shipped — confirmed by direct read: the function now selects by `fieldGameTier()`/`fieldTierRank()` (categorical tier rank), not a raw score threshold; the drama score is explicitly retained only "for back-compat with downstream `_otwGetLiveTier` call," per the function's own comment, not used for selection. Rule 95's entry for this item is stale and needs correcting as part of this CC-CMD — but that correction requires a separate CC-CMD targeting STANDARDS.md specifically (this repo's write-allowlist covers index.html directly but STANDARDS.md needs the same commit_file-via-CC-CMD path used all night); note this explicitly in the outbox rather than silently leaving it stale.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md and STANDARDS.md Rules 92/93/95 (the precedent and the risk register) before touching this.

Write findings to outbox/cc-otw-tier-categorical-2026-07-12.md.

## TASK 1 — Confirm current state from HEAD

Re-read `_otwGetLiveTier()` and `_otwFindLiveGame()` fresh. Confirm the exact current thresholds (60/40) and margin values are unchanged from what's described above. Confirm `_otwFindLiveGame()`'s categorical-selection status (the Rule 95 staleness finding) is still accurate. Report any drift.

## TASK 2 — Understand what `smoothed >= 60` and `smoothed >= 40` are actually trying to capture

Before replacing the thresholds, determine what real-world conditions they're approximating — read `dramaScoreLive()`'s own composition (what factors feed into it) to identify which specific, nameable factual signals (recent scoring frequency, lead-change recency, elapsed-time-adjusted pace, etc.) are driving the score high enough to cross 60 or 40 in practice. Don't guess at replacement conditions without understanding what the existing score is actually built from.

## TASK 3 — Replace with named categorical conditions

Following the exact pattern Rule 92 already established (categorical tier hierarchy, no composite arithmetic, single within-tier sort key where needed): replace the `smoothed >= 60`/`smoothed >= 40` branches with explicit, independently-checkable factual conditions derived from TASK 2's findings — not a renamed threshold on the same underlying score. `margin <= 3` (already binary) can stay as-is; only the composite-score comparisons need replacing. State clearly in the outbox what each new condition checks and why it correctly substitutes for what the score threshold was approximating.

## TASK 4 — Confirm no downstream consumer breaks

`_otwGetLiveTier()`'s output feeds other code (per `_otwSigTierRank()`'s own comment, at minimum). Grep every call site of `_otwGetLiveTier` and confirm each still receives a valid tier string from the same four-value set (CRUNCH/EXTRA_TIME/CLOSE_FINISH/LIVE_GAME/null) — this is a classification-logic change, not a return-shape change, and must not alter the contract.

## VERIFICATION

- Real extraction test: construct real or realistic game-state inputs that previously crossed the 60/40 thresholds, confirm the new categorical logic classifies them the same way for genuine close/live games, and correctly diverges only where the old scalar threshold was actually wrong (if any such cases surface from TASK 2's analysis, document them explicitly rather than treating a behavior change as a bug).
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.

## DONE CONDITION

`_otwGetLiveTier()` no longer compares a composite drama score against a numeric threshold — it classifies using named, independently-checkable factual conditions, matching the precedent already established for the Watch Engine WC selector. Rule 95's stale `_otwFindLiveGame()` entry is flagged for correction (separate CC-CMD noted, not silently left wrong). Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 confirms current state accurately, including the Rule 95 staleness finding (10 pts)
- TASK 2 genuinely understands what the thresholds approximate before replacing them (25 pts)
- TASK 3 correctly implements categorical replacement, reasoning stated per condition (35 pts)
- TASK 4 confirms no downstream contract break (15 pts)
- Real test coverage, all three suites clean (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.