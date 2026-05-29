# FIELD Handoff — May 29 2026 (Session End — RAI Chain Fixes + Baseball RAI)

## Code HEAD
`df5e49c` — MLB Platoon RAI built · Smoke 256/0

## COMPLETED THIS SESSION

### NBA RAI — Six bugs fixed across multiple builds:
1. `47a8e7d` Temporal dead zone: homeLabel/awayLabel declared after fetchRosterAdvantage call
2. `ab98a0f` Bottom sheet cache key mismatch: _raiCache[espnEventId] vs _raiCache[game._id]
3. `ab98a0f` ESPN boxscore home/away: team.homeAway field doesn't exist → use name matching
4. `ab98a0f` eData matching checked homeName only → now checks home + away names
5. `544fd98` RAI placement: appended to .game-card without grid-column → 3px accent column
   Fixed: now injected inside .score-wrap (grid-col:2 row:2 all viewports)
   _raiRehydrateScoreWrap() re-injects from cache after score updates
6. NBA CDN relay: `ce67a98` /nba-live → /nba (route already existed)
   All NBA CDN fixes tested against live OKC@SAS G6 data (probe confirmed working)

### MLB Platoon RAI — built and shipped:
- `df5e49c` MLB at-bat matchup edge
- fetchMLBPlatoon(): MLB Stats live feed /game/{gamePk}/feed/live
  → batSide + pitchHand → platoon advantage + count context
- Switch hitters always have platoon edge
- Display: "L vs R · batter edge" / "0-2 count (pitcher)" in score-wrap
- Bottom sheet: At-Bat Edge section with batter/pitcher names
- TESTING TOMORROW with live games

### NBA CDN probe:
- OKC@SAS G6 confirmed live: scoreboard + PBP both accessible
- No Akamai block. teamName keys (spurs_thunder) confirmed in scoreboard response.
- Probe doc: 1ZrGeeiFlFQXTnL24ABQ28knaNLnYhETk3FMuCOiaiGg
- Game result: SAS 118 - OKC 91. Series now 3-3. Game 7 in OKC.

## CURRENT STATE

HEAD: df5e49c · Smoke 256/0
RAI system fully built:
  NBA: Tier 1 NBA CDN (exact lineup + stint net) ← active
       Tier 2 ESPN plays[] ← active (site.web.api.espn.com relay)
       Tier 3 ESPN boxscore ← always fallback
  MLB: platoon + count context ← built, needs live game test tomorrow
  Both inject into .score-wrap for consistent cross-viewport placement

OPEN: NBA RAI visual confirmation still unverified (game ended before test)
      Test on Game 7 or next available live NBA game
      Test MLB platoon on any live game tomorrow

## RELAY STATE

field-relay-nba deployed with:
  /nba/* → NBA CDN (playbyplay + scoreboard whitelisted)
  /espn-summary/* → site.web.api.espn.com (unlocks data.plays)
  /mlb-stats/* → MLB Stats API (live feed + people + boxscore)

## QUEUE

TIER 0 DEADLINES:
⚡ NHL SCF shell — ECF just resolved, Hurricanes eliminated? Check results
⚡ NBA Finals G1 shell — June 3 (OKC or SAS vs East winner)
⚡ World Cup 2026 Phase 1 — June 11 HARD DEADLINE
⚡ USPTO provisional — ~June 25

NEXT SESSION:
1. Verify RAI showing on live game (NBA or MLB)
2. NHL SCF shell if ECF resolved
3. NBA Finals G1 shell

## CANONICAL IDs
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Repo: jeffunglesbee-create/jubilant-bassoon
RAI spec: 1XwUC3lV3I6YnMc35rYogNvbwIwZmRYRBmAy-XDvwAWA
RAI audit: 1liYzvOBlmQoVuQQbE6WXIbWQKuaCXrosRGqKRjPVsMQ
CDN probe: 1ZrGeeiFlFQXTnL24ABQ28knaNLnYhETk3FMuCOiaiGg
