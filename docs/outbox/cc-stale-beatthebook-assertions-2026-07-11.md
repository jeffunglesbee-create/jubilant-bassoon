# CC Session Outbox — Update 3 stale field_smoke.js assertions (CC-CMD-2026-07-11-stale-beatthebook-assertions)

**Date:** 2026-07-11
**Scope:** jubilant-bassoon (sole). All tasks executed.

## TASK 1 — Confirmed, with honest drift reporting on the total count

Re-ran `field_smoke.js` fresh from HEAD. The 3 targeted assertions
(A67, A69, Assertion 30) matched exactly as described in the doc — no
drift on those specifically.

**Real drift, reported rather than silently absorbed:** the file's
*total* failure count was 6, not 3, at the time this CC-CMD landed —
not because this doc's premise was wrong, but because my own
immediately-prior, separate commit (`c6f08ba`, relocating ~20
previously-dead assertions past `process.exit()`) surfaced 3 more
genuinely real, topically-*unrelated* failures (Assertion 48
journalism-odds-context, `'weather-intelligence'` and `'ufl-2026'`
FIELD_FEATURES registry keys — weather/UFL feature-registry gaps, not
betting-content). Confirmed these are correctly out of this CC-CMD's
scope (about betting-content removal specifically) and left untouched.

## TASK 2 — Each of the 3 individually reasoned, not a blanket choice

**Checked the doc's own assumption before acting on it** (per DO NOT
ASSUME): the doc says "Assertion 30 ... has no known equivalent
absence-check anywhere yet — confirm this via grep." Grepped
`smoke.js`'s existing A243 ("Betting engine REMOVED (ToS/patent
compliance, 2026-05-29)", line 1183): it already checks the absence of
`renderBetting`, `findOddsForGame`, `ODDS_RELAY_BASE`,
`buildBettingFieldEdge`, and `beatTheBook` — **partially contradicting**
the doc's assumption: `ODDS_RELAY_BASE` (1 of Assertion 30's 4
conditions) IS already covered elsewhere. The other 3
(`fetchOddsForSport`, `getGameOdds`, `ODDS_SPORT_MAP`) are genuinely
uncovered anywhere else — confirmed via direct grep of `smoke.js`,
zero matches for any of the three.

This asymmetry drove different treatment per assertion, not a blanket
rule:

- **A67 (`beatTheBook()` presence)** → **Removed.** Fully, exactly
  redundant with `smoke.js` A243's existing
  `!html.includes('function beatTheBook')` check. No unique tracking
  value in a duplicate.
- **A69 (`beatTheBook(g)` wiring presence)** → **Removed.** Once the
  function itself cannot exist (A243 guarantees that), a call site to
  it structurally cannot exist either — checking for absent wiring to
  an already-guaranteed-absent function is tautological.
- **Assertion 30 (Odds relay adapter, 4 conditions)** → **Inverted to
  assert absence**, not removed. Unlike A67/A69, this one is *not*
  fully redundant: 3 of its 4 conditions have no equivalent
  absence-check anywhere else in the repo. Removing it outright would
  leave those 3 with zero guard against a silent regression (one of
  them creeping back in unnoticed). Inverted in place, matching
  `smoke.js` A243's established pattern, preserving real tracking
  value the doc's own TASK 2 note anticipated might be needed.

**Considered and explicitly declined**: extending `smoke.js`'s A243 to
also cover the 3 uncovered conditions, then removing Assertion 30
entirely (which would have been the more architecturally "pure" fix,
matching `field_smoke.js`'s own stated charter — "structural
assertions... → smoke.js" — that presence/absence checks belong there,
not here). Not done: this CC-CMD's title and scope explicitly name
`field_smoke.js`'s 3 stale assertions; editing `smoke.js` as well would
be a scope expansion beyond what was asked. Flagged here as a genuine,
cleaner long-term alternative for a future, explicitly-scoped CC-CMD,
not unilaterally done.

## TASK 3 — Confirmed, no other stale references missed

Grepped `field_smoke.js` for `beatTheBook`, `fieldVsMarket`,
`ODDS_RELAY_BASE`, `fetchOddsForSport`, `getGameOdds`, `ODDS_SPORT_MAP`,
`_oddsCache` — exactly the 3 already identified (Assertion 30 at its
original lines, A67, A69). No `fieldVsMarket` or `_oddsCache`
references found at all (neither ever existed in this file). Not
assumed — a real, direct sweep.

## VERIFICATION

- Re-ran after the change: `Failures: 3` (down from 6), explicitly the
  3 unrelated weather/UFL/journalism findings from the prior commit —
  not "0 failures" since this CC-CMD's scope was specifically the 3
  betting-content assertions, all 3 of which are now correctly resolved.
- Confirmed stable across 2 additional runs (`Failures: 3` both times).
- `node smoke.js index.html`: 919 passed, 0 failed — unaffected, no
  cross-contamination.
- `node field_unit.js`: 66 passed, 0 failed — unaffected.
- `node --check field_smoke.js`: syntax clean.

## DONE CONDITION

`field_smoke.js` no longer contains any assertion checking for the
*presence* of a feature confirmed intentionally and permanently
removed. Each of the 3 original failures has an explicit, individually
reasoned resolution — 2 removed (fully redundant with `smoke.js`
A243), 1 inverted (genuine, previously-uncovered tracking gap
preserved as an absence-guard). Final failure count (3) explicitly
reported, correctly attributed to a separate, prior, unrelated fix —
not conflated with this CC-CMD's own scope.

## CONFIDENCE SCORING

- +15 — TASK 1 confirms exact current failure match: **met** (the 3
  targeted assertions matched exactly; the file's total count drift
  from 3→6 was honestly reported and correctly attributed to a
  separate, prior commit, not silently absorbed or ignored)
- +50 — TASK 2 each of the 3 individually reasoned and correctly
  resolved: **met** (asymmetric treatment — 2 removed, 1 inverted —
  driven by directly verifying the doc's own assumption rather than
  trusting it, finding it was only half-right)
- +20 — TASK 3 confirms no additional stale references missed: **met**
- +15 — Verification: final failure count explicitly reported (3, not
  glossed as "fixed"), `smoke.js` unaffected: **met**

**Total: 100/100.**

## Commit

- `field_smoke.js`: A67/A69 removed, Assertion 30 inverted to an
  absence-guard. No `SW_VERSION` bump — not a deploy-gate trigger path.
- This manifest.
- **Flagged, not actioned**: extending `smoke.js` A243 to cover
  `fetchOddsForSport`/`getGameOdds`/`ODDS_SPORT_MAP` explicitly (rather
  than field_smoke.js's inverted Assertion 30 doing it) would be the
  architecturally cleaner long-term fix, matching field_smoke.js's own
  stated charter that structural checks belong in smoke.js — out of
  this CC-CMD's stated scope, a candidate for a future, explicitly-scoped
  task.
