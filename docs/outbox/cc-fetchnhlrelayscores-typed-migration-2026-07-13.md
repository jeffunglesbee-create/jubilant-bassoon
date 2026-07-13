# CC Session Outbox — fetchNHLRelayScores migration to fieldOperation()

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Executes
`docs/CC-CMD-2026-07-13-fetchnhlrelayscores-migration.md`.

## TASK 0 — Probe

`fetchNHLRelayScores` found at L20227 pre-edit (drifted from the CC-CMD's
estimated ~L20262 due to intervening commits this session — re-confirmed
fresh, not assumed). Exactly 1 real call site
(`fetchNHLRelayScores().catch(e=>captureFieldError('relay-nhl',e,true));`,
~L20589 pre-edit), matching the CC-CMD's stated scope. Read the full
function body: the outer `try{...}catch(e){}` wraps the entire fetch +
parse + processing block.

## TASK 1 — Migration

Wrapped the function body (everything after the early
`if (!document.querySelector(...)) return;` guard, which stays outside
the wrap since it's a deliberate "not applicable today" skip, not part of
the operation) in
`fieldOperation({subsystem:'scores', operation:'fetch-nhl-relay', retryable:true}, async () => {...})`.
Removed the internal `try{...}catch(e){}` entirely — `fieldOperation()`'s
own try/catch is now the sole catcher. The `if (!r.ok) return;` line was
left as a bare, non-throwing return (matches its pre-migration behavior
of silently no-op'ing on HTTP failure; adding HTTP-status differentiation
was explicitly out of this CC-CMD's scope).

## TASK 2 — Caller decision: REMOVED the redundant catch, not kept

`fieldOperation()` never rejects — its own try/catch always resolves to
`{ok:false,code,...}` on failure rather than re-throwing (this matches
the function's prior EXTERNAL behavior of never throwing to its caller;
only the INTERNAL telemetry-recording was broken, not the "never throw"
contract). This means the sole caller's
`.catch(e=>captureFieldError('relay-nhl',e,true))` can **structurally
never fire** after migration — it is dead code, not a second independent
safety net. Removed it, replacing the call with a bare
`fetchNHLRelayScores();`. `FIELD_OPERATIONS.recordFailure()` (called
internally by `fieldOperation()` on every real exception) already invokes
`captureFieldError()` — the telemetry this line never actually produced
before is now genuinely produced, just via `fieldOperation()`'s own catch
instead of the caller's.

Left the 3 sibling fire-and-forget relay calls on adjacent lines
(`fetchNBARelayScores`, `fetchFPLLiveScores`, `fdPrefetchSoccerLive`)
untouched — they may have the identical bug, but migrating them is out of
this CC-CMD's explicit scope ("fetchNHLRelayScores and its sole caller.
No other function"). Worth a note for whoever picks the next Bucket-A-
style item: this same shape may repeat 3 more times.

## TASK 3 — Verification

**Real forced-failure test** (Node `vm`, `fetchNHLRelayScores`/
`fieldOperation`/`FIELD_OPERATIONS`/`classifyFieldError`/
`captureFieldError` extracted verbatim from `index.html`):

- **TEST A — forced network failure** (mock `fetch` rejects with a real
  `Error`): result `{ok:false, code:'UNKNOWN_ERROR', subsystem:'scores',
  operation:'fetch-nhl-relay', ...}`. `window._fieldErrors` — **exactly 1
  entry**, `{fn:'scores:fetch-nhl-relay', err:'simulated network
  failure', ts:...}`. Before this fix, this exact scenario produced
  **zero** `_fieldErrors` entries (the confirmed bug — the internal catch
  swallowed the exception before the caller's own `.catch()` could ever
  see it).
- **TEST B — forced malformed-JSON failure** (mock `fetch` resolves
  `ok:true` but `r.json()` throws): result `{ok:false,...}`, exactly 1
  `_fieldErrors` entry. Confirms the fix covers parse failures, not just
  network failures.
- **TEST C — genuine success** (mock `fetch` resolves normally, empty
  games array): result `{ok:true}`, **zero** `_fieldErrors` entries — no
  false-positive telemetry noise introduced by the migration.

All 3 assertions passed — exactly one recording per real failure, zero
for success, not zero (the old bug) and not two (which would indicate the
caller-side catch decision in TASK 2 was wrong).

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## DONE CONDITION

A real failure in `fetchNHLRelayScores` now genuinely reaches telemetry,
proven via real forced-failure tests showing real `_fieldErrors` entries
(TEST A, TEST B) — not just confirmed the code compiles. TASK 2's
decision (remove, not keep, the caller's now-redundant catch) is stated
with reasoning: keeping it would have been dead code implying a safety
net that structurally cannot exist once `fieldOperation()` guarantees its
own promise never rejects.

## Commit

- `index.html`: `fetchNHLRelayScores` migrated to `fieldOperation()`,
  internal catch removed; sole caller's redundant `.catch()` removed with
  reasoning documented inline. `SW_VERSION` bumped `2026-07-12g` →
  `2026-07-12h`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
