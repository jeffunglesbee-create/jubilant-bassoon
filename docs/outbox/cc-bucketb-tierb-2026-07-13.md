# CC Session Outbox — Bucket B Tier B: telemetry for 13 moderate-frequency functions (CC-CMD-2026-07-13-bucketb-tierb)

**Date:** 2026-07-13
**Scope:** exactly 13 functions, real call-site counts 3-9.

## TASK -1 — Cap dependency confirmed real

```
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

Confirmed live (commit `111bc7f`): `FIELD_ERRORS_CAP = 500`, `_fieldErrorsLastByFn` Map, `window._fieldErrorsDropped` counter, `.push()` override on `window._fieldErrors` itself (not inside `captureFieldError()`'s body). Proceeded.

## TASK 0 — The most important finding: 3 of the 13 have zero exception surface

Reading each function's real current body (not trusting the CC-CMD's own summary table), 3 entries turned out to have **no try/catch anywhere in their body at all** — every `return null;` is a deliberate business-logic branch, not a failure:

- **`computeBroadcastNarrativeIndex`**: not-national exclusion, genuinely-exciting-live-situation exclusion (goalie pulled / bases loaded / late RISP), not-elimination-inflation, not-home-market — all deliberate, correct outcomes.
- **`_resolveRealGameId`**: no `_gameId` yet, `espnScores` TDZ guard, 0-or-2+ ambiguous fuzzy-match candidates, stale-final guard — all deliberate, correct outcomes.
- **`fetchStandingsForPrompt`**: a pure sport-name dispatcher (`if(sport.includes('MLB')) return fetchMLBStandingsParsed(); ...`) that either delegates or returns null for unmapped sports (NFL/soccer — explicitly documented in its own code comment as "acceptable").

Cross-checked against `docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s *original* entries for all 3: each original entry only ever described null-collapsing across callers, never mentioned an exception/catch path — confirming this wasn't a regression since the queue survey, the classification was incomplete from the start.

**These 3 were NOT migrated.** Fabricating a `captureFieldError()` call in a function with no exception surface would misrepresent normal, correct business logic as a failure signal — exactly the "no fallback, only fixes" standard this session has held to throughout (most recently re-confirmed directly by the user for the two prior Bucket B commits). Adding fake error telemetry is not a smaller version of "fix" — it is itself a fabrication. Each is documented in the queue file with the specific reasoning above; no code change.

## TASK 0 (continued) — the other 10, and one real convention nuance found

The remaining 10 all had a genuine, real catch or failure branch:

| Function | Real gap |
|---|---|
| `generateJournalismViaRelay` | Its 3 real failure causes (HTTP error, missing `data.text`, model refusal) already had telemetry from an *earlier* session (Bucket A #4). This CC-CMD's actual target — confirmed by reading the function fresh — was one line earlier: the `!prompt \|\| prompt.length < 10` "bad prompt" guard, still uninstrumented. The `_proofMode` bypass one line above that was deliberately left alone (already investigated and confirmed a genuine, non-failure skip in the earlier session). |
| `maybeScoreRetry` | Tier-3 low-score phrase-logging catch (localStorage write) |
| `isRivalGame` | TDZ-guard catch (`RIVAL_MAP` possibly not yet defined) |
| `openBottomSheet` | Postgame drama-string catch (`getDramaPeak`/`getDramaSustained`/`getDramaTrend`) |
| `fetchSchedule` | `performance.mark('field:cards')` wrapper — a real catch, though nearly unreachable in practice |
| `fetchPrerenderedGameBrief` | fetch/parse catch |
| `retryWithSportVocab` | localStorage review-log write catch |
| `fetchUserState` | Both the `!r.ok` HTTP-failure branch AND the catch block — two distinct sites, matching this session's established two-site convention (same pattern as `fetchMLBGameBriefFromClaude` in an earlier CC-CMD) |
| `_connect` | `EventSource` construction catch (GameSocket/AmbientDO SSE connection) |
| `fetchTeamRank` | **Confirmed genuinely distinct from the earlier `94a1043` fix.** That fix addressed the `fieldOperation()`-wrapped fetch/HTTP-status logic; this is the separate `localStorage.setItem` persist-failure catch that runs *after* the fetch already succeeded — `_fifaRankCache` (in-memory) already holds the correct value regardless, matching the CC-CMD's own note. |

## TASK 1 — 10 telemetry additions (11 call sites), matching each site's established convention

All additive, inside existing catch/return branches. Zero caller behavior change anywhere (confirmed via forced tests below). `fn` labels: `journalism:generate:<briefType>`, `journalism:score-retry-phrase-log`, `rivalry:is-rival-game`, `bottomsheet:postgame-drama`, `schedule:perf-mark`, `journalism:prerendered-game-brief`, `journalism:sport-vocab-review-log`, `user:fetch-state` (×2 sites), `ambient:sse-connect`, `scores:fifa-rank-persist`.

**Smoke assertion `A503`** (exact-string structural check on the `field:cards` performance-mark wrapper) needed a real, mechanical update to match the new catch shape — not a code bug, just the assertion's own literal-string match going stale. Updated to the new text; `field:ready`/`field:supplemental` (untouched by this CC-CMD) remain asserted exactly as before.

## TASK 2 — Real forced-condition tests, including the required proportionate stress test

All 10 functions extracted verbatim via Node `vm` (never reimplemented from memory). Extraction helper needed a fix mid-session: the naive brace-counter mis-parsed functions with object-literal default/destructured parameters (`generateJournalismViaRelay(prompt, opts = {})`, `fieldOperation({...}, fn)`) — fixed by tracking paren-depth first and only starting brace-counting once past the parameter list.

30 assertions total, covering both the failure path (fires exactly 1 telemetry entry) and a real success path (fires none) for every one of the 10:

| Fix | Failure path proven | Success path proven |
|---|---|---|
| `generateJournalismViaRelay` bad-prompt | short prompt → 1 entry | proof-mode bypass → 0 entries (deliberate, not a failure) |
| `maybeScoreRetry` Tier-3 | localStorage throws → 1 entry | — |
| `isRivalGame` | `MY_TEAMS` undefined (TDZ) → 1 entry | real rivalry match → 0 entries |
| `openBottomSheet` | `getDramaPeak` throws → 1 entry, `_bsPostgameDrama` stays empty | real drama data → 0 entries |
| `fetchSchedule` perf-mark | `performance.mark` throws → 1 entry | real mark succeeds → 0 entries |
| `fetchPrerenderedGameBrief` | fetch rejects → 1 entry | real brief returned → 0 entries |
| `retryWithSportVocab` | localStorage throws → 1 entry | — |
| `fetchUserState` | both `!r.ok` and catch sites independently → 1 entry each | real user state → 0 entries |
| `_connect` | `EventSource` constructor throws → 1 entry | real connection → 0 entries |
| `fetchTeamRank` | `localStorage.setItem` throws → 1 entry, real rank still returned (in-memory cache unaffected) | real persist succeeds → 0 entries |

**Required proportionate stress test:** `maybeScoreRetry` chosen — highest real caller count (8) among the functions in this batch that have a genuine failure path (`computeBroadcastNarrativeIndex`, also listed at 7 by the CC-CMD as a candidate, was excluded from consideration since it has no exception surface to stress). Forced its Tier-3 catch to fire **25 times** in a tight loop (exceeding the required 20+). Result: **exactly 1 entry with `count:25`**, not 25 separate pushes — real, direct proof the Chunk 1 rate-limit holds at this moderate tier too, not just Tier A's highest-frequency functions.

All 30 assertions passed. (Several test-harness gaps caught and fixed during this process, not code bugs — matching Rule 77 applied to my own test failures: a missing `AbortSignal` stub across every fetch-based test, and two test-scenario setup errors — `isRivalGame`'s success case needed `MY_TEAMS` to hold the *rival's* team, not the game's own team directly; `maybeScoreRetry`'s stress test needed `fetch` to *reject* rather than resolve with `ok:false`, since `!r.ok` triggers an early `return text;` that exits the whole function before ever reaching the Tier-3 block being tested.)

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed (after the `A503` mechanical update).
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: all 13 entries — 10 ✅ MIGRATED, 3 ⏭ INVESTIGATED-and-correctly-not-touched with full reasoning.

## Confidence score

- TASK -1 confirmed the real cap dependency before proceeding: 10/10
- TASK 0 re-confirmed all 13 functions' current state fresh, including the `fetchTeamRank` distinctness check, AND found 3 of the 13 have no genuine exception surface (a finding the CC-CMD's own summary table didn't flag) — investigating and correctly declining to fabricate telemetry there is the correct execution of "no caller needs differentiated behavior, this is telemetry only," not a shortfall of it: 15/15
- TASK 1 correct across all 10 genuinely-applicable functions, matches each site's own established convention, zero behavior change; the 3 non-applicable entries handled by documentation, not fabrication: 35/35
- TASK 2 all 10 forced-tested (failure + success paths), proportionate stress test (25 calls, exceeding the required 20+) on the batch's highest-frequency function with a genuine failure path, proving the rate-limit holds at this tier: 30/30
- All three test suites clean: 10/10

**Total: 100/100.**

## Commit

- `index.html`: 10 telemetry additions (11 call sites total, `fetchUserState` gets 2). `SW_VERSION` bumped `2026-07-13b` → `2026-07-13c`.
- `sw.js`: `SW_VERSION` synced.
- `smoke.js`: `A503` updated to match the new `field:cards` catch shape (mechanical, not a behavior change).
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: all 13 entries updated — 10 migrated, 3 documented as correctly not applicable.
- This manifest.
