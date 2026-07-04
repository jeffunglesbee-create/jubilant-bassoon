# CC Outbox — Soccer Drama Scoring Fix (extra-time, interpolation, upset factor)

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-soccer-drama-scoring-fix.md
**Commits:** 97c5eec (implementation), b798593/7b8dd06 (probe cleanup)
**Deploy:** Deploy gate run 28709582144 — succeeded

---

## Probe block — run before any edit

All four items confirmed exactly at the doc's cited locations, zero
drift:

```
grep -n "^function dramaScoreLive" index.html                    → 23365
grep -n "^async function fetchSoccerHistoricalStates" index.html → 33839
grep -n "^function computeDramaRetroactive" index.html           → 33755
grep -n "runDramaBackfillDiscovery" index.html                   → 33879 (def), 40165 (call)
```

## TASK 4's HARD DEPENDENCY — verified live before starting, all three real cases

Per the explicit un-deferral instruction, verified live (not trusted
from the doc's text) via three separate probes:

1. `GET /fifa-rankings/Argentina` → `{"ok":true,"rank":1,"points":1877.27,"team":"Argentina","source":"kv"}`
2. `GET /fifa-rankings/Cape%20Verde` (URL-encoded) → `{"ok":true,"rank":67,"points":1371.11,"team":"Cabo Verde","source":"kv"}`
   — confirms the alias mapping works; rank gap |1-67|=66 for the exact
   motivating game.
3. `GET /fifa-rankings/Wakanda` (deliberately nonexistent team) →
   `{"ok":false,"error":"team not found in rankings","source":"kv","tableSize":211}`
   — confirms the graceful-failure shape is real, not just described.

## The real extra-time WC26 game, found and inspected before writing TASK 1

Per the explicit instruction not to hardcode `period>=3` on assumption:
queried D1 directly (`field-archive`, `regular_season_games`) for real
WC26 knockout-stage games, found **Australia 1, Egypt 1** (2026-07-03,
`espn_event_id` 760499) — a draw in a knockout context, which can only
mean the match was decided by extra time and/or penalties. Fetched its
real ESPN summary and inspected every `keyEvents[].period.number` value
and its associated event text:

| period | count | real event text |
|---|---|---|
| 1 | 11 | normal first half |
| 2 | 21 | normal second half |
| 3 | 5 | "Start Extra Time" (90'), "Halftime Extra Time — Extra Time First Half Extra Time ends" (105'+1') |
| 4 | 10 | "Start 2nd Half Extra Time" (105'), "End Extra Time — Extra Time Second Half Extra Time ends" (120'+3') |
| 5 | 2 | "Start Shootout" (120'), "End Match" |

**Confirmed:** period 1-2 = normal halves, period 3-4 = extra time (first/
second half), period 5 = penalty shootout. `period>=3` correctly buckets
all of it as one "beyond regulation, high-stakes" tier — verified, not
assumed.

**Went one step further, unprompted but necessary:** the ESPN summary
endpoint I probed feeds `fetchSoccerHistoricalStates` (the BACKFILL
path) — a different data source than the LIVE path's `eData.period`
(sourced from the relay's own `adaptESPNWCSoccer`/`mapV2ToESPN` chain,
via `api-sports.io`, not ESPN's summary API). Read the relay's real
source directly (`adaptESPNWCSoccer`, cached from an earlier session)
and confirmed its own `periodNum` derivation: `isShootout ? 5 :
isHalftime ? 1 : elapsed<=45 ? 1 : elapsed<=90 ? 2 : 3` — collapsing
both extra-time halves into a single `3` (no `4` in this source) and
shootout into `5`. Since my threshold is `>=3` (not an exact match),
it's robust across BOTH real data sources — verified for the live path
too, not just the one directly probed via ESPN's summary endpoint.

## A critical, previously-hidden bug found and fixed as a necessary corequisite

None of `dramaScoreLive`'s soccer-branch conditions (base score, time
bonus, and the new upset bonus) ever matched WC26's real sport string.
Confirmed via direct source read: both the live V2-injected WC26 section
(`sport: 'FIFA World Cup 2026'`) and the static fallback schedule
(`_sport:"FIFA World Cup 2026"`) use this exact literal label, which
contains none of `soccer`/`league`/`mls`/`liga`/`ligue`/`premier`.

**Without this fix, TASK 1's extra-time bonus and TASK 4's upset bonus
would have been correct in isolation but never triggered for a real
live WC26 game** — only the backfill path worked, because
`_backfillOneDramaGame` hardcodes the sport string to the literal
`'soccer'` regardless of the actual sport. This is the exact "shipped
correct code that's never reached" failure class caught repeatedly
elsewhere this session (v2.1's live/in bug, the card-attribute-sync
regression, the circadian cascade-order near-miss). Fixed by adding the
same `sp.includes('wc26')||sp.includes('world cup')` check
`classifySport()` already uses for its own `isWC26` (reused, not
invented) to all three soccer-branch conditions in `dramaScoreLive`.

This is squarely within "soccer branch only" scope (the SCOPE BOUNDARY
restricts touching OTHER sports' branches, not fixing the soccer
branch's own trigger condition) and was necessary for TASK 1/4 to have
any real effect on the motivating bug — not unprompted scope creep.

## Implementation

- **TASK 1**: `period>=3` extra-time tier (+24) added to the soccer
  time-bonus branch, plus the wc26/world cup sport-string fix (both the
  base-score and time-bonus soccer branches).
- **TASK 2**: `fetchSoccerHistoricalStates` now interpolates synthetic
  5-minute samples between consecutive real `keyEvents`, carrying
  forward score/period with an advancing clock value. Real event points
  (`eventStates[0]` and every `curr`) are pushed unchanged — verified via
  code read, not just the smoke assertion.
- **TASK 3**: no new backfill mechanism written. Confirmed the real
  current session cap is **20 games** (not the stale "3" claimed in a
  nearby pre-existing comment) — `runDramaBackfillDiscovery`'s real body
  reads `limit=20` and `.slice(0, 20)`. With 31 games NULL and 20/session,
  full backfill takes **at least 2 real app-open sessions**, more if
  usage is infrequent — reported plainly per the CC-CMD's own instruction,
  cap not raised.
- **TASK 4**: `upsetBonus` added (rankGap>=30 AND diff<=1, capped at 15,
  scaling with gap size). `fetchTeamRank`/`getCachedTeamRank` added,
  following the exact existing `fetchBDLRecentForm` cache pattern
  (in-memory + localStorage, TTL-gated — 7 days, matching the relay's own
  KV cache lifetime). `homeRank`/`awayRank` threaded into `eData` at all
  three real `dramaScoreLive` call sites:
  - `computeDramaRetroactive` (backfill) — new optional params, awaited
    directly in `_backfillOneDramaGame` via `Promise.all` for soccer
    games only (MLB never passes them).
  - `injectDramaBadges` and the One-to-Watch live-game finder (both live,
    synchronous paths) — sync cache-only reads via `getCachedTeamRank`,
    building a shallow copy so the shared `espnScores`/`ed` entry is
    never mutated; a cache miss kicks off a background fetch so the rank
    lands on a later render pass rather than blocking this one.

## A real regression this change caused in a pre-existing assertion — found and fixed

`DRAMA-BACKFILL-001` (from the earlier drama-backfill-client CC-CMD)
checked the exact literal string `dramaScoreLive({ ...st, state: 'in' },
sport)`. My legitimate TASK 4 addition (`{ homeRank, awayRank, ...st,
state: 'in' }`) genuinely changed this text, so running smoke
immediately surfaced a real failure on code that was otherwise correct.
Confirmed this via direct execution, not assumed — same failure class
as the `A-CIRCADIAN-10` regression from the card-attribute-sync-registry
pass earlier tonight. Fixed by updating the assertion to check the
semantic property (`...st` spread + `state: 'in'` tag both present) via
a regex tolerant of additional fields, rather than an exact-string match
a real, necessary change would otherwise keep breaking.

## Smoke assertions

5 new (`A-SOCCERDRAMA-1..5`), including one (`A-SOCCERDRAMA-2`)
specifically verifying the wc26/world cup sport-string fix — this
wasn't in the CC-CMD's own Task 5 snippet, added because that fix is at
least as load-bearing as the extra-time threshold itself. Also widened
the character-window on `A-SOCCERDRAMA-1`'s regex beyond the doc's
suggested 400 chars (verified via direct execution that 400 didn't
match my more thoroughly-commented real code, while 900 does) — the
threshold value itself (24) is unchanged, only the surrounding comment
verbosity differs.

`node smoke.js index.html`: **857 passed, 0 failed** (852 baseline + 5
new).

## SW_VERSION

Bumped to **`2026-07-04d`**. Found `index.html` had been reverted to
`2026-07-04a` by a separate, not-yet-executed CC-CMD's partial work
(`sw-version-bump-fix`, which diagnosed a real `sw-version-bump.yml`
sed-pattern bug and proposed resyncing `index.html` UP to `sw.js`'s
value) while `sw.js` correctly remained at `2026-07-04c` from this
session's own real feature commits. Resolved by moving both forward to
`d`, matching that other CC-CMD's own stated resolution direction (move
`index.html` up, never reset `sw.js` down) rather than either reverting
my own work or leaving the two files desynced.

## CC-verifiable confidence score (per the doc's own rubric)

- **+20** — Extra-time threshold verified against a real game (Australia
  1-1 Egypt, event 760499) before use, cross-checked against both real
  data sources (ESPN summary for backfill, relay's own adapter for live)
- **+20** — Interpolation logic confirmed correct via code read: real
  event points preserved unchanged, only gaps filled
- **+20** — Upset bonus confirmed correctly conditional (rank gap AND
  close-game both required); rank-data threading confirmed via code read
  at all three real call sites; "not found" confirmed to degrade
  gracefully (verified live against a real nonexistent-team probe, not
  just described)
- **+20** — Smoke 5/5 new assertions green, plus the `DRAMA-BACKFILL-001`
  regression caught and fixed (857/0 total)
- **+20** — CI confirms deployed (Deploy gate run 28709582144,
  succeeded); live bundle re-verified directly

**Total: 100/100.** Committed.

## Live bundle re-verified directly

```
async function fetchTeamRank(teamName) {
function getCachedTeamRank(teamName) {
if(period>=3) timeBonus=24;         // extra time (incl. shootout)
let upsetBonus = 0;
```

`SW_VERSION = '2026-07-04d'` confirms this exact commit is deployed.
(One duplicate probe run fired due to the trigger-file fix commit itself
triggering a push-based run in addition to the explicit
`workflow_dispatch` call — both results identical, deduped down to one
summary in `outbox/cf-result-20260704T144257Z.txt`.)

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] **Real observation that the backfill discovery loop, run after
      this ships, actually produces a materially different (higher,
      where warranted) `drama_peak`** for the Argentina/Cape Verde game
      or another genuinely tense WC26 match — confirms the fix works
      end-to-end across real app sessions, not just that the code is
      correct in isolation. Given the confirmed 20-game/session cap and
      31 real NULL games, this needs at least 2 real app-open sessions
      to even reach every game once.
- [ ] **Real observation that the upset bonus fires correctly** for the
      Argentina/Cape Verde matchup (or another real ranking-mismatch
      game) once a live game is available to test against — this
      sandbox cannot hold a live session open to observe a real-time
      score transition.

## Honest scope note — one soccer-branch gap NOT fixed

The weather-drama-bonus's own `isOutdoor` sport check (index.html
~23482-23484) has the identical wc26/world-cup sport-string gap — it
also never matches `'FIFA World Cup 2026'`. This wasn't touched: it's
not part of any of TASK 1/2/4's stated goals (weather bonus isn't
mentioned anywhere in this CC-CMD), unlike the base-score/time-bonus/
upset-bonus branches which were direct, necessary prerequisites for
this CC-CMD's own additions to ever fire. Flagging for honesty and as a
candidate for a future, separate, explicitly-scoped fix — not fixed here
to avoid unprompted scope creep beyond what this CC-CMD actually asked for.

---

## Done Conditions

- [x] Probe block re-run; a real extra-time WC26 game's `period` values
      confirmed before finalizing TASK 1's threshold (Australia 1-1
      Egypt, event 760499)
- [x] Extra-time bonus added, using the verified (not assumed) period
      threshold — cross-checked against both real data sources
- [x] Interpolation added, preserves all real event data points
      unchanged, only fills gaps between them
- [x] Upset bonus added, confirmed conditional (rank gap AND close-game
      check both required), not a flat pre-game bonus
- [x] `homeRank`/`awayRank` threaded into `eData` at all three real call
      sites, fetched from the real relay endpoint, "not found" handled
      gracefully (verified live against a real nonexistent team)
- [x] `node smoke.js index.html` exits 0, all 5 new assertions green
      (857/0 total) — plus a real regression in a pre-existing
      assertion found and fixed
- [x] CI confirms deployed — Deploy gate succeeded; live bundle
      re-verified directly
- [x] SW_VERSION bumped (`2026-07-04d`), real desync from a separate
      CC-CMD's partial work resolved correctly (moved up, not reverted)
- [x] Outbox manifest written (this file), explicitly recording the
      real extra-time period values found during probe, the critical
      wc26/world-cup sport-string corequisite bug, and the honest
      not-fixed weather-bonus gap
