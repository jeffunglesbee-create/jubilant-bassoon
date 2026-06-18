BUG 1 — Night Owl narrative inversion (CRITICAL)
CC-CMD-2026-06-18

OBSERVED (Twins 9 @ Rangers 3, MIN @ TEX, June 17):
  - "The Rangers held an early advantage, leading by as many as 4-runs"
  - "the Twins lineup eventually secured a 10-run lead"
  - "There were 3 lead changes"

VERIFIED TRUTH:
  - Twins scored 4 in the 1st and led wire-to-wire
  - Maximum Twins lead was 7 (when 9-2 in the 8th)
  - 0 lead changes occurred

ROOT CAUSE — buildLinescoreContext (index.html:33201)

  The function emitted "[LINE SCORE] Inn1: 0-4 | Inn2: 0-4 | ..." with the
  pair ordered home-away (cumH-cumA). The Twins (away) scored 4 in inning 1
  so cumH=0, cumA=4 → "0-4". Numerically correct.

  But broadcast convention reads score pairs as away-home (the same order
  Game: "MIN @ TEX" uses earlier in the prompt). The LLM defaulted to that
  reading: "team-A scored 0, team-B scored 4" → "Rangers (home) had 0,
  Twins (away) had 4" was the intended meaning, but the LLM resolved it as
  "first listed team scored 0 — that's the away team MIN", placing the 4
  on Rangers. Everything downstream inverted from there.

  The "10-run lead" and "3 lead changes" are pure hallucinations enabled by
  the misread linescore. buildScoreNarrativeContext output ("Twins led by
  as many as 7-runs") was correct but silent on absence of lead changes,
  so the LLM filled in plausible-sounding numbers.

FIX (one commit, two coordinated edits):

1. buildLinescoreContext now takes (eData, gameId, homeLabel, awayLabel)
   and emits explicit team-nick labels in away-first order:

   BEFORE: "[LINE SCORE] Inn1: 0-4 | Inn2: 0-4 | ... | Inn9: 3-9"
   AFTER : "[LINE SCORE] Inn1: Twins 4, Rangers 0 | Inn2: Twins 4, Rangers 0
           | ... | Inn9: Twins 9, Rangers 3"

   No positional ambiguity. The LLM cannot misread.

2. buildScoreNarrativeContext appends a wire-to-wire marker when the loser
   never led and there were 0 lead changes:

   BEFORE: "[SCORE NARRATIVE] Twins led by as many as 7-runs"
   AFTER : "[SCORE NARRATIVE] Twins led by as many as 7-runs
           · wire-to-wire (Rangers never led)"

   Removes the prompt gap that let the LLM invent lead changes / early
   advantages on never-trailed games.

3. Three call sites updated to pass game.home + game.away into
   buildLinescoreContext:
     - index.html:24803  (FIELD desk brief context block)
     - index.html:34610  (Night Owl prompt — owl candidate path)
     - index.html:34917  (Night Owl prompt — owlEData path)

END-TO-END VERIFICATION (Rule 61):

  Replayed Twins-Rangers innings against the patched functions in a
  Node stub harness. Output:

  LINESCORE:
  [LINE SCORE] Inn1: Twins 4, Rangers 0 | Inn2: Twins 4, Rangers 0
  | Inn3: Twins 4, Rangers 0 | Inn4: Twins 6, Rangers 0 | Inn5: Twins 6, Rangers 0
  | Inn6: Twins 7, Rangers 0 | Inn7: Twins 7, Rangers 2 | Inn8: Twins 9, Rangers 2
  | Inn9: Twins 9, Rangers 3

  NARRATIVE:
  [SCORE NARRATIVE] Twins led by as many as 7-runs · wire-to-wire (Rangers never led)

  Both outputs match the verified box score. No 4-run Rangers advantage,
  no 10-run lead, no 3 lead changes — those were LLM hallucinations on
  an ambiguous prompt, not bugs in this code path.

DRAMA SCORE AUDIT (BUG 1 sub-task):

  User asked whether 52/100 on a wire-to-wire blowout suggests the drama
  engine has the same inversion bug. Skimmed the drama functions
  (getDramaSustained, getDramaTrend, getDramaPeakWithTime, computePushDrama)
  — they all use `Math.abs(home - away)` for margin and read raw scores
  symmetrically. No home/away inversion. 52/100 on a 9-3 game with
  multiple multi-run innings is a defensible mid-tension reading
  (volatility-aware, not lead-flip-only); not a bug. Documenting here so
  the audit is on the record; no code change required for that part.

PIN: smoke.js A651 (asserts signature, output template, all three call
     sites pass labels, and the wire-to-wire marker).

SW_VERSION: 2026-06-18c → 2026-06-18d.
SMOKE: 690 → 691 / 0.
