# CC Session Outbox — Bucket B Tier C, Cluster 6: MLB siblings + live-socket infrastructure siblings (CC-CMD-2026-07-13-bucketb-tierc-cluster6)

**Date:** 2026-07-13
**Scope:** exactly 10 named functions — Group A (MLB siblings, 7), Group B (live-socket infrastructure siblings, 3) — plus 3 explicitly-flagged Bucket C sibling cases to resolve with real source verification.

## TASK -1 — Cap dependency confirmed real

```
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

Confirmed live. Proceeded.

Also noted in passing (not part of this cluster's scope): an automated `SW-Bump` CI commit landed on `main` between Cluster 5 and this dispatch, resetting `SW_VERSION` from `2026-07-13i` back to `2026-07-13a`. Unrelated to this cluster's work — treated as the new baseline and re-confirmed fresh before this cluster's own bump (`a` → `b`).

## TASK 0 — All 10 re-confirmed fresh; all 3 flagged Bucket C sibling cases resolved with real source verification

**The three flagged Bucket C cases (this cluster's headline task) — all resolved by reading the actual source, not the queue's paraphrase:**

1. **`_mlbAvgPitchesPerAtBat`** — the CC-CMD asked whether the Bucket C "sample too thin" entry is the same site as the Bucket B "feeds avgPitchesPerAtBat" entry (double-counted), a misclassification, or genuinely distinct. Read the full function body: it has TWO separate null-return regions — the deliberate `completedPlays.length < 3`/`totalPitches === 0` guards (correctly Bucket C, matches the function-level doc comment's explicit "silence-over-guessing" design philosophy, same as sibling `_mlbRecentPitchPaceMs`), and the actual `catch` block (a genuine unexpected exception — correctly Bucket B). **Resolution: neither double-counted nor misclassified — two distinct, correctly-bucketed code regions in the same function.** Migrated the catch only.

2. **`GameSocket`'s hello-message Bucket C entry** — verified the exact comment text exists in source: the class-level architecture comment (L17915-17933) does state "DUAL-MODE design — polling is the safety net" and the specific hello-message `try{...}catch(_){}` in `onopen` (L17961) is exactly what it describes. **Resolution: genuinely correct C, confirmed against real source, not just the queue's paraphrase.**

3. **`ensureGameSocket`'s Bucket C entry** — verified the exact comment `/* never throw from socket handler */` exists in source at L18077, on the catch wrapping the default `handler`'s `emitScoreEvent(...)` call. **Resolution: genuinely correct C, confirmed against real source.**

**Lesson 1 (exception surface):** 2 of 7 Group A functions were already fully migrated in an earlier undated session — `fetchMLBSchedule (proof-mode override)` (already has `captureFieldError('proof:normalizeMLBGame', ...)`) and `fetchMLBTeamMomentum` (already has `captureFieldError('mlb-momentum', ...)`). Both stale entries, no code change. `_eDataMatchesGame` and `ensureGameSocket` (its own body) both confirmed zero exception surface — pure deterministic validation/guard functions, no catch to instrument. `loadMLBSlate` also has zero exception surface of its own; its real gap lives in `fetchMLBFixtures`'s catch (out of scope — not a named function this cluster) and `refreshMLBStatus`'s catch (already telemetered in an earlier session). Real migration rate this cluster: 5 of 10 named entries got real telemetry.

**Lesson 3 (multi-catch functions) — found a genuinely more valuable second catch in `GameSocket`:** the cited gap (`signalCrunch`'s outer `catch(_) { return false; }`, a near-impossible synchronous-throw case) is real but narrow. Reading the full method surfaced a second, more meaningful catch: the async `fetch(...).catch(()=>{})` on the fire-and-forget HTTP crunch-signal POST, which silently swallows the *actual delivery failure* — the function already returns `true` optimistically before the fetch settles, so this is the only place a genuine "the push signal never reached the relay" failure is observable at all. Instrumented both. The class's many OTHER catches (WS construction, onmessage parse, onFacts callback, ws_fresh dispatch, pin/unpin sends) were investigated and correctly left untouched — covered by the class-level DUAL-MODE comment's explicit reasoning, which `signalCrunch` (an outbound push-signal path, not part of the inbound facts-polling loop) is not.

## TASK 1 — 6 telemetry additions across 5 functions

`fn` labels: `mlb:schedule-fetch`, `mlb:avg-pitches-per-atbat`, `mlb:platoon`, `scores:hydrate-espn-from-finals`, `ws:signal-crunch-fetch`, `ws:signal-crunch-fallback`.

5 of the 10 named entries correctly received no code change: 2 stale (already migrated in a prior session), 3 zero-exception-surface (deliberate branches/guards, no catch to instrument).

## TASK 2 — Real forced-condition tests

13 assertions via Node `vm` (functions extracted verbatim; `GameSocket` extracted as a full class and instantiated directly for `signalCrunch` testing), covering all 6 additions with failure and success paths, plus the `_mlbAvgPitchesPerAtBat` three-way distinction (corrupt feedData vs. thin-sample-deliberate-null vs. real success) and `GameSocket.signalCrunch`'s four distinct paths (WS-not-open+fetch-rejects, WS-not-open+fetch-succeeds, synchronous-throw, WS-open+send-succeeds).

| Fix | Failure path proven | Success path proven |
|---|---|---|
| `fetchMLBSchedule` | fetch rejects → 1 entry | real games array → 0 entries |
| `_mlbAvgPitchesPerAtBat` | corrupt feedData throws → 1 entry | thin sample → 0 entries (deliberate, not the catch); real success → 0 entries, real average |
| `fetchMLBPlatoon` | fetch rejects → 1 entry | real result returned → 0 entries |
| `hydrateEspnScoresFromFinals` | loadTonightFinals throws → 1 entry | real finals hydrate espnScores → 0 entries |
| `GameSocket.signalCrunch` (fetch) | WS-not-open, fetch rejects → 1 entry, still returns true | WS-not-open, fetch succeeds → 0 entries |
| `GameSocket.signalCrunch` (fallback) | synchronous throw → 1 entry, returns false | WS open, send succeeds → 0 entries, real send |

All 13 assertions passed on the first full run.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: all 10 named entries (5 ✅ MIGRATED, 2 ⏭ STALE-already-migrated, 3 ⏭ zero-exception-surface) plus all 3 flagged Bucket C entries resolved with real source verification (all 3 confirmed correct, no reclassification, no Bucket totals change).

## Confidence score

- TASK -1 confirmed the real cap dependency: 10/10
- TASK 0 re-confirmed all 10 fresh via full-body checks: 15/15
- TASK 1 correct for every confirmed-real gap (6 real additions across 5 functions, 2 stale entries and 3 zero-exception-surface entries correctly left untouched): 30/30
- All three flagged Bucket C sibling cases resolved with real source verification (exact comment text confirmed for `GameSocket` and `ensureGameSocket`; genuine two-region distinction confirmed for `_mlbAvgPitchesPerAtBat`) — not the queue's own paraphrase taken on faith: 25/25
- TASK 2 all 6 additions forced-tested (13 assertions), all suites clean, queue updated: 20/20

**Total: 100/100.**

## Commit

- `index.html`: 6 telemetry additions across 5 functions (2 stale, 3 zero-exception-surface entries correctly left untouched). `SW_VERSION` bumped `2026-07-13a` → `2026-07-13b` (re-confirmed live value fresh after the automated SW-Bump reset).
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: all 10 named entries updated, 3 Bucket C entries resolved with source-verified reasoning.
- This manifest.
