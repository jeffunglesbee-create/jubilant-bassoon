# CC-CMD-2026-09-13 — "no odds" counts two different things

Second CC-CMD from `CC-CMD-2026-09-12-odds-line-wrong-render-path`, filed per
Rule 87.4. That one made the dominant no-odds state countable; this one is about
what the count turns out to contain.

## Measured — manifest `odds-line-probe-manifest-20260913T025407Z.json`, SW `2026-09-12u`

```
debriefs_total                81
debriefs_with_movement_line   29
debriefs_no_movement_line     52

of the 81 rendered debriefs:
  espn: ids          66
  synthetic g<N> ids 12
  other               3

of the 29 WITH a movement line:
  synthetic ids       0
```

**Zero of twenty-nine.** Every card carrying a movement line has a durable id,
and all twelve synthetic-id cards sit in the no-movement set.

## Why that matters

`debriefs_no_movement_line: 52` reads as "52 games had no odds". It is at least
two populations:

1. **~12 cards that could not ask.** `injectDebriefCards` fetches
   `/context/game/{id}`; a `g<N>` slate id is not a durable identifier, and
   `CC-CMD-2026-09-12-context-game-slate-id` made the relay refuse unresolvable
   ids outright (`resolved: false`, all content fields null). These games may
   have opening odds nobody asked for.
2. **~40 cards that asked and got nothing.** The genuine no-odds state, which is
   what the count is supposed to mean.

One number, two causes, needing different fixes — the shape this project keeps
finding. The fix for (1) is id resolution; for (2) there is no fix, it is data.

## Tasks

0. **Probe.** Split the count in the manifest: `no_movement_undurable_id` and
   `no_movement_durable_id`, with a named example of each. **The artifact is a
   committed manifest carrying both numbers summing to
   `debriefs_no_movement_line`** — a sum that does not reconcile means a third
   population nobody has named.
1. **Establish whether the undurable-id cards have odds at all.** Take the named
   example's teams and date, resolve it against the relay, and record whether
   `/context/game` for the resolved id returns an `oddsOutcome`. If it does, (1)
   is a real gap; if it does not, the synthetic-id correlation is incidental and
   this CC-CMD closes as WONTDO with the evidence.
2. **Only if Task 1 finds odds:** fix the id, not the layer. `injectDebriefCards`
   already resolves a durable id (`CC-CMD-2026-09-12-context-game-slate-id`);
   find why these twelve did not get one. Do not add a fallback (Rule 76) and do
   not widen what the relay accepts (Rule 60 — the relay refusing unresolvable
   ids is correct and was deliberate).
3. **Mutation (Rule 90).** The split must fail when miscounted: force every card
   into one bucket and confirm the sum check goes red.
4. **Done condition.** A committed manifest where
   `no_movement_undurable_id + no_movement_durable_id === debriefs_no_movement_line`
   and each carries a named example.
5. **Outbox manifest** per Rule 67.

## Not claimed

That the twelve are a defect. The correlation is exact in one run and one run is
not a population — the synthetic ids may all belong to sports with no odds
coverage at all, in which case nothing is lost and Task 1 says so.
