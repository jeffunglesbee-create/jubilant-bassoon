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

## Tasks 0 and 1 — ANSWERED 2026-09-12, and the answer moves the fix

`outbox/odds-line-probe-manifest-20260912T183331Z.json`, measured from the live
page in CI:

```
espn_mlb_probe: { "status": 200, "events": 0 }
archive_rows_for_claimed_empty_date: 24      (relay /context/date/2026-09-11)
```

**ESPN answers 200 with zero events.** The sweep is not failing and it is not
swallowing anything — `site.api.espn.com/.../baseball/mlb/scoreboard?dates=20260911`
genuinely returns an empty `events` array. So `anyData` is correctly false, and
the `no-events` branch is honest about what it was handed.

**The relay has the same day's games.** 24 rows in the archive, and
`/v2/games?sport=mlb&date=2026-09-11` returned **15 completed games** earlier
today with `source: "espn-wc"` — ESPN-derived data, fetched by the relay, for
the exact date the client's own ESPN call calls empty.

So the client is asking the wrong source for a past date, not asking it badly.
Neither `fetch-error` nor `no-events` is the right message, because neither the
fetch nor the day is the problem.

### What that changes

Task 2 below was written as "pick the right message". That is now the wrong
fix: it would make the client honest about a gap it does not need to have. The
relay serves past dates and the client already talks to it everywhere else.

**Revised Task 2: for a date that is not today, source the slate from the relay
(`/v2/games` per sport, or `/context/date/{iso}`) rather than
`fetchESPNFixturesForDate`.** `no-events` then means what it says, and
`fetch-error` covers a relay that is unreachable.

Scope note (Rule 69): that is a source change on the date-nav path only. It must
not touch today's path, which works and is the hot path.

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
