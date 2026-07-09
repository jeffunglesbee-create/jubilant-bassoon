# CC-CMD: Add smoke coverage for the enqueue-context-gap fix — currently zero

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

`smoke.js` has stayed at 890/0 through the entire enqueue-context-gap
arc tonight (client TASKS 1/2/5, the finals-desk follow-up) — confirmed
live, freshly re-run against a real tarball, not assumed. Checked
whether an existing assertion happens to cover this anyway: A277 is the
closest name match ("saveEspnFinal saves sourceId + matchupNote") but
verifies a different function's local-state persistence entirely,
unrelated to what gets sent in the `JOURNALISM_ENQUEUE_RELAY` POST body.

**Real, current gap:** the exact bug fixed tonight (enqueue payload
missing `home`/`away`/`homeScore`/`awayScore`/`matchupNote`, silently
capping Context Anchoring + Matchup Depth at zero) has zero static-check
coverage. If a future edit to any of these three call sites drops one
of these fields — plausible, they're easy to lose in an unrelated
refactor — nothing in CI catches it. It would silently regress to
exactly the state discovered and fixed tonight, and only be caught
again by someone happening to run another live A/B test, the way it
was found the first time.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "briefType: 'night-owl'" -B3 index.html
grep -n "briefType: 'scouts-pick'" -B3 index.html
grep -n "briefType: /nba/i.test" -B3 index.html
# Re-confirm the exact current enqueue bodies for all three fixed call
# sites before writing assertions against them — do not assume tonight's
# diffs are still byte-identical to what was committed, re-verify.

tail -30 smoke.js
# Confirm the exact current highest assertion number before adding new
# ones — continue the sequence correctly, don't guess a number.
```

## TASK 1 — Add three assertions, one per fixed call site

For each of `night-owl`, `scouts-pick`, `finals-desk-nba`/
`finals-desk-nhl`: add an assertion checking that the literal enqueue
body (the exact `JSON.stringify({...})` call, matched precisely enough
that the check would fail if any of these specific fields were removed)
includes `home`, `matchupNote`, and — for night-owl/finals-desk
specifically, not scouts-pick, which correctly omits these since it
fires pre-game — `homeScore`/`awayScore`. Match the existing codebase's
own assertion style (grep-based string presence checks, per the
existing `A277`-style pattern) rather than inventing a new assertion
shape.

## TASK 2 — Confirm the new assertions actually catch the regression

Before finalizing: temporarily revert one of the three fixes locally
(remove `matchupNote` from finals-desk's enqueue body, for instance),
run smoke.js, confirm the new assertion actually fails — then restore
the real fix and confirm it passes again. This is the only way to prove
the assertion detects the bug it's meant to catch, rather than just
checking that *some* string is present that happens not to be the load-
bearing one. Report this test cycle explicitly in the outbox.

## DONE CONDITIONS

- [x] Three new assertions added, one per fixed call site, correctly
      distinguishing scouts-pick's legitimate score-field omission
- [x] Each new assertion proven to actually fail when the real fix is
      temporarily reverted, not just proven to pass on the current
      (already-correct) code
- [x] smoke.js count increases by exactly 3, 0 failures

## CONFIDENCE SCORING

- +40 — three assertions correctly added, matching existing style,
  correctly scoped per call site (scouts-pick's score omission respected)
- +40 — each proven to actually catch a real revert, not just pass on
  already-correct code
- +20 — final count confirmed via fresh run, not assumed

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-enqueue-smoke-coverage.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
