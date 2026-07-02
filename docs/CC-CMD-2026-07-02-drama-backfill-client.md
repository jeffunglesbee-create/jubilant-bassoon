# Claude Code Command — Retroactive Drama Backfill

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write findings to outbox/cc-drama-backfill-2026-07-02.md.

## CONTEXT

Real, confirmed 2026-07-02: `drama_peak` is NULL for 128 completed games.
Root cause: the existing archival trigger (`if (_gameId && dramaPeak > 0)`
near line 36566, `dramaPeak` read from `localStorage`) only fires if a live
session was open long enough to accumulate samples. For one user, that's
true for a small fraction of games — structurally, not accidentally,
degraded since at least 2026-06-20.

**The fix does NOT touch RUWT/ADR-002 at all** — the relay's role is
unchanged (serve facts, store whatever the client computes and sends). What
changes: the client can now compute drama for a completed game it never
watched live, by replaying the **exact existing** `dramaScoreLive()`
function (confirmed real, line ~23010 — score-differential + period/clock
urgency, NOT a probability or momentum score) against real historical game
state, instead of requiring live-accumulated samples.

**Real data sources confirmed live 2026-07-02, not assumed:**
- **MLB**: ESPN's summary endpoint (`site.api.espn.com/.../summary?event=X`)
  has a real `plays[]` array — confirmed 505 real entries for a real game,
  each with `homeScore`, `awayScore`, `period.number`, and real `wallclock`
  timestamp. This is exactly `dramaScoreLive()`'s required input shape
  (`homeScore`, `awayScore`, `period`) — the client can call the *same
  function*, fed historical snapshots instead of live ones, and get
  results consistent with what live tracking would have produced.
- **Soccer**: ESPN's `keyEvents[]` does NOT carry running score directly —
  confirmed via a real check. It has `scoringPlay: true/false`, `period`,
  `clock`, `wallclock` per event. Running score must be **reconstructed**
  by iterating events in order and incrementing the scoring team's tally on
  each `scoringPlay: true` entry — this is real, doable, but is
  reconstruction, not a direct field read. Do not skip this step or assume
  a score field exists that doesn't.
- **BSD's `momentum` array was investigated and correctly rejected** for
  this purpose — it doesn't match `dramaScoreLive()`'s actual input
  requirements (score/period/clock, not a momentum index). Do not use it
  here; it was the wrong data source for this specific fix, confirmed by
  reading the real formula before building against it.

## PRE-BUILD PROBE (Rule 87)

```bash
grep -n "function dramaScoreLive" index.html
sed -n '23010,23110p' index.html   # confirm current exact formula, all sport branches, hasn't changed
grep -n "function recordDramaHistory\|function getDramaHistory\|function getDramaPeakWithTime\|function getDramaSustained\|function getDramaTrend" index.html
grep -n "dramaPeak.*localStorage\|_relayBase + '/archive/drama'" index.html   # confirm exact current trigger site, line numbers may have shifted
```

Confirm `dramaScoreLive()`'s real signature and all sport-specific branches
are unchanged from what's documented above before building the retroactive
replay — this doc's understanding of the formula could be stale by the time
this executes.

## TASK 1: New function — `computeDramaRetroactive(historicalStates, sport)`

Takes an array of `{homeScore, awayScore, period, clock}` snapshots
(reconstructed from ESPN data per sport, see Task 2/3) and replays
`dramaScoreLive()` against each snapshot in sequence, building the same
`{t, s, p}`-shaped history array `recordDramaHistory()` would have built
live — except `t` here is the real historical `wallclock` timestamp from
the source data, not `Date.now()`. This lets the *existing* `getDramaHistory
`/`getDramaPeakWithTime`/`getDramaSustained`/`getDramaTrend` functions work
unmodified against the reconstructed history — do not reimplement peak/
sustained/trend logic separately; reuse what already exists by feeding it
the right shape.

**Do not persist this reconstructed history to localStorage** — it's a
one-time computation for backfill, not live tracking. Compute in memory,
derive the final `drama_peak`/`drama_arc` payload, POST it, discard.

## TASK 2: MLB retroactive state reconstruction

Fetch `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event={espn_event_id}`
(same ESPN base already used elsewhere in this file — confirm the exact
existing constant/pattern via probe, don't hardcode a new one). Map
`plays[]` directly:
```javascript
const states = (data.plays || []).map(p => ({
  homeScore: p.homeScore, awayScore: p.awayScore,
  period: p.period?.number, clock: '', // MLB dramaScoreLive doesn't use clock, only period
  t: new Date(p.wallclock).getTime(),
}));
```
Verify `dramaScoreLive()`'s MLB branch really only needs `period` (extra
innings threshold) and not `clock` — confirmed in this doc's context above
(`period>=10`/`>=9`/`>=7` checks, no MLB clock parsing) — but re-confirm
against the probe output, not this doc alone, since formulas can drift.

## TASK 3: Soccer retroactive state reconstruction

Fetch the ESPN soccer summary equivalent for the real `espn_event_id`.
Iterate `keyEvents[]` in order, reconstructing running score:
```javascript
let homeScore = 0, awayScore = 0;
const states = (data.keyEvents || []).map(e => {
  if (e.scoringPlay) {
    // Determine which side scored -- verify the real field for this
    // during PRE-BUILD PROBE (likely e.team.id compared against the
    // game's home/away team IDs; do not assume the field name without
    // checking a real keyEvents entry for a real goal first).
    if (/* home team scored */) homeScore++; else awayScore++;
  }
  return { homeScore, awayScore, period: e.period?.number,
           clock: e.clock?.displayValue || '', t: new Date(e.wallclock).getTime() };
});
```
**This task has a real unresolved gap, stated honestly:** which field
identifies the scoring team on a `keyEvents` entry was not confirmed in
this session — only that `scoringPlay: true/false` exists. Resolve this
during PRE-BUILD PROBE against one real completed match with a known real
scoreline (e.g., England 2-1 Congo DR, event 760495, confirmed real result
this session) before writing the reconstruction loop — verify the computed
final `homeScore`/`awayScore` matches 2-1 before trusting the loop for any
other match.

## TASK 4: Discovery + backfill loop

On app open, fetch `GET {relayBase}/archive/drama-missing?limit=3` (the
relay endpoint from the companion CC-CMD in field-relay-nba — confirm it's
deployed before this ships, real cross-repo dependency). Cap at 3 per
session — same conservative, rate-limit-conscious pattern already used
elsewhere in this codebase (`slice(0, 3)` per-league cap seen in the
existing multi-league scoreboard fetch). For each returned game: fetch the
sport-appropriate historical state (Task 2 or 3), run Task 1's retroactive
computation, POST the result to `/archive/drama` exactly as the existing
live path does (same endpoint, same payload shape, no relay change needed
for this part).

**Do not block app startup on this.** Fire-and-forget per game, same
`keepalive: true` / `.catch(() => {})` pattern as the existing live drama
POST — this is best-effort backfill, not a critical path.

## TASK 5: Verification

```bash
node --check <extracted script block>   # or existing smoke.js pattern for this file
```

Cannot fully verify end-to-end from the CC sandbox (needs live ESPN fetches
+ a real relay round-trip). Done condition: syntax valid, and the MLB
reconstruction inline-tested against event 401815989 (Rays 4, Royals 0 —
real confirmed result this session) produces a final state matching that
score before relying on it for any other game.

**Chat-side follow-up (not checkable by CC):** trigger the backfill flow for
a few real games from the 128-game backlog, confirm `drama_peak` actually
lands in D1 for each, and confirm the computed values are plausible (not
all identical, not all zero) before considering the backlog genuinely
addressed.

## TASK 6: Outbox manifest (last task)

State explicitly: what field actually identifies the scoring team in a real
soccer `keyEvents` entry (Task 3's stated gap, resolved or not), the real
MLB inline-test result against event 401815989, and confirm no more than 3
backfill POSTs fire per app session.
