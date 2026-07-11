# CC Session Outbox — MLB Pitch/Batting-Order Pace Data Probe (CC-CMD-2026-07-10-mlb-pitch-pace-probe)

**Date:** 2026-07-10
**Scope:** Probe-only. No feature design, no code changes. Answer: does
pitch count / batting-order pace data reach FIELD's relay/client from
MLB's source feed?

## PROBE BLOCK

`git log --oneline -5` — confirmed at HEAD (`f0c25ac`) before starting.

`grep -rn "statsapi.mlb.com\|MLB Stats API\|gumbo\|GUMBO" index.html
sw.js` — found extensive existing MLB Stats API usage. **Two real,
distinct relay paths exist, not one:**

1. **Direct-to-source (client-side, CORS-open)**: `MLB_STATS_BASE =
   'https://statsapi.mlb.com/api/v1'` (index.html:7381). FIELD calls
   this directly for schedule/linescore data, and separately calls the
   GUMBO live-feed variant
   (`MLB_STATS_BASE.replace('v1','v1.1') + '/game/{gamePk}/feed/live'`,
   index.html:20842, inside `fetchMLBLiveGame(gamePk)`).
2. **Relay-proxied**: `MLB_STATS_RELAY =
   'https://field-relay-nba.jeffunglesbee.workers.dev/mlb-stats'`
   (index.html:18438). FIELD calls `${MLB_STATS_RELAY}/game/{gamePk}/boxscore`
   inside `fetchMLBBoxscoreContext(gamePk)` (index.html:18817).

Both are real, live, and currently in production use — confirmed by
fetching both directly against a genuinely live game (see below), not
inferred from the code alone.

## TASK 1 — Findings, with real field-level evidence

**Test game: Philadelphia Phillies @ Detroit Tigers, `gamePk: 824252`,
confirmed `abstractGameState: "Live"`, `detailedState: "In Progress"`
at probe time (2026-07-10, bottom of the 5th).**

### 1. Direct GUMBO live feed (`statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live`)

Fetched live, real response. Quoted directly, not inferred:

- **Current at-bat pitch count — present.**
  `liveData.plays.currentPlay.count = {"balls":1,"strikes":0,"outs":2}`
- **At-bat sequence number — present.**
  `liveData.plays.currentPlay.atBatIndex = 40` (this game's 41st
  at-bat, 0-indexed) — this is the field a "who's up in N at-bats"
  forecast would anchor on.
- **Current batter/pitcher identity — present.**
  `currentPlay.matchup.batter.fullName = "Colt Keith"`,
  `currentPlay.matchup.pitcher.fullName = "Aaron Nola"`,
  plus `batSide`/`pitchHand`.
- **Batting order — present.**
  `liveData.boxscore.teams.away.battingOrder = [607208, 656941,
  547180, ...]` — real player-ID array in lineup order.
- **Per-pitch timestamps — present.** Pulled a completed at-bat's full
  `playEvents[]` array (5 events, `atBatIndex: 0`, Trea Turner vs Jack
  Flaherty). Each event carries `startTime`/`endTime` (ISO 8601) and,
  for actual pitches, `pitchNumber`. Quoted directly: the at-bat's
  final pitch event —
  `{"pitchNumber":2,"startTime":"2026-07-10T22:41:45.712Z","endTime":"2026-07-10T22:41:56.543Z"}`
  — an ~11-second real inter-pitch gap, exactly the granularity a
  pitch-clock-based pace forecast would need. (The at-bat's *first*
  play event had `isPitch:false` with a multi-hour start/end gap —
  almost certainly a pre-game logging artifact, not a real pitch —
  flagged so this isn't mistaken for the norm.)

**`fetchMLBLiveGame(gamePk)` (the function that reads this exact
response) currently extracts only a subset**: `inning`, `inningHalf`,
`outs`, `balls`, `strikes`, baserunner booleans, both scores, `batter`,
`pitcher`. It does **not** extract `atBatIndex`, `battingOrder`, or
`playEvents[]` — all three exist in the raw response and are silently
discarded by this function's own return shape.

**More significant: `fetchMLBLiveGame` has ZERO callers anywhere in
`index.html`.** Confirmed via a full-file grep — only its own
definition and one stale comment (`index.html:24662`,
"`eData.innings populated by fetchMLBLiveGame`") reference it; no
actual call site exists. Even the subset it does capture (balls/
strikes/batter/pitcher) currently reaches **zero** FIELD consumers —
this function is dead code today, not a live, partially-wired path.

### 2. Relay-proxied boxscore (`field-relay-nba.../mlb-stats/game/{gamePk}/boxscore`)

Fetched live through the actual relay (not direct-to-MLB), same real
game: `200 OK`. The pitcher stats object
(`teams.away.players.ID{id}.stats.pitching`) for the away starter
(605400) contains, quoted directly:

```
"numberOfPitches": 82,
"pitchesThrown": 82,
"balls": 35,
"strikes": 47,
"battersFaced": 19,
```

**Total game pitch count is genuinely present in the relay's own
response.** `fetchMLBBoxscoreContext()` (the function that reads this
exact response, and **is** actively called — index.html:27791, wired
into a real journalism-context builder) currently extracts only
`inningsPitched`, `strikeOuts`, `era`, `earnedRuns` — `numberOfPitches`/
`pitchesThrown`/`battersFaced` are present in the payload it already
has in hand and are discarded, never reaching the consumer this
function feeds.

(Secondary, incidental finding — not this probe's target, flagged for
awareness only: `s.era` is read at index.html:18838 but `era` does not
appear anywhere in this boxscore endpoint's real `pitching` stats key
list, quoted above — that read is silently always empty via the `||''`
fallback. Not investigated further; out of scope for a probe-only
task.)

## CONCLUSION — clear, not hedged

**Yes — pitch count, batting order, and per-pitch pace/timing data all
genuinely exist upstream, confirmed via real, live, quoted API
responses from a currently in-progress game.** This is not a "data
doesn't exist" outcome. It is the same shape as tonight's other
findings: **real signal exists in the raw source, and is currently
discarded during FIELD's own normalization** — split across two real
gaps:

1. `fetchMLBLiveGame()` (the function with the richest available
   fields — `atBatIndex`, `battingOrder`, per-pitch `playEvents[]`
   timestamps, all reachable from a single existing fetch) is fully
   built but has **zero callers** — not wired to anything.
2. `fetchMLBBoxscoreContext()` (the function that IS wired to a real
   consumer) receives `numberOfPitches`/`pitchesThrown`/`battersFaced`
   in its own already-fetched payload and discards all three.

**No feature was designed or built.** This probe answers only whether
the data exists — it does. A real "likely [Player] up in ~N pitches"
feature would need: (a) wiring `fetchMLBLiveGame` to a real caller (or
extending `fetchMLBBoxscoreContext`'s existing wired call) to actually
capture `atBatIndex`/`battingOrder`/pitch-count fields already present
in responses FIELD already fetches, and (b) separate design work this
probe was explicitly scoped not to do.

## DONE CONDITIONS

- [x] Real MLB relay adapter(s) identified — two distinct paths (direct
      GUMBO live feed, relay-proxied boxscore), both confirmed live
- [x] Actual raw response fields reported, quoted directly from a real,
      currently in-progress game — not inferred from documentation
- [x] Clear, explicit answer: pitch/batter pace data is available
      upstream (yes), currently discarded during normalization — no
      hedged conclusion
- [x] No feature code written — probe only, `git status --short`
      confirms zero changes to `index.html`/`sw.js`

## CONFIDENCE SCORING

- +40 — real MLB relay path(s) correctly identified (both the
  direct-to-source GUMBO feed and the relay-proxied boxscore route,
  each confirmed live with a real HTTP request): **met**
- +40 — actual field-level evidence reported, quoted from real live
  responses against a genuinely in-progress game
  (`atBatIndex`/`battingOrder`/`playEvents[].startTime,endTime`/
  `numberOfPitches`/`pitchesThrown`), not inferred from documentation
  or memory of the API's general shape: **met**
- +20 — clear yes/no conclusion stated (yes, available upstream,
  currently discarded) — no feature work attempted, no partial or
  hedged answer: **met**

**Total: 100/100.**

## Commit

- No `SW_VERSION` bump, no `index.html`/`sw.js` changes — probe-only,
  report-only task, confirmed via `git status --short`.
- This manifest.
