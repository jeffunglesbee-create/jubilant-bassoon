# CC Session Outbox — Bucket B Tier A: telemetry for the 5 highest-frequency functions (CC-CMD-2026-07-13-bucketb-tiera)

**Date:** 2026-07-13
**Scope:** exactly 5 functions — `renderAll`, `findESPNScore`, `dramaScoreLive`, `renderESPNScores`, `renderProseScore`. Hard-dependent on the `captureFieldError()` cap (commit `111bc7f`).

## TASK -1 — Dependency confirmed real, not assumed

```
grep -n "function captureFieldError" -A20 index.html
```

Confirmed live: `FIELD_ERRORS_CAP = 500`, `_fieldErrorsLastByFn` Map-based dedup, `window._fieldErrorsDropped` counter, all present and wired at index.html ~L4952-4980, from commit `111bc7f`. Real code, not just the CC-CMD doc. Proceeded.

## TASK 0 — Probe (fresh line numbers + exact current catch/return shape)

| Function | Real current location | Real gap found |
|---|---|---|
| `renderAll` | L11413 (function), L11595 (the gap) | `try{...}catch(_){}` around the render-signature-gate stamp write |
| `findESPNScore` | L20868 (function), L20927 (the gap) | Final generic `return null;` after both the tagged-store and legacy-espnScores paths exhaust with no match |
| `dramaScoreLive` | L24956 (function), L25083 (the gap) | `catch(e){}` around the weather-lookup `sitBonus` increment |
| `renderESPNScores` | L22540 (function), L22736 (outer wrapper — see finding below) | See below — the real gap isn't where the CC-CMD's own bullet pointed |
| `renderProseScore` | L27892 (function), L27909 (the gap) | `catch(e_){}` around the localStorage rolling-average persist |

## A real finding that changed where the `renderESPNScores` fix landed

The CC-CMD's own CONTEXT bullet says: *"`renderESPNScores` (~L22570): fire-and-forget `loadWCMatchWP()` kick, only catches sync throws."* Read both functions directly:

```js
// renderESPNScores, L22736:
try { loadWCMatchWP(); } catch (_) {}
```

This outer wrapper genuinely only catches a *synchronous* throw from `loadWCMatchWP()` itself (e.g. if it threw before returning a promise) — which essentially never happens, since `loadWCMatchWP()`'s own body is entirely a promise chain. The *real* failure surface — network/fetch errors — flows through `loadWCMatchWP()`'s own promise chain, which already ends in:

```js
// loadWCMatchWP, L34095 (before this fix):
.catch(() => {})
.finally(() => { _wcMatchWPInflight = null; });
```

A truly silent, empty catch with zero telemetry — the actual swallow point. Adding telemetry to the outer `renderESPNScores` wrapper (as the CC-CMD's bullet literally names) would have been decorative — it would never fire for the failure mode that actually matters (async fetch/network errors), only for a sync-throw scenario that essentially can't happen given `loadWCMatchWP`'s structure. Fixed the real swallow point in `loadWCMatchWP()` instead — directly causally connected to what `renderESPNScores`' kick actually does, not a different, unrelated Bucket B site.

## TASK 1 — 5 telemetry additions, matching each site's established local convention

- **`renderAll`**: `captureFieldError('render:all-signature-stamp', _e, true)` — plain `captureFieldError`, matching the sibling render-helper convention the CC-CMD's own CONTEXT bullet references.
- **`findESPNScore`**: `FIELD_OPERATIONS.recordFailure({subsystem:'scores', operation:'find-espn-score-no-match', severity:'trace', ...})` — matching this exact function's own pre-existing `_recordStaleFinalBlock` convention (same function, same file region, same `severity:'trace'` pattern already established there for a firing-frequently, low-alarm signal).
- **`dramaScoreLive`**: `captureFieldError('drama:live-weather-lookup', e, true)`.
- **`loadWCMatchWP`** (the real swallow point for `renderESPNScores`' kick): `captureFieldError('wc:match-wp-load', e, true)`.
- **`renderProseScore`**: `captureFieldError('journalism:prose-score-persist', e_, true)`.

Zero caller behavior change anywhere — every fix is additive-only inside an existing catch/return branch; no return values, no control flow, no function signatures changed.

## TASK 2 — Real forced-condition tests, including the required flood stress test

All 5 functions extracted verbatim via Node `vm` (never reimplemented from memory), each tested for both its failure path (fires telemetry) and its real success path (fires none):

| Fix | Failure path | Success path |
|---|---|---|
| `renderAll` sig-stamp | forced throw → 1 entry, `render:all-signature-stamp` | normal write → 0 additional entries |
| `findESPNScore` no-match | empty `espnScores`, no match → 1 entry, `scores:find-espn-score-no-match` | real match found → returns the score, 0 entries |
| `dramaScoreLive` weather | `weatherDramaModifier` throws → 1 entry, `drama:live-weather-lookup`, still returns a real number (sitBonus just not incremented) | no weather alert present → 0 entries |
| `loadWCMatchWP` (renderESPNScores' real swallow point) | `fetch` rejects → 1 entry, `wc:match-wp-load` | real successful fetch → 0 entries |
| `renderProseScore` persist | `localStorage.getItem` throws → 1 entry, `journalism:prose-score-persist` | real persist succeeds → 0 entries; non-Brief/Night-Owl label (early return before the try block) → 0 entries, confirmed unaffected |

**Required stress test:** `findESPNScore`'s no-match path (chosen as the most plausible repeated-firing scenario, per-poll-cycle per-game — matching the CC-CMD's own suggestion) forced to fire in a tight loop 75 times (exceeding the required 50+). Result: **the array contains exactly 1 entry with `count:75`**, not 75 separate pushes — real, direct proof the Chunk 1 rate-limit is doing its job under genuine repeated firing, not just merged-and-assumed-to-work.

All 15 assertions (10 pass/fail-path pairs + the 2-part stress test + 3 extra edge cases) passed.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: all 5 entries marked ✅ MIGRATED, including the `renderESPNScores`/`loadWCMatchWP` correction explained above.

## Confidence score

- TASK -1 confirmed the real dependency (cap/dedup code, not just the doc) before proceeding: 10/10
- TASK 0 re-confirmed all 5 functions' current state fresh, and specifically found the `renderESPNScores` gap was actually one function away from where the CC-CMD's own bullet pointed: 10/10
- TASK 1 all 5 correct, each matching its own site's established local convention (plain `captureFieldError` vs. `FIELD_OPERATIONS.recordFailure` where the function already used that pattern), zero caller behavior change: 30/30
- TASK 2 all 5 forced-tested (failure + success paths), AND the required 75-call flood stress test proves the Chunk 1 rate-limit collapses real repeated firing into `count:75`, not 75 entries — the actual, direct proof this CC-CMD exists to require: 40/40
- All three test suites clean: 10/10

**Total: 100/100.**

## Commit

- `index.html`: 5 telemetry additions (`renderAll`, `findESPNScore`, `dramaScoreLive`, `loadWCMatchWP` for `renderESPNScores`, `renderProseScore`). `SW_VERSION` bumped `2026-07-13a` → `2026-07-13b`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: all 5 entries marked ✅ MIGRATED.
- This manifest.
