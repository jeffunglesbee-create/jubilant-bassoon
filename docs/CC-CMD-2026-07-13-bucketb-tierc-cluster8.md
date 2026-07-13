# Claude Code Command — Bucket B Tier C, Cluster 8: UI/schedule decorative-catch siblings + storage-persist siblings (11 functions)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 11 functions across two patterns. Built excluding Clusters 5, 6, and 7's 30 functions, none of which had landed at build time — re-verify no overlap via TASK 0. Real call-site counts 1-2 each.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull. Read CLAUDE.md and confirm the cap dependency below.

Write findings to outbox/cc-bucketb-tierc-cluster8-2026-07-13.md.

## TASK -1 — Confirm the cap dependency

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

## CONTEXT — standing lessons, plus a real caller/callee pair worth noting

**Lesson 1 (exception surface):** rate has varied 10%-56% so far. Check the full body.
**Lesson 2 (Bucket C cross-check):** cross-check all 11 against the full `## Bucket C` section before writing code.
**Lesson 3 (multi-catch functions):** read each function's full body.
**Overlap check:** re-confirm via `git log --oneline` on `index.html` since session start that none of these 11 were touched by Clusters 5, 6, or 7 landing in the meantime — this doc was built before any of the three confirmed landing.

**A genuine caller/callee pair in Group A, not a coincidence:** `findConflicts` is `renderConflictChip`'s own direct input (`renderConflictChip(findConflicts(...))`) — investigate both together, since a fix to one's return shape could affect what the other needs to handle.

### Group A — UI/schedule decorative-catch siblings (6 functions)

| Function | Real callers | Gap |
|---|---|---|
| `findConflicts` (~L11091) | 1 | Sole caller `renderConflictChip(findConflicts(...))` never sees the swallow; a bad date silently drops one game from bucketing |
| `renderConflictChip` (~L11176) | 2 | Inline `t=''` fallback in template; no caller ever inspects why time formatting failed |
| `buildTodaySchedule` (~L12024) | 1 | Immediately followed by `.filter(Boolean)`; postponed-game null indistinguishable from other reasons |
| `renderArchiveTimeline` (~L14255) | 1 | `decodeURIComponent` guarded only on the "expand" branch, sibling collapse branch unguarded |
| `renderNewspaper` (~L23043) | 1 | Wraps `applyFieldPickBadge()` defensively; badge simply doesn't apply on error |
| `buildStreamingDiscovery` (~L24191) | 1 | Sole caller uses `buildStreamingDiscovery() || STREAMING_APPS` — textbook bare-default decorative pattern |

### Group B — storage-persist siblings (5 functions)

| Function | Real callers | Gap |
|---|---|---|
| `_bundleFinalizedAt` (~L6973) | 1 | Single caller does bare `bundleTs || _finalizedAt[...]`; all 6 distinct null causes collapse to the same fallback |
| `restoreSnapshot` (~L42541) | 1 | Sole caller uses `.finally()` only; the false return is never read |
| `saveMyTeams` (~L23834) | 1 | `localStorage.setItem` failure silently swallowed; sole caller is fire-and-forget |
| `_initBannedExtension` (~L26295) | 1 | JSON.parse catch on cached banned-phrase extension; sole caller reads whatever resulted, no differentiation |
| `idbSet` (~L42518) | 1 | Return value completely unconsumed at the sole call site; catch is pure decoration |

## TASK 0 — Probe

Re-confirm all 11 functions' current line numbers and full-body shape fresh. Confirm the overlap check above. Investigate `findConflicts`/`renderConflictChip` together given the direct caller/callee relationship.

## TASK 1 — Add captureFieldError() to each confirmed-real gap

Same convention as prior clusters. Zero caller behavior change.

## TASK 2 — Verification

- Real forced-condition test for each function that gets telemetry.
- Confirm genuine success behavior unchanged across all 11.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 11 individually investigated, zero overlap with Clusters 5/6/7 confirmed. Real gaps get real telemetry. Zero caller behavior change. Queue file updated.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 re-confirms all 11 fresh, overlap check performed (20 pts)
- TASK 1 correct for every confirmed-real gap, findConflicts/renderConflictChip investigated together (35 pts)
- TASK 2 all additions forced-tested, all suites clean, queue updated (35 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
