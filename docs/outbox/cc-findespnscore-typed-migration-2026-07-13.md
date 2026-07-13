# CC Session Outbox — findESPNScore migration (queue Bucket A #3, self-directed)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Continuing autonomously through
`docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s ranked Bucket A list.

## Novel thinking: the queue's own framing didn't fit this function

`findESPNScore` is the highest-leverage entry by call-site count (25+
real callers), but it's fundamentally different from every other entry
migrated so far: it's a **synchronous, pure in-memory lookup** — no
`fetch`, no `await`, nothing that throws. `fieldOperation()` is built
around wrapping an async operation's try/catch; there is no exception
here to catch, so a literal "migrate to fieldOperation()" instruction
doesn't actually apply.

Re-read every real caller (not sampled) before deciding what to do: all
25+ call sites do a bare truthy check (`if (!eData)` / `eData ?
... : ...`) on the result. The real question this migration needs to
answer isn't "how do we wrap this" — it's **"would any caller actually
behave differently if it could distinguish 'stale-final blocked' from
'genuinely no data yet'?"** Tracing through what each caller does with a
`null` (skip rendering live data for this card, fall back to scheduled/
pregame state) confirms: **no.** The correct action for both cases is
identical — a stale-final-blocked score is, by definition, wrong data
that must not be shown, functionally equivalent to having no data at
all.

Changing the return contract for 25+ call sites to expose a distinction
nothing would act on is exactly the high-risk, low-value migration
Rule 69 (TOUCH-ONLY-A) and Rule 88 (CORRECT-FAST-A, "the right way, not
the quick way") warn against — 25+ sites is a lot of surface area to
introduce a regression in, for zero real behavior change.

**The actual gap is observability, not caller behavior.** The stale-final
guard (the June 10 2026 fix) firing was previously invisible outside a
live `FIELD_DEBUG` console session — and one of its 3 call sites (the
legacy fallback path, both team-order orientations) had **no logging at
all**, not even that. A high firing rate would be real, currently-
discarded evidence that the underlying root cause (api-sports.io
mistagging late games under the wrong calendar date) is still occurring
upstream. That's the actual value being left on the table.

## Fix: purely additive telemetry, zero return-contract change

Added `_recordStaleFinalBlock(path)`, called at all 3 sites where
`_staleFinalGuard` returns true (the PM-20 tagged path, and both
orientations of the legacy fallback loop). It calls
`FIELD_OPERATIONS.recordFailure()` directly (not through the async
`fieldOperation()` wrapper, which doesn't fit a synchronous function)
with `severity:'trace'` — this is the guard working exactly as designed
(correctly blocking bad data), not a genuine failure, so it's recorded
without the console-noise implications a higher severity would carry.
The pre-existing `FIELD_DEBUG`-gated `console.warn` is preserved
unchanged for the tagged path; the legacy path gains console visibility
it never had, gated the same way.

**Nothing about `findESPNScore`'s return value changed in any case.**
No caller was touched. This is the entire migration.

## Real verification (Node `vm`, function extracted verbatim)

| Test | Scenario | Return (unchanged?) | `_fieldErrors` |
|---|---|---|---|
| A | Tagged path, stale-final blocked | `null` ✓ | **1** (was 0 outside FIELD_DEBUG) |
| B | Tagged path, genuinely no data (`findScore` returns `null`) | `null` ✓ | 0 — no false positive |
| C | Tagged path, genuine live score (not stale) | real score object ✓ | 0 — no false positive |
| D | Legacy path, stale-final blocked (forward orientation) | `null` ✓ | **1** (was 0, unconditionally, even in FIELD_DEBUG — this path never logged at all before) |

All 4 assertions passed — return values confirmed byte-identical to the
pre-migration function in every scenario (backward-compatible with all
25+ existing callers by construction, not just by inspection), and
telemetry now genuinely fires exactly when, and only when, the guard
blocks a stale score.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## Commit

- `index.html`: `findESPNScore` gains additive telemetry at all 3
  stale-final-block sites; return contract and all 25+ callers untouched.
  `SW_VERSION` bumped `2026-07-12j` → `2026-07-12k`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
