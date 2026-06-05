# FIELD HANDOFF — 2026-06-06 (Session END — full journalism surface audit)

## State
jubilant-bassoon HEAD: a14db62 · Smoke: 509/0 · Unit: 66/0
field-relay-nba HEAD: 981d474
SW_VERSION: 2026-06-05a

## Full Journalism Surface Audit — COMPLETE ✅

Systematic audit of all 21 sports against 10 surfaces.
Found and fixed gaps across 3 commits: d2026c4 (AFL/CFL), 84f7c2d (AFL/CFL cleanup), a14db62 (all remaining).

### Final surface coverage matrix

| Sport | NightOwl | BottomSh | Drama | Classify | LeagueTag | FieldVoice | DetectClass | VocabViol | QualityTgt | LiveSrc |
|---|---|---|---|---|---|---|---|---|---|---|
| NBA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| NHL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MLB | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| NFL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | off-season |
| WNBA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | →basketball | ✅ | ✅ | ✅ |
| MLS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| EPL | ✅ | ✅ | →soccer | ✅ | ✅ | ✅ | ✅ | →soccer | ✅ | off-season |
| UCL/UEFA | ✅ | ✅ | →soccer | ✅ | ✅ | ✅ | →soccer | →soccer | ✅ | off-season |
| LaLiga | ✅ | ✅ | →soccer | ✅ | ✅ | →soccer | ✅ | →soccer | ✅ | off-season |
| Serie A | ✅ | ✅ | →soccer | ✅ | ✅ | →soccer | ✅ | →soccer | ✅ | off-season |
| Bundesliga | ✅ | ✅ | →soccer | ✅ | ✅ | ✅ | ✅ | →soccer | ✅ | off-season |
| Ligue 1 | ✅ | ✅ | →soccer | ✅ | ✅ | →soccer | ✅ | →soccer | ✅ | off-season |
| WC26 | ✅ | ✅ | →soccer | ✅ | ✅ | ✅ | →soccer | →soccer | →soccer | ✅ (Jun 11) |
| AFL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (squiggle) |
| CFL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (odds) |
| Tennis | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Golf | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Cricket | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ (willow) |
| Rugby | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| NCAAMB | — | — | — | ✅ | ✅ | — | — | — | — | — |
| NCAAFB | — | — | — | — | — | — | — | — | — | — |

→soccer = intentionally routed through soccer block (correct behavior)
→basketball = WNBA routes to basketball class (correct)
— = no live data source or rarely shown; low priority

Notes:
- Golf/Cricket/Rugby: no dramaScoreLive (no live score source; FIELD shows pre/post only)
- Golf/Cricket/Rugby: no getQualityTarget (no quality history to learn from yet)
- NCAAMB/NCAAFB: in-season only; carry-forward if they get a data source

## Priority List
1. JQ Gate brand-safe fallback (~60 lines)
2. Drama Dial header chip (~20 lines)
3. Arc Poster (~200 lines, BLOCKER: verify getDramaHistory() populated live)
4. State Transition PerformanceObserver (~30 lines)
5. iOS PWA Add-to-Home (~40 lines)

## Key Refs
jubilant-bassoon HEAD: a14db62
field-relay-nba HEAD: 981d474
Smoke: 509/0 · Unit: 66/0
