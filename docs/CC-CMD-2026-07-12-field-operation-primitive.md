# Claude Code Command — Build fieldOperation() as an extension of the existing captureFieldError(), not a parallel system

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** ADD new code only. Touch zero existing call sites in this CC-CMD — this is Chunk 1 of a multi-CC-CMD sequence (see CC-CMD-2026-07-12-typed-result-survey.md for Chunk 2, which produces the real prioritized migration list). Migrating individual call sites is explicitly out of scope here.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and STANDARDS.md Rule 69 (TOUCH-ONLY-A) before touching this file.

Write findings to outbox/cc-field-operation-primitive-2026-07-12.md.

## CONTEXT — this is an extension of real, existing code, not greenfield

Confirmed via direct source read: `captureFieldError(fn, err, silent=true)` (~line 4948) already exists and is already called ~40 times across the codebase — a lightweight helper that pushes `{fn, err, ts}` into `window._fieldErrors`, feeding the FIELD Health Panel debug UI (`buildFieldHealthPanel()`, accessible via long-press-settings or `?debug=1`). This is a real, in-use mechanism. Do not build a second, disconnected telemetry system alongside it — `fieldOperation()` must call `captureFieldError()` internally on failure, so the Health Panel keeps working and gains richer data, not a competing data source.

Also confirmed via direct grep: 406 `return null;`, 75 `return false;`, 344 silent-swallow `catch` blocks exist across `index.html`. This CC-CMD does not touch any of them — it only builds the primitive they would eventually migrate to, one at a time, in later CC-CMDs.

**The real risk in this whole effort, stated so later CC-CMDs don't lose it:** wrapping a call site in `fieldOperation()` is not itself a fix. It only becomes one if the *caller* is updated to branch differently on `.ok`/`.code`/`.retryable` — otherwise it's the same swallow-and-default behavior with nicer plumbing underneath. This CC-CMD builds the plumbing only; it makes no claim of fixing any of the 825 sites.

## TASK 0 — Probe

```bash
grep -n "function captureFieldError" -A 10 index.html
grep -n "_fieldErrors\|buildFieldHealthPanel" index.html | head -10
```

Confirm the exact current signature and Health Panel dependency before designing `fieldOperation()` around it — do not assume this doc's excerpt above is still byte-exact.

## TASK 1 — Add the typed-result shape and `fieldOperation()`

Add near `captureFieldError()`, not in a new, disconnected location:

```javascript
// FIELD_OPERATIONS: structured success/failure telemetry, extends captureFieldError()
// rather than replacing it — the Health Panel's window._fieldErrors keeps working.
const FIELD_OPERATIONS = {
  recordSuccess({ subsystem, operation, duration, context }) {
    // additive counters/timing only — no behavior change to any caller.
  },
  recordFailure(failure) {
    captureFieldError(`${failure.subsystem}:${failure.operation}`, failure.error, failure.severity !== 'trace');
    // additive: also retain the richer failure object for future consumers
    // (window._fieldFailures or similar) — do not remove or alter what
    // captureFieldError() itself does.
  },
};

async function fieldOperation({
  subsystem,
  operation,
  severity = 'degraded',
  retryable = false,
  context = {},
}, fn) {
  const startedAt = performance.now();
  try {
    const value = await fn();
    FIELD_OPERATIONS.recordSuccess({ subsystem, operation, duration: performance.now() - startedAt, context });
    return { ok: true, value };
  } catch (error) {
    const failure = { subsystem, operation, severity, retryable, context, error, at: Date.now() };
    FIELD_OPERATIONS.recordFailure(failure);
    return { ok: false, code: classifyFieldError(error), ...failure };
  }
}

function classifyFieldError(error) {
  // Start minimal and honest — do not invent categories with no real
  // evidence behind them yet. HTTP status, if present on the error object
  // from this codebase's existing fetch wrappers, is the one classification
  // that's already reliably derivable today.
  if (error && typeof error.status === 'number') return 'HTTP_ERROR';
  return 'UNKNOWN_ERROR';
}
```

`classifyFieldError()` intentionally starts with only 2 categories, not the fuller taxonomy a survey might eventually justify (outage/malformed-schema/stale-data/etc. from the ChatGPT proposal) — do not invent categories not yet backed by real observed cases. Widening it is real, separate future work once TASK 2 (survey) shows what categories actually occur.

## TASK 2 — Verification

- Unit-level: call `fieldOperation()` directly with a function that succeeds and one that throws (including one that throws an error with a `.status` property, and one that doesn't), confirm both the success and failure return shapes match, confirm `captureFieldError()`/`window._fieldErrors` still receives an entry on failure exactly as before.
- Confirm zero existing call sites changed: `git diff` should show only additions, not modifications to any pre-existing function.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

`fieldOperation()`, `FIELD_OPERATIONS`, and `classifyFieldError()` exist, are unit-verified, and correctly extend (not replace or duplicate) `captureFieldError()`. Zero existing call sites modified. This CC-CMD makes no improvement claim beyond "the tool now exists" — migration value comes from later, separately-verified CC-CMDs.

**Confidence scoring:**
- TASK 0 probe confirms real current `captureFieldError()` signature before building around it (15 pts)
- `fieldOperation()` correctly calls into `captureFieldError()`, doesn't duplicate the Health Panel's data source (30 pts)
- `classifyFieldError()` stays minimal, doesn't invent unverified categories (15 pts)
- Zero existing call sites touched, confirmed via diff (25 pts)
- All three test suites clean, unit-level proof of both success/failure paths (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
