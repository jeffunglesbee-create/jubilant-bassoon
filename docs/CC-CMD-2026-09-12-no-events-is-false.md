# CC-CMD-2026-09-12 — "No major events on Yesterday" is false

Surfaced the moment `5f171c06` stopped the renderer discarding it. The message
was always being generated; nobody could see it.

## Measured

`outbox/odds-line-probe-manifest-20260912T180809Z.json`, live, SW `2026-09-12i`:

```
date_nav_check.failure_kind: "no-events"
note: "No major events on Yesterday Try a different date with the ‹ › arrows"
```

2026-09-11 was not an empty day. The relay's own census for that date reports
**42 rows across 9 sport labels**, and `/v2/games?sport=mlb&date=2026-09-11`
returns **15 completed games**, eight of them carrying opening AND closing odds.

`goToDate` reaches its `!sections.length` branch, so `scheduleResult.sections`
is `[]` — either `fetchESPNFixturesForDate` returned `null` (its `!anyData`
path) and `fetchDateSchedule` then returned an empty `rows`, or the ESPN sweep
returned an empty array. The branch is honest about what it was handed; what it
was handed is wrong.

## Why this is worse than a blank page, not better

A spinner says "still working". "No major events on Yesterday" is a **claim
about the world**, and it is false. This repo's first rule is DO NOT INVENT.
A user who navigates back one day is now told there was no sport yesterday.

## Tasks

0. **Probe.** Which of the two produced the empty array — instrument
   `fetchESPNFixturesForDate`'s `anyData` and `_leagueFailures`, and
   `fetchDateSchedule`'s `rows.length`, for a past date. **The artifact is a
   committed manifest carrying both numbers**, not a conclusion about them.
1. **Read `fetchESPNFixturesForDate` at HEAD** and say why a date with 15 real
   MLB games yields `anyData === false`. The per-league `try` swallows every
   failure into a counter; check whether `_leagueFailures` equals the league
   count, which would mean every fetch failed rather than every fetch being
   empty.
2. **Fix so the message matches the data.** If the fetches failed, the honest
   branch is `fetch-error` with Retry, not `no-events`. Those two are already
   distinguishable in the DOM (`data-failure`) — this is about picking the right
   one, which requires the sweep to report WHY it has nothing.
3. **Mutation (Rule 90).** Force each of: all leagues empty, all leagues
   failing, and a mix. Assert `no-events` only for the first.
4. **Done condition.** A committed manifest where stepping back one day either
   renders cards, or renders `fetch-error`, for a date the relay census shows
   has rows. `no-events` on such a date is the failure being fixed.

## Automated follow-up

`odds_line_probe.js` now cross-checks the claim against the relay: when
`failure_kind === 'no-events'`, it asks `/context/date/<that date>` and FAILS
the run if the archive has rows. The claim is no longer taken at face value by
the check that reads it.
