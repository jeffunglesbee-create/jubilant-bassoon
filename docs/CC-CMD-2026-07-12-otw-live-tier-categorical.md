# Claude Code Command — Replace _otwGetLiveTier's composite-score thresholds with named, decomposed conditions

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** STANDARDS.md's Rule 95 (RUWT risk register, dated June 4 2026) flags `_otwFindLiveGame`'s selection as the "MODERATE" composite-plus-threshold risk. Verified directly against current source: that specific function has already been refactored to categorical tier-rank selection (`fieldTierRank`, `rank>bestRank`) — the governance note is stale about *that* function. But tracing where the composite `dramaScoreLive()` output (`smoothed`) actually still gets used found the real, still-live version of the same risk one function downstream: `_otwGetLiveTier()` — `if (margin <= 3 && smoothed >= 60) return 'CLOSE_FINISH'; if (smoothed >= 40) return 'LIVE_GAME';`. This is the exact RUWT claim structure — composite score, numeric threshold, categorical output that drives a directly user-visible label (OTW header chip via `_otwTierLabel`) — sitting unresolved, in the actual location, not the one the governance doc names.

`dramaScoreLive()` blends two sport-calibrated inputs: score-margin closeness (`base`) and time-urgency (`timeBonus`, from `period` + parsed `clock` minutes). Both raw inputs are already factual observables — `margin` is already used directly in `_otwGetLiveTier`. This CC-CMD does not need to remove or rewrite `dramaScoreLive()` itself, which may be legitimately fine for pure-display, non-selection uses elsewhere — confirm this via TASK 1 before assuming either way.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md, STANDARDS.md Rule 92 (the existing categorical-hierarchy precedent this should follow) and Rule 95 (the risk register this corrects) before touching anything.

Write findings to outbox/cc-otw-live-tier-categorical-2026-07-12.md.

## TASK 1 — Confirm current state and full blast radius

Re-read `_otwFindLiveGame`, `_otwGetLiveTier`, and `dramaScoreLive` fresh from HEAD. Confirm the analysis above is accurate. Grep for every other call site of `_otwGetLiveTier` and every other place `smoothed`/the `dramaScoreLive()` output feeds a threshold comparison that produces a categorical or selection outcome (not just a displayed number) — this may not be the only remaining instance. Report the complete list.

## TASK 2 — Decompose the CLOSE_FINISH and LIVE_GAME thresholds into named conditions

Following the exact precedent already established and proven in this file (the RUWT-compliant WC live game selector, "categorical hierarchy replaces composite arithmetic"): replace `margin <= 3 && smoothed >= 60` and `smoothed >= 40` with named, AND-gated binary conditions built from the same raw factual observables `dramaScoreLive()` itself uses (`margin`, `period`, parsed `clock` minutes) — not from `smoothed`. For example (not prescriptive — derive the actual correct conditions from what `dramaScoreLive()`'s existing sport-calibrated tables imply CLOSE_FINISH/LIVE_GAME were originally meant to capture, per sport): a close-margin condition combined with a late-period-and-low-clock condition, sport-calibrated the same way the existing tiers already are. Each condition must be independently nameable and auditable — no blended arithmetic surviving into the tier decision itself.

## TASK 3 — Confirm no regression in real tier classification

Using real archived or live game states (via D1/archive, not synthetic examples only), run both the old `smoothed`-threshold logic and the new decomposed-condition logic against the same real games and compare outputs. Where they differ, determine which is actually correct per the tier's own intended meaning (a close, late, tense game) and report it — don't assume the old thresholds were correctly calibrated just because they're being replaced.

## TASK 4 — Update Rule 95 to reflect the corrected, current state

Rule 95's risk register currently misattributes this risk to `_otwFindLiveGame`. Correct it: note that function's selection is already categorical (confirmed this session), and that the actual remaining risk was in `_otwGetLiveTier`, now resolved by this CC-CMD. This is a factual correction to the governance record, matching the precedent already set tonight for correcting stale claims in STANDARDS.md.

## VERIFICATION

- Real test: decomposed conditions produce sensible tier classifications against real game states from TASK 3's sample, not just synthetic examples.
- Confirm `margin`/`period`/`clock` parsing logic is reused from `dramaScoreLive()`'s own existing patterns, not reimplemented differently.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Confirm the OTW header chip still renders correctly end to end (browser-verify if possible, per Rule 18's browser-confirmed discipline for this class of change).

## DONE CONDITION

`_otwGetLiveTier`'s CLOSE_FINISH/LIVE_GAME determination uses only named, independently-auditable factual conditions — no composite score, no numeric threshold on a blended value. Rule 95 corrected to reflect where the risk actually was. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 confirms full blast radius, not just the two named functions (15 pts)
- TASK 2 correctly decomposes into named conditions using raw inputs, matching the established categorical-hierarchy precedent (40 pts)
- TASK 3 real-data regression check performed, discrepancies reasoned not assumed (20 pts)
- TASK 4 Rule 95 corrected accurately (10 pts)
- Real test coverage, all three suites clean, browser-verified if possible (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.