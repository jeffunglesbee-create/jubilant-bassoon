# CC Session Outbox — Chunk 1/3: fieldOperation() primitive

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Executing
`docs/CC-CMD-2026-07-12-field-operation-primitive.md` (Chunk 1 of 3;
Chunk 2 is `typed-result-survey`, Chunk 3 is field-relay-nba's
`relay-operation-primitive`, out of scope here).

## Note on the doc's own commit history

The top commit on `main` at dispatch time, `eb132ca`, is titled as if
this chunk were already built. Checked before trusting it (this
session's now-repeated discipline — this is the third time tonight a
commit message described intended work that its own diff didn't
contain): `git show --stat eb132ca` touches only
`docs/CC-CMD-2026-07-12-field-operation-primitive.md` (98 insertions —
the CC-CMD doc itself). `fieldOperation` had zero references anywhere
in `index.html` before this session's edit. Genuinely unbuilt.

## TASK 0 — Probe

```
grep -n "function captureFieldError" -A 10 index.html
```
Confirmed byte-exact match to the CC-CMD's own excerpt: signature
`captureFieldError(fn, err, silent=true)`, entry shape `{fn, err, ts}`,
pushes to `window._fieldErrors`. `_fieldErrors`/`buildFieldHealthPanel`
usage also confirmed unchanged from the doc's description. No drift.

## TASK 1 — Added, verbatim, adjacent to captureFieldError()

`FIELD_OPERATIONS`, `fieldOperation()`, `classifyFieldError()` inserted
immediately after `captureFieldError()` (~line 4948), exactly as
specified in the CC-CMD. `fieldOperation()` calls
`FIELD_OPERATIONS.recordFailure()` on error, which calls
`captureFieldError()` internally — the Health Panel's existing data
source is extended, not duplicated. `classifyFieldError()` stays at
2 categories (`HTTP_ERROR`/`UNKNOWN_ERROR`) as specified — no invented
taxonomy ahead of TASK 2's real survey data.

## VERIFICATION

Real extraction test (Node `vm`), `captureFieldError`/`FIELD_OPERATIONS`/
`fieldOperation`/`classifyFieldError` pulled verbatim. 4 cases, all
passed:

1. **Success path**: `fieldOperation({subsystem:'test', operation:
   'succeeds'}, async () => 42)` → `{ok:true, value:42}`,
   `window._fieldErrors` untouched.
2. **Failure, no `.status`**: throws a plain `Error` → `{ok:false,
   code:'UNKNOWN_ERROR', subsystem:'mlb', operation:'fetchSchedule'}`,
   `captureFieldError` entry confirmed exactly
   `{fn:'mlb:fetchSchedule', err:'network unreachable', ts:...}`.
3. **Failure, `.status:503`**: → `code:'HTTP_ERROR'`, `severity`/
   `retryable` correctly passed through from the caller.
4. **`severity:'trace'`**: still recorded in `_fieldErrors` (via
   `severity !== 'trace'` controlling only `captureFieldError`'s own
   `silent` flag, not whether the entry is recorded at all) — matches
   the spec's intent that trace-level failures stay silent in the
   console but are never dropped from the data.

- `git diff index.html`: zero `-` lines outside the diff header —
  confirmed pure addition, no existing call site touched.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_smoke.js index.html`: **Failures: 0**, unaffected.
- `node field_unit.js`: 66 passed, 0 failed.
- `node --check` on the extracted inline `<script>` body: clean.

## DONE CONDITION

`fieldOperation()`, `FIELD_OPERATIONS`, and `classifyFieldError()`
exist, unit-verified against both success and failure paths (including
both error classifications), correctly extend `captureFieldError()`
without duplicating the Health Panel's data source. Zero existing call
sites modified. No improvement claim beyond "the tool now exists" —
per the CC-CMD's own framing, migration value comes from later,
separately-verified work (Chunk 2 survey, then per-site migration
CC-CMDs).

## Commit

- `index.html`: `FIELD_OPERATIONS`/`fieldOperation()`/
  `classifyFieldError()` added (~48 lines), adjacent to
  `captureFieldError()`. No other function touched. `SW_VERSION`
  bumped `2026-07-12b` → `2026-07-12c`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
