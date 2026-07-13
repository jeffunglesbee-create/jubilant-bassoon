# Claude Code Command — Bucket B Tier C, Cluster 6: MLB siblings + live-socket infrastructure siblings (10 functions)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 10 functions across two genuine patterns. Real call-site counts 1-2 each.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull. Read CLAUDE.md and confirm the cap dependency below.

Write findings to outbox/cc-bucketb-tierc-cluster6-2026-07-13.md.

## TASK -1 — Confirm the cap dependency

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

## CONTEXT — three standing lessons, plus a specific, already-identified Lesson-2 case for this batch

**Lesson 1 (exception surface):** rate has varied 10%-56% so far, driven by real function shape. Check the full body.

**Lesson 2 (Bucket C cross-check) — three specific, already-found sibling citations to resolve, not just a general reminder this time:**
- `_mlbAvgPitchesPerAtBat` has a second queue entry in Bucket C (~L21019): "sample too thin guard; same documented design philosophy as sibling function." Determine whether this Bucket C classification is genuinely correct (a deliberate statistical-validity guard, distinct in kind from the Bucket B entry's `feeds avgPitchesPerAtBat, sole consumer only checks ==null` gap) or whether it's the same site being double-counted, or a real misclassification like Cluster 3's finds.
- `GameSocket` has a second entry in Bucket C (~L17867): "DUAL-MODE architecture comment states polling fallback covers any WS gap regardless of cause." This one *reads* like a genuinely correct Bucket C case (an explicit architectural comment stating the fallback is deliberate) — but confirm this directly against the real comment in source rather than accept the queue's own paraphrase.
- `ensureGameSocket` has a second entry in Bucket C (~L17983): "Comment explicitly states 'never throw from socket handler'... swallow is intentional." Same instruction — verify the real comment exists as described before treating this as confirmed-correct Bucket C.

**Lesson 3 (multi-catch functions):** read each function's full body, not just the cited line.

### Group A — MLB siblings (7 functions)

| Function | Real callers | Gap |
|---|---|---|
| `fetchMLBSchedule (proof-mode override)` (~L4912) | 1 | Result immediately `.filter(Boolean)`ed; real `fetchMLBSchedule` callers never see this test-fixture path |
| `fetchMLBSchedule` (~L20974) | 1 | Catch returns null; sole caller chain (`loadMLBSlate`→`fetchMLBFixtures`/`refreshMLBStatus`) collapses to "skip update" regardless |
| `_mlbAvgPitchesPerAtBat` (~L21024) | 1 | Feeds `avgPitchesPerAtBat`; sole consumer `_mlbWhosUpNext` only checks `==null` — **see Lesson 2 Bucket C cross-check above** |
| `loadMLBSlate` (~L21133) | 2 | Both `fetchMLBFixtures`/`refreshMLBStatus` treat null as one signal; no distinction between empty-slate vs fetch failure |
| `fetchMLBTeamMomentum` (~L8565) | 2 | Both callers use `.catch(()=>null)`; unknown-team-ID, HTTP failure, and thrown exception all treated identically |
| `fetchMLBPlatoon` (~L36632) | 1 | Sole caller does `if(!platoon) return;` regardless of which internal guard fired |
| `_eDataMatchesGame` (~L39398) | 1 | Invalid-input false is one of three false paths `saveEspnFinal` collapses into a single reject-and-log action |

### Group B — live-socket infrastructure siblings (3 functions, all with a Bucket C sibling to resolve — see Lesson 2)

| Function | Real callers | Gap |
|---|---|---|
| `GameSocket` (~L17939) | 1 | Outer catch returns false; sole external caller never inspects the return value — **Bucket C sibling at ~L17867, see above** |
| `ensureGameSocket` (~L17945) | 1 | null guard redundant with caller's pre-check — **Bucket C sibling at ~L17983, see above** |
| `hydrateEspnScoresFromFinals` (~L39765) | 2 | Both real callers invoke as a bare statement, zero return-value consumption |

## TASK 0 — Probe

Re-confirm all 10 functions' current line numbers and full-body shape fresh. Resolve all three flagged Bucket C sibling cases explicitly with real reasoning, not deferred or assumed either direction.

## TASK 1 — Add captureFieldError() to each confirmed-real gap

Same convention as prior clusters. Zero caller behavior change.

## TASK 2 — Verification

- Real forced-condition test for each function that gets telemetry.
- Confirm genuine success behavior unchanged across all 10.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 10 individually investigated. All three flagged Bucket C sibling cases resolved with real, source-verified reasoning (not the queue's own paraphrase alone). Real gaps get real telemetry. Zero caller behavior change. Queue file updated for all 10 (plus the 3 cross-referenced Bucket C entries if their status changes).

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 re-confirms all 10 fresh (15 pts)
- TASK 1 correct for every confirmed-real gap (30 pts)
- All three flagged Bucket C sibling cases resolved with real source verification, not the queue's paraphrase taken on faith (25 pts)
- TASK 2 all additions forced-tested, all suites clean, queue updated (20 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
