# Claude Code Command — Compound Architecture Phase 1: UI Primitives

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CONTEXT

Source spec: Drive doc "FIELD — Compound Architecture: Schedule + UI Primitives + The Debrief" (June 15 2026, APPROVED, ID `1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I`), Part 2. This is the real, honest first phase toward The Debrief — Part 3 of the same spec cannot safely start until this phase's card-slot template exists; The Debrief's own client rendering explicitly depends on it.

**This is Phase 1 of 3 real, sequential phases, not the whole thing.** Phase 2 (Schedule Compound: `buildEnrichedGame`, `renderCard`, delta rendering) and Phase 3 (The Debrief itself) are separate, later CC-CMDs, each requiring this phase to genuinely land first.

Five primitives every surface in the app should compose from: `fieldChip`, the card slot template + `fillSlot`, `fieldSection`, `fieldState`, `fieldRow`.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -c "function fieldChip\|function fieldSection\|function fieldState\|function fieldRow\|function fillSlot" index.html
# Confirm zero — re-verify at execution time, don't trust this doc's own age
grep -c "field-chip--MUST\|field-chip--WATCH\|field-chip--DISCOVERY" index.html
# Check whether chip classes referenced in the spec already exist under different names
node smoke.js index.html 2>&1 | tail -3
```

Confirm genuinely zero existing implementation. If any of the 5 primitives partially exist under a different name, report this — don't silently duplicate or silently rename without flagging it.

---

## TASK 1 — Build fieldChip(text, tier, opts)

Exactly as specced: 7 tiers (MUST/WATCH/DISCOVERY/CAUTION/QUIET/INFO/NEUTRAL), real color mapping from the spec (referencing Rule 37 COLOUR-SYS-A — confirm this rule's real current color values match the spec before hardcoding, the spec is over a month old). CSS classes as specced.

**Do not yet replace existing chip implementations** (`.stream-chip`, `.drama-badge`, etc.) in this task — that's the spec's own "Phase 2: Refactor existing surfaces" sub-step, real, separate, higher-risk work touching many call sites. This task only builds the new primitive standalone.

## TASK 2 — Build the card slot template + fillSlot(card, name, content)

Exactly as specced — the full slot template including the `data-slot="debrief"` slot (currently unused, reserved for the future Phase 3 work). `fillSlot`'s three behaviors (null→hidden, string→textContent, Element→replaceChildren) exactly as specced.

**Do not wire this template into the live schedule render path yet** — that's Phase 2 (Schedule Compound)'s job. This task builds the template and fill function as standalone, testable pieces.

## TASK 3 — Build fieldSection, fieldState, fieldRow

Exactly as specced, standalone.

## TASK 4 — Real verification

Confirm all 5 primitives are genuinely callable and produce the exact DOM structure specced — a real, isolated test (e.g., call each function directly in a scratch context, inspect the real output), not just "it didn't throw." Full local pipeline dry-run, real commit, real live verification (job logs + post-deploy content check).

---

## DONE CONDITION

All 5 primitives (`fieldChip`, card slot template + `fillSlot`, `fieldSection`, `fieldState`, `fieldRow`) exist as real, callable, standalone functions producing the exact specced DOM/CSS structure — not yet wired into any existing surface, verified via real job logs and live content check.

**Confidence scoring:**
- TASK 1 (25 pts): fieldChip real, correct tiers/colors, not yet wired into existing surfaces
- TASK 2 (30 pts): card slot template + fillSlot real, correct three-way behavior, includes the reserved debrief slot
- TASK 3 (20 pts): fieldSection/fieldState/fieldRow real, matching spec
- TASK 4 (25 pts): real isolated verification of DOM output, real live CI run confirmed via job logs, real post-deploy content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.

---

## NEXT STEPS (not this dispatch)

Once verified: Phase 2 (Schedule Compound — `buildEnrichedGame`, `renderCard`, delta rendering, refresh coordinator) becomes dispatchable, using these primitives. Phase 3 (The Debrief itself — five layers, relay `drama_score` column, client rendering) becomes dispatchable only after Phase 2 lands.
