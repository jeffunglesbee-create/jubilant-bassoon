# Claude Code Command — Gap 8 + Gap 9: Journal Tab + Streaming Discovery Circadian Shift

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All JS edits go in `src/legacy/field.js`, never `index.html` directly.

---

## CONTEXT

Source: Gap Closers doc, Gap 8 + Gap 9. Both are real, independent, low-risk consumers of Gap 5's already-live `computeCircadianContext`/`_circadianMode` — grouped into one CC-CMD since each is small and they touch different surfaces (Journal tab section ordering; Streaming Discovery card sort/badges), not because they're coupled.

**Real, confirmed foundation:** `_circadianMode` (global mode, one of PREVIEW/PRIME/NIGHT/LATE/DAWN) is live and updated every V2 poll (Gap 5, confirmed). Both gaps read this value — neither needs new circadian computation.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "_circadianMode" src/legacy/field.js | head -5
grep -n "function.*[Jj]ournal.*[Tt]ab\|journal-section\|jrn-" src/legacy/field.js | head -10
grep -n "function.*[Ss]treaming.*[Dd]iscovery\|streaming-service-card" src/legacy/field.js | head -10
node smoke.js index.html 2>&1 | tail -3
```

Confirm real, current Journal tab and Streaming Discovery function/section names — the spec's own references (`renderScheduleFromEnriched`-style assumptions) are month-old and this codebase has moved substantially tonight alone.

---

## TASK 1 — Gap 8: Journal tab section priority by mode

Per spec's own real priority tables (PREVIEW/PRIME/NIGHT/LATE/DAWN each order Journal sections differently) — adapt section names to what actually exists in the current Journal tab (the spec's own section names like "Tonight's FIELD Brief," "Scout's Pick," "Market Watch," "Archive Timeline" may not match current naming exactly; confirm real section identifiers via the probe block before assigning priorities).

Implementation: a `data-journal-priority` attribute per section, keyed by current `_circadianMode`, with a re-sort (CSS `order` property or DOM reorder) firing when mode changes.

**Mandatory literal verification:**
```bash
grep -c "data-journal-priority" src/legacy/field.js
```
Paste real output — must be > 0.

## TASK 2 — Gap 9: Streaming Discovery sort + badge by mode

Per spec: PREVIEW sorts by tonight's game count ("N games tonight"), PRIME by live count ("N live now"), NIGHT by Debrief-available count ("N Debriefs available" — using the real, confirmed `.card-debrief`/final-game detection from Phase 3b, not a new mechanism), LATE/DAWN by total archive coverage.

**Mandatory literal verification:**
```bash
grep -c "games tonight\|live now\|Debriefs available\|games tracked" src/legacy/field.js
```
Paste real output.

## TASK 3 — Real diff and live verification

```bash
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
git diff --stat
```

Real commit, real live CI confirmation, real content check for both surfaces.

---

## DONE CONDITION

Journal tab sections genuinely reorder by real, current `_circadianMode`; Streaming Discovery cards genuinely re-sort and re-badge by mode — both verified via pasted grep output and real live content checks, not assumed from code presence alone.

**Confidence scoring:**
- TASK 1 (35 pts): Journal tab priority real and wired, confirmed via pasted output
- TASK 2 (35 pts): Streaming Discovery sort/badge real and wired, confirmed via pasted output
- TASK 3 (30 pts): real diff, real live CI, real content check for both

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
