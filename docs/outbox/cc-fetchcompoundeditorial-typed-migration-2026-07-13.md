# CC Session Outbox — fetchCompoundEditorial (queue Bucket A #7, self-directed)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Continuing autonomously through
`docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s ranked Bucket A list. Follow-up
to entry #5 (`journalismCallsToday`), which already fixed this function's
dead-code backoff message — this entry closes the remaining gap the
queue's own original note flagged: "the budget-exhausted branch does NOT
set this side-channel, an inconsistency within the same function."

## Fix

Extended the `window._compoundLastError` diagnostic (already fixed for
the backoff case in entry #5) to the budget-exhausted case too. Before
this fix, budget exhaustion set no message at all — the Health Panel
(index.html ~L5120/5123, which displays `_compoundLastError` verbatim
whenever the rendered brief is static or missing) would show whatever
error string happened to be set last, which could be hours old and from
a completely unrelated failure (a 429, an HTTP error, a thrown
exception) — actively misleading about the real current cause.

Left the `_proofMode` skip untouched: its own adjacent comment already
explicitly documents this as deliberate ("prevents `_fieldErrors`
entries" — avoiding telemetry noise during proof-mode test runs), not an
overlooked gap. Per the same restraint applied throughout this session's
migrations, didn't invent differentiation where none was missing.

## Real verification (Node `vm`, functions extracted verbatim)

Set `window._compoundLastError` to a fake stale value ("a stale error
from 3 hours ago") before forcing a budget-exhausted call. Confirmed the
stale value is overwritten with the accurate, current-cause message:
`"journalism budget exhausted (50/50 calls used today)"` — including the
real call count, not a generic string.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## Commit

- `index.html`: budget-exhausted branch of `fetchCompoundEditorial`'s
  guard now sets an accurate `window._compoundLastError` message.
  `SW_VERSION` bumped `2026-07-12m` → `2026-07-12n`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: entry #7 marked ✅ MIGRATED.
- This manifest.
