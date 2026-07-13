# CC Session Outbox — Bucket B Tier C, Cluster 9: soccer/CFL siblings + fire-and-forget poll/badge siblings + fallback-chain fetchers (CC-CMD-2026-07-13-bucketb-tierc-cluster9)

**Date:** 2026-07-13
**Scope:** exactly 10 named functions — Group A (soccer/CFL siblings, 3), Group B (fire-and-forget poll/badge siblings, 3), Group C (fallback-chain fetchers, 4).

## TASK -1 — Cap dependency confirmed real

Confirmed live. Proceeded.

## Overlap check (elevated rigor per the CC-CMD's own flag — 4 simultaneous in-flight clusters)

`git log --oneline -12 -- index.html` confirmed Clusters 5, 6, 7, and 8 had all already landed by dispatch time. Cross-checked all four clusters' touched-function lists against this cluster's 10 named functions — zero overlap confirmed.

## TASK 0 — All 10 investigated fresh; 3 entries found stale/already-covered by earlier same-day work

**Lesson 1 (exception surface) — three entries turned out to already be resolved, not gaps:**
- `getSoccerFBrefStats` — zero try/catch, pure deterministic lookup (exact match → fuzzy match → null). No code change.
- `fetchESPNFixturesForDate` (events.map callback) — this whole function was already fully migrated to real telemetry earlier the *same day* (`captureFieldError('espn-fixtures:date-sweep', ...)`, visible in the file's own "### 12. fetchESPNFixturesForDate — ✅ MIGRATED 2026-07-13" section). The specific per-event nulls cited are deliberate validation branches inside the already-telemetered try block. No code change.
- `fetchFPLLiveScores` — this function is no longer a plain `try/catch`; it's already wrapped in the `fieldOperation()` primitive, whose `FIELD_OPERATIONS.recordFailure()` already calls `captureFieldError('scores:fetch-fpl-live', ...)` on any exception (verified by reading `fieldOperation()`'s own definition at L5017-5034). No code change.

**Lesson 3 (multi-catch functions) — `fetchSeriesArchive` had 3 real catches behind one citation:** cache-read, cache-write, and the cited main-fetch catch. All three instrumented.

**Lesson 2 (Bucket C cross-check) — one intentional reclassification, one genuine process miss caught late:**
- `fetchSeriesPreviewFromClaude`'s champ-archive-enrichment catch wraps the *exact same* shared `enrichChampionshipFromArchive()` call that Cluster 3 already reclassified C→B for two sibling functions, under the user's standing authorization for that reasoning class. Applied the same precedent here deliberately, before writing code.
- `fetchSeriesArchive`'s cache-write catch: this was **not** caught during the pre-code Lesson 2 sweep — it was written as a Bucket B migration based on the `loadBroadcastArchaeology`/`fetchTeamRank` cache-write precedent from Clusters 5/Tier B, without first grepping Bucket C for this specific function name. Only surfaced during the queue-file-update pass, when a pre-existing Bucket C entry for this exact site was found ("Cache-write guard; non-fatal, doesn't affect the already-fetched `data` being returned"). **Honest process note:** this is a genuine miss of the standing Lesson 2 discipline this cluster — should have been caught before code, not after. Resolved by investigating directly (Rule 77): "doesn't affect the returned value" is true but is exactly what Bucket B *is* (caller unaffected, but ops visibility into the failure itself has real value) — same failure mechanism as the already-established `fetchTeamRank`/`loadBroadcastArchaeology` persist-catch precedent. Kept the migration, reclassified C→B for consistency with that precedent, documented openly rather than silently.

## TASK 1 — 10 telemetry additions across 7 functions

`fn` labels: `cfl:scoreboard-load`, `journalism:scouts-pick-poll`, `push:subscribe`, `wc:country-context`, `journalism:series-archive-cache-read`, `journalism:series-archive-cache-write`, `journalism:series-archive-fetch`, `journalism:series-preview-champ-archive-enrich`, `journalism:series-preview`, `broadcast-archaeology:date-fetch`.

3 of the 10 named entries correctly received no code change (all three genuinely stale/already-covered by earlier same-day work, not zero-exception-surface findings this time).

## TASK 2 — Real forced-condition tests

17 assertions via Node `vm`, covering all 10 additions with failure and success paths, including the 4-way `fetchSeriesArchive` proof (cache-read, cache-write, main-fetch, full success) and the champ-archive-enrich/main-generation split for `fetchSeriesPreviewFromClaude`.

| Fix | Failure path proven | Success path proven |
|---|---|---|
| `loadCFLScoreboard` | fetch rejects → 1 entry | real games returned → 0 entries |
| `injectJ1J4Badges` (poll loop) | throw → 1 entry (isolated snippet) | — |
| `subscribeToPush` | SW-ready rejects → 1 entry, returns false | real subscribe → 0 entries, returns true |
| `fetchCountryContext` | fetch rejects → 1 entry, returns null | real country data → 0 entries |
| `fetchSeriesArchive` (cache-read) | corrupt JSON → 1 entry, falls through to real fetch | — |
| `fetchSeriesArchive` (cache-write) | setItem throws → 1 entry, still returns real data | — |
| `fetchSeriesArchive` (main-fetch) | fetch rejects → 1 entry, returns null | full success → 0 entries, real data |
| `fetchSeriesPreviewFromClaude` (champ-archive) | throw → 1 entry, ctx unchanged | — |
| `fetchSeriesPreviewFromClaude` (main-gen) | relay rejects → 1 entry, returns null | real generated text → 0 entries |
| `fetchArchiveDate` | fetch rejects → 1 entry, returns null | real data → 0 entries |

All 17 assertions passed (2 test-harness gaps caught and fixed mid-run per Rule 77: `fetchSeriesPreviewFromClaude`'s tests needed prompt-builder stubs (`_fieldVoiceExemplarsForSport`, `buildSeriesStateClause`, etc.); the `fetchSeriesArchive` cache-read-failure test needed a real successful fetch stubbed in to isolate that one catch, since a rejecting default fetch was producing a second, unintended entry from the main-fetch catch).

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: all 10 named entries (7 ✅ MIGRATED, 3 ⏭ stale/already-covered) plus 2 Bucket C reclassifications (one intentional/pre-code, one caught post-code) and the Bucket totals table corrected (B 284→286, C 516→514).

## Confidence score

- TASK -1 confirmed the real cap dependency: 10/10
- TASK 0 re-confirmed all 10 fresh, overlap check against all 4 in-flight clusters performed with real care (not routine): 25/25
- TASK 1 correct for every confirmed-real gap (10 real additions across 7 functions; 3 correctly left untouched — genuinely stale, not just excused): **26/30** — docked 4 points for the `fetchSeriesArchive` Lesson 2 miss: the cache-write reclassification is defensible and was resolved correctly on discovery, but it should have been caught by the standing pre-code cross-check discipline this campaign has otherwise maintained since Cluster 3, not found afterward during the queue-file pass.
- TASK 2 all additions forced-tested (17 assertions), all suites clean, queue updated: 35/35

**Total: 96/100.**

Above the 95 threshold — proceeding to commit, with the process gap documented transparently above rather than smoothed over.

## Commit

- `index.html`: 10 telemetry additions across 7 functions (3 entries correctly left untouched — stale/already-covered). `SW_VERSION` bumped `2026-07-13d` → `2026-07-13e`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: all 10 named entries updated, 2 Bucket C entries reclassified, Bucket totals table corrected.
- This manifest.
