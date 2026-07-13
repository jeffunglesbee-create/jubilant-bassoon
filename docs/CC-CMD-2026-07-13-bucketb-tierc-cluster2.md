# Claude Code Command — Bucket B Tier C, Cluster 2: fire-and-forget IIFE/prefetch siblings (10 functions)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 10 functions/sites, all sharing the "fire-and-forget, return value never read by any caller" shape. Real call-site counts 1-2 each. No other Bucket B site, and not any Bucket C entry.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and confirm the cap dependency below.

Write findings to outbox/cc-bucketb-tierc-cluster2-2026-07-13.md.

## TASK -1 — Confirm the cap dependency

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

## CONTEXT

All 10 are fire-and-forget calls where the caller never reads the return value or awaits with no check — the telemetry is purely additive visibility into background work that currently fails silently with zero trace.

| Function | Real callers | Gap |
|---|---|---|
| `fetchV2AllScores` (WC brief IIFE, ~L18456) | 1 | Fire-and-forget IIFE, return unused |
| `fetchV2AllScores` (NBA brief IIFE, ~L18502) | 1 | Same pattern |
| `fetchV2AllScores` (NHL brief IIFE, ~L18539) | 1 | Same pattern |
| `soccerFBrefInit` (~L8535) | 1 | Sole real caller is pure fire-and-forget |
| `espnInjuriesPrefetch` (~L30495) | 1 | Fire-and-forget from `setTimeout` |
| `nhlPlayoffLeadersPrefetch` (~L30639) | 1 | Fire-and-forget `setTimeout` entrypoint |
| `nbaPlayoffLeadersPrefetch` (~L30795) | 1 | Same pattern |
| `fetchFIELDBriefFromClaude` (inline IIFE variant, ~L31236) | 1 | Result `.filter(Boolean)`ed regardless of success |
| `visibilitychange listener (peak_missed)` (~L29041) | 1 | Event handler swallow with no consumer; comment cites a real prior silent-failure bug |
| `saveSnapshot` (~L42535) | 1 | Both invocation paths never inspect any result |

## TASK 0 — Probe

Re-confirm all 10 sites' current line numbers and exact current shape fresh before editing.

## TASK 1 — Add captureFieldError() to each

Same convention as prior tiers. Zero caller behavior change — these are already fire-and-forget by design; telemetry doesn't change that, only makes failures visible.

## TASK 2 — Verification

- Real forced-condition test for each of the 10.
- Confirm genuine success behavior unchanged for all 10.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 10 fire-and-forget sites have real telemetry, proven via real forced-condition tests. Zero caller behavior change. Queue file updated for all 10 entries.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 re-confirms all 10 sites' current state fresh (15 pts)
- TASK 1 correct across all 10, zero behavior change (45 pts)
- TASK 2 all 10 forced-tested, all suites clean, queue updated (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
