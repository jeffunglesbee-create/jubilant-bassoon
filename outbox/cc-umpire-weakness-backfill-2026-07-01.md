# CC Outbox — Backfill Zone Data for Already-Processed Umpire Games

**Date:** 2026-07-01/02
**CC-CMD:** docs/CC-CMD-2026-07-01-umpire-weakness-backfill.md
**Commits:** c9b363f (script + workflow), 0ad8f17 (5-day chunk fix), c10b8b5 (2-day chunk fix)
**Runs:** 28555611187 (14-day, incomplete), 28555988842 (5-day, incomplete), 28556560702 (2-day, **complete**)
**Smoke:** 819 → 819 (Python-only change, no new client-side surface)

---

## Pre-build probe

Confirmed real current state: 327 `processed_game_pks`, 44 umpires, and —
critically — **no per-game umpire breakdown exists anywhere in the
current output shape**. Every umpire entry is a pure aggregate
(`challenged`, `overturned`, `rate`, `fullName`, `weakness`, `zones`) with
no `game_pk` list or per-game record. This resolves the CC-CMD's own
disclosed pseudocode gap: `pk_to_ump_last` is genuinely **not**
recoverable from existing data. The backfill re-fetches HP officials data
via MLB Stats API `schedule?hydrate=officials`, scoped only to dates that
actually have a target-pk challenge (not every date in the range) — same
one-call-per-date batching as the normal weekly flow.

**Real earliest processed date — git history was misleading, used a
different approach.** The CC-CMD warned not to trust commit-history
inference. Investigated: `umpire_abs.json`'s first appearance in a clean
commit was bundled into an unrelated "ci: update current state" commit
(2026-06-14), but the file's own internal `updated` timestamp at that
commit showed `20260608T193700Z` — an earlier real update run existed
that git's commit history doesn't cleanly represent (likely swept up by
the same stash/reset issue CLAUDE.md documents for `FIELD-CURRENT-STATE.md`
corruption). Since `processed_game_pks` stores no per-game dates either,
reconstructing the exact true earliest date from history is unreliable.
Used the codebase's own documented convention instead
(`mlb-weekly-update.py`'s comment: "Date range: first run = full season
(April 1)") as a safe, established floor, deliberately erring wide —
extra chunks with no matching `target_pks` are cheap (filtered out, zero
cost); under-covering would silently miss real backfill targets, the
worse failure mode.

## Task 1 — Backfill script

Created `scripts/mlb-umpire-zone-backfill.py`. Helpers (`fetch_csv`,
`challenge_re`, `ZONE_LABELS`, MLB Stats API officials lookup) copied
verbatim from `mlb-weekly-update.py` Section 6, not reinvented — copied
rather than imported because `mlb-weekly-update.py` is a top-level script
with no `__main__` guard; importing it would execute its entire fetch
pipeline (sections 1-6, all network calls) as a side effect.

**Fixed a real boundary bug before shipping**, caught before the first
live trigger: back-to-back N-day chunks sharing a literal calendar date
as both a chunk's exclusive upper bound and the next chunk's exclusive
lower bound (`game_date_gt`/`game_date_lt` are strict inequalities) would
silently skip any game dated exactly on that boundary. Fixed by padding
each chunk's actual query bounds by 1 day beyond its intended calendar
coverage while keeping intended ranges themselves perfectly adjacent —
verified with a dedicated dry-run script confirming zero gaps and zero
duplicate-covered dates across the full range before shipping.

**Dry-ran the merge/weakness-recomputation logic** against the real
committed `umpire_abs.json` data before the first live trigger: confirmed
a synthetic zone update correctly produces a real weakness label when a
zone's overturn rate exceeds the umpire's overall rate with ≥2 samples,
and correctly withholds weakness when a zone has only 1 sample (avoiding
a misleading 100%).

## Task 2 — workflow_dispatch entry point

Added `.github/workflows/mlb-umpire-zone-backfill.yml` as a dedicated,
`workflow_dispatch`-only file (mirroring `savant-csv-probe.yml`'s
established pattern) rather than adding a job to the scheduled
`mlb-weekly-update.yml` — deliberately avoids any risk of the backfill
accidentally firing on a future cron tick.

## Task 3 — Verification: three real live runs, iterating to a genuinely complete result

This section is the core of what happened and why it took three tries —
documented in full because glossing over the first two incomplete runs
would misrepresent what "verified" means here.

**Run 1 (28555611187, 14-day chunks): 201/327 games, 14/44 umpires with
weakness.** Completed without error, committed real data. But every one
of its 7 chunks returned **exactly 25000 rows** — investigated rather
than accepted at face value (Rule 77): a real 14-16 day MLB window is
~65,000-70,000 pitches by a rough estimate (~15 games/day × ~290 combined
pitches/game), roughly 3x the observed count. This is Baseball Savant's
server-side row cap on `statcast_search/csv`, not a coincidental true
count — confirmed by the suspiciously exact, repeated 25000 across
multiple independent date ranges (also matches the earlier
umpire-weakness-zone CC-CMD's own 14-day probe, which hit the identical
25001-with-header count). The committed "201/327" result was real but
understated — some of the other 126 games likely had genuine
challenge/zone data that was simply never scanned, not zero.

**Run 2 (28555988842, 5-day chunks): 306/327 games, 32/44 umpires with
weakness.** Fixed the chunk size down to 5 days (~21,750 estimated
pitches, based on the ~4350/day figure from Run 1's own estimate),
expecting to clear the cap with margin. Improved substantially but **17
of 19 chunks still hit exactly 25000 rows** — the ~4350/day estimate was
too low for real full-season 30-team volume. Added a truncation detector
in the same commit that flags any chunk still hitting the cap rather than
silently trusting it (this is what caught the ongoing problem instead of
shipping a second incomplete result as final).

**Run 3 (28556560702, 2-day chunks): 327/327 games, 40/44 umpires with
weakness — complete, no truncation.** Dropped to 2-day chunks. Real
per-chunk volumes came back at 13,500-17,000 pitches (~6,750-8,500/day
real volume — nearly double my Run-1 estimate), confirming 2-day windows
were the first genuinely safe size. Log line: "No chunks hit the row cap
— full coverage of all chunks' date ranges." All 327 target games got
zone data; all 306 recoverable pk→umpire mappings resolved (327/327 HP
umpires resolved — every game that had zone data also successfully
resolved its umpire).

**Idempotency was essential to making 3 iterations safe.** After Run 1,
added a reset-zones/weakness-before-merge step so each re-run recomputes
fresh from its own scan rather than accumulating on top of a prior run's
(possibly incomplete) results — verified this was safe specifically
because 100% of existing zone data at each point came from this script's
own prior run, not from the normal weekly flow's independent incremental
accumulation (which had captured zero new games in the relevant window,
confirmed in the prior CC-CMD's own investigation). This assumption is
documented inline in the script for anyone re-running it after real
normal-flow zone data eventually accumulates.

**A genuine near-miss caught before it reached the repo:** after Run 2's
fix, a local sandbox test run (network blocked, as always) triggered the
new reset-before-merge logic with nothing to re-merge — this would have
silently wiped the real backfilled data if committed. Caught via
`git diff --stat` before staging, restored the file from git before
committing the code fix. Documented in the commit message as a specific
warning against this failure mode recurring.

- `node smoke.js index.html`: 819/0 throughout — unaffected by all three
  iterations (pure Python + data change, no client-side code touched).

## Task 4 — Outbox manifest

**Resolved per-game-umpire-mapping approach:** NOT recoverable from
existing data (confirmed via probe) — required re-fetching officials data
via MLB Stats API `schedule?hydrate=officials`, scoped to dates with
actual target-pk challenges only (not the full date range), matching the
normal weekly flow's one-call-per-date batching.

**Real chunk boundaries used and why:** 2-day windows across
2026-04-01 through 2026-07-01 (46 chunks), chosen only after two larger
sizes (14-day, then 5-day) both empirically proved insufficient against
Baseball Savant's real ~25,000-row cap — the real per-day volume during
full 30-team season play (~6,750-8,500 pitches/day observed) was
consistently higher than early estimates suggested.

**Real before/after weakness counts:**
- Before this CC-CMD: 0/44 umpires had a non-null `weakness` (confirmed
  in the prior umpire-weakness-zone CC-CMD's own live-verification
  finding — zero new games had been processed since the feature shipped).
- After Run 1 (14-day, incomplete): 14/44.
- After Run 2 (5-day, incomplete): 32/44.
- After Run 3 (2-day, complete, 327/327 games): **40/44** — final,
  verified-complete result.

The 4 umpires still without a `weakness` value have genuinely insufficient
zone-level sample data (their overall challenge counts qualify per the
`c >= 3` threshold, but no individual zone reached the `>= 2` sample
minimum with a rate exceeding their overall rate) — not a coverage gap.

---

## Done Conditions

- [x] Per-game-umpire-mapping gap resolved (re-fetch, not recoverable
      from existing data — confirmed, not assumed)
- [x] Chunking approach iterated to a genuinely complete result (327/327
      games, 0 chunks hitting the row cap) — not stopped at the first
      "it ran without error" result
- [x] `challenged`/`overturned`/`processed_game_pks` never touched —
      confirmed via the script's own structure (zones/weakness only)
- [x] Idempotent re-run safety verified and documented, including a
      caught near-miss (local sandbox reset with nothing to re-merge)
- [x] Real live confirmation of non-null `weakness` on real umpires with
      real names, rates, and challenge counts — not just a clean job log
- [x] 819/0 smoke throughout
- [x] Outbox written, including the two incomplete intermediate runs —
      not just the final successful one
