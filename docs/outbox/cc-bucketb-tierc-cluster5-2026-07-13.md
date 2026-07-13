# CC Session Outbox — Bucket B Tier C, Cluster 5: World Cup siblings + schedule-callback siblings + cache-parse-fallback siblings (CC-CMD-2026-07-13-bucketb-tierc-cluster5)

**Date:** 2026-07-13
**Scope:** exactly 11 named functions/sites across three groups — Group A (World Cup siblings, 5), Group B (schedule-callback siblings, 3), Group C (cache/storage parse-fallback siblings, 3).

## TASK -1 — Cap dependency confirmed real

```
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

Confirmed live (`FIELD_ERRORS_CAP = 500` at L4953, `_fieldErrorsLastByFn` Map at L4955, eviction/dedup logic through L4977). Proceeded.

## TASK 0 — All three lessons applied, all three paid off

**Lesson 1 (exception surface):** rate skewed low this cluster relative to nominal function count — 1 of 11 named functions/sites had zero exception surface (`_wcAdvancementProb`: pure deterministic lookup chain, fully `?.`/`??`-guarded, no try/catch anywhere). But the REAL additions count (16) came out far above the doc's own "1-2 sites each" estimate (~13-14 expected) because Lesson 3 surfaced substantially more real catches than the queue's one-line descriptions implied — see below. A second Lesson-1 nuance recurred twice: `fetchSchedule`'s CFL closure's outer `.catch()` on `loadCFLScoreboard().then(...)` and `loadBroadcastArchaeology`'s per-date `fetchArchiveDate(iso).catch(() => null)` were both confirmed unreachable/absorbed — the callee (`loadCFLScoreboard`, `fetchArchiveDate`) already has its own internal try/catch that never rejects, matching the `Promise.allSettled`-absorption pattern from Clusters 3/4. Both correctly left untouched.

**Lesson 2 (Bucket C cross-check, confirmed real a second time):** cross-checked all candidate real-gap functions against the current `## Bucket C` section before writing any code. 10 of 11 had zero conflict. One did: `bdlLoad`'s existing Bucket C entry ("null legitimately means 'no cache entry'; sole caller treats cache-miss as the correct no-op path") conflated two genuinely distinct code paths that both `return null;` — the deliberate `!raw` early-return (true cache-miss) and the `catch(e)` block (corrupt-cache JSON.parse/storage failure). Read the function body directly: these are not the same thing. Reclassified C→B and migrated, following the exact precedent and reasoning class established in Cluster 3's `fetchGameBriefOnDemand`/`fetchEPLMatchBriefFromClaude` correction. Forced-tested all three paths independently (corrupt-cache fires 1 entry; true cache-miss fires 0, proving the two paths are genuinely distinct; fresh valid hit fires 0 with real data) to confirm the reclassification didn't blur the two branches.

**Lesson 3 (multi-catch functions, confirmed real again — biggest finding this cluster):** 4 of the 11 named entries had substantially more real catches than their one-line description implied:
- `fetchSchedule (golf load callback)` — cited 1 (computeGolfDerivedMetrics wrap); the closure actually has 4: also the `scheduleRenderAll()` wrap (direct sibling of the CFL entry, same closure), `injectPGALeaderboard()` wrap (already had a bare console.warn under FIELD_DEBUG but zero captureFieldError — a whole visible UI feature, same tier as Cluster 3's `renderFieldDesk` card catches), and the round-completion archival wrap (`_isGolfRoundComplete`/`saveGolfRoundFinal` — silent data-loss on failure, a completed round never gets archived).
- `loadBroadcastArchaeology` — cited 1 (cache-read); actually has 3: also the sessionStorage cache-write persist catch (same tier as the already-migrated `fetchTeamRank` persist pattern) and the outer `Promise.all(...).then(...).catch(() => {})` build/render safety net (confirmed reachable only via a synchronous throw in results-processing or `renderBroadcastArchaeology()` itself, since per-date fetch failures are already absorbed one line earlier).
- `fplLoadBootstrap` — cited 1 (cache-parse); actually has 2: also the live-fetch catch, a genuinely distinct failure mode (network/relay failure vs. corrupt cache) not redundant with the first.
- `bdlLoad` — see Lesson 2 above; the Bucket C reclassification effectively surfaced this as a second real single-catch function.

All other named entries (`fetchWCStandings`, `buildWCMediaCards`, `renderWCBracketTree`, `buildWCBars`, `fetchSchedule (CFL load callback)`, `fetchSchedule (BDL prefetch callback)`) were confirmed to have exactly the 1 real catch cited, no more.

## TASK 1 — 16 telemetry additions across 10 functions (11th, `_wcAdvancementProb`, correctly excluded — zero exception surface)

`fn` labels: `wc:standings`, `wc:media-card-journal-note`, `wc:bracket-tree-fetch`, `wc:projections-cache-load`, `schedule:golf-derived-metrics`, `schedule:golf-render`, `schedule:golf-pga-inject`, `schedule:golf-round-archive`, `schedule:cfl-render`, `schedule:bdl-prefetch-kickoff`, `bdl:cache-read`, `broadcast-archaeology:cache-read`, `broadcast-archaeology:cache-write`, `broadcast-archaeology:build-render`, `fpl:bootstrap-cache-parse`, `fpl:bootstrap-fetch`.

Two sites deliberately excluded as redundant/unreachable (documented in TASK 0 Lesson 1): the CFL closure's outer `.catch()` on `loadCFLScoreboard().then(...)`, and `loadBroadcastArchaeology`'s per-date `fetchArchiveDate(...).catch(() => null)`. One site excluded as redundant with an already-migrated callee's own telemetry: the inline `.catch(()=>{})` on `fetchBDLSeasonAverages()` inside the BDL prefetch callback (real rejection already telemetered as `bdl:season-averages` in Cluster 1).

## TASK 2 — Real forced-condition tests

29 assertions via Node `vm`, covering every one of the 16 additions with both a failure path (fires exactly 1 entry, correct `fn` label) and a genuine success path (fires zero additional telemetry, real correct return value/behavior), plus the two-path distinction proof for `bdlLoad` (corrupt-cache vs. true-cache-miss) and the multi-site independence proofs for the golf closure (4 sites tested individually plus a combined all-success run) and `fplLoadBootstrap` (cache-parse-failure-falls-through-to-real-fetch-success, in addition to isolated failure/success per site).

| Fix | Failure path proven | Success path proven |
|---|---|---|
| `fetchWCStandings` | fetch rejects → 1 entry | real standings data returned → 0 entries |
| `buildWCMediaCards` | getStatOfDay throws → 1 entry | real Scout's Pick text → 0 entries |
| `renderWCBracketTree` | fetch rejects → 1 entry | real bracketSlots returned → 0 entries |
| `buildWCBars` (loadWCProjectionsCache) | throw → 1 entry | clean call → 0 entries |
| `fetchSchedule` golf: derived-metrics | throw → 1 entry | — (isolated per-site + combined success) |
| `fetchSchedule` golf: render | throw → 1 entry | — |
| `fetchSchedule` golf: pga-inject | throw → 1 entry | — |
| `fetchSchedule` golf: round-archive | throw → 1 entry | combined all-4-success → 0 entries |
| `fetchSchedule` CFL: render | throw → 1 entry | real success, section pushed → 0 entries |
| `fetchSchedule` BDL prefetch kickoff | synchronous throw in guard → 1 entry | real success → 0 entries |
| `bdlLoad` | corrupt cache → 1 entry | true cache-miss → 0 entries; fresh hit → 0 entries, real data |
| `loadBroadcastArchaeology` cache-read | corrupt cache → 1 entry (sync) | valid fresh cache → 0 entries, renders cached games |
| `loadBroadcastArchaeology` cache-write | setItem throws → 1 entry, still renders | full success → 0 entries |
| `loadBroadcastArchaeology` build-render | renderBroadcastArchaeology throws → 1 entry | full success → 0 entries, renders fresh games |
| `fplLoadBootstrap` cache-parse | corrupt cache → 1 entry, falls through to real fetch success | fresh valid cache → 0 entries, returns true early |
| `fplLoadBootstrap` fetch | live fetch rejects (no cache) → 1 entry, returns false | full success (no cache, live fetch ok) → 0 entries |

All 29 assertions passed on the first full run.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: all 11 named entries (10 ✅ MIGRATED including the `bdlLoad` C→B reclassification, 1 ⏭ INVESTIGATED-and-correctly-not-touched), plus the Bucket totals table corrected for the reclassification (B 283→284, C 517→516).

## Confidence score

- TASK -1 confirmed the real cap dependency: 10/10
- TASK 0 re-confirmed all 11 fresh via full-body checks (not line-window), correctly applied Lesson 1 (1 zero-exception-surface exclusion + 2 confirmed-unreachable/absorbed exclusions + 1 redundant-with-callee exclusion, all with reasoning), Lesson 2 (proactive Bucket C cross-check on every real-gap candidate, found and correctly reclassified 1 genuine conflict), and Lesson 3 (found 4 functions with more real catches than their one-liner implied, verified each with full-body reads before writing code): 20/20
- TASK 1 correct for every confirmed-real gap across all 11 entries (16 real additions, zero fabricated telemetry on deliberate branches): 35/35
- TASK 2 all 16 additions forced-tested (29 assertions), including the `bdlLoad` two-path distinction proof and multi-site independence proofs, all suites clean, queue updated: 35/35

**Total: 100/100.**

## Commit

- `index.html`: 16 telemetry additions across 10 functions (11th, `_wcAdvancementProb`, correctly investigated and left untouched — zero exception surface). `SW_VERSION` bumped `2026-07-13h` → `2026-07-13i`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: all 11 named entries updated (Bucket B section), 1 Bucket C entry reclassified, Bucket totals table corrected.
- This manifest.
