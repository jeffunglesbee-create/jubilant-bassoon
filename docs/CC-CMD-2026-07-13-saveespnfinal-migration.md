# Claude Code Command — Migrate saveEspnFinal to fieldOperation(): a mid-function exception currently reports as success

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** `saveEspnFinal` (~L39433-L39681) and its two real callers (~L23281, ~L41881). No other function.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and docs/TYPED-RESULT-MIGRATION-QUEUE.md's entry #1 (the full finding this CC-CMD executes against) before touching this file.

Write findings to outbox/cc-saveespnfinal-typed-migration-2026-07-13.md.

## CONTEXT — the top-ranked, confirmed-bug entry in the migration queue, not a theoretical candidate

`saveEspnFinal`'s outer `catch(e){}` (~L39681, matching the `try{` at ~L39434) swallows any mid-function exception into an implicit `undefined` return — identical to the genuine success path, which also falls off the end with no explicit `return true`. Both real callers branch on the return value (`L23281: if (saveEspnFinal(...) !== false) domFinalsAdded++;` and `L41881: if (saveEspnFinal(...) === false) return;`) — neither can currently tell "genuinely saved" from "an exception occurred mid-save." A broken save is silently counted as successful by both.

This is why it's ranked #1 in `docs/TYPED-RESULT-MIGRATION-QUEUE.md`, ahead of higher-caller-count entries: it's a confirmed live bug, not a theoretical differentiation opportunity.

## TASK 0 — Probe

```bash
grep -n "function saveEspnFinal" index.html
sed -n '39430,39440p;39675,39685p' index.html
grep -n "saveEspnFinal(" index.html
```

Confirm the exact current function boundaries and both real call sites before editing — line numbers are from earlier this session and may have shifted. Confirm there are still exactly 2 real callers (not more, not fewer) — if the count differs, update this CC-CMD's own scope statement in the outbox rather than silently expanding or narrowing what gets touched.

## TASK 1 — Migrate saveEspnFinal to fieldOperation()

Wrap the function body in `fieldOperation({subsystem:'scores', operation:'save-espn-final', retryable:true}, async () => {...})`, returning the real success value explicitly (`return true` on the success path, not an implicit fall-through) rather than relying on undefined-as-success. The function's own signature/call convention should stay as close to its current shape as the wrapping requires — do not restructure control flow beyond what `fieldOperation()` needs.

## TASK 2 — Update both real callers to branch on `.ok`, not on truthy/falsy inference

- `L23281`: `if (result.ok) domFinalsAdded++;` (or the real post-migration equivalent) — a failed save should not increment this counter.
- `L41881`: `if (!result.ok) return;` — same branch, now correctly triggered by a real exception, not just an explicit `false`.

Do not add a third, different failure-handling behavior beyond what these two callers already do today (increment/skip) — this migration's job is making the EXISTING branches correctly triggered, not inventing new behavior (e.g., do not add a retry loop here even though `retryable:true` is set — that's real, separate, future work if wanted, not silently added now).

## TASK 3 — Verification

- Real test: force a mid-function exception (e.g., temporarily feed `saveEspnFinal` a corrupted/malformed argument that would fail a `JSON.parse` or similar internal step it performs) and confirm both callers now correctly detect the failure (`domFinalsAdded` does NOT increment; the `L41881` caller correctly returns early) — where before this fix, both would have silently treated it as success. Restore/remove any temporary test scaffolding after.
- Real test: confirm a genuine successful save still behaves identically to before (both callers still take their success branch).
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

A mid-function exception in `saveEspnFinal` is now distinguishable from success by both real callers, proven via a real forced-failure test, not code review alone. Genuine success behavior unchanged, proven via a real success-path test. No new failure-handling behavior invented beyond making the existing branches correctly triggered.

**Confidence scoring:**
- TASK 0 probe confirms real current boundaries and exactly 2 callers before editing (15 pts)
- TASK 1 migration correct, explicit success return, no unrelated restructuring (25 pts)
- TASK 2 both callers correctly branch on `.ok`, no invented third behavior (20 pts)
- TASK 3 real forced-failure test AND real success-path test, both proven not assumed (30 pts)
- All three test suites clean (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
