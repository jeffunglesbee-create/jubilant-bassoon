# Claude Code Command — Bucket B Tier B: telemetry for 13 moderate-frequency functions

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 13 functions, real call-site counts 3-9 (moderate frequency — real, but well below Tier A's 10-30+). No other Bucket B site.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and confirm the cap dependency below before TASK 0.

Write findings to outbox/cc-bucketb-tierb-2026-07-13.md.

## TASK -1 — Confirm the cap dependency is real (same check as Tier A, don't skip it)

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

Confirm the real cap/dedup override (commit `111bc7f`, applied via `Object.defineProperty` on `window._fieldErrors`'s own `.push`, not inside `captureFieldError()`'s body — check the array declaration site, not just the function) is genuinely live before proceeding.

## CONTEXT — all 13 are already-confirmed Bucket B; this is uniform application, not investigation

Per `docs/TYPED-RESULT-MIGRATION-QUEUE.md`, every entry below has already been classified — no caller needs differentiated behavior, this is telemetry only. Verification effort should scale to each function's real call-site count, not apply Tier A's heaviest requirement (a 50+-call flood stress test) uniformly — that would be over-engineering for functions an order of magnitude lower-frequency than `renderAll`/`findESPNScore`.

| Function | Real callers | Gap |
|---|---|---|
| `maybeScoreRetry` (~L27315) | 8 | Tier-3 low-score phrase logging catch; function already `return text` unconditionally right after |
| `computeBroadcastNarrativeIndex` (~L35883) | 7 | All 7 callers do a bare truthy/typeof check; "not national"/"genuinely exciting"/"no BNI type" folded into one null |
| `isRivalGame` (~L39059) | 7 | TDZ-guard catch collapses to same `false` as genuine no-rival |
| `openBottomSheet` (~L41553) | 7 | Postgame drama-string catch leaves `_bsPostgameDrama` empty silently |
| `_resolveRealGameId` (~L10646) | 5 | All 5 callers store result directly, never branch on it |
| `generateJournalismViaRelay` (~L17545) | 5 | Bad-prompt guard collapses into the same null all 5 callers treat identically |
| `fetchSchedule` (~L23093) | 4 | Trivial `performance.mark()` diagnostic wrapper |
| `fetchPrerenderedGameBrief` (~L31779) | 4 | All 4 callers check `if(kvBrief)` truthy, fall through regardless |
| `retryWithSportVocab` (~L26816) | 4 | localStorage review-log write catch; rewrite retry proceeds identically either way |
| `fetchUserState` (~L29063) | 3 | All 3 callers discard the resolved value entirely |
| `fetchStandingsForPrompt` (~L30161) | 3 | All 3 real callers use `Promise.allSettled`/`.catch(()=>{})`, fully discarding the value |
| `_connect` (~L29459) | 3 | None of the 3 invocation sites consume a return value |
| `fetchTeamRank` (~L24728) | 3 | **Different site than the one already fixed this session (commit `94a1043`).** That fix addressed transient-failure-cached-as-permanent; this is a separate `localStorage.setItem` persist-failure catch — `_fifaRankCache` already covers the session in-memory regardless. Confirm via TASK 0 this is genuinely still a distinct, unaddressed site before touching it. |

## TASK 0 — Probe

Re-confirm all 13 functions' current line numbers and exact current catch/null-return shape fresh. For `fetchTeamRank` specifically: read the full current function body first to confirm the persist-failure catch is still present and distinct from whatever the earlier fix already changed — do not assume the table above is still accurate without checking.

## TASK 1 — Add captureFieldError() to each, matching established convention

Same pattern as Tier A: `captureFieldError('<subsystem>:<operation>', err, true)` or `FIELD_OPERATIONS.recordFailure(...)`, whichever the immediately-surrounding code already uses. Zero caller behavior change across all 13.

## TASK 2 — Verification, scaled to real risk

- Real forced-condition test for each of the 13: trigger the failure path, confirm exactly one `captureFieldError` entry appears.
- For the 3 highest-frequency in this batch (`maybeScoreRetry` 8, `computeBroadcastNarrativeIndex`/`isRivalGame`/`openBottomSheet` 7 each — pick the single most plausible repeated-firing one among these four): a modest stress test, 20+ forced firings (proportionate to real caller count, not Tier A's 50+), confirming the existing rate-limit correctly collapses these too — this is real coverage of the moderate tier, not a repeat of Tier A's own proof.
- Confirm genuine success behavior unchanged for all 13.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 13 moderate-frequency Bucket B functions have real telemetry on their failure paths, proven via real forced-condition tests, with a proportionate stress test on the highest-frequency entry in this batch. Zero caller behavior change. `fetchTeamRank`'s site confirmed genuinely distinct from the earlier fix before being touched.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency before proceeding (10 pts)
- TASK 0 re-confirms all 13 functions' current state fresh, including the `fetchTeamRank` distinctness check (15 pts)
- TASK 1 correct across all 13, matches existing convention, zero behavior change (35 pts)
- TASK 2 all 13 forced-tested, proportionate stress test on the highest-frequency entry (30 pts)
- All three test suites clean (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
