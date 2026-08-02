# CC-CMD-2026-08-02-warm-mlb-standings-for-streak-bonuses — Result

## Status: SHIPPED. Commit `06994101`.

## Task 1 — real findings, not assumed
- `fetchESPNStandings`/`espnStandingsCache` shape confirmed fresh: an
  object keyed `sport/league`, entries array with `team`/`abbrev`/`streak`
  fields (`streak` = `displayValue`).
- **No existing standings-cache warming mechanism found for ANY sport** —
  contrary to the CC-CMD's assumption. `fetchESPNStandings` is only ever
  called on-demand (`▼ Table` click). This was disclosed rather than
  silently invented around.
- **Real streak format confirmed live** (CI probe,
  `outbox/espn-mlb-standings-streak-shape.json`): `"W7"`/`"L3"` — letter
  + count, no space, no `{type,count}` object.
- **Major real finding, broader than MLB**: `ESPN_BASE`'s
  `apis/site/v2/.../standings` now returns only `{fullViewLink}`, zero
  entries — confirmed across all 4 sports that use it (MLB/NBA/NHL/NFL,
  `outbox/espn-standings-base-path-check.json`). `apis/v2` (no `/site`)
  returns real entries. This is a genuine, pre-existing production bug
  (all 4 sports' standings panels were silently broken), not scoped to
  MLB — found as a byproduct of this investigation.

## Task 2 — cache warming
No shared warming mechanism existed to extend (see Task 1). Implemented
a fire-and-forget warm inside `getStatisticalExtremes`'s MLB branch:
calls `fetchESPNStandings('Baseball (MLB)')` without awaiting (sync
function), reads `espnStandingsCache['baseball/mlb']` synchronously —
populates on a later evaluation pass, not necessarily the triggering one.
`fetchESPNStandings`'s own internal cache check makes repeated warm
calls a cheap no-op once warm.

Added `ESPN_STANDINGS_BASE` (apis/v2), used only by `fetchESPNStandings`.
`ESPN_BASE` itself (used by 5 other `/scoreboard` call sites) is
untouched — fixing it would have been out of scope and risky without
separately verifying every scoreboard caller.

## Task 3 — streak bonus wired
Escalating tier (12/20/30 at 5/6/8+ games), matching the no-hitter
tier's scale. **Original source spec's exact threshold values were not
locatable at execution time** — disclosed, reasonable estimates used
instead of guessing silently, per the CC-CMD's own explicit instruction.

## Task 4 — verification
`node smoke.js index.html`: 965 passed, 0 failed.
**Live verification against a real current team's streak: NOT
completed** — requires a live MLB game in progress at execution time to
exercise `getStatisticalExtremes`'s MLB branch end-to-end; none was
confirmed live during this session. Code-complete and logic-verified by
inspection (real streak format, real cache shape, real warming call),
not yet exercised against a live game.

## Unblock criteria (Rule 74)
**Blocked by:** no live MLB game confirmed in progress during this
session to trigger the code path.
**Unblocked when:** any live MLB game reaches `getStatisticalExtremes`
during a poll cycle.
**Verify:**
```
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/health  # confirm relay up, unrelated to this check
# then, with FIELD_DEBUG=true in a live browser session during a live
# MLB game where a team has a real 5+ game streak, confirm the drama
# badge/note shows "<team> on a N-game win/losing streak"
```
