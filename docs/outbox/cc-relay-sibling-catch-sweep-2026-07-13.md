# CC Session Outbox — relay sibling catch-swallow sweep (self-directed follow-up)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Self-directed follow-up, not a
dispatched CC-CMD — flagged explicitly during the
`fetchNHLRelayScores` migration ("worth a note for whoever picks the
next item: this same shape may repeat 3 more times") and now checked and
fixed directly per an explicit instruction to automate follow-ups.

## What was checked

The 3 sibling fire-and-forget relay calls in the same batch as
`fetchNHLRelayScores` (index.html, the `renderESPNScores` poll cycle,
~L20585-20591 originally): `fetchNBARelayScores`, `fetchFPLLiveScores`,
`fdPrefetchSoccerLive`. Each read in full before touching anything.

## Confirmed: all 3 had the identical bug, not assumed from the pattern name

- **`fetchNBARelayScores`**: `catch(e){ if (FIELD_DEBUG) console.warn(...); }`
  — never called `captureFieldError`. Sole caller:
  `fetchNBARelayScores().catch(e=>captureFieldError('relay-nba',e,true));`
  — could never fire (promise never rejected).
- **`fetchFPLLiveScores`**: bare `catch(e){}`. Two call sites: one with
  the same dead-catch pattern
  (`fetchFPLLiveScores().catch(e=>captureFieldError('relay-fpl',e,true));`),
  one already a bare fire-and-forget call with no catch attempt at all
  (unaffected either way, left untouched).
- **`fdPrefetchSoccerLive`**: `catch(e){ if(FIELD_DEBUG) console.debug(...); return; }`
  — never called `captureFieldError`. Sole caller:
  `fdPrefetchSoccerLive().catch(e=>captureFieldError('relay-fd',e,true));`
  — same dead-catch pattern.

## Fix (identical pattern to fetchNHLRelayScores, no fallback logic added)

All 3 migrated to `fieldOperation()`; internal catches removed;
`fieldOperation()`'s own catch is now the sole (and genuinely
telemetered) catcher. Each function's pre-existing deliberate "not
applicable right now" early guards (`!RELAY_HEALTHY`, the FPL 28s rate
short-circuit + bootstrap dependency check, `!allData.sports`/no soccer
sections today) stay outside the wrap, unchanged — these are correct
skips, not failures, same reasoning as `fetchNHLRelayScores`'s
no-NHL-section guard.

`fdPrefetchSoccerLive`'s `applyFDLiveToCards()` call moved inside the
wrapped callback as the last statement — the original catch's `return;`
skipped it on failure, so it only ran on success; moving it inside
preserves that exact behavior (it's now simply the last line of a
callback that only completes when nothing throws).

Each dead-catch caller-side `.catch(e=>captureFieldError(...))` removed,
with the same reasoning documented inline as the NHL fix: `fieldOperation()`
never rejects, so a caller-side `.catch()` after migration is dead code
that can structurally never fire, not a second safety net.

## Real verification, not code review alone

Extracted all 3 functions verbatim via Node `vm` (plus `fieldOperation`/
`FIELD_OPERATIONS`/`classifyFieldError`/`captureFieldError`, also
verbatim) and ran a forced-failure + genuine-success test for each:

| Function | Forced failure → `_fieldErrors` count | Genuine success → `_fieldErrors` count |
|---|---|---|
| `fetchNBARelayScores` | 1 (was 0) | 0 |
| `fetchFPLLiveScores` | 1 (was 0) | 0 |
| `fdPrefetchSoccerLive` | 1 (was 0) | 0 |

All 6 assertions passed. (One test-harness mistake caught and fixed
during this process, not a code bug: the FPL success-path test initially
returned `undefined` because the function's own 28-second rate-limit
guard correctly blocked a second call fired milliseconds after the first
forced-failure test — reset `_fplLastFetch` between test phases and
re-ran; not a defect in the fix.)

## A stale smoke assertion found and corrected (Rule 77 — investigated, not rationalized)

`smoke.js`'s `'fetchNBARelayScores wired into ESPN cycle'` assertion
literally string-matched `'fetchNBARelayScores().catch'` — encoding the
old, now-intentionally-removed calling convention as if it were the real
structural invariant, rather than the actual intent (the function is
genuinely called from the ESPN poll cycle). Updated to check for
`'fetchNBARelayScores();'` instead — the real invariant, not the specific
implementation detail this fix correctly changed. This is the same class
of stale-assertion issue found and fixed earlier tonight in the OTW tier
categorical work (A495) — confirmed via direct read that
`relayHealthCheck().catch` (a separate assertion two lines below,
untouched by this fix) remains accurate and was left as-is.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed (after the correction
  above).
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## Scope note

Left untouched: `relayHealthCheck` (a different function, its own
`.catch(()=>{})` at the call site swallows silently by design with no
`captureFieldError` chain expected — not the same bug shape, not part of
this sweep). The 26-entry `docs/TYPED-RESULT-MIGRATION-QUEUE.md` still
has un-migrated Bucket A items beyond what this sweep covered — this was
a targeted check of the 3 specifically-flagged siblings, not a re-run of
the full queue.

## Commit

- `index.html`: 3 functions migrated (`fetchNBARelayScores`,
  `fetchFPLLiveScores`, `fdPrefetchSoccerLive`), 3 caller-side dead
  catches removed. `SW_VERSION` bumped `2026-07-12h` → `2026-07-12i`.
- `sw.js`: `SW_VERSION` synced.
- `smoke.js`: one stale assertion corrected to check the real invariant.
- This manifest.
