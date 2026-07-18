# Claude Code Command — esbuild Phase 3e: fifth real ES module extraction (or honest stop)

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

Five real extractions so far across three prior dispatches (Phase 3, 3b, 3c — Phase 3d may or may not have landed by execution time, check real state, don't assume): `fmtGolfToPar`, `fieldTierRank`/`fieldTierLabel`, `inferSport`/`golfRoundLabel`.

**Real, honest signal from Phase 3c's own candidate search: the safe-candidate pool is thinning.** It checked 12 real functions to find 2 usable ones — a noticeably harder search than either prior extraction needed. This CC-CMD explicitly permits stopping honestly if a genuinely safe candidate doesn't exist, rather than forcing a weaker extraction to hit a quota. A forced, marginal extraction is worse than no extraction — it either takes on real risk (a not-quite-pure function, a borderline constant dependency) or produces a technically-safe but practically pointless single-line module.

**Full, real, cumulative rejection list — check against all of these, and against Phase 3d's real outcome if it's landed:**
- `classifyFieldError`, `_briefQualityClassify`, `stripMarkdown`, `_gameSport`, `lastNameOf`, `isDomesticLeagueInBreak`, `isCrunchTimeGame` — smoke asserts their literal function signature or content
- `expandStreams`, `resolveBundle`, `sportCountLabel` — depend on `SR`/`BUNDLES`/`SPORT_META` constants
- `teamNick`, `_multiWordNicks` — smoke asserts the dict's own string content
- `minutesSinceFinal`, `fmtTime`, `isoToLabel`, `localTz` — depend on state variables or constants, not pure
- `parseSeriesRecord` — depends on `teamNick`/`_teamAbbr`
- `isGrindingGame` — depends on `isCrunchTimeGame` internally

Reuse the established pattern exactly (new module under `src/utils/` or `src/sports/`, named exports, `globalThis` bridge in `main.js`, stub comment in `field.js`, no import in `field.js`).

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
find src/utils src/sports -name "*.js" 2>&1
grep -h "^export function" src/utils/*.js src/sports/*.js 2>&1
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Real, thorough candidate search, with an honest stop condition

Use AST + call-graph tooling, matching Phase 3c's own more exhaustive approach rather than the lighter searches of Phase 3/3b — the remaining pool needs real digging now. Cross-check every candidate against the full rejection list above and the real, current extraction inventory (including Phase 3d's real outcome if it's landed by now).

**If no genuinely safe, real candidate is found after a real, thorough search: stop here, report exactly what was checked and why each candidate failed, and do not force a marginal extraction.** This is a valid, complete, high-confidence outcome for this dispatch — not a failure to route around.

## TASK 2 — Extract using the established pattern exactly (only if TASK 1 finds a real candidate)

## TASK 3 — Real call-site verification

## TASK 4 — Full local pipeline dry-run

## TASK 5 — Real live verification

Same standard as every phase tonight — real job logs, real post-deploy content check.

---

## DONE CONDITION

Either: a fifth real, genuinely safe function extracted and verified via real job logs and live content check. Or: TASK 1 honestly reports the safe-candidate pool is now exhausted, with real evidence of what was checked — a valid, complete outcome, not an incomplete one.

**Confidence scoring:**
- TASK 1 (35 pts): real, thorough search — either finds a genuine candidate with real evidence, or honestly and completely reports exhaustion
- TASK 2 (20 pts, if applicable): established pattern followed exactly
- TASK 3 (15 pts, if applicable): real call-site verification
- TASK 4 (15 pts, if applicable): full local pipeline dry-run clean
- TASK 5 (15 pts, if applicable): real live CI run confirmed via job logs, real post-deploy content check

If TASK 1 honestly concludes no candidate exists, TASK 1's own 35 points plus full credit for the remaining 65 (since stopping correctly is exactly what's required) is the complete, correct outcome — do not lower the score for "not extracting anything" if the search itself was genuinely thorough.

Do not commit unless confidence >= 95 (for whichever outcome — extraction or honest stop). If score < 95, report verbatim and stop.
