# CC-CMD-2026-07-30-reconcile-soccer-base-formula

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Deadline context:** EPL 2026-27 starts **August 21, 2026** (verified via
web search, 2026-07-30) — this formula runs on every EPL/UEFA/domestic
match from day one. UEFA Champions League qualifiers already started
July 7 and are live now.

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-30-reconcile-soccer-base-formula.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## This is a decision task, not a bug fix — read this before touching code

Earlier chat sessions today initially framed soccer's live drama formula
as neglected. A closer read found the opposite: `dramaScoreLive`'s
soccer branch has been ACTIVELY developed as recently as **2026-07-04**
(CC-CMD-2026-07-04-soccer-drama-scoring-fix):

- A dedicated extra-time `timeBonus` (+24 for `period>=3`), live-verified
  against a real WC26 knockout game (ESPN event 760499, Australia 1-1
  Egypt, decided by penalties) — confirmed period labeling for extra
  time and shootout.
- A FIFA-rank-based `upsetBonus`, using real rank data via the relay,
  deliberately CONDITIONAL (only fires when the underdog is currently
  within 1 goal, not a flat pre-game bonus) — with explicit RUWT/ADR-002
  reasoning in the comment (internal signal, not pre-game narrative).

**The one piece that does NOT match a separate, earlier (May 2026) spec
("Soccer Drama Score: Full Breakdown," Drive doc
1KUiDqiH-1_Dc7Gmv1TyLmS1OSwF-DiXVesoXu3eRubA) is the base score-closeness
table:**

```
Live today:  diff===0?1.0 : diff===1?0.72 : diff===2?0.32 : 0.06
May spec:    tied=1.0, margin1=0.85 (0.90 if bothTeamsScored), margin2=0.45, margin3+=0.15
```

`bothTeamsScored` as a concept is confirmed absent entirely — not
partially built, not referenced anywhere.

**The question this CC-CMD answers is not "which number is right" — it
is "was the base table a deliberate decision that the July 4 work built
around, or a genuine gap nobody revisited while everything else moved
forward."** Those have different correct actions.

---

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Re-read the current soccer `base` and `timeBonus` branches of
  `dramaScoreLive` fresh — confirm the exact numbers above still match
  live HEAD.
- Read the full CC-CMD-2026-07-04-soccer-drama-scoring-fix outbox
  record (search `outbox/` for it) if it still exists — does it mention
  the base formula at all, even in passing? If the July 4 author
  explicitly considered and kept the existing base numbers, that is
  decisive evidence this was deliberate. If July 4 only touched
  timeBonus/upsetBonus and never mentioned base, that supports "never
  revisited" instead.
- Read the May 2026 spec doc directly (link above) for its own stated
  reasoning behind `0.85/0.45/0.15` — was there a real calibration
  process (e.g., tested against real match data), or was it a proposed
  starting point never validated?

## Task 2 — Decide, with evidence, don't guess

Based on Task 1's findings:

- **If July 4 deliberately kept the current base numbers**: leave them.
  Document the finding in the outbox so this question does not get
  re-asked next season. Nothing else to do.
- **If the base table was genuinely never revisited**: this is the
  live, real decision — adopt the May spec's numbers, or run a
  quick validation first (a same-shape check to today's MLB round-1
  validation script — real historical soccer games, both formulas,
  compare resolution/reasonableness) before committing to a change that
  affects every match starting in 22 days. Given the time pressure, a
  fast validation is better than either extreme (shipping unverified,
  or not deciding before the season starts).
- Either way, add `bothTeamsScored` as a real signal if adopting the
  May numbers, since it was part of that spec's stated design and is
  currently entirely unbuilt — don't half-adopt the table without the
  condition that was designed to gate part of it.

## Task 3 — Smoke + verify

- `node field_smoke.js` — 0 failures required.
- If the formula changes, construct at least 3 real recent soccer game
  scenarios (a blowout, a 1-goal game, a tied game with extra time) and
  show the before/after score for each — confirm the change does what
  was intended, not just that it compiles.

---

## Explicitly NOT in scope

- Do not touch `timeBonus`, `upsetBonus`, `sitBonus`, or the extra-time
  logic — all independently confirmed working and recently verified.
  This task is about `base` only.
- Do not touch Layers 2-4 (competition context, two-legged aggregate,
  multi-game Final Day) — separate CC-CMDs
  (CC-CMD-2026-07-30-wire-pl-final-day-stakes.md, already pending;
  CC-CMD-2026-07-30-build-two-legged-aggregate-tracking.md, this same
  session).

---

## Outbox

`outbox/cc-session-2026-07-30-reconcile-soccer-base-formula.md`: which
of the two paths was taken and why, the evidence from Task 1 that
decided it, and (if changed) the 3 real before/after test cases.
