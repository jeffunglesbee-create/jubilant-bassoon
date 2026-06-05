# FIELD HANDOFF — 2026-06-04 (SESSION END)

## State
jubilant-bassoon HEAD: d932e81 · Smoke: 484/0 · Unit tests: 60/0
field-relay-nba HEAD: 78618f6

## This Session — Advancement Probability Complete

### relay/src/soccer-wp.js (78618f6)
computeAdvancementProb v2:
  - estimateThirdPlaceRate(): proper rank-based estimate from cross_group_rank
    (rank 1-6: 95%, 7: 80%, 8: 50% bubble, 9: 20%, 10: 5%, 11-12: 1%)
    Pre-tournament default: 8/12 = 66.7% (uniform)
  - groupId derived from standings[0].group_id for rank lookup
  - method tag: 'single-game-scenario-v2'
  - Removed hardcoded 0.5/0.6 + stale _ suppressor

### index.html (d932e81)

_wcAdvancementProb(teamName, scenarios, groupId, liveGame, side):
  Primary: Permutations Engine pQualifyTop2 + pQualifyAsBest3rd (multi-game).
  Fallback: relay g.advancementProb.homeAdvance/awayAdvance (single-game v2).
  Fuzzy team-name matching for Odds API vs wc26Raw variations.
  Source tagged: 'permutations' | 'relay-v2'

_wcBuildAdvBar(liveGame, hAdv, aAdv, hName, aName):
  Dedicated two-tone advancement bar (home green / away amber), injected
  BELOW the WP bar in same <td>. Shows opening delta from GameDO baseline (▲▼)
  when ≥5pp. Source label: 'full group scenarios' vs 'single-game estimate'.
  CSS: wc-adv-bar, wc-adv-home, wc-adv-away, wc-adv-gap, wc-adv-meta.

_wcBuildWPBar: calls _wcAdvancementProb for both teams, renders _wcBuildAdvBar.

_wcScenarioBadge:
  Badge now shows TRUE P(advance) = pQualifyTop2 + pQualifyAsBest3rd.
  '${pAdvPct}% adv' when best-3rd path meaningful (≥1%).
  Tooltip: 'XX% = YY% top-2 + ZZ% as best-8 third'.

What was connected that wasn't before:
  relay g.advancementProb → first consumed anywhere in browser display
  GameDO openingAdvanceProb → baseline delta in advancement bar
  pQualifyTop2 + pQualifyAsBest3rd → unified P(advance) badge (not split)
  Live WP → outcomeProbabilities → Permutations → real-time advancement bar

## Complete WP + Advancement Stack — Final Status
  ✓ Poisson + Dixon-Coles model (computeLiveWP)
  ✓ lambdaFromTotalsAndH2H (totals market, 20-step binary search)
  ✓ oddsToLambda (h2h inversion fallback)
  ✓ lambdaFromShots (SOT proxy, trust-blended)
  ✓ Pre-game lambda cache (getWCPregameLambdas, 5-min TTL)
  ✓ winProb on V2 live game (source: odds-blended/shots-proxy/default-lambda)
  ✓ Soccer CRUNCH: 4 conditions, WP-gated late_deficit, /crunch route fixed
  ✓ computeAdvancementProb v2 (cross-group thirdPlaceRate from D1 rank)
  ✓ GameDO WP store: openingWP, lastWP, wpHistory, openingAdvanceProb
  ✓ GameDO WS fan-out: {type:'wp', wp, wpDelta}
  ✓ Level 1: 3-segment WP bar + source label + pulse
  ✓ Level 1+: wpDelta trend ↑↓ (≥2pp per poll)
  ✓ Level 3a: WP Surprise — openingWP vs current (≥5pp)
  ✓ Advancement bar: dedicated visual row with both teams' P(advance)
  ✓ Advancement bar: opening delta from GameDO (▲▼ when ≥5pp)
  ✓ Advancement badge: true P(advance) = pQualifyTop2 + pQualifyAsBest3rd
  ✓ v1.4 Poisson margin model — matchMeta wired correctly
  ✓ v1.5 fair-play tiebreaker
  ✓ v1.6 bracket implications (Match 73-88)
  ✓ v1.7 simultaneous-kickoff banner
  ○ Level 2 sparkline (recentWPHistory available; display not built)
  ○ wpDelta → drama dial hookup

## Smoke: 479→484 / Unit tests: 60/0

## Outstanding Before June 11
  - /wc/admin/seed e2e test
  - BALLDONTLIE trial: June 11
  - Scoreboard P0
  - Watch Engine WC fix (~line 26190)

## Key Refs
jubilant-bassoon HEAD: d932e81
field-relay-nba HEAD: 78618f6
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 484/0 · Unit tests: 60/0
