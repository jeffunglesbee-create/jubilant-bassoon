# Claude Code Command — Bucket B Tier C, Cluster 9: soccer/CFL siblings + fire-and-forget poll/badge siblings + fallback-chain fetchers (10 functions)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 10 functions across three patterns. Built excluding Clusters 5, 6, 7, and 8's 41 functions, none of which had landed at build time — re-verify no overlap via TASK 0. Real call-site counts 1-2 each.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull. Read CLAUDE.md and confirm the cap dependency below.

Write findings to outbox/cc-bucketb-tierc-cluster9-2026-07-13.md.

## TASK -1 — Confirm the cap dependency

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

## CONTEXT — standing lessons

**Lesson 1 (exception surface):** rate has varied 10%-56% so far. Check the full body.
**Lesson 2 (Bucket C cross-check):** cross-check all 10 against the full `## Bucket C` section before writing code.
**Lesson 3 (multi-catch functions):** read each function's full body.
**Overlap check:** re-confirm via `git log --oneline` on `index.html` since session start that none of these 10 were touched by Clusters 5, 6, 7, or 8 landing in the meantime — this doc was built before any of the four confirmed landing. Four simultaneous in-flight clusters is more than any prior batch — treat the overlap check as load-bearing, not routine, this time.

### Group A — soccer/CFL siblings (3 functions)

| Function | Real callers | Gap |
|---|---|---|
| `loadCFLScoreboard` (~L12661) | 2 | Both callers treat null and empty array identically, discarding HTTP-not-ok vs other reasons |
| `getSoccerFBrefStats` (~L8546) | 2 | Both call sites just do `if(hStats)`; exact-match miss vs fuzzy-match miss indistinguishable |
| `fetchESPNFixturesForDate (events.map callback)` (~L7389) | 1 | Per-event null immediately `.filter(Boolean)`ed away in the same function |

### Group B — fire-and-forget poll/badge siblings (3 functions)

| Function | Real callers | Gap |
|---|---|---|
| `injectJ1J4Badges` (~L15255) | 1 | Swallows entire background poll loop; badge silently stays without brief either way |
| `fetchFPLLiveScores` (~L21795) | 2 | Both callers never inspect internals; catch already fully swallows, next poll retries regardless |
| `subscribeToPush` (~L9158) | 2 | Both callers fire-and-forget without reading the returned boolean |

### Group C — fallback-chain fetchers (4 functions)

| Function | Real callers | Gap |
|---|---|---|
| `fetchCountryContext` (~L31079) | 1 | Sole caller does bare `if (!cc) return;`; every failure reason collapses identically |
| `fetchSeriesArchive` (~L31738) | 1 | Sole caller returns `ctx` unchanged on any falsy result |
| `fetchSeriesPreviewFromClaude` (~L28527) | 2 | Both call sites just check truthiness, discarding why generation failed |
| `fetchArchiveDate` (~L31769) | 1 | Caller does `if (!r) continue;` per date in a 14-day loop |

## TASK 0 — Probe

Re-confirm all 10 functions' current line numbers and full-body shape fresh. Confirm the overlap check above with particular care given four clusters are simultaneously in flight.

## TASK 1 — Add captureFieldError() to each confirmed-real gap

Same convention as prior clusters. Zero caller behavior change.

## TASK 2 — Verification

- Real forced-condition test for each function that gets telemetry.
- Confirm genuine success behavior unchanged across all 10.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 10 individually investigated, zero overlap with Clusters 5/6/7/8 confirmed. Real gaps get real telemetry. Zero caller behavior change. Queue file updated.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 re-confirms all 10 fresh, overlap check performed with real care given 4 simultaneous in-flight clusters (25 pts)
- TASK 1 correct for every confirmed-real gap (30 pts)
- TASK 2 all additions forced-tested, all suites clean, queue updated (35 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
