# Claude Code Command — Decide what "final period" means for OTW CLOSE_FINISH, then implement it

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Status:** FOLLOW-UP to `docs/CC-CMD-2026-07-12-otw-tier-categorical.md` /
`docs/CC-CMD-2026-07-12-otw-live-tier-categorical.md`, both already
executed (see `docs/outbox/cc-otw-tier-categorical-2026-07-12.md`). This
doc exists because that session found a genuine, unresolved product
question while fixing an unrelated confirmed bug, and correctly declined
to decide it unilaterally — per the standing instruction that new
mismatches from a design change get followed up on, not silently
discarded or used as sole grounds to revert.

**Scope:** `_otwIsFinalPeriod(eData, sport)` in index.html (currently
~line 37013, may have shifted — re-grep before editing). Do not touch
`_otwMarginTier` or `_otwIsCrunchTime` unless the decision below requires
it.

## THE QUESTION

`_otwGetLiveTier`'s CLOSE_FINISH condition is `tier === 1 && finalP`
(dead-even margin, in the final period). "Final period" currently means,
per sport: NBA/WNBA/NFL/CFL/AFL period>=4, NHL period>=3, MLB period>=9,
soccer minute>=70 (fixed 2026-07-12, was period>=2), tennis period>=2.
This is the LITERAL final period/inning/quarter — matches OLD's
historical behavior (the `smoothed>=60` composite threshold), currently
shipped.

An alternative definition, tried and reverted this session (v3, see the
outbox doc's full autopsy): "final period" = the first period/clock value
at which `dramaScoreLive()`'s own per-sport timeBonus table first turns
nonzero (e.g. NBA period>=3 instead of period>=4 — Q3 already carries a
+5 timeBonus, not just Q4's +10). This is EARLIER than "literal final
period" for every sport except soccer/tennis (already period-2-based)
and MLB (7th inning already carries some urgency in real broadcasts,
though `dramaScoreLive` itself only starts its bonus at inning 7 with
+7, separate from the 9th-inning +16 "true late" tier).

**Concretely, for a dead-even (margin=0) game:**
- NBA/WNBA: Q3 (period=3) vs Q4 (period=4) — is a tied 3rd quarter
  "CLOSE_FINISH," or does that label imply the game's actual final
  stretch (Q4)?
- MLB: 7th/8th inning vs 9th inning — same question.
- AFL: Q3 vs Q4.
- Tennis: this one's less ambiguous since tennis already uses period>=2
  (deciding set is period>=3, "any set past the first" is period>=2);
  the mismatch here (margin=1/period=1) is a different question — see
  the table below, it's about whether a single break in set 1 already
  counts, not about final-period timing.

Neither definition is more "correct" in an absolute sense — this is a
product decision about what "CLOSE_FINISH" should communicate to a user
glancing at the OTW chip: "the game is tied AND it's genuinely near the
end" (current, conservative) vs. "the game is tied AND it's gotten
meaningfully late" (the alternative, more permissive).

## THE 7 CONCRETE TEST CASES (re-verify these are still current before deciding — re-run the sweep, don't trust these numbers blindly per Rule 72)

| Sport | margin | period | clock | dramaScoreLive raw | Literal-final-period (current) | First-nonzero-timeBonus (alternative) |
|---|---|---|---|---|---|---|
| NBA | 0 | 3 | 1:30 | 70 | LIVE_GAME | CLOSE_FINISH |
| WNBA | 0 | 3 | 1:30 | 70 | LIVE_GAME | CLOSE_FINISH |
| Soccer | 0 | 1 | 75 | 57 | CLOSE_FINISH (minute>=70 already fixed) | (same, already resolved) |
| Soccer | 0 | 2 | 75 | 57 | CLOSE_FINISH | (same, already resolved) |
| AFL | 5 | 4 | 3:00 | 65 | CLOSE_FINISH (tier=2 && crunch) | (same — this one isn't a finalP question, it's a crunch-timing boundary case, verify separately) |
| Tennis | 1 | 1 | — | 36 | null | LIVE_GAME (tier question, not finalP — verify separately) |
| Tennis | 1 | 3 | — | 54 | CLOSE_FINISH | (already CLOSE_FINISH under current) |

Re-reading this table: only the NBA and WNBA rows are cleanly "literal
vs first-nonzero finalP" cases at raw=70 (which, notably, is comfortably
ABOVE the 60 threshold — not a marginal boundary value). That raw=70 is
NOT a marginal call is worth weighing: under literal-final-period, a
genuinely drama-rich tied Q3 NBA game with 1:30 left (raw=70, well past
the 60 bar) still shows as LIVE_GAME, not CLOSE_FINISH, purely because
"final period" is being read as Q4-only. The AFL and Tennis rows turn out
to be governed by other logic (crunch-timing and tier assignment,
respectively), not `_otwIsFinalPeriod` — TASK 1 below should re-verify
this precisely and correct this doc if the categorization above is wrong.

## TASK 1 — Re-verify the test cases and isolate exactly which mismatches are genuinely `_otwIsFinalPeriod` questions

Re-run the 749-sample sweep (scratchpad scripts from the 2026-07-12
session, or rebuild if the scratchpad has been cleared — see the outbox
doc for the full methodology) against the CURRENT shipped
`_otwGetLiveTier`. Confirm which of the current mismatches are actually
attributable to `_otwIsFinalPeriod`'s literal-vs-first-nonzero choice
(NBA/WNBA rows above) vs. other logic (AFL crunch timing, Tennis tier
assignment — these are NOT in scope for this CC-CMD, don't touch them
without separately re-deriving why they mismatch).

## TASK 2 — Get a product decision, don't infer one

This is explicitly NOT a decision Claude Code should make unilaterally by
picking whichever produces higher OLD-agreement — OLD-agreement is not
the correctness bar (see the outbox doc's methodology caveat). Surface
the NBA/WNBA raw=70 example concretely (a tied game with 1:30 left in the
3rd quarter, genuinely tense, currently shown as "LIVE_GAME" not
"CLOSE_FINISH" purely on a quarter-number technicality) and ask for an
explicit choice: keep literal-final-period, or move to
first-nonzero-timeBonus for NBA/WNBA/MLB/AFL specifically (the sports
where this diverges from already-shipped soccer/tennis behavior).

## TASK 3 — Implement the decision

If moving to first-nonzero-timeBonus: change `_otwIsFinalPeriod`'s
NBA/WNBA/MLB/AFL/CFL branches to match `dramaScoreLive()`'s own first
nonzero timeBonus period per sport (NBA/WNBA period>=3, MLB period>=7,
AFL/CFL period>=3 — re-derive exact values from `dramaScoreLive()`'s
current timeBonus table, don't copy these from memory, they may have
drifted). **Also re-verify the `looseTier3Sport` AFL/CFL carve-out still
makes sense against the new finalP definition** — v3's AFL regression
(9 false LIVE_GAME promotions, see the outbox doc's autopsy) happened
exactly because a wider finalP interacted badly with that carve-out; do
not repeat that specific mistake. Re-run the full 749-sample sweep before
committing and report the new agreement percentage and any new
mismatches, don't assume it's clean.

If keeping literal-final-period: close this CC-CMD with a note in the
outbox that the decision was explicitly made to keep current behavior,
with the reasoning, so this doesn't get re-litigated from scratch next
time someone notices the same NBA raw=70 case.

## VERIFICATION

- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Full 749-sample sweep re-run, agreement percentage reported honestly
  (don't cherry-pick a subset).
- If changed: real-data check via live ESPN scoreboard fetch (same
  browser-tool pattern as the 2026-07-12 session used), at least one real
  live game if available at execution time.

## DONE CONDITION

Either: (a) `_otwIsFinalPeriod` updated per an explicit product decision,
with the full sweep re-run and a clean result, and Rule 95 / the outbox
doc updated accordingly; or (b) an explicit "keep current behavior"
decision recorded in the outbox with reasoning, so this is closed, not
just abandoned.

**Confidence scoring:**
- TASK 1 correctly isolates which mismatches are genuinely `_otwIsFinalPeriod`-caused vs. other logic (25 pts)
- TASK 2 surfaces a real decision point rather than picking silently (25 pts)
- TASK 3 implements cleanly (if changed) with a full clean re-sweep, or closes cleanly with reasoning (if kept) (35 pts)
- Real test coverage, all three suites clean (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
