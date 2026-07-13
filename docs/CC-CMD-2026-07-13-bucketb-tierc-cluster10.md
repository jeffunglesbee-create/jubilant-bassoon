# Claude Code Command — Bucket B Tier C, Cluster 10 (FINAL): all remaining 15 entries — closes Tier C entirely

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** all 15 remaining Bucket B low-frequency entries (real call-site counts 1-2). This is the last cluster — once this lands, Bucket B Tier C is fully closed, no further clusters needed.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull. Read CLAUDE.md and confirm the cap dependency below.

Write findings to outbox/cc-bucketb-tierc-cluster10-2026-07-13.md.

## TASK -1 — Confirm the cap dependency

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

## CONTEXT — all standing lessons, plus two specific items needing care

**Lesson 1 (exception surface):** rate has varied 10%-56% across clusters. Check the full body.
**Lesson 2 (Bucket C cross-check):** cross-check all 15 against the full `## Bucket C` section before writing code.
**Lesson 3 (multi-catch functions):** read each function's full body, not just the cited line.
**Overlap check:** re-confirm via `git log --oneline` on `index.html` since session start that none of these 15 were touched by any earlier cluster.

**`bdlLoad` — already-confirmed distinct site, not a duplicate:** this cluster's entry is at ~L14819, a genuinely different catch than the one already migrated by Cluster 5 at ~L14893 (the corrupt-cache-read catch, already done). Confirm via TASK 0 that ~L14819 is a real, separate, still-unaddressed site before treating it as already covered.

**`getVolatilityIndex`/`getVolatilityLabel` — a real caller/callee pair, same shape as Cluster 8's `findConflicts`/`renderConflictChip`:** `getVolatilityLabel` is `getVolatilityIndex`'s sole caller. Investigate both together.

### All 15 entries

| Function | Real callers | Gap |
|---|---|---|
| `_computeSRPlayEPA` (~L10355) | 1 | Sole caller `events.map(_computeSRPlayEPA).filter(Boolean)` discards all null reasons identically |
| `bdlFetch` (~L14785) | 2 | Both callers do bare `if(!data||!data.data) return []`, no distinction from missing key vs other failure |
| `getVolatilityIndex` (~L10465/L10564) | 1 | Sole caller `getVolatilityLabel` does bare `if (v === null) return null` — **see caller/callee note above** |
| `getVolatilityLabel` (~L10478/L10576) | 2 | Both callers just do `vL ? ... : ''` ternary — **see caller/callee note above** |
| `loadPGASlate` (~L16786) | 1 | `if(!r.ok) return null` collapses HTTP errors into the same null the sole caller treats as a network exception |
| `fetchESPNStandings` (~L17132) | 1 | Sole caller falls to identical "all sources failed" stub regardless of cause |
| `buildSafeScoreWrap` (~L22006) | 1 | Inner catch of Layer-3 fallback chain; whichever layer fails, falls to Layer 4 identically |
| `fetchNBALiveBoxscore` (~L36147) | 2 | Both callers use optional chaining, treating missing-ID and fetch-failure identically |
| `getMLBAnalyticsContext` (~L8077) | 2 | Both callers already wrap the call in their own try/catch, outer wrapping fully decorative |
| `_fetchUFLGameEpa` (~L10408) | 1 | Sole caller awaits with no return-value check; poll loop retries every 60s regardless |
| `_fieldGameRenderPayload` (~L10769) | 1 | Sole caller embeds result directly into a signature array via `.map` with no null check |
| `bdlLoad` (~L14819) | 1 | Catches JSON.parse/storage errors, falls through to same `return null` as cache-miss — **see bdlLoad note above** |
| `buildLayer3Rules` (~L27736) | 1 | Per-game try/catch around extra-period/extreme-event rule computation |
| `getFieldUserId` (~L28777) | 2 | Both callers only check `if(!userId)`, never inspect the cause |
| `buildArbitrageReport` (~L35310) | 2 | Both callers treat "no data" and "no allData" identically |

## TASK 0 — Probe

Re-confirm all 15 functions' current line numbers and full-body shape fresh. Confirm the `bdlLoad` distinctness and the volatility caller/callee relationship. Confirm the overlap check.

## TASK 1 — Add captureFieldError() to each confirmed-real gap

Same convention as prior clusters. Zero caller behavior change.

## TASK 2 — Verification

- Real forced-condition test for each function that gets telemetry.
- Confirm genuine success behavior unchanged across all 15.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## TASK 3 — Close out Tier C

Once TASK 0-2 are complete: update `docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s summary table (near the top, where Bucket totals live) to reflect final reality, and reconcile the older section-header labels ("Bucket B — grouped by function... (281 sites)" / "Bucket C — grouped by function... (519 sites)") that were never updated across Clusters 1-9 to match the summary table — these have drifted and should say the same numbers in both places. Add a one-line note at the top of the Bucket B section stating Tier C (the low-frequency, 1-2-caller sweep) is complete as of this commit, distinct from the still-open Bucket B moderate/high-frequency work (already fully done via Tier A/B) — i.e., state plainly that the entire original 281-site Bucket B survey is now fully resolved, not just this specific batch.

## DONE CONDITION

All 15 individually investigated. Real gaps get real telemetry; correct exclusions or reclassifications documented with reasoning. Zero caller behavior change. Queue file's summary numbers reconciled across all locations. A clear closing statement that Bucket B Tier C — and Bucket B as a whole — is fully resolved.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 re-confirms all 15 fresh, bdlLoad distinctness and volatility pair both confirmed, overlap check performed (20 pts)
- TASK 1 correct for every confirmed-real gap (30 pts)
- TASK 2 all additions forced-tested, all suites clean (25 pts)
- TASK 3 queue totals reconciled across all locations, clear closing statement written (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
