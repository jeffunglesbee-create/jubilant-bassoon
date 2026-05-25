# FIELD Handoff — May 25 2026 (Journalism Depth Items 4-6)

HEAD: cfba7e8 (jubilant-bassoon) / 90304bc (field-relay-nba)
Smoke: 175/0
Deploy: SUCCESS (both repos)
SW_VERSION: 2026-05-25a

## WHAT WAS BUILT

Items 4-6 of the journalism depth build (9-item series):

**Item 4 — BDL season averages (fetchBDLPlayerContext)**
  Extracts player names from series matchupNotes via regex (name before stat).
  Two-step: search /bdl/nba/v1/players → /bdl/nba/v1/season_averages.
  24h localStorage cache per player. Parallel pre-fetch before buildCompoundPrompt.
  Injects [SEASON STATS] into game lines: "Brunson: 24.2 PPG / 6.7 APG (season)"

**Item 5 — NHL live shots + save% (fetchNHLLiveStats)**
  Calls /nhl/v1/scoreboard/now (already routed). For each live game:
  fetches /v1/gamecenter/{id}/boxscore for goalie name + sv%.
  Injects [NHL LIVE]: "Shots: MTL 22–18 CAR · Markstrom 94.4% sv%"
  90s cache. Maps by home|away team name key.

**Item 6 — MLB Stats boxscore (fetchMLBBoxscoreContext)**
  NEW relay route added: /mlb-stats/* → statsapi.mlb.com/api/v1 (relay 90304bc).
  Uses game.sourceId (gamePk). Extracts current pitcher IP/K/ERA/ER + team batting avg.
  Injects [MLB BOX]: "Cole: 7.0 IP, 9K, 1 ER · Yankees .287"
  90s cache per gamePk.

Architecture: all three pre-fetched via Promise.allSettled() in
fetchCompoundEditorial() before buildCompoundPrompt(). Synchronous reads
inside the game line builder.

## WHAT'S NEXT

Items 7-9 (cultural signals):
  7. Reddit buzz signal — r/nba r/hockey r/baseball comment velocity
  8. ESPN /athletes/{id} career stats endpoint
  9. Google Trends alpha API for cultural relevance

Also pending:
  - TYPE A daily update (SW_VERSION bump May 26)
  - SCORE-UNIFORM-A active bug (~45 min TYPE B)
  - Current State doc update (stale)
