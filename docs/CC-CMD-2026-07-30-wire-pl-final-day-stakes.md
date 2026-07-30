# CC-CMD-2026-07-30-wire-pl-final-day-stakes

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Confirmed by:** direct grep against live HEAD, 2026-07-30, and a prior
independent audit already recorded in this file's own comments
(CC-CMD-2026-07-15-string-referenced-verify): `_plTitleNote`,
`_plCityNote`, `_plTotNote`, `_plWhuNote` have ZERO real callers anywhere
in the file. The clinch-scenario/goal-difference math itself was already
confirmed correct by that same audit — this is a wiring task, not a
correctness task.

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-30-wire-pl-final-day-stakes.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Locate the current `PL_FD` object and the four note functions fresh —
  do not trust line numbers from this doc or any prior read, both are
  already stale by definition.
- Confirm the functions' actual signatures (what do they take, what do
  they return — a string? an object?).
- Confirm whether `PL_FD`'s hardcoded 2025-26 season values are STILL
  the ones in the file, or whether a later session already refreshed
  them for the current season without wiring a caller. Check both
  independently — do not assume one implies the other.

## Task 2 — Build the missing caller

The existing comment already scopes this precisely: *"Whoever picks
this up next season needs to build a real caller (e.g. a per-game
matchupNote injection point) in addition to refreshing PL_FD."*

- Identify the correct injection point — likely wherever `matchupNote`
  is already set for EPL games elsewhere in the file (search for the
  existing EPL matchupNote pattern and match its convention, per the
  DO-NOT-INVENT principle — reuse the established pattern, do not
  invent a new one).
- Call the appropriate note function(s) for games involving the
  relevant teams, gated to the actual Final Day date (the existing code
  already has a similar gate pattern elsewhere in the file for
  date-gated seasonal content — find and reuse it).
- Confirm the note text actually reaches a rendered surface (matchupNote
  display, or wherever these strings are meant to surface) via a real
  browser check, not just "the function was called."

## Task 3 — Data refresh is a SEPARATE, later decision

Do NOT refresh `PL_FD`'s hardcoded standings values as part of this
CC-CMD unless the current Premier League season's Final Day is
imminent (check the actual date before deciding). If it is not
imminent, wiring the caller with the EXISTING (stale) data is still the
correct scope for this task — the point is proving the pipe works, not
guessing at numbers for a date that may be months away. If Final Day
IS imminent, flag this explicitly and ask before hand-entering new
standings values, since those are real, verifiable facts that need a
real source, not invention.

## Task 4 — Smoke + verify

- `node field_smoke.js` — 0 failures required.
- Confirm via direct evaluation (not just code inspection) that at
  least one of the four note functions is now reachable from a real
  render path for a relevant game.

---

## Explicitly NOT in scope

- Do not build the GENERAL domestic-league relegation/title/aggregate
  formula (the broader "soccer four-layer formula"). That was
  investigated and found to not exist in ANY form, coded or dead — it
  is a materially larger effort than wiring this one already-correct,
  already-hardcoded PL Final Day case. Separate decision, not this
  CC-CMD.
- Do not extend this pattern to La Liga, Serie A, or any other league's
  relegation battles. PL Final Day only, matching what already exists.
- Do not touch `sitBonus`, `dramaScoreLive`, or the live in-game scoring
  path. This is pre-game/day-of editorial narrative text, not a
  numeric score input.

---

## Outbox

`outbox/cc-session-2026-07-30-pl-final-day-wiring.md`: which injection
point was chosen and why, confirmation the note text renders on a real
game (screenshot or DOM text, not just "no errors"), and whether
`PL_FD`'s data was found current or stale (without necessarily
refreshing it — see Task 3).
