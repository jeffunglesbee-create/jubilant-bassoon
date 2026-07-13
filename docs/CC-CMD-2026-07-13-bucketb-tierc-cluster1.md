# Claude Code Command — Bucket B Tier C, Cluster 1: standings/cache discard-pattern siblings (7 functions)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 7 functions, all sharing the identical "sole/few callers discard the resolved value regardless of cause" shape. Real call-site counts 1-2 each — low frequency, low noise-risk. No other Bucket B site, and explicitly **not** any Bucket C (correctly-fine-as-is) entry — different bucket, never touch those.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and confirm the cap dependency below.

Write findings to outbox/cc-bucketb-tierc-cluster1-2026-07-13.md.

## TASK -1 — Confirm the cap dependency (same check as Tier A/B)

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

## CONTEXT — genuinely low-risk, low-investigation-burden by design

All 7 are already-confirmed Bucket B with 1-2 real callers each. Unlike Tier A/B, no stress test is required here — call-site counts this low cannot plausibly flood the cap even unthrottled. Standard single-fire forced-condition tests suffice.

| Function | Real callers | Gap |
|---|---|---|
| `fetchMLBStandingsParsed` (~L29900) | 1 | Only reachable via `fetchStandingsForPrompt`, whose own callers discard the resolved value |
| `fetchNHLStandingsParsed` (~L30115) | 1 | Same discard-the-value pattern as the MLB fetcher |
| `fetchMLSStandingsParsed` (~L30140) | 1 | Same discard-the-value pattern |
| `fetchNBAStandingsParsed` (~L30010) | 1 | Same pattern, after all three fallback sources fail |
| `fetchBDLSeasonAverages` (~L30047) | 1 | Sole consumer `fetchBDLMilestones` only checks `!players?.length` |
| `fetchBDLMilestones` (~L30078) | 1 | Sole caller uses `if(ms) note=...` in a fallback chain |
| `_readCachedRank` (~L24703) | 2 | Corrupt-cache catch falls to `return undefined`, both callers treat identically to "not cached yet" |

## TASK 0 — Probe

Re-confirm all 7 functions' current line numbers and exact current catch/null-return shape fresh before editing.

## TASK 1 — Add captureFieldError() to each, matching established convention

Same pattern as Tier A/B: `captureFieldError('<subsystem>:<operation>', err, true)`. Zero caller behavior change across all 7.

## TASK 2 — Verification

- Real forced-condition test for each of the 7: trigger the failure path, confirm exactly one `captureFieldError` entry appears.
- Confirm genuine success behavior unchanged for all 7.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 7 standings/cache discard-pattern functions have real telemetry, proven via real forced-condition tests. Zero caller behavior change. `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated for all 7 entries.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 re-confirms all 7 functions' current state fresh (15 pts)
- TASK 1 correct across all 7, matches convention, zero behavior change (45 pts)
- TASK 2 all 7 forced-tested, all suites clean, queue updated (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
