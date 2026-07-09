# CC-CMD: Mine tonight's own outbox proof into 6 missing smoke assertions

**Date:** 2026-07-09 (amended — original scope was 3 of 6 real changes
missing coverage; broadened after a full commit sweep found the other 3)

**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

`smoke.js` has been frozen at 890/0 since `6789cd8e` (2026-07-08
14:23:01Z) — confirmed via a full commit sweep since that timestamp,
not assumed. Filtering out doc-only CC-CMD pushes and automated data
crons (`oura`/`whoop`/`mlbn-schedule`/`auto-overlay`), **six real
runtime code changes** shipped in that ~26-hour window with zero new
static coverage:

1. `d12d2a24` — Truth Is/Night Stars connected to real `finalized_at`
2. `0a0034f2` — sport-label matching extracted to a shared utility
3. `084cdf8c` — Pick'em's three display/data bugs (stats nesting,
   two probability-scale bugs)
4. `c6f13599` — threshold-240 migration + enqueue game/matchup data
   (5 call sites)
5. `7708d23c` — `getQualityTarget`'s stale `/180` scale reference
6. `00e9cfb1` — finals-desk's identical enqueue-context-gap bug

**The genuinely faster approach, not the obvious one:** every one of
these six was already rigorously live-verified at ship time — real HTTP
tests, real D1 queries, exact before/after values, all preserved in
each fix's own outbox doc. Re-deriving "what should this assertion
check" from scratch for each one is redundant work; the decision was
already made once, correctly, under real conditions, and is sitting in
`docs/outbox/`. Mine each outbox's own stated proof directly into an
assertion rather than reinventing the check.

## PROBE BLOCK

```bash
git log --oneline -5

ls docs/outbox/ | grep -E "truth-is-night-stars|sport-label|pickem|threshold-240|enqueue-context-gap|getqualitytarget"
# Locate each of the 6 fixes' own outbox file — re-confirm exact
# filenames, don't assume this doc's guesses are current.

for f in $(ls docs/outbox/ | grep -E "truth-is-night-stars|sport-label|pickem|threshold-240|enqueue-context-gap|getqualitytarget"); do
  echo "=== $f ==="
  grep -A15 "TASK 4\|Live Verif\|live test\|Confirmed live" "docs/outbox/$f" | head -20
done
# Pull each outbox's own stated proof — exact values, exact code
# checked — this is the actual spec for what each new assertion verifies.

tail -30 smoke.js
# Confirm the current highest assertion number, continue correctly.
```

## TASK 1 — One assertion per fix, sourced from that fix's own outbox

For each of the six commits above, add exactly one smoke assertion
whose check is derived directly from what that fix's own outbox already
proved — not a new, independently-invented check. Examples of the
mapping (verify each against the real outbox text via the probe, these
are illustrative not prescriptive):
- Truth Is/Night Stars: the outbox's own before/after evidence of what
  `finalized_at` source got wired in — assert that source is present.
- Sport-label matching: assert the shared utility function exists and
  the original inline duplicate is gone (the outbox's own diff shows
  both halves of this).
- Pick'em: three separate assertions may be warranted here specifically
  (stats nesting + two scale fixes are three distinct, independently
  verified claims in that outbox, not one) — don't compress three real
  claims into one assertion for the sake of a round number.
- Threshold-240/enqueue: this is where TASK 1 of the prior version of
  this doc already specified three call-site assertions (night-owl,
  scouts-pick, finals-desk) — keep that specification, it's still
  correct, just now explicitly one part of the full six rather than the
  whole doc.
- getQualityTarget: assert `/300` (or the corrected reference) is
  present and `/180` is genuinely absent.

## TASK 2 — Prove each new assertion actually catches a regression

For every new assertion: temporarily revert that specific fix locally,
run smoke.js, confirm the new assertion fails — then restore the fix,
confirm it passes. Do this per-assertion, not once for the batch — a
shared setup that only reverts one fix and calls the whole batch proven
would leave five assertions unverified against what they're supposed to
catch. Report each cycle explicitly in the outbox.

## DONE CONDITIONS

- [x] Every one of the six fixes has at least one assertion (Pick'em
      may warrant three, per its outbox's own three distinct claims)
- [x] Each assertion's check derived from that fix's own outbox proof,
      cited explicitly in the new assertion's own description string
- [x] Every new assertion individually proven to fail on a real revert
      and pass on the real fix — not asserted, demonstrated
- [x] smoke.js count increases by the real number added (likely 6-8
      given Pick'em's three claims), 0 failures

## CONFIDENCE SCORING

- +15 — all six fixes accounted for, none skipped
- +25 — each assertion's check genuinely sourced from that fix's own
  outbox proof, not independently reinvented
- +45 — every new assertion individually proven against a real revert,
  not just proven to pass on already-correct code
- +15 — final count and 0-failure state confirmed via fresh full-tarball
  run, not assumed

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-enqueue-smoke-coverage.md. Execute all tasks (scope now covers all 6 uncovered fixes, not just 3 -- re-read TASK 1 in full). Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
