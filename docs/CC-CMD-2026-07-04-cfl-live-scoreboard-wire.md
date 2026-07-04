# CC-CMD: Wire the real, live CFL scoreboard relay endpoint to the client — currently dormant since June 27

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Replace the static, score-less `cflGames` hardcoded array
(index.html ~11891) with a live fetch against the relay's
`/cfl/scoreboard/rounds` endpoint.

**Why — real, dormant, already-working infrastructure, not new work:**
A June 27 2026 session found, tested, and wired a genuinely live CFL
scoreboard API into the relay: `cflscoreboard.cfl.ca`, discovered via
the open-source `ha-teamtracker` project's `provide_cflscoreboard.py`
after confirming ESPN's CFL data is dead (frozen since 2023) and TSN/CBS
have no public API. The relay's `/cfl/scoreboard/rounds` route has been
live since relay commit `4bcaaebc4e` and is confirmed working TODAY
(2026-07-04) with real, accurate data — verified live, not assumed:
Calgary 58 – Toronto 36 and Ottawa 22 – Saskatchewan 27 (both matching
independent verification against CFL.ca's own real results), and
today's BC Lions vs Edmonton Elks correctly showing `"status":
"scheduled"`. **The client has never called this endpoint — confirmed
via exhaustive grep, zero matches for `cfl/scoreboard` anywhere in
index.html.** CFL has been rendering from a static array with no score
field at all (home/away/time/venue only) despite this real, accurate,
30-second-refresh live source sitting unused in the relay for over a
week.

**Real data shape, confirmed live 2026-07-04** (re-verify before
implementing, this doc's snapshot may drift):
```json
{
  "id": 1420016, "status": "playing", "name": "Week 5", "type": "REG",
  "startDate": "2026-07-03T00:00:00+00:00", "endDate": "2026-07-05T23:59:00+00:00",
  "tournaments": [{
    "id": 13419690, "date": "2026-07-04T23:00:00+00:00", "status": "scheduled",
    "homeSquad": {"id": 93775, "name": "BC Lions", "shortName": "BC", "score": 0},
    "awaySquad": {"id": 114347, "name": "Edmonton Elks", "shortName": "EDM", "score": 0},
    "clock": null, "winner": null, "activePeriod": null
  }]
}
```
Round-level `status` values observed: `"complete"`, `"playing"`.
Tournament(game)-level `status` values observed: `"complete"`,
`"scheduled"` — confirm whether a live in-progress game reports
`"live"` or something else at the tournament level by checking during
an actual live window if possible; do not assume the label without
checking, since only pre/post states were observed in this session's
verification.

**Target time:** ~40 min (real integration work, not a one-line fix)

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress — the relay endpoint itself
  must be reached via the CI-as-proxy pattern (cf-probe / outbox trigger
  commit) for verification, same as every other live-relay check this
  session
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK (run before any edits)
```bash
grep -n "const cflGames = \[" index.html
grep -n "cfl/scoreboard" index.html
grep -n "^async function fetchSchedule" index.html
```
Then, via CI-as-proxy (outbox trigger commit, same pattern as every
other live-relay check this session), re-fetch
`https://field-relay-nba.jeffunglesbee.workers.dev/cfl/scoreboard/rounds`
and confirm the response shape still matches this doc's snapshot before
writing any mapping code — do not assume the shape is unchanged from
2026-07-04 without checking.

## TASK 1 — Fetch and map live CFL data

Find the section building `cflGames` (index.html ~11891) inside
`buildTodaySchedule` (or wherever the section-array assembly for the
day's sports currently lives — re-verify the exact function via probe).
Replace the static array with an async fetch against
`{relayBase}/cfl/scoreboard/rounds`, following the SAME async-injection
pattern already established for golf's `slashGolfPrefetchAll`/
`loadPGASlate` (index.html ~15386) — i.e., this section should NOT
block the initial render; it populates/backfills the CFL section
similarly to how golf's live data arrives after initial paint.

Mapping, per real observed fields:
- Find the round where `todayStr` falls within `[startDate, endDate]`
  (both ISO 8601, already in the exact format `isToday`/date-comparison
  helpers elsewhere in this file expect — reuse an existing date-range
  helper if one exists rather than writing a new one; check for one via
  probe before assuming none exists).
- For each `tournaments[]` entry in that round: `home` = `homeSquad.name`,
  `away` = `awaySquad.name`, `start_time` = the tournament's `date`
  field directly (already correct ISO 8601 UTC), plus new fields this
  hardcoded array never had before: `homeScore`/`awayScore` from
  `homeSquad.score`/`awaySquad.score`, and a `state` derived from the
  tournament-level `status` (map `"complete"` → whatever this codebase's
  existing final-state convention is — check `getCardCircadian`/
  `isGameOver`'s expected input shape via probe rather than inventing a
  new convention).
- Preserve existing fields the current hardcoded entries carry that the
  live source doesn't provide (`league` label, `venue`, `streams` via
  `resolveBundle`) — these still need to come from somewhere. Check
  whether keeping a SMALL static lookup table (team → venue, e.g.) makes
  sense here, or whether `venue`/`streams` should be dropped/simplified
  for CFL specifically. Do not silently drop the streaming-link
  information that existing users rely on without an explicit decision;
  flag this in the outbox if uncertain rather than guessing.

## TASK 2 — Decide, don't assume, what happens to the old hardcoded array

Given the live source now covers real games with real scores, the old
`cflGames` array (schedule-only, home/away/time/venue, no scores) should
likely be REMOVED once the live fetch is confirmed working — but this
CC-CMD does not mandate that decision unilaterally. If the live fetch
works cleanly end-to-end (Task 1 + Task 3's verification), remove the
hardcoded array in the same commit rather than leaving dead, duplicate
data behind (matching this session's `golfGames`-is-intentionally-empty
precedent, where hardcoded data and a live source coexisting caused a
real, confirmed duplicate-rendering bug earlier today). If anything about
the live fetch's reliability is uncertain by the time this ships, keep
the hardcoded array as an explicit fallback ONLY (used if the live fetch
fails) rather than as a competing, simultaneously-rendered source — state
which path was taken and why in the outbox.

## TASK 3 — Live verification via CI-as-proxy

Confirm, via a real outbox-trigger probe (not just code review):
1. The live fetch correctly returns today's real CFL game(s) with
   correct scores/status.
2. If a hardcoded fallback was kept (Task 2), confirm it only activates
   when the live fetch genuinely fails (simulate via probe if possible),
   not simultaneously with live data (avoiding a repeat of today's golf
   duplicate-section bug).
3. Circadian classification (`getCardCircadian`) correctly reads the new
   live `state`/status fields for CFL games — this directly affects
   `CC-CMD-2026-07-04-circadian-card-sort-order`'s sort behavior and
   `getNewspaperVoice`'s bucketing, both of which currently always see
   CFL as `LATE` (no recognized live-state field, confirmed earlier this
   session) — verify whether this wiring changes that classification,
   and if so, whether that's correct/desired, rather than assuming it
   either does or doesn't change without checking.

## SCOPE BOUNDARY

DO:
- Wire the live fetch as specified, following the golf-style async-injection pattern
- Make an explicit, stated decision about the old hardcoded array (Task 2)
- Verify live via CI-as-proxy, not just code review
- Check the circadian-classification interaction (Task 3.3) explicitly
- Bump SW_VERSION
- Add smoke assertions appropriate to what's actually built (count TBD by CC based on real implementation)

DO NOT:
- Touch the relay (`field-relay-nba`) — the endpoint is already live and working, this CC-CMD is client-only
- Touch golf's `golfGames`/`loadPGASlate`/Slash Golf systems — separate, already-correct, unrelated
- Invent a `state`/status mapping convention without checking what `getCardCircadian`/`isGameOver` actually expect first
- Silently drop venue/streaming-link info without flagging the decision explicitly

## DONE CONDITIONS
- [ ] Probe block re-run, live endpoint re-confirmed with current real data before implementing
- [ ] Live fetch implemented, correctly scoped to today's/current round
- [ ] Explicit, stated decision made and justified on the old hardcoded array (kept as fallback-only, or removed)
- [ ] Venue/streaming-link handling decided explicitly, not silently dropped
- [ ] Circadian classification interaction (Task 3.3) checked and reported, not assumed either way
- [ ] Live verification via CI-as-proxy showing real, correct data end-to-end
- [ ] `node smoke.js index.html` exits 0
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped
- [ ] Outbox manifest written to `docs/outbox/cc-cfl-live-scoreboard-wire-{date}.md`

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation of a live, in-progress CFL game (not just pre/post states) to confirm what status label and clock/period data actually looks like while `"playing"` — this session's verification only observed complete and scheduled games, never an in-progress one.

## COMPLIANCE
- Rule 68: probe block first, including re-verifying the live shape hasn't drifted
- Rule 87: self-completing on the CC-verifiable portion; live in-progress-game observation is necessarily deferred

## CONFIDENCE SCORING TABLE
+25  Live fetch correctly implemented and mapped, matching real confirmed field names
+20  Explicit, justified decision on the old hardcoded array (not left ambiguously coexisting)
+15  Venue/streaming-link handling explicitly decided
+15  Circadian classification interaction checked and reported
+15  Live verification via CI-as-proxy, real current data
+10  CI confirms deployed, smoke clean

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-cfl-live-scoreboard-wire.md.
Re-confirm the live relay endpoint's real current shape first (CI-as-
proxy) — do not assume this doc's 2026-07-04 snapshot is still exact.
Wire the fetch following golf's async-injection pattern. Make an
explicit decision on the old hardcoded array rather than leaving both
paths coexisting (that caused a real duplicate-rendering bug earlier
today with golf) -- state which path was taken and why. Check whether
this changes CFL's circadian classification. Do not commit unless
confidence ≥ 95. If score < 95 report verbatim and stop — do not invent
results.
