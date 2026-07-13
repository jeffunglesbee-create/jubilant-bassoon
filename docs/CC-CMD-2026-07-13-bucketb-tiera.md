# Claude Code Command — Bucket B Tier A: telemetry for the 5 highest-frequency functions

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 5 functions — `renderAll`, `findESPNScore`, `dramaScoreLive`, `renderESPNScores`, `renderProseScore`. No other Bucket B site. **Hard dependency: `docs/CC-CMD-2026-07-13-capturefielderror-cap.md` must be merged and confirmed live first** — do not proceed if the cap/rate-limit isn't actually in `captureFieldError()` yet, these are exactly the functions that risk flooding it.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and confirm the cap dependency below before TASK 0.

Write findings to outbox/cc-bucketb-tiera-2026-07-13.md.

## TASK -1 — Confirm the dependency is real, not assumed

```bash
grep -n "function captureFieldError" -A20 index.html
```

If this does not show a real cap/rate-limit implementation (not just the CC-CMD doc existing — the actual code), stop and report that the dependency isn't met. Do not proceed with this CC-CMD's TASK 0 onward.

## CONTEXT — these 5, chosen specifically for being the highest-risk-if-unprotected, now the highest-value-once-protected

Per `docs/TYPED-RESULT-MIGRATION-QUEUE.md`, all 5 are already-confirmed Bucket B (no caller needs different behavior) with real call-site counts of 30+, 25, 14, ~15, and ~15 respectively — meaning any failure in these paths is currently invisible across a huge share of the app's actual runtime activity, not a rare edge case.

- `renderAll` (~L11503): bare catch around signature-stamp write; sibling render helpers already use `captureFieldError`, this is a gap not a design choice.
- `findESPNScore` (~L20770): generic "no match found" path, callers already correctly render nothing — migration adds telemetry only.
- `dramaScoreLive` (~L24878): weather-lookup try/catch; `sitBonus` simply isn't incremented on failure today.
- `renderESPNScores` (~L22570): fire-and-forget `loadWCMatchWP()` kick, only catches sync throws.
- `renderProseScore` (~L27691): localStorage rolling-average persist catch, no return value either way.

## TASK 0 — Probe

Re-confirm all 5 functions' current line numbers and exact current catch/null-return shape fresh — time has passed since the queue was built, other work has touched adjacent code.

## TASK 1 — Add captureFieldError() to each, matching the file's established pattern

For each of the 5: add a `captureFieldError('<subsystem>:<operation>', err, true)` call (or `FIELD_OPERATIONS.recordFailure(...)` if that reads more naturally for the specific site — match whichever convention the immediately-surrounding code already uses, don't introduce a third pattern). Zero caller behavior change — this is telemetry only, exactly as the queue classified it.

## TASK 2 — Verification, with explicit attention to the exact risk this CC-CMD exists to avoid

- Real forced-condition test for each of the 5: trigger the failure path, confirm exactly one `captureFieldError` entry (or the rate-limited collapsed form) appears, not a flood.
- **Specifically stress-test at least one of the 5 (whichever has the most plausible repeated-firing scenario — likely `dramaScoreLive` or `findESPNScore`, given per-game/per-poll shape) by forcing its failure path to fire 50+ times in a tight loop, and confirm the Chunk 1 rate-limit correctly collapses this into a bounded number of entries, not 50 separate ones.** This is the real proof the dependency is doing its job, not just merged.
- Confirm genuine success behavior unchanged for all 5.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 5 highest-frequency Bucket B functions have real telemetry on their failure paths, proven via real forced-condition tests, with at least one explicitly stress-tested to confirm the Chunk 1 rate-limit actually prevents flooding under repeated firing — not just assumed to work because it merged. Zero caller behavior change anywhere.

**Confidence scoring:**
- TASK -1 confirms the real dependency before proceeding, doesn't assume (10 pts)
- TASK 0 re-confirms all 5 functions' current state fresh (10 pts)
- TASK 1 correct, matches existing convention, zero behavior change (30 pts)
- TASK 2 all 5 forced-tested, AND the explicit flood stress-test proves the rate-limit works under real repeated firing, not just merged (40 pts)
- All three test suites clean (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
