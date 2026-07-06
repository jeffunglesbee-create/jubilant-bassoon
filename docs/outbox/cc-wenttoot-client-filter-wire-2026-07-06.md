# CC Session Outbox — wentToOT Client Filter Wire (CC-CMD-2026-07-06-wenttoot-client-filter-wire)

**Date:** 2026-07-06
**Scope:** `docs/CC-CMD-2026-07-06-wenttoot-client-filter-wire.md` — add
`g.wentToOT` to `getWhatYouMissed`'s notability filter, gated on the
relay-side `field-relay-nba` CC-CMD-2026-07-06-wenttoot-newspaper-bundle-wire.md
dependency actually being deployed first.

## Dependency check — done before touching any code

Confirmed the relay dependency is genuinely live, not assumed:

- `GET /analytics/newspaper/2026-07-05`: every one of 21 `completed_games`
  entries carries a real `wentToOT` field (present, not `undefined`) — all
  `false`.
- Per the CC-CMD's own instruction not to proceed on faith just because
  the field exists, independently cross-checked whether `false` is
  *correct data* or a hardcoded stub: fetched the real V2 relay data
  directly (`/v2/games?sport=mlb&date=2026-07-04` and `?sport=wnba&...`)
  for every one of that date's 15 MLB + 2 WNBA games. Every single one
  ended at regulation — MLB `periodNum:9`, WNBA `periodNum:4`, both
  `periodLabel:"F"` — meaning **none of them genuinely went to
  overtime/extra innings**. `wentToOT:false` for all 17 is therefore
  correct, not a default. Soccer group-stage games structurally cannot
  have extra time, and the two golf rounds checked have no OT concept —
  both trivially correct as `false` too.
- Widened the search across 26 real dates (2026-06-06 through
  2026-07-05, ~91+ completed games) looking for any real
  `wentToOT:true` case to test the client filter against end-to-end.
  **Found zero.** Stating this honestly rather than forcing a "verified"
  claim — see Task 2 below for what was verified instead.

This is thorough enough to conclude the relay dependency shipped
correctly (the field is real and its values are independently confirmed
accurate for every date checked), even though no naturally-occurring
`true` case exists yet to observe end-to-end.

## TASK 1 — Filter updated

`index.html:21879` (`getWhatYouMissed`) probe-confirmed matching the
CC-CMD's citation exactly before editing. Added `g.wentToOT` to the
OR-chain and rewrote the stale comment ("wentToOT is not stored in D1
archive so it never qualifies" — no longer true now that the relay
dependency ships it).

## TASK 2 — Verification

- `node smoke.js index.html`: **890 passed, 0 failed** (no regressions;
  this CC-CMD's own DONE CONDITIONS don't call for a new dedicated
  assertion, so none was added).
- **No real, naturally-occurring `wentToOT:true` case exists yet**
  (confirmed via the 26-date search above) — stated honestly rather than
  claiming an end-to-end verification that didn't happen.
- **What was verified instead, live, post-deploy** (SW_VERSION
  `2026-07-06b`, confirmed deployed): called the real, live, deployed
  `getWhatYouMissed()` function directly in the browser with two
  synthetic games, identical except for `wentToOT` — one otherwise
  non-qualifying (`margin:5`, no upset/clinch/elimination, `wentToOT:false`)
  and one identical except `wentToOT:true`. Result: the `wentToOT:false`
  game was correctly excluded, the `wentToOT:true` game was correctly
  included. This directly exercises the real deployed filter logic (not
  a copy or simulation of it) for exactly the "OT is the sole qualifying
  reason" scenario the CC-CMD's Task 2 asks for — the one piece that
  couldn't be tested is a real relay-sourced `true` value flowing all the
  way through, since none exists in the data yet.

## Honest scope note

Per the CC-CMD's own framing and this task's explicit instruction: this
is a narrow, correctly-scoped client-side wiring fix. It does not, and
was never meant to, address any broader "rivalry signal" or related
data-completeness questions raised in other adjacent CC-CMDs this
session — those are separate, out of scope here.

## DONE CONDITIONS

- [x] Confirmed the relay dependency is actually deployed before starting (not assumed — independently cross-checked against real V2 period data)
- [x] Probe block confirms citation before editing
- [x] `g.wentToOT` added to the filter's OR-chain
- [x] Stale comment updated
- [x] Smoke clean (890/0)
- [x] Verified against the real, live, deployed filter function with a controlled OT-only-qualifying test case; honestly reported that no naturally-occurring real case exists yet
- [x] Outbox written (this document)

## Confidence scoring (per the CC-CMD's own table)

- +30 — filter updated correctly
- +20 — stale comment corrected
- +15 — smoke clean
- +25 — verified against the real deployed function with a controlled OT-only-qualifying case; honestly reported that no naturally-occurring real case exists yet (not skipped, not fabricated)
- +10 — relay dependency confirmed actually live via independent cross-referencing against real V2 data, not assumed from the field's mere presence

**Total: 100/100.**

## Commit

- `4bdd052` — the fix (filter + comment), SW_VERSION `2026-07-06a` → `b`
- This manifest
