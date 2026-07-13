# Claude Code Command — Bucket B Tier C, Cluster 5: World Cup siblings + schedule-callback siblings + cache-parse-fallback siblings (11 functions)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 11 functions across three genuinely shared patterns. Real call-site counts 1-2 each.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull. Read CLAUDE.md and confirm the cap dependency below.

Write findings to outbox/cc-bucketb-tierc-cluster5-2026-07-13.md.

## TASK -1 — Confirm the cap dependency

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

## CONTEXT — three lessons carried forward, all confirmed real in prior clusters, none rediscovered from scratch

**Lesson 1 (exception surface):** rate has varied 10%-56% across clusters so far, driven by each batch's real function shape (pure lookups skew high, fetch-heavy skews low) — not a fixed target either direction. Check the full body, not a line window.

**Lesson 2 (Bucket C cross-check, confirmed real via Cluster 3):** cross-check all 11 against the full `## Bucket C` section before writing code. A structurally-identical-to-`dramaScoreLive` sibling deserves reclassification, not automatic deference.

**Lesson 3 (multi-catch functions, confirmed real via Cluster 3 and Cluster 4):** a queue entry's one-line description may describe only one of several real catches in a function (`fetchFinalsDesk`, `fetchWCTabBrief`, `fetchRosterAdvantage` all had this). Read each function's full body, not just the cited line.

### Group A — World Cup siblings (5 functions)

| Function | Real callers | Gap |
|---|---|---|
| `fetchWCStandings` (~L32663) | 2 | Both callers store the result without distinguishing HTTP-fail from other causes |
| `buildWCMediaCards` (~L13304) | 1 | journalNote enrichment failure silently kept prior default |
| `_wcAdvancementProb` (~L34316) | 2 | Both callers just check truthiness to decide whether to render the bar |
| `renderWCBracketTree` (~L34579) | 2 | Fetch failure silently produces empty slots; both callers `.catch(()=>{})` |
| `buildWCBars` (~L38869) | 1 | Sole caller only checks truthy string; cache fallback already covers cache-miss |

### Group B — schedule-callback siblings (3 functions, explicitly cited as the same pattern in the queue)

| Function | Real callers | Gap |
|---|---|---|
| `fetchSchedule (golf load callback)` (~L23350) | 1 | Wraps `computeGolfDerivedMetrics()`; proceeds identically whether or not derived metrics computed |
| `fetchSchedule (CFL load callback)` (~L23417) | 1 | "Same `scheduleRenderAll()` defensive wrapper pattern as the golf one" — queue's own words |
| `fetchSchedule (BDL prefetch callback)` (~L23437) | 1 | Guards a `.some()` check + fetch kickoff; on error the prefetch simply never fires |

### Group C — cache/storage parse-fallback siblings (3 functions)

| Function | Real callers | Gap |
|---|---|---|
| `bdlLoad` (~L14819) | 1 | Catches JSON.parse/storage errors, falls through to same `return null` as cache-miss |
| `loadBroadcastArchaeology` (~L24352) | 1 | sessionStorage cache-read catch falls through to a fresh 14-day archive fetch |
| `fplLoadBootstrap` (~L21651) | 1 | sessionStorage parse failure falls through to live fetch attempt |

## TASK 0 — Probe

Re-confirm all 11 functions' current line numbers and full-body catch/null-return shape fresh, per all three lessons above.

## TASK 1 — Add captureFieldError() to each confirmed-real gap

Same convention as prior clusters. Zero caller behavior change.

## TASK 2 — Verification

- Real forced-condition test for each function that gets telemetry.
- Confirm genuine success behavior unchanged across all 11.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 11 individually investigated against all three lessons. Real gaps get real telemetry; correct exclusions or reclassifications documented with reasoning, not defaulted either direction. Zero caller behavior change. Queue file updated for all 11.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 re-confirms all 11 fresh, full-body check, all three lessons applied (20 pts)
- TASK 1 correct for every confirmed-real gap (35 pts)
- TASK 2 all additions forced-tested, all suites clean, queue updated (35 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
