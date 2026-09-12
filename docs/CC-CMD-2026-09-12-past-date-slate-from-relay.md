# CC-CMD-2026-09-12 — source past-date slates from the relay, not ESPN

Option B of `CC-CMD-2026-09-12-no-events-is-false` Task 2. **Both halves planned
here (Rule 70).**

## Probe results — already measured, do not re-derive

| fact | value | how |
|---|---|---|
| ESPN scoreboard, `dates=20260911`, mlb | HTTP **200**, `events: 0` | live page, CI, `manifest-20260912T183331Z` |
| relay `/v2/games?sport=mlb&date=2026-09-11` | **15 games**, `source: "espn-wc"` | `probe_relay_route` |
| relay `/v2/games?sport=epl&date=2026-09-11` | `0 games` — no EPL fixtures that Friday | `probe_relay_route` |
| relay `/context/date/2026-09-11` | **24 rows** | probe |

ESPN's scoreboard genuinely serves nothing for that past date. The relay serves
the same day's games, ESPN-derived, through a route the client already calls.

## RELAY HALF — no change required

`/v2/games?sport={key}&date={iso}` already accepts an arbitrary past date and
returns the full game shape. Verified above on two sports, one with games and one
without, so both the populated and empty answers are confirmed.

**Task R1.** Re-run both probes at execution time and paste the counts into the
outbox manifest. If either has changed, STOP — the client half's premise is gone.
No relay code, no deploy, no contract change.

## CLIENT HALF

### The shape already exists

`injectV2SportSection(sportKey, sectionLabel)` (`field.js:15661`) already maps V2
data into the exact `allData.sports` section shape:

```js
{ home, away, _id: e._gameId || e.espnEventId || k,
  league: sectionLabel, _sport: sectionLabel, _section: sectionLabel,
  start_time, state, confirmed: true, round,
  homeCuratedRank, awayCuratedRank }
```

It sets **no `streams`** — injected sections render without stream chips today,
which is the shipped behaviour for CFB, NFL, WNBA, MLS and eleven more. So there
is no `resolveBundle` mapping to invent, and **no Rule 64 band-aid** — the reason
`/context/date` was rejected in favour of this route.

But it reads `espnScores`, which the V2 poll fills for TODAY only. It does not
fetch.

### Tasks

1. **Extract the section labels into a map.** Nineteen `injectV2SportSection('x',
   'Label')` call sites carry the label as a literal and there is no table. Build
   `V2_SECTION_LABEL` from those exact strings — `grep -n "injectV2SportSection('"`
   and copy them, do not invent — plus the three the ESPN sweep owns:
   `mlb: 'Baseball (MLB)'`, `nba: 'NBA Playoffs'`, `nhl: 'NHL Playoffs'`, read
   from `FETCH_LEAGUES`'s own `section` fields. Point every existing call site at
   the map so there is one source, not twenty. **Artifact: a diff where every
   removed literal appears in the map, verified by a script that compares the two
   sets and prints both counts.**

2. **`fetchRelayDateSections(iso)`.** Fan out `fetchV2Games(key, iso)`
   (`field.js:15188`, already written, already error-handled, 6s timeout) over
   the enabled `FIELD_V2_SOURCES` keys in parallel. Map each game with the SAME
   field list as `injectV2SportSection` — extract that mapping into one shared
   function rather than copying it. Drop sports with zero games. Return
   `[{sport, section, games}]` or `null` when every sport is empty.

3. **Wire it for PAST dates only.** In `goToDate`'s unknown-date path, when
   `iso < TODAY_ISO`, use `fetchRelayDateSections(iso)` in place of
   `fetchESPNFixturesForDate(iso)`. Future dates keep the existing chain
   untouched — ESPN serves those and nothing measured says otherwise.
   Fallback depth stays at 2 (`relay || AI`), so **Rule 76** is not breached.

4. **Mutation (Rule 90).** Three, each caught by its own property: the map
   missing one sport (that section vanishes); `fetchV2Games` rejecting for one
   sport (the others still render); every sport empty (the `no-events` note, not
   a blank page).

5. **Done condition.** A committed probe manifest where stepping back one day
   gives `cards > 0` AND `failure_kind: null`. The current red —
   `failure_kind: "no-events"` with `archive_rows_for_claimed_empty_date: 24` —
   is exactly the assertion that must flip, and it already runs on every probe
   invocation.

## Not in scope

Today's path (`fetchSchedule`), the odds layers, and `applyMainHTML`. The
zero-change fast path was fixed in `5f171c06` and is not to be touched again here.
