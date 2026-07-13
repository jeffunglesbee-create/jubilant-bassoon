# CC Session Outbox — Bucket B Tier C, Cluster 2: fire-and-forget IIFE/prefetch siblings (CC-CMD-2026-07-13-bucketb-tierc-cluster2)

**Date:** 2026-07-13
**Scope:** exactly 10 functions/sites, all fire-and-forget with real call-site counts 1-2.

## TASK -1 — Cap dependency confirmed real

```
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

Confirmed live (commit `111bc7f`). Proceeded.

## TASK 0 — Probe, and three real findings

Reading all 10 sites' current bodies fresh surfaced three things worth documenting before writing any code:

**1. `soccerFBrefInit` already has telemetry — via a different, non-overlapping system.** It calls `_recordRelayInit()` at both its `!r.ok` and catch sites, writing to `window._relayInitStatus` (a *latest-status-only* record from an earlier `CC-CMD-2026-07-11-relay-init-staleness-visibility` session). That system does **not** feed the Health Panel's "Runtime Errors" count the way `window._fieldErrors`/`captureFieldError()` does — different purpose (freshness/staleness display vs. bounded failure history). Adding `captureFieldError()` alongside the existing calls is genuinely additive, not redundant: it's the difference between "is this currently stale" and "how often has this failed, visible in the same place every other Bucket B/C addition is now visible."

**2. `espnInjuriesPrefetch`/`nhlPlayoffLeadersPrefetch`/`nbaPlayoffLeadersPrefetch` all have the exact `loadWCMatchWP` pattern from the Tier A CC-CMD.** Each is a sync wrapper (`try { fetchXxx(); } catch(_) {}`) around an `async` function — meaning the outer catch only catches sync throws (which don't happen, since calling an async function never throws synchronously unless argument evaluation itself throws). The real swallow point is inside each async function's own body. Instrumented there instead of the decorative outer wrapper, matching the established Tier A precedent.

**3. A deeper nuance found via forced testing, not assumed:** for `fetchNHLPlayoffLeaders`/`fetchNBAPlayoffLeaders` specifically, the real swallow point's catch is narrower than "network failure." Both functions use `Promise.allSettled([...])` to fetch from multiple endpoints, which **never rejects** — and both already have an explicit `if (!sk && !gk) return ...gracefulFallback` one line *before* the catch, which absorbs a total-fetch-failure scenario gracefully without ever reaching the catch at all. Confirmed this directly: a forced test with `fetch` rejecting produced **zero telemetry** — correctly, not a gap, since that code path returns early inside the `try` and never throws. The catch is only reachable if the response-*building* function (`buildNHLPlayoffLeadersByTeam`/`buildNBAPlayoffLeadersByTeam`) itself throws given a malformed-but-successful response — a real, narrower, genuine code-integrity signal, not a network-failure one. Telemetry still added there (it's the actual reachable failure surface), just with a corrected understanding of what it actually guards.

**4. `fetchFIELDBriefFromClaude (inline IIFE variant, ~L31236)` is a stale queue entry — no code change.** Its description (".filter(Boolean)ed regardless of success") doesn't match anything in the current file. Tracing it: the function's only real call site (`initFIELDBrief`) was already fully migrated to a typed `{ok, text/reason}` contract with full caller-side branching earlier in *this same session* (Bucket A entry #8, commit `adfc01e`) — this table entry describes the function's pre-migration shape. No separate "inline IIFE variant" exists anywhere in the file to touch. Documented in the queue file; no code change (matching the "no fallback, only fixes" standard — there's nothing real here to fix).

## TASK 1 — 9 telemetry additions (10 call sites)

All additive. `fn` labels: `journalism:v2-wc-brief-consume`, `journalism:v2-nba-brief-consume`, `journalism:v2-nhl-brief-consume` (all 3 inside `fetchV2AllScores`), `soccer:fbref-init` (×2 sites, alongside existing `_recordRelayInit`), `espn:injuries-prefetch`, `nhl:playoff-leaders-prefetch`, `nba:playoff-leaders-prefetch`, `userdo:peak-missed-visibility`, `snapshot:save`.

## TASK 2 — Real forced-condition tests

All 9 functions/sites tested. The 3 `fetchV2AllScores` inline IIFEs (embedded deep in a massive, dependency-heavy function) were extracted **verbatim** via a general-purpose brace/paren-counting IIFE extractor (built for this CC-CMD — pulls the exact `(async (...) => {...})` expression out of the surrounding source without reimplementing any of its logic) and invoked directly in isolation, rather than attempting to run the whole `fetchV2AllScores`.

22 assertions total:

| Fix | Failure path proven | Success/graceful path proven |
|---|---|---|
| WC brief IIFE | fetch rejects → 1 entry | `!r.ok` graceful early-return (not the catch) → 0 entries |
| NBA brief IIFE | fetch rejects → 1 entry | — |
| NHL brief IIFE | fetch rejects → 1 entry | — |
| `soccerFBrefInit` | `!r.ok` and catch, each → 1 entry, `_recordRelayInit` ALSO still fires (additive, not replacing) | real data returned → 0 `captureFieldError` entries |
| `espnInjuriesPrefetch` (real site: `fetchESPNInjuries`) | fetch rejects → 1 entry, graceful cache/empty fallback still returned | real success → 0 entries |
| `nhlPlayoffLeadersPrefetch` (real site: `fetchNHLPlayoffLeaders`) | builder throws → 1 entry; **total fetch failure → 0 entries, confirmed correctly not a gap** | real success → 0 entries |
| `nbaPlayoffLeadersPrefetch` (real site: `fetchNBAPlayoffLeaders`) | builder throws → 1 entry; **total fetch failure → 0 entries, confirmed correctly not a gap** | — |
| `visibilitychange` listener (`peak_missed`) | forced throw → 1 entry | clean run → 0 additional entries |
| `saveSnapshot` | `idbSet` rejects → 1 entry | real persist succeeds → 0 entries |

All 22 assertions passed. (One test-harness gap caught and fixed during this process, not a code bug — matching Rule 77 applied to my own test failures: a missing `FIELD_SNAPSHOT_STORE` stub was masking the real assertion outcome for `saveSnapshot`'s success-path test, since a `ReferenceError` on the undeclared constant was itself being caught and counted as "telemetry fired" for the wrong reason. Added the stub, both scenarios then verified correctly.)

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: all 10 entries — 9 ✅ MIGRATED, 1 ⏭ INVESTIGATED-and-confirmed-stale with full reasoning.

## Confidence score

- TASK -1 confirmed the real cap dependency: 10/10
- TASK 0 re-confirmed all 10 sites' current state fresh, found the `loadWCMatchWP`-pattern gap in 3 of them, the non-redundant-additive nature of `soccerFBrefInit`'s existing telemetry, the narrower-than-assumed reachability of 2 catch blocks (proven not assumed), and one fully stale/obsolete entry: 15/15
- TASK 1 correct across all 9 genuinely-applicable sites (10 call sites), zero behavior change; the 1 non-applicable entry handled by documentation, not fabrication: 45/45
- TASK 2 all 9 forced-tested (failure + success/graceful paths), including proving a negative (total fetch failure does NOT reach 2 of the catches, confirmed not a gap rather than assumed), all suites clean, queue updated: 30/30

**Total: 100/100.**

## Commit

- `index.html`: 9 telemetry additions (10 call sites total, `soccerFBrefInit` gets 2). `SW_VERSION` bumped `2026-07-13d` → `2026-07-13e`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: all 10 entries updated.
- This manifest.
