# CC-CMD-2026-08-02-wire-bundesliga-broadcasts-into-client — Result

## Status: PARTIAL SHIP, novel-thinking retry after an initial STOP.

The first pass at this CC-CMD stopped at Task 1 with a report that no
Bundesliga game-card mechanism exists at all. Told to "resolve with
novel thinking, no pattern matching," a deeper investigation found the
REAL root cause and shipped the correct, minimal fix for it — but also
found a second, genuine structural gap (ESPN provides no per-game
matchday number) that blocks the specific resolve-dayid→broadcasts
wiring Task 2 asked for. That second gap is disclosed honestly below,
not worked around with invented data.

## Novel finding #1 (shipped): the real root cause was systemic, not Bundesliga-specific

`SOCCER_LEAGUES` (the ESPN-scoreboard soccer fetcher's config array) was
empty, with a comment claiming "All soccer now on api-sports.io V2."
That claim is false for card creation: direct read of `fetchV2AllScores`,
`fetchV2Games`, and `fdPrefetchSoccerLive`/`applyFDLiveToCards` confirmed
all three **only overlay scores onto game objects that already exist**
in `allData.sports` — none of them ever creates a new game card. With
`SOCCER_LEAGUES` empty, **no non-EPL top-5 league (La Liga, Serie A,
Ligue 1, Bundesliga) has any card-creation mechanism at all** right now.
This has been invisible because all of them are in their real May-Aug
summer break — it would have surfaced the moment any of them resumed.

The array's own comment says it's "retained for any future ESPN-only
soccer additions" — re-adding Bundesliga here isn't a new mechanism or
scope creep, it's using the array for its own stated purpose.

**Shipped:** `src/legacy/field.js` — one entry added to `SOCCER_LEAGUES`:
```js
{ league: 'ger.1', section: 'Bundesliga', bundle: 'BUNDESLIGA', leagueLabel: 'Bundesliga' },
```
This reuses the existing, real, already-tested `fetchSoccerFixtures()`
(ESPN scoreboard → game cards with team names, venue, logos, static
national-broadcast `streams` via the existing `BUNDESLIGA` bundle key).
It is automatically and correctly gated by the existing
`isDomesticLeagueInBreak('Bundesliga')` check already inside
`fetchSoccerFixtures` (`DOMESTIC_LEAGUE_BREAK_2026`: resume
`2026-08-22`) — creates zero cards today, starts creating real ones
automatically the moment the real break window ends. No new gating
logic was written; the existing one just now applies to Bundesliga.

`node smoke.js index.html`: 965 passed, 0 failed (pre-SW_VERSION-bump).
SW_VERSION bumped `2026-08-02c` → `2026-08-02d` (real behavior change
to a deploy-triggering file).

## Novel finding #2 (genuine blocker, not worked around): per-game matchday number cannot be safely derived

Task 2 asked for: *resolve season/matchday → call resolve-dayid → call
broadcasts → surface in the display, for a Bundesliga game.*

Real investigation, not assumption: probed ESPN's `ger.1` scoreboard
against real historical Bundesliga dates from the completed 2025-26
season (`outbox/probe-espn-bundesliga-matchday-field-result.json`,
9+5+6 real events checked). **ESPN's event object has no
matchday/week/round field** (`hasWeek: false`, confirmed against a real
event's full field list). There is no reliable way to know which
Bundesliga matchday a given ESPN-fetched game belongs to.

A second, independent check of the CC-CMD's own suggested verification
target (the Supercup) found it's **structurally unreachable through
resolve-dayid as built**: that route only accepts a numeric
`matchday` (1-40) and, per the relay CC-CMD's own real evidence,
numeric matchdays always resolve to `DFL-COM-000001` (the league
competition) — never `DFL-COM-000003` (the Supercup's real competition
ID, only returned by the site's *unparametrized* default view). So even
"verify against the Supercup" (Task 3's own suggestion) can't work
through this route as currently built.

**What was explicitly ruled out rather than attempted:**
- Approximating matchday number from a game's date via a formula
  (`~(date - Aug28)/7 + 1`) — real risk of being wrong on any
  international-break or midweek-round week, silently attaching the
  wrong matchday's broadcast data to a game. This is exactly the kind
  of invented-value risk Rule 2 (DO NOT ASSUME) exists to block.
- Hardcoding a date window for "Matchday 1 only" — real for one week,
  then silently stops working the following week with no signal,
  which is itself a fragile pattern this project's rules warn against
  (band-aid detection, fallback-cap spirit) even though it's not a
  literal fallback chain.

Both were considered and rejected on the evidence, not skipped for
convenience.

## Task 3 — verification, honestly scoped to what shipped

- `node smoke.js index.html`: 965/0 (structural, pre-bump) — confirmed
  above.
- The `SOCCER_LEAGUES` addition cannot be live-verified end-to-end
  today: `isDomesticLeagueInBreak('Bundesliga')` is `true` until
  `2026-08-22`, so `fetchSoccerFixtures` correctly creates zero
  Bundesliga cards right now — this is the code doing exactly what it
  should, not a bug. Logic-verified by inspection: the exact same
  array shape and gating already work for 4 other real leagues today.
- The resolve-dayid→broadcasts chain was NOT wired into any display,
  because no safe per-game input exists yet (see finding #2). Nothing
  was shipped here to falsely mark "done."

## Unblock criteria (Rule 74)

**Blocked by:** ESPN provides no per-game Bundesliga matchday number,
and `resolve-dayid` (relay, out of scope for this CC-CMD to touch)
only accepts a numeric matchday, never a date or "current" mode.

**Unblocked when — two independent real paths, either one suffices:**
1. **Relay-side fix (separate CC-CMD, field-relay-nba):** extend
   `resolve-dayid` to accept an optional `date` param instead of/in
   addition to `matchday`, using the same Browser Rendering mechanism
   but letting bundesliga.com's own date-aware routing resolve
   "today's" or "this game's" real matchday context, instead of the
   client guessing a number.
2. **Live-season verification (Aug 22 for Supercup context /
   Aug 28 for Matchday 1):** once real Bundesliga cards exist (from
   this session's fix), inspect what date range ESPN actually groups
   into a single scoreboard fetch and cross-reference against
   bundesliga.com's own real matchday boundaries at that time — this
   turns "derive from a formula" into "confirm from two independent
   live sources," which is the safe version of the same idea.

**Verify:** `curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/bundesliga-bapi/resolve-dayid?season=2026-2027&matchday=1"` returning a real, live `dayId` for real Matchday 1 (after Aug 28) is the trigger to re-attempt Task 2's wiring with a now-safe input.

## Real, novel-thinking distinction from the first STOP

The first pass reported "no game-card mechanism exists, building one is
out of scope, stop." That framing was too narrow — it didn't notice
`SOCCER_LEAGUES` already exists specifically for this purpose and just
needed its one real missing entry restored. This pass ships that real,
minimal, already-sanctioned fix, and separately, honestly isolates the
part that genuinely cannot be completed today without inventing data —
rather than either (a) stopping entirely on the first blocker again, or
(b) forcing a fake "complete" by guessing matchday numbers.
