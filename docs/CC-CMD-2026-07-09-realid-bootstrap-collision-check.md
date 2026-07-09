# CC-CMD: Test and harden _resolveRealGameId against a same-day bootstrap collision

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

`_resolveRealGameId(game)` (shipped in
`CC-CMD-2026-07-09-realid-fix-and-generalize.md`, verified 100/100)
bootstraps `game._gameId` via one real fuzzy match, then caches it
permanently. Every later `findEspnEntry(game)` call then uses the fast
real-ID path, which — correctly — treats a real-ID mismatch as
definitive with no fuzzy fallback, since a resolved real ID is meant to
be authoritative, not a hint.

That design is only as safe as the one bootstrap match it depends on.
The shipped verification tested the happy path thoroughly (real
construction sites, negative controls, end-to-end through
`buildWCMediaCards()` → `scoreSMTCard()`) but did not test what happens
if the bootstrap match itself is wrong. `requireSameDate` guards against
a wrong *date* — it does nothing for two different games on the *same*
date whose team-name suffixes happen to collide under
`_resolveRealGameId`'s underlying matcher (both home and away, 6-char
suffix, non-alpha stripped). If that happens, the wrong ID gets cached
permanently, and the fast path's own no-fallback design would then
actively reject the correct match for the rest of that session.

**This is a narrow, low-priority hardening item, not a confirmed bug.**
Scope accordingly — probe for real-world likelihood before building any
defensive machinery. If the collision surface turns out to be
vanishingly unlikely under the real matching rule (both sides required,
not home-only), say so plainly and do the minimum safe fix rather than
over-engineering against a risk that doesn't practically exist.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "function _resolveRealGameId" -A 15 index.html
grep -n "function findEspnEntry" -A 25 index.html
# Re-confirm both are still exactly as shipped before touching either.

grep -n "_gameId: fg.id" index.html
# Confirm how many distinct real-world sports currently populate
# _gameId via V2/mapV2ToESPN — this bounds where a same-day collision
# could even originate (only among V2-sourced entries, not every sport).
```

Then, empirically: using real or realistically-constructed data, check
whether the current matcher (`vh.endsWith(h) && va.endsWith(a)`,
6-char suffix, non-alpha stripped) can produce **more than one**
candidate match on the same day for any real team-name pairs likely to
appear in FIELD's actual sport coverage (not contrived worst-case
strings unless no real example exists). Report the actual finding —
common, rare, or effectively impossible under real team names — before
deciding what fix, if any, this warrants.

## TASK 1 — Confirm or rule out the risk empirically

Construct a real test: two distinct games, same date, deliberately
chosen so both home and away suffixes collide under the exact matcher
above. Run `_resolveRealGameId` against both and confirm what actually
happens today — does it cache a wrong ID, cache ambiguously, or throw?
Report the real, observed behavior, not an inference from reading the
code.

## TASK 2 — If the risk is real: require unambiguous candidacy before caching

If Task 1 confirms multiple entries can satisfy the same bootstrap
match: change `_resolveRealGameId` to only cache `game._gameId` when
**exactly one** `espnScores` entry matches — if the fuzzy criteria
returns more than one candidate, that ambiguity is itself the collision
signal. In that case, leave `game._gameId` unset (not a guess, not the
first match) and let this game continue using plain fuzzy matching on
every call — no worse than today's pre-fix behavior, just not yet
eligible for the faster, stronger path until a later call resolves
unambiguously (e.g., after one side's game goes final and drops out of
the live pool).

**If Task 1 shows the collision surface is not realistically reachable**
given real team names and the both-sides-required matcher: do not add
this machinery. State plainly why the risk doesn't warrant it, and
leave `_resolveRealGameId` unchanged.

## TASK 3 — Live verification

If Task 2's fix is built: confirm via the same constructed collision
that `game._gameId` now stays unset rather than caching a wrong value,
and that fuzzy matching continues working correctly for that game on
subsequent calls. If Task 2 is skipped per its own exit clause: no
verification needed beyond Task 1's empirical finding.

## DONE CONDITIONS

- [x] Real-world collision likelihood empirically checked, not assumed
      either way
- [x] If real: unambiguous-candidacy guard added, verified via the
      actual constructed collision case, not inferred from code reading
- [x] If not real: explicitly stated why, with the evidence from Task 1,
      and no unnecessary defensive code added

## CONFIDENCE SCORING

- +40 — Task 1's empirical finding is real (actual test run, not
  code-reading inference), whichever way it comes out
- +30 — if fixed: unambiguous-candidacy guard correctly implemented and
  verified against the real constructed case
- +30 — if not fixed: the decision not to build anything is explicitly
  justified with the Task 1 evidence, not just asserted

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-realid-bootstrap-collision-check.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
