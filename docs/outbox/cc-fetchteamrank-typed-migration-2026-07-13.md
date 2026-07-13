# CC Session Outbox — fetchTeamRank migration (queue Bucket A #6, self-directed)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Continuing autonomously through
`docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s ranked Bucket A list per an
explicit instruction to keep going, applying real fixes rather than
fallback layers.

## Novel thinking applied, not a mechanical wrap

The queue entry's original finding: `fetchTeamRank`'s `catch(_) {}`
swallows a network/timeout exception into `rank=null`, cached under
`FIFA_RANK_TTL` (7 days) — identical to a genuine "team not found in
FIFA rankings" response. A literal `fieldOperation()` wrap alone (return
`{ok:false}` on exception, keep everything else the same) would NOT have
fixed the actual bug: the real defect is that the **cache write itself**
doesn't distinguish "we got a real answer" from "we failed to get an
answer" — and a second, previously-unexamined case has the identical
effect: `if (r.ok) { ... } ` silently falls through to the pre-initialized
`rank = null` on a bare HTTP error status (`!r.ok`), which was ALSO being
cached for 7 days as if it were a confirmed "not ranked" result. Fixing
only the thrown-exception path would have left the `!r.ok` path exhibiting
the exact same bug, unfixed.

**Real fix:** stop caching failures at all, of any kind. `!r.ok` is now
treated as a thrown error (not a silent fallthrough), so both failure
modes flow through the same `fieldOperation()` catch. The cache write
(`_fifaRankCache[ck] = rank; localStorage.setItem(...)`) only happens when
`fieldOperation()` reports `ok:true` — meaning either a real rank number
or a genuine, valid-API-response "not found" (`d.ok:false`, which IS a
definitive, stable fact worth caching). A failure of any kind returns
`null` for that one call and leaves the cache untouched — the next
render/poll cycle's call is the retry, with zero new retry machinery.

## TASK — Migration

- `fetchTeamRank`: body wrapped in `fieldOperation({subsystem:'scores',
  operation:'fetch-team-rank', retryable:true, context:{teamName}}, ...)`.
  `!r.ok` now throws (with `.status` set, so `classifyFieldError` reports
  `HTTP_ERROR` instead of `UNKNOWN_ERROR` — a real diagnostic
  improvement, not just a bug fix). The cache-write moved to AFTER
  checking `result.ok`, only executing on success.
- `getCachedTeamRank`: its `.catch(() => {})` on the fire-and-forget
  background `fetchTeamRank(teamName)` call removed — dead code once
  `fetchTeamRank`'s promise can no longer reject (same reasoning as the
  relay sibling sweep).
- Third call site (`Promise.all([fetchTeamRank(g.home), fetchTeamRank(g.away)])`
  in the drama-retroactive backfill path): unchanged — it already just
  consumes the return value directly (`number | null`), and that external
  contract is unchanged by this fix; only what gets *persisted* on
  failure changed.

## Real verification (Node `vm`, functions extracted verbatim)

| Test | Scenario | Return | Cached? |
|---|---|---|---|
| A | Network exception (fetch rejects) | `null` | **No** (was: yes, 7 days — the bug) |
| B | HTTP 503 (`!r.ok`, not thrown by `fetch` itself) | `null` | **No** (was: yes, 7 days — the bug, and previously untested/unnoticed) |
| C | Genuine "not found" (valid response, `d.ok:false`) | `null` | **Yes** — correct, this is a real fact |
| D | Genuine success (real rank) | `67` | **Yes** — correct |
| E | Failure, then a real success on the next call | `1` | Confirms the actual point of the fix — a prior transient failure does NOT block a later real answer, unlike before |

All 5 assertions passed. TEST E is the one that matters most: before this
fix, TEST A's failure would have poisoned the cache for 7 days, making
TEST E's immediate-retry scenario impossible to observe as "fixed" until
the TTL expired — now it works on the very next call.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## Commit

- `index.html`: `fetchTeamRank` migrated with the cache-on-success-only
  redesign (not just a `fieldOperation()` wrap); `!r.ok` now a real
  failure, not a silent fallthrough; `getCachedTeamRank`'s dead catch
  removed. `SW_VERSION` bumped `2026-07-12i` → `2026-07-12j`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
