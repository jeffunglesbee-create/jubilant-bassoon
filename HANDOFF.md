# FIELD Handoff — May 27 2026 (TYPE C Analytics/Spec Session Complete)

HEAD: 00db022 · Smoke: 192/3 (stale per-day config, not regressions) · SW_VERSION: 2026-05-26a · File: ~1.08MB
No code commits this session — pure analytics spec + documentation work.

## CANONICAL DOCS — ALL CURRENT

Current State: 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
Master Improvement Ranking: 1NAR2XYXC-A-MV0kvLKj9YX0ys1omYUwqw7YcdXstwIU
Master Feature Priority: 1k2pq5dB6pKeegBzVBo1ee-Xo98-Qri5aq-2WqMg_suU
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Build Session List v7.25: 19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ

## TIER 0 — DO FIRST (unchanged from previous handoff)

1. BNI patent fix (~15 min) — preGameScore → !isScoutsPick
2. EMBER patent fix (~30 min) — isLateCloseGame() replaces threshold
3. TYPE A May 27 — WCF G5 result + NHL WCF G4 result + MLB slate
4. NBA Finals G1 shell (~35 min) — JUNE 3 DEADLINE. NYK confirmed East.
5. World Cup 2026 build (~90 min) — JUNE 11 DEADLINE.
6. File Regret Risk USPTO provisional ($320 pro se) — 30-day window from May 26

## THIS SESSION — ANALYTICS SPECS CREATED (all Drive, no code)

CROSS-SPORT:
  Substitution Momentum Shift (cross-sport): 1ASy9CpKM_RIyovfvjm4nBLLD56SpHF0byNJV-fZe74g

MLB:
  Complete Baseball Analytics Spec (45 metrics): 1EwO-NfG_aBb-6CoOOliuCeCHxbYFfuTBoQrlejM7smM
  Novel Combined Metrics / Extrapolation Layer: 1KrW5KVeMIPyonwUqtp23ExR1LzpK9IFjxzSsAM3FOww
  ABS Era + Novel Metrics: 1muBDYM8-k041qCy_D4rrYkWfj6zeg1cOHqBzraqFTDg

NBA + NHL:
  NBA + NHL Analytics Spec (Cross-Sport): 13AGp87M_6FrWwMNi4y0L3rHcrIrqSaU-OvxGEGdzgSo

SOCCER:
  Soccer Club + Country + Team Fit: 11ukbH8Nivu5i2fa_KXB8KvWWYVPnNCEMpSnF-XHDngw
  Soccer Dark Arts + Athletic Intelligence: 1D5qDyyaiT06pZCMMhIN1BC_zbU72sxvWyxSV3oiQSZ0
  Soccer "Expected" Models Beyond xG: 1ylhR5TO31y0vs_-pXXXG5rOeIy2QpVAdo5HwHBPxuSg

AFL:
  AFL Advanced Analytics Spec: 1DbPS53DgZ08tvx3mzXW6Je3fC9I5HoRMOe2ma2xcyN4
  AFL Addendum — xMarks + Stoppage Physicality: 1MDJ65YPDrL_pYZ99ZJ951CJJ2PHrK3YpPJ8R9Oz_2Mg

KEY DECISIONS THIS SESSION:
  [DECISION] "Never perform the final combination" confirmed as covering ANY
    mathematical operation (add, multiply, weight, average) — not just summation.
    Update STANDARDS.md: replace "summation" with "combination" throughout.
  [DECISION] Team Fit Index (soccer) — 4 independent dimensions displayed separately
    even though it has nothing to do with excitement. Universal design principle,
    not just patent defense.
  [DECISION] xFoul / xCard / expected non-goal events = Game Character Predictors.
    They answer "what kind of game will this be?" not "who will win?"
  [DECISION] Pre-clearance physicality (AFL) is the missing layer in clearance
    analysis. Champion Data tracks it (2025 API). FIELD should surface it.

NOVEL THINKING SUMMARIES:
  Team Fit Index (soccer): 4-dimension assessment of national team cohesion.
    Club pairs + position match + tactical compatibility + international minutes.
    World Cup's most important unmeasured question. JUNE 11 BUILD PRIORITY.
  Substitution Momentum Shift: sub as controlled experiment. 10-min before/after
    window. ≥15 point swing = Impact Sub. Cross-sport (soccer/MLB/NBA/NHL/AFL).
  AFL xMarks: mark rating = actual/expected. Zone-classified intercept marks.
    Spoil quality. Stoppage physicality via pre-clearance contest dominance.
  AFL Kill Quarter: quarter variance detector. Pre-game prediction + live alert.
  Dark Arts (soccer): Clean Tackle Rate, "Getting Away With It" Index,
    Tactical Foul Map, Corner Battle Index, Dribbled Past + Response.
  Athletic Intelligence (soccer): Trackback Index, Sprint Type Classification,
    Speed Mismatch Predictor, Defensive Effort vs. Output Ratio.
  Expected Models beyond xG: xFoul, xCard, Tactical Foul Yield, Set Piece
    Frequency Predictor, Long Throw Intelligence.

PENDING — NOT YET BUILT (same as before + new additions):
  MLB Stats API wiring: PACE badge, Milestone Proximity (~60 min)
  Odds API MLB spreads removal (~5 min, 33% credit savings)
  SCARCITY badge (~10 min, zero API calls)
  ABS challenge count in live game card (~25 min)
  Soccer Team Fit Index build (~3 hours, Wave 1 before June 11)
  World Cup venue intelligence (~20 min)
  World Cup group dynamics calculator (~25 min)
  AFL Kill Quarter Detector (~20 min)
  AFL xScore Conversion badge (~15 min)
  All 85+ analytics specs above (implement in waves)

## FISH AUDIO (corrected from previous docs)

Plus = $5.50-20/month → API access. Free tier: 8K credits, no API.
Web Speech API now, Fish Audio when revenue.

## EDITORIAL MECHANICS

The Pass · The Carry · The Lock · The Unlisted · The Arc Shape Call
The Position · The Thread · The Ledger · The Revision · The Correction
Spec: 1LVVdaOQYG6RiSgGdC_dgnmwbqNvhIYluRrd-sZoSLzE

## ARTIFACT NAMING

CowserWalkoff.jsx → export default function CowserWalkoff
OriolesMagic.jsx → export default function OriolesMagic
