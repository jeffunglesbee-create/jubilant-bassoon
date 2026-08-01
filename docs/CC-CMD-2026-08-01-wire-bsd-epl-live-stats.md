# CC-CMD-2026-08-01-wire-bsd-epl-live-stats

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-01-wire-bsd-epl-live-stats.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## What's real, confirmed live today, and what isn't yet

The relay's `/bsd/events/{id}/shotmap` and BSD's underlying `stats`
frame shape carry genuinely rich, live, per-minute data — confirmed via
the relay's own `/bsd/contract` doc and a real probe: `home_xg`/
`away_xg`, `possession_home`, shot-level events with pitch coordinates
and player names, `average_positions`. `bsdLeagueId: 1` is configured
for EPL (`season: '2026-27'`, matching the confirmed current season).

**This is currently completely disconnected from the client** — confirmed
via direct grep, zero references to `bsd/events` or `bsdLeagueId`
anywhere in `field.js`. This task closes that gap, for the live case only.

**A real, separate bug was found and must not be relied on:** `season=`
on `/bsd/events/season` does not filter results — identical `count` and
identical first-page dates were returned across three different season
values. `date=` on `/bsd/events/by-date` also does not reliably filter
— requesting `2026-07-25` returned a match dated `2026-11-08`. **Do not
build anything that depends on searching BSD by season or date range.**
Direct lookup by a known real `event_id` was confirmed reliable (a
genuinely future match's shotmap correctly returned all-empty/null
fields with `status: "notstarted"` — the shape and status field are
trustworthy, only the list-search filtering is not).

---

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Re-confirm today's two findings fresh: zero client callers of BSD-EPL
  data, and the season/date filter bug (try the same probes again —
  BSD's upstream may have changed).
- Determine how to reliably get the correct BSD `event_id` for a real,
  currently-live EPL match WITHOUT using the broken date/season search.
  Likely approach: match on team names (home/away) via BSD's per-event
  `home_team`/`away_team` strings, joined against whatever team
  identifiers the client already has for EPL from FD/PulseLive/ESPN —
  same shape as how MLB's real `gamePk` was resolved via team-name
  matching against `statsapi.mlb.com`'s schedule earlier today, not by
  guessing an ID. If BSD exposes any other reliable "today's live
  matches" endpoint (check `/bsd/events/live` specifically — this
  was NOT tested today, only season/by-date were), prefer that over
  team-name matching if it works.

## Task 2 — Wire the live stats, scoped narrowly

- For a live EPL match already identified by the client (via FD/
  PulseLive/ESPN), resolve the matching BSD `event_id` (Task 1's
  method) and fetch `/bsd/events/{id}/shotmap` for `home_xg`/`away_xg`/
  `possession_home`.
- Surface this as real match context (journalism enrichment is the
  most direct, lowest-risk use — "City led xG 1.4 to 0.6 at halftime"
  is a genuine, checkable factual claim, not a composite score).
- Do NOT wire shot-level coordinates, average positions, or the live
  ball-position stream in this pass — those need their own scoping
  (visualization, coordinate-system verification per the contract's
  own "provisional" flag) and are a larger, separate task.
- Given EPL's season hasn't started (Gameweek 1, Aug 21), this cannot
  be tested against a real live match yet. Build and verify the code
  path with a real historical event_id instead if one can be reliably
  found (Task 1), or clearly document that live verification is
  pending the actual season start if it cannot.

## Task 3 — Smoke + verify

- `node field_smoke.js` / `smoke.js` (confirm current name fresh) —
  0 failures required.
- Whatever verification is possible before Aug 21 — a real historical
  match's populated stats if Task 1 finds a reliable way to reach one,
  or an honest statement that this is code-complete but live-unverified
  pending the season start.

---

## Explicitly NOT in scope

- Shot coordinates, average positions, live ball-position stream —
  separate, larger task.
- Any code that queries BSD by season or date range — confirmed
  unreliable today, do not build around it even defensively (no
  fallback-with-retry logic either — if this needs to work, it needs
  the real fix of finding a reliable identification method, not a
  workaround for the broken one).
- Backfilling historical EPL matches — same date-search blocker,
  separate concern from wiring the live case.

---

## Outbox

`outbox/cc-session-2026-08-01-wire-bsd-epl-live-stats.md`: the real
event-ID resolution method chosen, whether `/bsd/events/live` turned out
to be a cleaner path than team-name matching, and honest confirmation of
what could vs. couldn't be verified given the season hasn't started.
