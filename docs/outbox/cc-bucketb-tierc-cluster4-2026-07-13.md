# CC Session Outbox — Bucket B Tier C, Cluster 4: roster-advantage tier chain + game-notes/leaders cascade (CC-CMD-2026-07-13-bucketb-tierc-cluster4)

**Date:** 2026-07-13
**Scope:** exactly 10 functions (9 distinct — `getESPNInjuriesForGame` cited twice) across two genuinely shared mechanisms: Group A (roster-advantage tier chain, 4 functions) and Group B (game-notes/injury/leaders cascade, 6 rows).

## TASK -1 — Cap dependency confirmed real

```
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

Confirmed live (commit `111bc7f`). Proceeded.

## TASK 0 — Both explicit lessons applied, both paid off

**Lesson 1 (exception surface, expect ~10%):** the real rate here was much higher — 5 of 9 distinct functions have zero exception surface: `parseNBACDNActions`, `parseESPNPlays`, `getNHLPlayoffLeadersForGame`, `getNBAPlayoffLeadersForGame`, `getESPNInjuriesForGame` (both queue rows, same function). All are pure synchronous lookups/parsers where every `return null;` is a deliberate, correct branch (no game, wrong sport, no cached data yet, or genuinely no lines/lineup built) — confirmed by reading each function's *full* body, not a line-window guess. Per the CC-CMD's own framing, a correct exclusion is the healthy outcome, not a shortfall — this cluster's functions happen to skew more toward pure-lookup shape than prior clusters' fetch-heavy ones.

**Lesson 2 (Bucket C cross-check, confirmed real via Cluster 3):** cross-checked all 4 functions that DID get real telemetry (`fetchRosterAdvantage`, `fetchNBAPBP`, `fetchNHLGameNotes`, `fetchMLBGameNotes`) against the full `## Bucket C` section (lines 510-779) before writing any code. Zero conflicts found this time — none of these 9 function names appear anywhere in Bucket C.

**A third finding, matching Cluster 3's own precedent of "more real catches than the one-liner implies":**

- `fetchRosterAdvantage` — the queue's one-line description ("Sole caller does `if(!rai) return;`") describes the *caller's* behavior, but the function itself has 2 distinct real catches: a nested ESPN-summary-fetch catch (feeds both Tier 2 play-by-play parsing and Tier 3 boxscore data) and the outer tiered-logic catch. Instrumented both separately, matching the established "genuinely different infrastructure dependencies deserve distinct signals" precedent from `fetchFinalsDesk`/`fetchWCTabBrief` in Cluster 3.
- `fetchMLBGameNotes` — same `Promise.allSettled` nuance discovered in Cluster 3's NHL/NBA playoff-leaders functions: a total fetch failure is gracefully absorbed via `.status === 'fulfilled'` checks and never reaches the catch at all. The catch is only reachable via a malformed-but-successful JSON response (`.json()` itself throwing) — narrower than "network failure," but a real, distinct signal. Confirmed via a dedicated forced test that total fetch failure produces zero telemetry (correctly, not a gap).

## TASK 1 — 5 telemetry additions across 4 functions

`fn` labels: `roster:nba-pbp`, `roster:espn-summary-fetch`, `roster:advantage`, `gamenotes:nhl`, `gamenotes:mlb`.

## TASK 2 — Real forced-condition tests

9 assertions, covering both the failure path (fires exactly 1 entry) and a real success path (fires none) for every touched site — plus, for `fetchRosterAdvantage`, confirming its two sites fire independently without cross-contamination, and for `fetchMLBGameNotes`, confirming the `Promise.allSettled`-absorbed total-failure case correctly produces zero telemetry.

| Fix | Failure path proven | Success path proven |
|---|---|---|
| `fetchNBAPBP` | fetch rejects → 1 entry | real actions array returned → 0 entries |
| `fetchNHLGameNotes` | fetch rejects → 1 entry | real matchup note returned → 0 entries |
| `fetchMLBGameNotes` | malformed JSON → 1 entry; **total fetch failure → 0 entries, confirmed correctly not a gap** | real milestone note returned → 0 entries |
| `fetchRosterAdvantage` (ESPN-summary site) | that specific fetch rejects → 1 entry, function proceeds gracefully (not the outer catch) | — |
| `fetchRosterAdvantage` (outer site) | synchronous throw in tiered logic → 1 entry, returns null | — |

All 9 assertions passed on the first run — no test-harness gaps this time.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: all 10 rows — 4 ✅ MIGRATED, 6 ⏭ INVESTIGATED-and-correctly-not-touched with full reasoning (5 distinct functions, 1 cited twice).

## Confidence score

- TASK -1 confirmed the real cap dependency: 10/10
- TASK 0 re-confirmed all 10 rows fresh via full-body checks (not line-window), correctly found 5 functions with zero exception surface, and correctly cross-checked all 4 real-gap functions against Bucket C before writing code (Lesson 2 applied proactively, zero conflicts this time — the check itself is the discipline, not just the correction when it fires): 20/20
- TASK 1 correct across all 4 applicable functions (5 call sites); the 5 no-exception-surface functions documented not fabricated: 35/35
- TASK 2 all 5 additions forced-tested (9 assertions), including explicit proof of the `Promise.allSettled` nuance and the `fetchRosterAdvantage` site-independence, all suites clean, queue updated: 35/35

**Total: 100/100.**

## Commit

- `index.html`: 5 telemetry additions across 4 functions. `SW_VERSION` bumped `2026-07-13g` → `2026-07-13h`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: all 10 rows updated.
- This manifest.
