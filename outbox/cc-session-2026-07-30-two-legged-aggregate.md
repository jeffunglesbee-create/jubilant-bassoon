# CC Session — two-legged-aggregate (STOPPED — confidence gate, no commit)
**Date:** 2026-07-30
**CC-CMD:** docs/CC-CMD-2026-07-30-build-two-legged-aggregate-tracking.md
**Repo:** jubilant-bassoon
**Confidence for Task 2 as scoped: below 95. No code committed for this CC-CMD.**

---

## Task 1 findings — re-verified fresh, and they change the premise

**Second-leg detector, re-confirmed:** `elimination_boost()` (src/legacy/field.js
~8554-8580) is a text-match on `(g.league||'').toLowerCase()`, still zero
awareness of actual scores. Its output flows into `g.narrative`/
`g._gameImportance`/`g._series` via `applyNarrativeContext()`. Traced
every consumer of those three fields fresh (not trusting the CC-CMD's own
"exactly two consumers" summary) — there are actually many more consumers
than that (sort scoring at ~6211-6212/7560/25856, card CSS classes, drama
gateway state at ~34885/34920). **But the CC-CMD's narrower, actually
load-bearing claim is confirmed accurate**: `dramaScoreLive`'s full body
(21844-22014) contains zero references to `narrative`/`_gameImportance`/
`_series` — the detector genuinely cannot affect live scoring, regardless
of how many other things it touches.

**First-leg score data — confirmed absent, as the CC-CMD anticipated, but
worse than expected:** `game.series.homeAggregate`/`awayAggregate` exist
as a shape `buildRoundBadge()` (~3970-3983) already knows how to render
("Agg: X-Y") — but grepped the ENTIRE file for `homeAggregate`/
`awayAggregate`: they appear in exactly that one read site and nowhere
else. Nothing anywhere writes them. This UI code has been dead since it
was written.

**Away-goals rule, verified live via web search (not assumed from
training knowledge):** confirmed abolished across all UEFA club
competitions since the 2021-22 season. No away-goals-adjusted logic
should be built. [UEFA's own announcement](https://www.uefa.com/uefachampionsleague/news/0295-1cd662315a16-d45212883270-1000--away-goals-rule-why-uefa-scrapped-it-for-the-champions-lea) /
[corroborating coverage](https://sports.yahoo.com/articles/no-champions-league-away-goals-192400683.html).

---

## The blocker Task 1 surfaced that the CC-CMD did not anticipate

Investigated where UCL live scores actually come from before building
anything on top of them (Rule 71 — read before write):

1. `fetchSoccerFixtures()` (the ESPN-direct soccer fetcher, ~18719) loops
   over `SOCCER_LEAGUES.map(...)` — **`SOCCER_LEAGUES = []`** (confirmed
   at ~14046-14051, with its own comment: "All soccer now on
   api-sports.io V2... This array retained for any future ESPN-only
   soccer additions"). This function currently iterates zero leagues and
   does nothing.
2. Live soccer scoring is supposed to come from `fetchV2AllScores()` →
   `fetchV2Games(sport, date)`, gated by `FIELD_V2_SOURCES` (~14152).
   **`ucl: false, europa: false, conference: false`** — flat booleans,
   with comment `// European — season ended, re-enable 2026-27`. Unlike
   `wc26`/`nfl` in the same object, which use a real date-gate expression
   (`new Date() >= new Date('...')`), these three are hardcoded off with
   no gate at all. This flag is stale: UCL qualifiers have been live
   since July 7, 2026 (verified this session), but nobody flipped it.
3. **Verified independently that even the relay side isn't currently
   serving real UCL data either** — probed `field-relay-nba`'s own
   `/v2/games?sport=ucl&date=2026-07-29` directly: `{"games":[],"count":0,
   "source":"espn-wc"}`. Cross-checked against a direct ESPN probe for the
   same date (`site.api.espn.com/apis/site/v2/sports/soccer/
   uefa.champions_qual/scoreboard`): a real completed match exists for
   that exact date (Omonia Nicosia at Kairat Almaty, 2nd Leg, FT-Pens,
   `"series":{"competitors":[{"aggregateScore":1.0},...]}`). Ruled out
   "just an off-day" by probing a confirmed-enabled source
   (`sport=wc26`) for the same date — also empty, but that's plausible
   (no WC26 games that specific day); the UCL case is different because a
   real game is independently confirmed to exist and the relay didn't
   serve it.

**Conclusion:** UCL/Europa/Conference currently have no functional live
score pipeline end to end — disabled client-side (`FIELD_V2_SOURCES`)
and, independently, not actually served by the relay's own `ucl` handler
for at least one confirmed real match date. `dramaScoreLive` never
receives real `eData` for these games right now (`if(!eData) return 0`
fires immediately), regardless of what aggregate-context logic gets
added to it.

---

## Why this stops the task here, per the confidence gate

Building aggregate-tracking logic into `dramaScoreLive`'s soccer branch
right now would be:
- **Unverifiable end-to-end** — no live UCL score ever reaches it to test
  against, so "confirm the live drama score for that second leg now
  reflects the aggregate context" (Task 4's own requirement) cannot be
  satisfied with a real artifact, only a synthetic one that proves
  nothing about production behavior.
- **Likely dead code today** — Rule 63 (no dead code in commits): the
  code would have zero real callers until two separate, un-scoped fixes
  land first (client `FIELD_V2_SOURCES` flip + relay `ucl` handler fix).
- **Partly cross-repo** — the relay-side gap is out of this CC-CMD's
  scope (jubilant-bassoon only) and would need its own CC-CMD in
  field-relay-nba, planned atomically per Rule 70, not improvised here.

Per explicit instruction ("Do not commit unless confidence >= 95. If
score < 95, report verbatim and stop"): stopping. No code committed for
this CC-CMD.

---

## What WOULD need to happen, in order, for this to become buildable

1. **field-relay-nba CC-CMD**: diagnose why `/v2/games?sport=ucl` doesn't
   return the confirmed-real 2026-07-29 match. Check whether the handler
   needs a qualifying-round-specific param, a different upstream league
   ID, or is simply unimplemented for qualifiers. Confirm whether
   api-sports.io (or whatever upstream the relay uses) exposes aggregate/
   leg data at all for two-legged ties, mirroring what ESPN's public API
   already provides natively (`"leg":{"value":2,...}`,
   `"series":{"competitors":[{"aggregateScore":1.0}]}` — confirmed live
   via direct ESPN probe this session, real shape, real values).
2. **jubilant-bassoon fix**: once the relay serves real UCL data, flip
   `FIELD_V2_SOURCES.ucl/europa/conference` from flat `false` to a real
   date-gate (mirroring the `wc26`/`nfl` pattern already in the same
   object) so live scores actually populate `eData` for these
   competitions again.
3. **Then** this CC-CMD's actual ask (aggregate-context bonus in
   `dramaScoreLive`, mirroring `upsetBonus`'s additive/capped/conditional
   pattern) becomes buildable and verifiable against a real live match.

---

## What remains untouched, confirmed still absent (per the CC-CMD's own scope notes)

- Layer 2 (Bundesliga/Serie A/Ligue 1 relegation data) — confirmed
  completely absent, not attempted.
- Layer 4 (simultaneous multi-game awareness) — confirmed to not exist as
  any reusable mechanism, not attempted.

---

## Carry-forwards

1. **field-relay-nba CC-CMD needed**: diagnose/fix `/v2/games?sport=ucl`
   (and `europa`/`conference`) not serving real live qualifier data;
   confirm whether aggregate/leg data is available upstream to pass
   through, matching ESPN's already-confirmed shape.
2. **jubilant-bassoon follow-up CC-CMD needed** (blocked on #1): flip
   `FIELD_V2_SOURCES.ucl/europa/conference` to a real date-gate; wire
   aggregate context into `dramaScoreLive`'s soccer branch once real live
   data is confirmed flowing.
3. Both explicitly NOT completed here — this is a documented blocker, not
   a deferred "nice to have."
