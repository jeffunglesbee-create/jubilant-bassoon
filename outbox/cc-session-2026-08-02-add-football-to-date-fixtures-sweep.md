# CC-CMD-2026-08-02-add-football-to-date-fixtures-sweep — Result

## Status: SHIPPED. Real live verification, no regression.

## Task 1 — re-verified fresh, real answer found (not assumed)

**Question: does football need its own mapping branch, or does the
existing generic (non-golf) path already work?**

Read `fetchESPNFixturesForDate`'s `games = events.map(...)` in full.
The generic path only extracts `home.team.displayName`,
`away.team.displayName`, `comp.venue.fullName`, and `ev.date` — it does
**not** extract score, period, situation, or curatedRank for any of the
5 already-wired sports (that live-state data comes from separate
polling functions, not this fixtures sweep).

Read `adaptESPNFootball` (field-relay-nba, the reason football needed
its own adapter there): its real special-casing is for
down/distance/situation, quarter-labeled periods, and curatedRank —
none of which this function touches.

**Real, live confirmation** (`outbox/probe-espn-football-fixtures-shape-result.json`):
fetched real ESPN NFL (Sept 10-11 2026, real 49ers @ Rams at Melbourne
Cricket Ground) and real CFB (Aug 29 2026, `groups=80`, real TCU vs
North Carolina at Aviva Stadium — 8 real FBS games) scoreboards.
Both have `competitions[0].competitors[].homeAway` +
`.team.displayName`, `competitions[0].venue.fullName`, `ev.date` —
**identical shape** to the 5 already-wired sports.

**Conclusion: no special branch needed.** The reason `adaptESPNFootball`
exists doesn't apply to this function's simpler extraction.

Re-confirmed fresh from field-relay-nba's own config (not memory):
`nfl: {espnSport:'football', espnLeague:'nfl'}`,
`cfb: {espnSport:'football', espnLeague:'college-football'}`.

**Real, incidental finding (not fixed, out of scope):** field-relay-nba's
own `/v2/games` route claims (in a comment) to apply `groups=80` for
CFB but its actual `espnUrl` construction never appends it — a
pre-existing relay-side discrepancy, explicitly out of scope here
("do not touch adaptESPNFootball or /v2/games"). Flagging honestly
rather than silently fixing or ignoring; worth a future relay CC-CMD.

## Task 2 — entries added correctly

`src/legacy/field.js`, `FETCH_LEAGUES`:
```js
{sport:"football", league:"nfl",              section:"NFL", prefix:"Q"},
{sport:"football", league:"college-football", section:"CFB", prefix:"Q", groupsParam:"80"},
```
URL construction extended additively:
`` `${ESPN_BASE}/${sport}/${league}/scoreboard?dates=${dateStr}&limit=50` + (groupsParam ? `&groups=${groupsParam}` : "") ``
— `groups=80` appended as a real query param, not embedded in the
league path segment (the exact bug shape the CC-CMD flagged). Entries
without `groupsParam` get an empty-string append — zero behavior
change for the other 5 leagues.

No NFL/CFB broadcast `bundle` exists anywhere in this codebase —
intentionally omitted rather than invented; `resolveBundle(undefined)`
already safely returns `[]` (existing, tested behavior).

## Task 3 — real, live verification

`outbox/verify-football-fixtures-sweep-result.json`:
- **Real NFL game**: Los Angeles Rams vs San Francisco 49ers, real
  venue (Melbourne Cricket Ground), correct home/away attribution.
- **Real CFB games**: 8 real FBS games for Aug 29 2026, `groups=80`
  confirmed present as `&groups=80` in the actual request URL (not
  path-embedded) — sample: TCU Horned Frogs vs North Carolina Tar
  Heels, Aviva Stadium (Dublin).
- **Regression check** (NHL, an already-shipped sport): URL
  construction unaffected — `urlHasNoGroupsSuffix: true`,
  `urlEndsCorrectly: true` — confirms the `groupsParam` addition is
  fully backward-compatible.

`node smoke.js index.html`: 965 passed, 0 failed. SW_VERSION
`2026-08-02e` → `2026-08-02f`.

## Unrelated real gap found and fixed along the way

`HANDOFF.md`'s mid-session write (from a different, concurrent
session) was missing any SW-version reference, failing smoke
assertion A704 and blocking this commit. Fixed with a minimal one-line
addition rather than reverting the intentional mid-session content.

## No unblock criteria needed

Fully closed: Task 1's real either-way answer found and confirmed live,
Task 2 shipped correctly, Task 3 has real live proof plus an explicit
regression check.
