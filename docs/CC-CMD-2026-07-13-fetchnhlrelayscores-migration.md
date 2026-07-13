# Claude Code Command — Migrate fetchNHLRelayScores to fieldOperation(): its own internal catch prevents the caller's telemetry from ever firing

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** `fetchNHLRelayScores` (~L20262) and its sole caller. No other function.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and docs/TYPED-RESULT-MIGRATION-QUEUE.md's entry #2 before touching this file.

Write findings to outbox/cc-fetchnhlrelayscores-typed-migration-2026-07-13.md.

## CONTEXT — the second-ranked, confirmed-bug entry

The sole caller of `fetchNHLRelayScores` chains `.catch(e=>captureFieldError(...))`, expecting to record telemetry on failure. But `fetchNHLRelayScores`'s own internal `catch` swallows the error FIRST, before it can ever reach the caller's chain — the telemetry call never fires. The Health Panel is structurally blind to every real failure of this function; it has been recording zero NHL-relay failures regardless of how many actually occurred.

## TASK 0 — Probe

```bash
grep -n "function fetchNHLRelayScores" index.html
sed -n '20255,20300p' index.html
grep -n "fetchNHLRelayScores(" index.html
```

Confirm the exact current function body and its one real caller before editing — line numbers are from earlier this session.

## TASK 1 — Migrate fetchNHLRelayScores to fieldOperation()

Wrap the function body in `fieldOperation({subsystem:'scores', operation:'fetch-nhl-relay', retryable:true}, async () => {...})`. Remove the internal catch that currently swallows the error before it can propagate — `fieldOperation()`'s own try/catch is now the single point that records the failure (via `FIELD_OPERATIONS.recordFailure`, which itself calls `captureFieldError()`), not a second, competing catch inside the function body.

## TASK 2 — Update the caller

The caller's own `.catch(e=>captureFieldError(...))` chain becomes redundant once `fieldOperation()` already records the failure internally — decide explicitly whether to remove the now-duplicate caller-side catch (cleaner, avoids double-recording the same failure) or keep it as a second, independent safety net, and state the reasoning. Do not leave it ambiguous or silently do one without saying why.

## TASK 3 — Verification

- Real test: force `fetchNHLRelayScores` to fail (e.g., a temporarily invalid relay URL or malformed response) and confirm exactly one `captureFieldError`/`window._fieldErrors` entry is recorded for it — not zero (today's bug), and not two (if TASK 2 chose to keep both catches, confirm that's genuinely two independent recordings, not one masking the other's absence).
- Confirm a genuine successful fetch still behaves identically to before.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

A real failure in `fetchNHLRelayScores` now genuinely reaches telemetry, proven via a real forced-failure test showing a real `_fieldErrors` entry — not just confirmed the code compiles. TASK 2's decision (remove vs. keep the caller's redundant catch) is stated with reasoning, not defaulted silently.

**Confidence scoring:**
- TASK 0 probe confirms real current function/caller before editing (15 pts)
- TASK 1 migration correct, internal catch genuinely removed (not just renamed) (25 pts)
- TASK 2 caller-side redundant-catch decision made explicitly with stated reasoning (20 pts)
- TASK 3 real forced-failure test proves telemetry now fires, not assumed (30 pts)
- All three test suites clean (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
