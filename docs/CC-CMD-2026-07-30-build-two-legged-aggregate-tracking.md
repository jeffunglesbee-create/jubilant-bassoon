# CC-CMD-2026-07-30-build-two-legged-aggregate-tracking

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Deadline context:** UEFA Champions League 2026-27 qualifiers started
**July 7, 2026** (verified via web search, 2026-07-30) — two-legged ties
are live right now. League phase starts September 8. This is the most
time-urgent of the four soccer-scoring gaps investigated today, because
the gap is already active, not approaching.

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-30-build-two-legged-aggregate-tracking.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## The gap, precisely — read this before assuming what already exists

**A label exists. Score tracking does not.** Confirmed today via direct
grep, ~line 8578:

```js
if (/2nd leg|second leg/.test(s))
  return {importance:'playoff_impl', boost:12, label:'Knockout second leg', icon:'⚽'};
```

This is a **text-match on a matchup note string**, not a computed
aggregate score. It can tell you a game IS a second leg. It has zero
awareness of what the actual aggregate scoreline is. And per an earlier
finding this same session (the rivalry-boost trace), this entire
`.boost`/`importance` system has exactly two real consumers, neither of
which touches `dramaScoreLive` — one feeds an unrelated local variable,
the other only toggles a CSS class (`narrative-hi`) for bold text
styling. **This detector could fire correctly and it would still change
nothing about how drama is scored.**

So the current state for a real two-legged tie's second leg: `diff`-based
scoring looks ONLY at that single match's score, with zero knowledge of
the first leg's result. A team trailing 4-1 on aggregate but drawing
1-1 in the second leg scores as a calm, even game — when it may
actually be a near-dead tie, or (away-goals-adjusted, if that rule
applies to the specific competition) still very much alive.

---

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Re-confirm the second-leg detector's current exact location, and
  whether anything has changed about its consumers since today's
  earlier trace (search for every consumer of the object it returns
  fresh, do not trust this doc's summary).
- Confirm whether `game.matchupNote` or any other current field
  actually carries the FIRST LEG's score anywhere in the data model
  today, even informally. If it does not, this task requires sourcing
  that data, not just computing on top of something already present —
  check before assuming.
- Confirm current live away-goals-rule status for the relevant
  competitions (UEFA discontinued the away-goals rule as a tiebreaker
  in continental competitions some seasons back — do not assume it
  still applies; verify current rule for whichever competition this
  is scoped to before building logic that depends on it).

## Task 2 — Build real aggregate tracking

- Add a mechanism to associate a two-legged tie's two matches (likely
  keyed by the two teams + competition + round, since ESPN/whatever
  source is used may not explicitly link them) and carry the first
  leg's final score forward to when the second leg is live.
- Feed genuine aggregate context into `dramaScoreLive`'s soccer branch —
  likely as an additional bonus/modifier reflecting how close the TIE is
  on aggregate, not just how close the single match is. Reuse the
  existing bonus-composition pattern already used for `upsetBonus`
  (additive, capped, conditional on the situation being live and real)
  rather than inventing a new architectural pattern.
- Do not remove or duplicate the existing second-leg text detector —
  either wire IT to also carry the real aggregate score forward (if its
  existing call site has access to that data), or build the new
  mechanism alongside it and note the redundancy for a later cleanup
  decision. Don't silently maintain two disconnected systems without
  flagging it.

## Task 3 — Scope check before going further

This task is scoped to UEFA club competitions (Champions League, Europa
League, Conference League) and major domestic cups with two-legged
rounds, since those are the ones with real, current fixtures. Do NOT
attempt to also build Layer 2 (competition context) or Layer 4
(simultaneous multi-game) in this same task — those are separate,
already-written CC-CMDs
(CC-CMD-2026-07-30-wire-pl-final-day-stakes.md,
CC-CMD-2026-07-30-reconcile-soccer-base-formula.md).

## Task 4 — Smoke + verify

- `node field_smoke.js` — 0 failures required.
- Construct a real or synthetic two-legged scenario (e.g. leg 1: 3-0,
  leg 2 currently 0-1) and confirm the live drama score for that second
  leg now reflects the aggregate context, not just the single match's
  1-goal margin.

---

## Explicitly NOT in scope

- Layer 2 (Bundesliga/Serie A/Ligue 1 relegation data) — confirmed
  completely absent for these three leagues today; not attempted here,
  no CC-CMD written for it this round given the two dispatched already
  cover the most time-urgent gaps. Flag as a known remaining gap in the
  outbox, do not build it silently as a bonus.
- Layer 4 (simultaneous multi-game awareness) — confirmed to not exist
  as any reusable mechanism (only one hardcoded sentence for one known
  historical PL scenario). Separate, larger effort; not scoped here.

---

## Outbox

`outbox/cc-session-2026-07-30-two-legged-aggregate.md`: which
competitions were covered, the real or synthetic before/after test case,
confirmation of the away-goals-rule check from Task 1, and explicit
note of what remains (Bundesliga/Serie A/Ligue 1 Layer 2, Layer 4)
for anyone picking this thread up later.
