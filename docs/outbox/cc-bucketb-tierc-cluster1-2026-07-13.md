# CC Session Outbox — Bucket B Tier C, Cluster 1: standings/cache discard-pattern siblings (CC-CMD-2026-07-13-bucketb-tierc-cluster1)

**Date:** 2026-07-13
**Scope:** exactly 7 functions, real call-site counts 1-2 each.

## TASK -1 — Cap dependency confirmed real

```
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

Confirmed live (commit `111bc7f`). Proceeded.

## TASK 0 — Probe, and two real findings the CC-CMD's own summary table didn't fully capture

Read all 7 functions' current bodies fresh:

- **`fetchNBAStandingsParsed`** is a 3-tier fallback chain (ESPN-first, NBA CDN relay secondary, BallDontLie tertiary), each with its *own* separate catch block — not one. The CC-CMD's table row describes it singularly ("after all three fallback sources fail"), which correctly implies a single aggregate signal is the right shape here, not three individual ones. Matches the `fetchESPNFixturesForDate` precedent from an earlier Bucket A fix this session (a failure-count summary across many parallel per-league fetches, not one telemetry call per fetch).
- **`fetchBDLMilestones`** has zero try/catch anywhere in its body. Its only `return null;` (no players available) is already covered by `fetchBDLSeasonAverages`'s own telemetry (added in this same CC-CMD, see below) — and the function's real return value (`best`) being `null` (no player near a milestone tonight) is a completely normal, expected outcome, not a failure. Cross-checked the original queue entry: it only ever described the caller's `if(ms) note=...` fallback-chain shape, never an exception path — same incomplete-classification pattern found for 3 functions in the prior Tier B CC-CMD (`computeBroadcastNarrativeIndex`, `_resolveRealGameId`, `fetchStandingsForPrompt`).

**`fetchBDLMilestones` was NOT migrated** — documented in the queue file with the reasoning above; no code change, matching the same "no fallback, only fixes" standard applied throughout this session (fabricating telemetry for normal branching is itself a fallback, not a fix).

Confirmed the other 6 all have a genuine catch or failure branch:

| Function | Real gap |
|---|---|
| `fetchMLBStandingsParsed` | catch (network/parse failure) |
| `fetchNHLStandingsParsed` | catch (network/parse failure) |
| `fetchMLSStandingsParsed` | catch (network/parse failure) |
| `fetchNBAStandingsParsed` | 3 separate tier catches → 1 aggregate signal at the final `return null;` (see finding above) |
| `fetchBDLSeasonAverages` | both the `!r.ok` branch AND the catch block — two distinct sites, matching the established two-site convention (same pattern as `fetchUserState` in the prior Tier B CC-CMD). The separate localStorage-read cache-miss fallback in this same function is an **already-classified Bucket C entry** (correctly-fine-as-is, listed elsewhere in the queue file) — explicitly out of scope per the CC-CMD's own instruction never to touch Bucket C, and correctly left untouched. |
| `_readCachedRank` | corrupt-cache catch |

## TASK 1 — 6 telemetry additions (7 call sites)

All additive, inside existing catch/return branches. `fn` labels: `standings:mlb-parsed`, `standings:nhl-parsed`, `standings:mls-parsed`, `standings:nba-parsed` (single aggregate), `bdl:season-averages` (×2 sites), `scores:fifa-rank-cache-read`.

## TASK 2 — Real forced-condition tests (no stress test required, per the CC-CMD's own explicit exemption for this low-frequency tier)

All 6 functions extracted verbatim via Node `vm`. 20 assertions, covering both the failure path (fires exactly 1 entry) and a real success path (fires none) for every one:

| Fix | Failure path proven | Success path proven |
|---|---|---|
| `fetchMLBStandingsParsed` | fetch rejects → 1 entry | real standings returned → 0 entries |
| `fetchNHLStandingsParsed` | fetch rejects → 1 entry | real standings returned → 0 entries |
| `fetchMLSStandingsParsed` | fetch rejects → 1 entry | real standings returned → 0 entries |
| `fetchNBAStandingsParsed` | all 3 tiers fail (ESPN fetch rejects, CDN relay rejects, BDL fetch also rejects) → **exactly 1 aggregate entry**, not 3 | tier-1 (ESPN) succeeds → 0 entries, and tiers 2/3 confirmed never even attempted (stubbed to throw if called) |
| `fetchBDLSeasonAverages` | both `!r.ok` and catch sites independently → 1 entry each | real players returned → 0 entries |
| `_readCachedRank` | localStorage throws → 1 entry | real cached rank returned → 0 entries |

All 20 assertions passed on the first run — no test-harness gaps this time (the paren-depth-aware `extractFn` fix from the prior Tier B CC-CMD carried forward cleanly).

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed (no assertion needed updating this time — none of these 7 functions had a smoke assertion string-matching their exact catch text, unlike the prior tier's `fetchSchedule`/`A503` case).
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: all 7 entries — 6 ✅ MIGRATED, 1 ⏭ INVESTIGATED-and-correctly-not-touched with full reasoning.

## Confidence score

- TASK -1 confirmed the real cap dependency: 10/10
- TASK 0 re-confirmed all 7 functions' current state fresh, found `fetchNBAStandingsParsed`'s true 3-catch shape (correctly resolved to 1 aggregate signal) and `fetchBDLMilestones`'s lack of any exception surface (correctly not touched): 15/15
- TASK 1 correct across all 6 genuinely-applicable functions (7 call sites), matches convention, zero behavior change; the 1 non-applicable entry handled by documentation, not fabrication: 45/45
- TASK 2 all 6 forced-tested (failure + success paths), all suites clean, queue updated: 30/30

**Total: 100/100.**

## Commit

- `index.html`: 6 telemetry additions (7 call sites total, `fetchBDLSeasonAverages` gets 2). `SW_VERSION` bumped `2026-07-13c` → `2026-07-13d`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: all 7 entries updated.
- This manifest.

Note: `docs/CC-CMD-2026-07-13-bucketb-tierc-cluster2.md` also landed on `main` in the same push as this CC-CMD's spec doc — out of scope for this dispatch (the user's request named Cluster 1 only), left untouched.
