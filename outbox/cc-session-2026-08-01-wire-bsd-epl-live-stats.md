# CC Session — wire BSD EPL live stats
**Date:** 2026-08-02 (executing 2026-08-01's queued CC-CMD)
**CC-CMD:** docs/CC-CMD-2026-08-01-wire-bsd-epl-live-stats.md
**Repo:** jubilant-bassoon
**HEAD at close:** 67e7885c

---

## Task 1 — event_id resolution, simpler than the CC-CMD anticipated

Re-verified fresh: zero client callers of BSD-EPL data (confirmed, before
this session). The CC-CMD's Task 1 asked how to reliably resolve a BSD
`event_id` without depending on the broken date/season search.

**Real answer: no new resolution logic was needed at all.** The relay's
`handleV2Games` already runs a generic BSD live-enrichment block (no
sport restriction — confirmed by direct read, `src/index.js` ~3624) that
matches ANY sport's games to `/api/v2/events/live/` by team name and
sets `g.bsdEventId`. This is the exact mechanism already powering the
client's existing pitch/momentum feature (`field.js:14634`, `:30855`,
`:30985` — pre-existing, unrelated to this task). Once `epl:true` and a
real live match exists, `game.bsdEventId` will already be populated by
the time client code runs — confirmed via source read, not assumed.

Also re-confirmed the season/date search bug fresh — and it's since been
fixed relay-side this same session (`field-relay-nba` commit `101d201`,
`date_from`/`date_to` and `season_id`, not `date=`/`season=`). Doesn't
change this task's approach either way, since it never depended on
date/season search — noted for completeness per Rule 72.

## Task 2 — wired, scoped narrowly, real bug caught before writing code

**Pre-build probe (Rule 68) caught a real bug**: the CC-CMD assumed BSD's
shotmap fields were named `home_xg`/`away_xg`/`possession_home`. Probed
a real finished EPL match (BSD event 383, West Ham 3-0 Leeds, 2026-05-24,
found via `date_from`/`date_to` now that it works) before writing any
code — real shape is `stats.home.expected_goals` /
`stats.away.expected_goals` / `stats.home.ball_possession` /
`stats.away.ball_possession`. Wrote the client against the real shape.

New `_applyBSDMatchStats(games)` (`field.js`, next to
`_applyPLFinalDayNote`/`_applyLayer4CrossGameFacts`): fire-and-forget,
scoped to games with a live/final ESPN state AND a real `bsdEventId`.
Fetches `/bsd/events/{id}/shotmap`, sets `g.bsdXG`/`g.bsdPossession`.
Wired into the journalism context-line builder as a new `[XG]` factual
line — genuine, checkable match stats (xG, possession), not a composite
interest score. Clears ADR-002 Rule F (commodity data a neutral vendor
like ESPN/Opta would publish) trivially — no relay-side scoring
involved at all, this is pure client-side consumption of a factual
relay-proxied stat.

**Explicitly not wired** (per CC-CMD scope): shot coordinates, average
positions, live ball-position stream — all deferred, matching the
CC-CMD's own exclusion list.

## Task 3 — verification

Direct evaluation (this session's established pattern): extracted the
exact committed `_applyBSDMatchStats` function body, ran it against real
BSD event 383 data plus a negative control (a game object with no
`bsdEventId`). Both the positive case (xG/possession populated
correctly) and negative case (untouched game stayed untouched) passed.

`smoke.js`: 965 passed, 0 failed. `field_smoke.js`: 0 failures.
`field_unit.js`: 66 passed, 0 failed.

**Honest limit, stated per Rule 61/74**: EPL's 2026-27 season hasn't
started (Gameweek 1, Aug 21 — confirmed fresh this session via ESPN and
FPL, both agree). No real live EPL match exists right now to exercise
the full path end-to-end (relay match → real `bsdEventId` → shotmap →
context line, all live). This is code-complete and verified against
real BSD data via direct evaluation, but genuinely E2E-unverified until
the season starts.

**Unblock criteria (Rule 74):** blocked by the EPL season not having
started. Unblocks automatically Aug 21 2026 (Gameweek 1 kickoff, already
confirmed real via FPL fixtures). Verify then: find a live EPL game via
`probe_relay_route /v2/games?sport=epl&date=<live-date>`, confirm it has
a real `bsdEventId`, then confirm a journalism brief generated for that
game's context includes a `[XG]` line with non-null values.

## SW_VERSION

`2026-08-01a` → `2026-08-01b` (both index.html/field.js and sw.js;
`2026-08-01a` was already used by an intervening commit today).

## File-size note

index.html was at 2,599,988 bytes before this commit (12 bytes of
headroom under the 2,600,000 structural ceiling). Trimmed this commit's
own new comments to near-nothing, plus two of today's earlier
same-session comment blocks (PL Final Day / Layer 4 headers), disclosed
here rather than silently bundled. Zero logic changes — re-verified via
smoke + the direct-evaluation test after each trim.

---

## Explicitly NOT touched (per CC-CMD scope)

- Shot coordinates, average positions, live ball-position stream.
- Any code path querying BSD by season or date range.
- Historical EPL match backfilling.

## Carry-forwards

None requiring a new CC-CMD. Live E2E verification is pending the
2026-27 EPL season start (Aug 21), with explicit unblock criteria stated
above per Rule 74 — not an open-ended carry-forward.
