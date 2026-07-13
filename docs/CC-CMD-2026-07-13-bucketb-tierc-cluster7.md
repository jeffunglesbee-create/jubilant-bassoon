# Claude Code Command — Bucket B Tier C, Cluster 7: drama/rivalry computation siblings + journalism-context-feeder siblings (9 functions)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 9 functions across two genuine patterns. Built excluding Clusters 5 and 6's functions, which had not yet landed at build time — re-verify no overlap via TASK 0. Real call-site counts 1-2 each.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull. Read CLAUDE.md and confirm the cap dependency below.

Write findings to outbox/cc-bucketb-tierc-cluster7-2026-07-13.md.

## TASK -1 — Confirm the cap dependency

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

## CONTEXT — standing lessons plus two new, specific Bucket C sibling cases found while building this batch

**Lesson 1 (exception surface):** rate has varied 10%-56% so far. Check the full body.

**Lesson 2 (Bucket C cross-check) — two specific citations found this time:**
- `computeDramaRetroactive` has a second entry in Bucket C (~L35697): "finally-block cleanup of a temp localStorage key; removeItem failure is harmless housekeeping." Reads like a genuinely correct, distinct-in-kind Bucket C case (cleanup housekeeping vs. the Bucket B entry's real `if(!arc) return;` caller-discards-cause gap) — verify the real comment/code before confirming either way.
- `buildCompoundPrompt` has a second entry in Bucket C (~L28051, "pick helper"): "Local `pick()` closure: `!pool.length` returns null, consumed via `.filter(Boolean)` two lines later — correct filter-skip semantic." This is a *different* site within the same function name (a local closure, not the IIFE wrapper the Bucket B entry describes at ~L28063) — confirm they're genuinely two distinct code locations, not a duplicate citation of one site.

**Lesson 3 (multi-catch functions):** read each function's full body.

**Overlap check (new for this cluster):** re-confirm via `git log --oneline` on `index.html` since this session's start that none of these 9 were touched by Cluster 5 or Cluster 6 landing in the meantime — this doc was built before either confirmed landing.

### Group A — drama/rivalry computation siblings (4 functions)

| Function | Real callers | Gap |
|---|---|---|
| `isObjectiveRival` (~L39083) | 1 | `catch(e){return false}` caller (BLOOD GAME chip) can't tell lookup-crash from genuine non-rival |
| `buildDramaLineTiers` (~L40740) | 1 | `getDramaTrend()` catch leaves `trend=''` fallback; sole caller only checks `.tight` truthiness |
| `computeDramaRetroactive` (~L35659) | 1 | Sole caller does `if(!arc) return;`, uniformly discarding cause — **see Lesson 2 Bucket C cross-check above** |
| `evaluateEMBER` (~L35995) | 1 | Sole caller does `if(emberResult)` regardless of tier-1-ineligible vs gate-failed |

### Group B — journalism-context-feeder siblings (5 functions)

| Function | Real callers | Gap |
|---|---|---|
| `renderJournalism (via openJournalismForGame)` (~L14196) | 1 | Silent re-render failure leaves stale content with no indication |
| `renderJournalismCompanion` (~L14615) | 2 | "Later Tonight" block build failure silently omits that block, zero telemetry |
| `buildPlayoffSpecials` (~L13472) | 1 | journalNote stat-edge enrichment failure silently dropped |
| `fdFetchH2H` (~L17068) | 1 | Sole caller silently omits H2H context on any failure type |
| `buildCompoundPrompt (populateSeriesContext wrapper)` (~L28063) | 1 | IIFE swallow around a mutation call — **see Lesson 2 Bucket C cross-check above (distinct site from the pick-helper entry)** |

## TASK 0 — Probe

Re-confirm all 9 functions' current line numbers and full-body shape fresh. Confirm the overlap check above. Resolve both flagged Bucket C sibling cases with real source verification.

## TASK 1 — Add captureFieldError() to each confirmed-real gap

Same convention as prior clusters. Zero caller behavior change.

## TASK 2 — Verification

- Real forced-condition test for each function that gets telemetry.
- Confirm genuine success behavior unchanged across all 9.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 9 individually investigated, zero overlap with Clusters 5/6 confirmed, both flagged Bucket C sibling cases resolved with real reasoning. Real gaps get real telemetry. Zero caller behavior change. Queue file updated.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 re-confirms all 9 fresh, overlap check performed (20 pts)
- TASK 1 correct for every confirmed-real gap (30 pts)
- Both flagged Bucket C sibling cases resolved with real source verification (20 pts)
- TASK 2 all additions forced-tested, all suites clean, queue updated (20 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
