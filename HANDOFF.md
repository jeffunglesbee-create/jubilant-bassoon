# FIELD Handoff — May 25 2026 (Patent Mitigation M1+M2)

HEAD: 25f8571
Smoke: 188/0
Deploy: SUCCESS
SW_VERSION: 2026-05-25a

## WHAT WAS BUILT

Two patent mitigations triggered by screenshot review:

**M1 — "drama N" composite number removed from Betting Intelligence card**
  preGameScore() is a multi-factor composite (importance + broadcast + odds + milestones).
  Displaying it labeled "drama" in the Betting Intelligence Tonight On FIELD card
  recreates "interest level value" visually (Case A posture per Numerical Usage Policy).
  Resolution: numeric span removed from renderTonightSummary(). Semantic badges remain.
  Sorting still uses preGameScore internally — sorting ≠ classification.
  Live dramaScoreLive() on live cards is UNAFFECTED (Case C: single dimension, safe).

**M2 — Scout's Pick reformulated as boolean gates**
  OLD: preGameScore(g) > 70 → composite threshold → badge
  NEW: isScoutsPick(g) → individual boolean gates (no composite sum):
    - NOT a national game
    - Has playoff/series context (boolean)
    - Odds show competitive matchup (moneylineGap < 150, single dimension)
    - Near-milestone player (boolean)
  5 call sites replaced. Tooltip now describes signal, not score.
  Loophole 1 preserved: no interest level value computed and thresholded.

Patent mitigation doc: Drive 1Hcc-hvYc8MKbLBCWXFe3S-Nu_gw_hT_7Gcz_M-oa1LI

## REMAINING POSTURE

dramaScoreLive: Case C — safe (single dimension, admitted prior art)
preGameScore: sort/rank only — never thresholded in if() classification
Scout's Pick: boolean gates — Case C construction
Push: ADR-002 — independent boolean, never reads preGameScore

## NEXT SESSION

- Items 7-9 journalism depth (Reddit buzz, ESPN athlete stats, Google Trends)
- SCORE-UNIFORM-A active bug (~45 min TYPE B)
- TYPE A daily update (SW_VERSION bump for May 26)
- Current State doc update (very stale)
