# Claude Code Command — esbuild Phase 6: VENUE_COORDS + isOutdoorVenue/getVenueCoords

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

Phase 5 (`WX_DIR`+`cardinalDir` → `src/utils/wind.js`) confirmed the constant+function pattern extends cleanly: the constant is referenced normally within the new module by its co-located function(s), no cross-module import needed for that internal relationship; the `globalThis` bridge only matters for any bare-identifier reads that remain in `field.js`. Apply this exact template — the pattern is proven, this is not new ground.

**Real difference from Phase 5, worth checking explicitly rather than assuming identical:** this pair has *two* functions (`isOutdoorVenue`, `getVenueCoords`) sharing one constant (`VENUE_COORDS`), not one function like Phase 5. Confirm both functions' real relationship to the constant and to each other before extracting — do they call each other, or are they independent consumers of the same data?

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "^const VENUE_COORDS" src/legacy/field.js
grep -n "function isOutdoorVenue\|function getVenueCoords" src/legacy/field.js
grep -c "VENUE_COORDS" src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Real confirmation of scope

Confirm real current shape of `VENUE_COORDS`, `isOutdoorVenue`, `getVenueCoords`. Confirm whether the two functions call each other. Confirm all real bare-identifier callers of `VENUE_COORDS` outside these two functions (if any exist, they need the `globalThis` bridge same as Phase 5's approach). Confirm zero smoke assertions reference any of the three by name.

## TASK 2 — Extract into src/utils/venues.js

Constant + both functions, same-module internal references, `globalThis` bridge in `main.js` for all three, stub comments in `field.js`, no import added there.

## TASK 3 — Real call-site verification

## TASK 4 — Full local pipeline dry-run

## TASK 5 — Real live verification

Real job logs, real post-deploy content check — same standard as every phase tonight.

---

## DONE CONDITION

`VENUE_COORDS` + `isOutdoorVenue` + `getVenueCoords` extracted together, all real call sites verified, full pipeline proven via real job logs and live content check.

**Confidence scoring:**
- TASK 1 (20 pts): real confirmation, including the two-function relationship
- TASK 2 (30 pts): clean extraction
- TASK 3 (15 pts): real call-site verification
- TASK 4 (10 pts): full local pipeline dry-run clean
- TASK 5 (25 pts): real live CI run confirmed via job logs, real post-deploy content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
