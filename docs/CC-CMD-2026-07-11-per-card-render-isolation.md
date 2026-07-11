# Claude Code Command — Isolate per-card build failures in the structural render map

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** A ChatGPT analysis of this codebase claimed the render-signature gate could permanently freeze a broken structural render (signature stamped even on a swallowed failure). Traced directly against current source (index.html ~line 11523) — that specific mechanism does not hold: the signature stamp sits immediately after `applyMainHTML` succeeds, so a genuine throw during HTML-building leaves `lastSignature` stale and the next `scheduleRenderAll` cycle correctly retries, not skips. That claim is corrected, not acted on.

Investigating it surfaced a real, different, adjacent risk instead: the per-card template-literal builder (inside the `.map()` that produces each game's HTML, ~lines 11400-11510) has several correctly-wrapped inner try/catches around specific sub-expressions (`buildCardTimeDisplay`, the pulse chip), but most per-card function calls — `buildViewerIntelChip`, `buildNHLAnalyticsBadges`, `buildRoundBadge`, `buildWCBars`, `buildDramaLineTiers`, `buildCheapSeats`, `assessInjuryPriceImpact`, `buildParkFactorBadge`, `buildUmpWatchBadge`, `buildSeriesMarginsDots`, `matchupHTML`, and others in the same card body — have no wrapping at all. If any one of these throws for a single malformed game object, the exception propagates through the entire `.map()`, taking down the whole section's render, not just that one card.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md and STANDARDS.md's DO NOT INVENT rule before touching this.

Write findings to outbox/cc-per-card-render-isolation-2026-07-11.md.

## TASK 1 — Confirm the current exact state

Re-read the full per-card template builder fresh from HEAD. Confirm the list of unwrapped function calls above is accurate and complete — grep for every function call inside this specific `.map()` callback, not just the ones named here, and report the real, complete list (there may be more than what's listed above).

## TASK 2 — Wrap the whole per-card build in one try/catch, not each call individually

Rather than wrapping each of the ~10+ unwrapped calls individually (verbose, easy to miss one, and this codebase's own established pattern — per tonight's relay-init and render-surface fixes — favors one shared boundary over many scattered ones), wrap the entire per-card build (the whole function body that produces `_html` for one game `g`, inside the `.map()`) in a single try/catch. On failure: log via the existing `captureFieldError` mechanism (tag `card:{sport}:{gameId-or-index}`), and return either an empty string (card silently omitted) or a minimal fallback card shell (team names + time only, no enrichment) — decide which based on what's less disruptive to the surrounding grid layout, and state which you chose and why.

## TASK 3 — Confirm this doesn't change the render-signature gate's own correctness

The render-signature gate's actual behavior (verified in this CC-CMD's own scope section) already correctly retries on a genuine unhandled throw. Confirm that TASK 2's fix doesn't accidentally make things worse by converting what used to be "the whole render fails and retries next cycle" into "the whole render silently succeeds with one card missing, and the signature gets stamped as if everything rendered correctly" — this is a real tradeoff, not a strict improvement, and needs to be stated explicitly: isolating one bad card means the *rest* of tonight's cards render correctly instead of the whole page failing, but it also means a malformed single game no longer forces a retry on the next cycle. State this tradeoff in the outbox, and confirm `captureFieldError`'s logging is the mitigation (the failure is visible in `_fieldErrors`/Health Panel, even though the render itself "succeeds").

## VERIFICATION

- Construct a real test: temporarily make one of the previously-unwrapped functions (e.g. `buildViewerIntelChip`) throw for one specific game object, confirm the rest of that section's cards still render correctly, confirm the broken card either omits cleanly or shows the fallback shell, confirm `_fieldErrors` captures the failure with the correct tag. Revert the test change afterward.
- Confirm `node smoke.js` passes clean.
- Confirm no existing card's actual rendered output changed for the non-failure case (this is additive fault isolation, not a rewrite of card-building logic).

## DONE CONDITION

A single malformed game object can no longer take down the entire structural render — it fails in isolation, is logged via the existing `_fieldErrors` mechanism, and the rest of the section renders normally. Verified with a real forced-failure test, not asserted. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 confirms complete, accurate list of unwrapped calls, not assumed (15 pts)
- TASK 2 correctly wraps the whole per-card build in one boundary, reuses `captureFieldError`, stated fallback choice with reasoning (35 pts)
- TASK 3 tradeoff explicitly stated and reasoned, not glossed over (20 pts)
- Real forced-failure test constructed and verified, correct tag captured, rest of section unaffected (20 pts)
- `node smoke.js` clean, no non-failure-case output changed (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.