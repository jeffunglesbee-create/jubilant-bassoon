# Claude Code Command — Compound Architecture Phase 2: Schedule Compound

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.** This is a real refactor of the live schedule render path (the spec's own estimate: ~3 hours CC, touches `fetchV2AllScores`, `renderESPNScores`, `scheduleRenderAll`, `computeCardStage`, `buildCardTimeDisplay`, and every journalism injection point). Materially higher risk than Phase 1's standalone primitives.

---

## CRITICAL — EDIT TARGET DISCIPLINE

**All JS edits go in `src/legacy/field.js`. Never edit `index.html`'s `<script>` block directly.** Tonight's own incident: a session edited `index.html` directly, the pre-commit hook's `sync-source.mjs` silently overwrote it, and the real work was erased with a misleadingly clean smoke pass along the way. Before writing any code, confirm you understand this: `field.js` is the source, `index.html` is generated from it via `node scripts/sync-source.mjs`, which must run before every smoke check and before every commit.

```bash
# Sanity check this understanding before starting:
grep -n "sole JS source of truth\|only correct edit target" CLAUDE.md docs/*.md outbox/*.md 2>&1 | head -3
```

---

## CONTEXT

Source spec: Drive doc "FIELD — Compound Architecture: Schedule + UI Primitives + The Debrief" (June 15 2026, APPROVED, ID `1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I`), Part 1. Phase 1 (UI Primitives — `fieldChip`, `_cardTemplate`, `fillSlot`, `fieldSection`, `fieldState`, `fieldRow`) is confirmed complete and verified in `src/legacy/field.js`. This phase wires them into the actual schedule render path.

**Problem being solved:** 10 independent data paths (V2 poll, ESPN overlay, journalism cron, drama computation, series context, broadcast resolution, WC standings, archive enrichment, My Teams filter, sport filter) each write to game cards on separate timers — a single card can be touched 6+ times in 30 seconds, causing redundant DOM mutations and CLS risk.

**Do not assume the spec's referenced function names are still current — this is a month-old doc and the codebase has moved constantly tonight alone.** Verify every one via grep before touching it.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "sole JS source of truth" CLAUDE.md 2>&1 | head -1

# Confirm Phase 1 primitives are genuinely present in field.js
grep -c "function fieldChip\|function fillSlot\|function fieldSection\|function fieldState\|function fieldRow" src/legacy/field.js

# Confirm the real, current names of every function the spec assumes exists
grep -n "function fetchV2AllScores\|function renderESPNScores\|function scheduleRenderAll\|function computeCardStage\|function buildCardTimeDisplay" src/legacy/field.js

# Confirm zero existing implementation of this phase's own new functions
grep -c "function buildEnrichedGame\|function renderCard\b\|function updateCard\b" src/legacy/field.js

node scripts/sync-source.mjs
node smoke.js index.html 2>&1 | tail -3
```

Report the real output of every probe before writing any code. If any of the spec-referenced functions don't exist under the names assumed, find their real current names before proceeding — don't guess or invent replacements.

---

## TASK 1 — buildEnrichedGame(rawGame, sources): Layer 1 Data Aggregation

Per spec, merging real, current data sources into one enriched object — adapt the field list to what's actually available in the current game object shape (grep the real, current raw game object's fields before assuming the spec's exact property list is accurate). Include the `debrief: { dramaSealed, oddsOutcome, preGameBrief, seriesArc }` placeholder structure — but do not populate it with real Debrief logic; that's explicitly Phase 3 scope. Leave it present but inert (all null/undefined) for now, matching the reserved `data-slot="debrief"` from Phase 1.

**Mandatory literal verification:**
```bash
grep -n "function buildEnrichedGame" src/legacy/field.js
```
Paste real output.

## TASK 2 — renderCard(enrichedGame): Layer 2 Render Compound

Using Phase 1's real `_cardTemplate` and `fillSlot` — confirm their real, current call signatures via grep before using them, don't assume from the Phase 1 session doc's own description. One-pass slot filling as specced.

**Mandatory literal verification:**
```bash
grep -n "function renderCard\b" src/legacy/field.js
```
Paste real output.

## TASK 3 — updateCard(cardEl, prevGame, newGame): delta rendering

Only update slots whose data actually changed, per spec.

**Mandatory literal verification:**
```bash
grep -n "function updateCard\b" src/legacy/field.js
```
Paste real output.

## TASK 4 — Refresh coordinator + filter compound

Tier-based debounce (V2/ESPN merge within 500ms window) and single-pass filter evaluation (`shouldShowCard`), per spec — adapted to the real, current filter state variable names (grep for the actual current sport-filter and My-Teams-filter variables, don't assume the spec's `_activeSportFilter`/`_myTeamsOnly` names are current).

**Mandatory literal verification:**
```bash
grep -n "function shouldShowCard\|scheduleRenderDebounced" src/legacy/field.js
```
Paste real output.

## TASK 5 — Wire into the real render path

This is the highest-risk task — replacing the 10 independent write paths with the compound. Do this incrementally: confirm each of the 10 real data paths (V2 poll, ESPN overlay, journalism cron, etc.) still functions correctly after being routed through `buildEnrichedGame` → `renderCard`/`updateCard`, one path at a time, with a real smoke run after each. Do not attempt to wire all 10 in a single uncommitted batch — if something breaks, isolate which path caused it.

**Mandatory literal verification after each path is wired:**
```bash
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
```
Paste real output for each of the 10 paths as they're wired.

## TASK 6 — Real diff-size reconciliation before writing the outbox

```bash
git diff --stat
```

This phase is genuinely large — the diff should reflect real, substantial change across the render path, not a handful of lines. Before writing the outbox, confirm the real diff size matches the scope of what's about to be claimed, per the standard established after tonight's Gap 5 incident.

## TASK 7 — Real live verification

Commit through the normal path (`sync-source.mjs` → smoke → commit). Real `deploy-gate.yml` job logs directly confirmed via actual API output pasted verbatim, not summarized. Real live content check — confirm the actual rendered page shows cards built via the new compound (e.g., check for the `_cardTemplate`'s real, distinguishing DOM structure in the live HTML), not just that the page loads.

---

## DONE CONDITION

`buildEnrichedGame`, `renderCard`, `updateCard`, the refresh coordinator, and the filter compound all genuinely exist in `src/legacy/field.js` (confirmed via pasted grep output, not claimed), all 10 original data paths route through the compound correctly (confirmed via incremental smoke runs, one per path), the real diff size matches the outbox's own claims, and live deployment is confirmed via real job logs and a real content check — not assumed from a clean local test alone, per the standard this exact feature area already broke once tonight.

**Confidence scoring:**
- TASK 1 (15 pts): buildEnrichedGame real, confirmed via pasted output
- TASK 2 (15 pts): renderCard real, confirmed via pasted output
- TASK 3 (10 pts): updateCard real, confirmed via pasted output
- TASK 4 (10 pts): refresh coordinator + filter compound real, confirmed via pasted output
- TASK 5 (25 pts): all 10 data paths correctly wired incrementally, each with a real, pasted smoke result
- TASK 6 (10 pts): real diff-size reconciliation performed and shown
- TASK 7 (15 pts): real live CI run confirmed via actual pasted job/step output, real post-deploy content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Do not write the outbox until every literal verification step's real output has been captured and included.
