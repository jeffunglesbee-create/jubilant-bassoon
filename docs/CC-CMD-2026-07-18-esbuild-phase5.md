# Claude Code Command — esbuild Phase 5: first constant+function pair extraction (WX_DIR + cardinalDir)

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

Phase 4's own outbox (real, verified: tree-shaking confirmed working via a genuine byte-level test) directly evaluated two options and rejected the more obvious-seeming one — domain consolidation was explicitly called "not compelling," since the 13 existing modules are already well-scoped and grouping them would obscure origin without adding real value. Its actual recommendation: extract constant-dependent function pairs, one at a time, starting with the simplest.

**This is a genuinely new category, not a repeat of Phase 3's pattern — treat it with real caution, not routine confidence.** Every prior extraction (Phase 3 through 3-final, 19 functions) was pure logic with zero external dependencies. This one moves a real constant (`WX_DIR`) alongside its dependent function (`cardinalDir`) into the same new module — the first test of whether the established `globalThis` bridge pattern genuinely extends cleanly to constants, not just functions.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "^const WX_DIR" src/legacy/field.js
grep -n "function cardinalDir" src/legacy/field.js
grep -c "WX_DIR" src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Real confirmation before extracting

Confirm the real, current shape of both `WX_DIR` and `cardinalDir`. Confirm `WX_DIR` is genuinely only referenced by `cardinalDir` (or by other functions too — check don't assume; if other real callers exist, they also need to resolve `WX_DIR` correctly post-extraction, either by also being extracted or by reading it via the same `globalThis` bridge). Confirm zero smoke assertions reference either by name (grep, not assumed from Phase 3's own list — this is genuinely new ground).

## TASK 2 — Extract both together into one new module

`src/utils/wind.js` (per Phase 4's own naming) with `WX_DIR` as a real, exported constant and `cardinalDir` as a named function export that references it directly within the same module (a normal, same-file reference — no cross-module import needed for this one relationship). In `main.js`: import both, `globalThis.WX_DIR = WX_DIR` and `globalThis.cardinalDir = cardinalDir`, before `import './legacy/field.js'`. In `field.js`: both original definitions replaced with stub comments, no import added.

**Real risk to check explicitly:** does anything else in `field.js` reference `WX_DIR` directly as a bare identifier (not through `cardinalDir`)? If so, the `globalThis.WX_DIR` bridge must cover that too — confirm this works the same way the function-only bridge did, or report if constants behave differently under the IIFE/global-read pattern.

## TASK 3 — Real call-site verification

Every real caller of both `WX_DIR` and `cardinalDir` in `field.js` confirmed resolving correctly.

## TASK 4 — Full local pipeline dry-run

`sync-source.mjs` → smoke (958/0, re-confirm current count) → `build-bundle.mjs` clean.

## TASK 5 — Real live verification

Real `deploy-gate.yml` job logs directly confirmed, real live content check post-deploy.

## TASK 6 — Honest report on whether the pattern extends cleanly to constants

This is the real, primary question this dispatch exists to answer, beyond just "did this one pair extract successfully." State plainly whether constant co-extraction worked identically to the pure-function pattern, or whether it needed any real adjustment — this determines whether the remaining two named pairs (`VENUE_COORDS`+`isOutdoorVenue`/`getVenueCoords`, `MY_TEAMS`+`isFeaturedTierGame`) can follow this exact same CC-CMD template, or need their own adjustments.

---

## DONE CONDITION

`WX_DIR` + `cardinalDir` extracted together into `src/utils/wind.js`, all real call sites verified, full pipeline proven via real job logs and live content check, with an honest answer on whether the established pattern extends cleanly to constants.

**Confidence scoring:**
- TASK 1 (20 pts): real confirmation of scope, not assumed from function-only precedent
- TASK 2 (30 pts): clean extraction, real handling of any bare-identifier `WX_DIR` references beyond `cardinalDir` itself
- TASK 3 (15 pts): real call-site verification
- TASK 4 (10 pts): full local pipeline dry-run clean
- TASK 5 (15 pts): real live CI run confirmed via job logs, real post-deploy content check
- TASK 6 (10 pts): honest, evidence-based answer on pattern extension to constants

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
