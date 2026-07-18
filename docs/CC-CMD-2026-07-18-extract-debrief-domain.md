# Claude Code Command — Extract the Debrief domain into TypeScript (second real TS module)

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All edits go in `src/legacy/field.js` and the new module file, never `index.html` directly. `field.js` is a real ES module — new extractions use real `export`/`import`.

---

## CONTEXT

Repeats the same pattern the Identity extraction just proved: a real domain with a real, already-occurred boundary-mismatch bug directly motivating a typed contract, not a generic "let's add types" exercise.

**The real precedent bug:** `buildSeriesArc` (one of these six functions) read `game.winner`/`game.margin` per game — but the real, confirmed relay shape (`findSeries()` in field-relay-nba) provides `home_score`/`away_score` and a separate top-level `margins[]` array, not nested per-game fields. Found via direct static comparison against relay source, fixed before any live data could reveal it silently at runtime. That fix already shipped — this CC-CMD is about preventing the *next* one, not re-fixing that one.

**Real, current candidates — all 6 confirmed present, 2 real call sites each:**
- `buildDramaUnsealed`
- `buildFieldWasWatching`
- `buildOddsStory`
- `buildSeriesArc`
- `buildBracketDeltaLayer`
- `buildDebrief` (the assembler — calls the other 5)

All six share one real, common input: the `debrief` sub-object on an enriched game (`buildEnrichedGame`'s own `debrief: { dramaSealed, oddsOutcome, preGameBrief, seriesArc, bracketDelta }` shape). A real, shared type for this shape — enforced once, at the boundary — would have caught the `winner`/`margin` mismatch at build time instead of requiring manual static comparison to find it.

**Re-derive and re-verify this list fresh, matching the Identity extraction's own discipline — don't assume it's unchanged or complete.**

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
node smoke.js index.html 2>&1 | tail -3
for fn in buildDramaUnsealed buildFieldWasWatching buildOddsStory buildSeriesArc buildBracketDeltaLayer buildDebrief; do
  grep -c "\b$fn(" src/legacy/field.js
done
grep -n "debrief: {" src/legacy/field.js
```

Confirm the real, current `debrief` sub-object shape as `buildEnrichedGame` actually constructs it — this is the real source of truth for the type, not an assumption from this document.

---

## TASK 1 — Real scope review (matching Identity's own honest narrowing)

Confirm all six genuinely belong in one cohesive Debrief module — check each one's real dependencies (does any of them reach outside the debrief data shape into unrelated state?). If one doesn't cleanly fit, say so and exclude it, matching how Identity correctly excluded 4 of 7 candidates rather than force a wrong boundary.

## TASK 2 — Design the real TypeScript shapes first, from actual observed data

Real types for the actual `debrief` object shape — a `DebriefData` interface covering `dramaSealed`, `oddsOutcome`, `preGameBrief`, `seriesArc`, `bracketDelta`, each with its own real, confirmed shape (the relay's real `findSeries()` return shape for `seriesArc` specifically — `{series, games: [...], margins: [...]}`, matching the already-shipped fix, not the old broken assumption). Base every field on real, confirmed data, not an idealized guess — cross-reference against the relay's real response shape directly if needed, not just the client-side consumption code.

## TASK 3 — Extract into `src/debrief/index.ts`

Real TypeScript, real exports, real type annotations. Internal `field.js` call sites continue working via normal ES module imports.

**Mandatory literal verification:**
```bash
grep -n "export function build" src/debrief/index.ts
```
Paste real output — should show all real, final functions from TASK 1's scope review.

## TASK 4 — Real, functional call-site verification

For each extracted function, confirm real callers still resolve correctly. Specifically re-confirm `buildSeriesArc`'s real behavior against the real, confirmed relay shape — this is the exact function whose bug motivated this whole extraction; make sure the type system genuinely would have caught it, don't just assume it would.

## TASK 5 — Real diff, build, and live verification

Full pipeline: `sync-source.mjs` → smoke → `build-bundle.mjs` (confirm TS transpiles cleanly, matching Identity's own proof) → bundled regression check. Real commit, real live CI confirmed via the raw check-runs API directly, real live content check confirming a real Debrief card still renders correctly.

---

## DONE CONDITION

A real, cohesive Debrief module exists as genuine TypeScript, with a real `DebriefData` type matching the actual confirmed relay contract (including the corrected `seriesArc` shape), all real call sites verified functionally unchanged, full pipeline proven via real job logs and live content check.

**Confidence scoring:**
- TASK 1 (20 pts): real, honest scope review, not wholesale extraction
- TASK 2 (25 pts): real types matching the actual confirmed relay contract, especially the corrected seriesArc shape
- TASK 3 (20 pts): clean TS extraction, confirmed via pasted output
- TASK 4 (20 pts): real functional verification, specifically re-confirming buildSeriesArc against real data
- TASK 5 (15 pts): real pipeline proof, real live CI via raw job logs, real content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
