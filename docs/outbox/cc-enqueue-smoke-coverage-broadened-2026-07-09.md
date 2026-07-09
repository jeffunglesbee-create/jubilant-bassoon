# CC Session Outbox — Broadened Smoke Coverage Sweep (CC-CMD-2026-07-09-enqueue-smoke-coverage, amended)

**Date:** 2026-07-09
**Scope:** The source CC-CMD doc was amended mid-execution — the original
3-assertion scope (night-owl/scouts-pick/finals-desk enqueue payloads,
already committed separately) was found incomplete by a fuller commit
sweep, which located 3 more real runtime fixes shipped in the same ~26h
window with zero static coverage: Truth Is/Night Stars' `finalized_at`
wiring, the `_sportLabelMatches` extraction, and Pick'em's three display/
data bugs (a bundled fourth item, `getQualityTarget`'s `/180` scale fix,
was also still missing coverage from its own earlier CC-CMD). This outbox
covers the 6 new assertions added for those four fixes.

## What changed mid-flight, and how it was handled

The original 3-assertion work (`A-ENQUEUECTX-1/2/3`) was already complete,
committed, and independently correct when the source doc was amended
underneath it (a doc-only `[skip ci]` commit landed on `origin/main` while
this session was executing the original scope). Rebased cleanly rather
than discarding the completed work — the original 3 assertions remain
exactly as-is, a valid subset of the now-broader spec, not something to
redo. Read the amended doc in full before continuing, rather than
declaring the narrower, already-complete version "done" and stopping.

## PROBE BLOCK

Located each of the four fixes' own outbox docs and mined their stated
proof directly, per the amended doc's explicit instruction — not
independently re-deriving what each new assertion should check:

- `docs/outbox/cc-truth-is-night-stars-client-fix-2026-07-08.md`
- `docs/outbox/cc-sport-label-matching-utility-2026-07-08.md`
- `docs/outbox/cc-pickem-display-and-stats-fix-2026-07-08.md`
- `docs/outbox/cc-enqueue-context-gap-task5-2026-07-09.md` (this
  session's own earlier work, for `getQualityTarget`)

Confirmed each fix's own code is genuinely present in the current tree
before writing any assertion against it (`_bundleFinalizedAt`,
`_sportLabelMatches`, `buildPickEmStatsSection`, `buildPickWidgetHTML`,
`getQualityTarget` — all located and read in full).

## TASK 1 — Six new assertions, each derived from that fix's own outbox proof

- **`A-NIGHTSTARS-1`** — `_bundleFinalizedAt` carries all three
  protections its own outbox called out: the explicit UTC parse (the
  240-minute silent-error fix for ET users), the `recap_date===TODAY_ISO`
  guard, and the doubleheader-ambiguity fallback.
- **`A-SPORTLABEL-1`** — `_sportLabelMatches` exists standalone and
  `_bundleFinalizedAt`'s `sportOk` closure is genuinely the one-line
  wrapper calling it, not a second, independently-drifting inline copy.
- **`A-PICKEMFIX-1`** — Pick'em stats section reads the relay's real
  nested `picks` field (not flat) and uses the corrected `totalMade > 0`
  gate (not `!= null`, which the CC-CMD's own original spec got wrong and
  its test suite caught before shipping).
- **`A-PICKEMFIX-2`** — cumulative accuracy scaled `× 100`, whole-percent
  — a distinct claim from `-3` (different call site, same root cause:
  0-1 fraction rendered raw). Per the amended CC-CMD's explicit
  instruction not to compress three real, independently-verified claims
  into one assertion for a round number.
- **`A-PICKEMFIX-3`** — per-pick resolved probability scaled `× 100`,
  one decimal — the live-proven bug (0.598 rendering as "0.598%" on the
  currently-deployed app before the fix).
- **`A-JQSCALE-1`** — `getQualityTarget` uses the corrected `/300`
  scale/240 target/217 trigger, and the stale runtime output string
  (`/180. Target ≥ 145 —`) is genuinely gone.

Named `A-PICKEMFIX-*`, deliberately not `A-PICKEM-*` — that prefix is
already in use by an unrelated, earlier pick-em-ui CC-CMD's own
assertions (`A-PICKEM-4/5/6`); reusing it would create ambiguous, easily
confused assertion IDs across two unrelated fix families.

## A real false-positive caught before finalizing — investigated, not silently widened

`A-JQSCALE-1`'s first draft checked `!block.includes('/180')` — failed
immediately, even against the current, genuinely-correct code. Not
assumed to be a code bug; investigated directly: the failure was this
session's *own explanatory comment*, written earlier tonight, documenting
the arithmetic behind the `240`/`217` values ("145/180=81%x300=243"). A
blanket "no `/180` anywhere nearby" check can't distinguish a legitimate
comment mentioning the old number from an actual regressed runtime
string. Fixed by checking for the specific *stale output string*
(`/180. Target` and `Target ≥ 145 —`, both from the literal old template
literal) instead of the bare substring — narrower, correct, and still
catches the real regression (verified below).

## TASK 2 — Every new assertion individually proven against a real revert

Not a shared setup, not proven once for the batch — six independent
revert/restore cycles, one per assertion, each confirming exactly that
one assertion fails and the other eight (three original + five other new
ones) remain unaffected:

1. Reverted the UTC-parse fix (`raw.replace(' ','T')+'Z'` → plain
   `new Date(raw)`) → `A-NIGHTSTARS-1` failed alone (898/1). Restored,
   899/0.
2. Reverted `_sportLabelMatches`'s wiring (inlined the equivalent logic
   back into `sportOk` directly) → `A-SPORTLABEL-1` failed alone
   (898/1). Restored, 899/0.
3. Reverted Pick'em's nesting/`hasStats` fix (`st.picks` → flat `st`,
   `totalMade > 0` → `!= null`) → `A-PICKEMFIX-1` failed alone; `-2`/`-3`
   correctly unaffected (898/1). Restored, 899/0.
4. Reverted the accuracy-scale fix (`(accuracyRate*100).toFixed(0)` →
   the old `Math.round(accuracyRate)`) → `A-PICKEMFIX-2` failed alone;
   `-1`/`-3` correctly unaffected (898/1). Restored, 899/0.
5. Reverted the per-pick probability scale fix (`(resolvedProbability*
   100).toFixed(1)` → raw `resolvedProbability`) → `A-PICKEMFIX-3` failed
   alone; `-1`/`-2` correctly unaffected (898/1). Restored, 899/0.
6. Reverted `getQualityTarget`'s scale (`avgScore<217`/`/300`/`Target≥240`
   → the old `avgScore<130`/`/180`/`Target≥145`) → `A-JQSCALE-1` failed
   alone (898/1). Restored, 899/0.

Final restore verified via `git diff --stat index.html` showing zero
residual diff after all six cycles — `index.html` is byte-identical to
the pre-test committed state.

## VERIFICATION

`node smoke.js index.html`: **899 passed, 0 failed** (890 baseline + 3
original + 6 new = 899, exactly). `node field_unit.js`: 66/0.
`node field_smoke.js index.html`: 21 failures, matches the documented
pre-existing baseline. `node --check smoke.js`: syntax valid.

No `SW_VERSION` bump — `smoke.js`-only change, not in `deploy-gate.yml`'s
trigger paths.

## DONE CONDITIONS

- [x] Every one of the six fixes has at least one assertion (Pick'em has
      three, per its outbox's own three distinct, independently-verified
      claims — not compressed to fewer for a round number)
- [x] Each assertion's check derived from that fix's own outbox proof,
      cited explicitly in the assertion's own description string
- [x] Every new assertion individually proven to fail on a real revert
      and pass on the real fix — six independent cycles, not one shared
      demonstration for the batch
- [x] smoke.js count increased by the real number added (890 → 899, +9
      total across both commits: +3 original, +6 here), 0 failures,
      confirmed via a fresh full re-run after all revert cycles completed

## CONFIDENCE SCORING

- +15 — all six fixes accounted for, none skipped: **met**
- +25 — each assertion's check genuinely sourced from that fix's own
  outbox proof, not independently reinvented (each assertion's own
  description string cites the specific source CC-CMD and quotes or
  paraphrases that outbox's actual stated finding): **met**
- +45 — every new assertion individually proven against a real revert —
  six isolated cycles, not batch-proven, each confirming no false
  coupling with the other eight assertions: **met**
- +15 — final count (899) and 0-failure state confirmed via a fresh full
  run after every revert cycle was restored, not assumed: **met**

**Total: 100/100.**

## Commit

- `smoke.js`: six new assertions (`A-NIGHTSTARS-1`, `A-SPORTLABEL-1`,
  `A-PICKEMFIX-1/2/3`, `A-JQSCALE-1`), plus a correctness fix to
  `A-JQSCALE-1`'s own first-draft window logic (found and fixed before
  finalizing, not shipped broken).
- This manifest, alongside the original 3-assertion outbox
  (`cc-enqueue-smoke-coverage-2026-07-09.md`), which remains accurate for
  what it covered.
