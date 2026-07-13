# Claude Code Command — Bucket B Tier C, Cluster 4: roster-advantage tier chain + game-notes/leaders cascade (10 functions)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 10 functions across two genuinely shared mechanisms (not an arbitrary batch): 4 functions that literally feed the same `fetchRosterAdvantage` tiered-fallback chain, and 6 functions that share the same P1-P4-style "check truthiness, fall to next tier" game-notes/injury/leaders cascade shape. Real call-site counts 1-2 each.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull. Read CLAUDE.md and confirm the cap dependency below.

Write findings to outbox/cc-bucketb-tierc-cluster4-2026-07-13.md.

## TASK -1 — Confirm the cap dependency

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

## CONTEXT — two lessons carried forward explicitly, not rediscovered

**Lesson 1 (exception surface):** ~10% of every batch so far turned out to have zero real exception surface on close reading. Expect a similar rate here; a correct exclusion is the healthy outcome of real investigation, not a shortfall. Check the *full* function body for `try`/`catch`, not a fixed line window — a mechanical line-window pre-screen earlier this session produced a real false positive.

**Lesson 2 (Bucket C inverse-misclassification, confirmed real via Cluster 3, not theoretical):** if any of these 10 has a sibling site already classified Bucket C, do not defer to that classification by default. Check whether it's structurally identical to `dramaScoreLive`'s already-shipped Tier A pattern — "the fallback behavior is correct" and "the failure deserves telemetry visibility" are different questions. Cluster 3 found two real C→B reclassifications this exact way.

### Group A — roster-advantage tier chain (4 functions, genuinely shared mechanism)

| Function | Real callers | Gap |
|---|---|---|
| `fetchRosterAdvantage` (~L36387) | 1 | Sole caller does `if(!rai) return;`, missing cacheKey indistinguishable from any other failure |
| `fetchNBAPBP` (~L36278) | 1 | Feeds a tiered fallback (`if(cdnActions)`) inside `fetchRosterAdvantage` |
| `parseNBACDNActions` (~L36308) | 1 | Feeds the same NBA CDN tier in `fetchRosterAdvantage` |
| `parseESPNPlays` (~L36356) | 1 | Sole caller (Tier 2 in `fetchRosterAdvantage`) only checks `pbpData` truthiness |

### Group B — game-notes/injury/leaders cascade (6 functions, shared P1-P4 shape)

| Function | Real callers | Gap |
|---|---|---|
| `getNHLPlayoffLeadersForGame` (~L30619) | 1 | Falls to NBA check regardless of cause |
| `getNBAPlayoffLeadersForGame` (~L30777) | 1 | Reason for null unused |
| `fetchNHLGameNotes` (~L30986) | 1 | Same P1-P4 cascade pattern; missing-id vs fetch-failure indistinguishable |
| `getESPNInjuriesForGame` (~L30456) | 1 | Every null cause collapses to "no injury tag" |
| `getESPNInjuriesForGame(nameToAbbr)` (~L30466) | 2 | `||` discards why the lookup failed |
| `fetchMLBGameNotes` (~L30960) | 1 | Falls through to `assembleNoteFromContext` on any falsy note |

## TASK 0 — Probe

Re-confirm all 10 functions' current line numbers and full-body catch/null-return shape fresh. For any with a Bucket C sibling citation, explicitly re-derive whether Lesson 2 applies before deferring.

## TASK 1 — Add captureFieldError() to each confirmed-real gap

Same convention as prior clusters. Zero caller behavior change.

## TASK 2 — Verification

- Real forced-condition test for each function that gets telemetry.
- Confirm genuine success behavior unchanged across all 10.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 10 individually investigated against both lessons. Real gaps get real telemetry; correct exclusions or reclassifications documented with reasoning, not defaulted either direction. Zero caller behavior change. Queue file updated for all 10.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 re-confirms all 10 fresh, full-body check not line-window (20 pts)
- TASK 1 correct for every confirmed-real gap (35 pts)
- TASK 2 all additions forced-tested, all suites clean, queue updated, Lesson 2 explicitly applied to any Bucket C sibling found (35 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
