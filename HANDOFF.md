# FIELD Handoff — May 29 2026 (Session End — TYPE C: ESPN Pivot Phase 1)

## SESSION TYPE
TYPE C — Feature. Phase 1 live. ESPN parallel retained.

## Code HEAD
`820d5e2` — Smoke 239/0 · Deploy gate success

## COMPLETED THIS SESSION

### ESPN Pivot Phase 1 — api-sports.io live scores (820d5e2)

NBA, NHL, MLB, MLS live scores now served from api-sports.io instead of ESPN.
ESPN polling path retained in code — only bypassed when FIELD_V2_SOURCES[sport] = true.

**FIELD_V2_SOURCES state:**
- nba: true  (api-sports.io basketball, league 12)
- nhl: true  (api-sports.io hockey, league 57)
- mlb: true  (api-sports.io baseball, league 1)
- mls: true  (api-sports.io football, league 253)
- epl/ucl/laliga/seriea/bundesliga/ligue1: false (seasons ended ≤2026-05-26)

**What's wired:**
- ESPN_TO_V2_MAP: maps ESPN league IDs → FIELD V2 sport keys
- V2_PERIOD_PREFIX: correct periodPrefix per sport (Q/P/T/') for findESPNScore exclusion
- fetchESPNScores() polling loop: checks ESPN_TO_V2_MAP[league] + FIELD_V2_SOURCES[v2Key]
  at the START of each league callback — if true, calls fetchV2Games() + mapV2ToESPN(),
  writes to espnScores, updates _espnLeagueState, returns early (skip ESPN)
- mapV2ToESPN(): FieldGame → espnScores entry format (state/scores/period/clock/periodPrefix)
  WP, leaders, linescores are null — V2 doesn't provide these yet
- A244 regression guard added (239/0)

**Not yet wired (Phase 2 when needed):**
- Win probability (currently ESPN WP only — needs separate api-sports.io fixtures/statistics)
- In-game leaders (ESPN boxscore enrichment — not in /v2/games response)
- Baseball situation (outs/balls/strikes — needs /v2/game detail endpoint)

### Phase 0 client stubs also added (were lost to push conflicts)
V2_RELAY_BASE, FIELD_V2_SOURCES, ESPN_TO_V2_MAP, V2_PERIOD_PREFIX, fetchV2Games, mapV2ToESPN

## ESPN SURFACE REMAINING (not yet removed — spec says bake before delete)
- ESPN path still called for: WNBA, NFL, NCAA, F1, Golf, UCL/UEL/UECL (via ESPN_SPORTS)
- Soccer leagues via SOCCER_LEAGUES: eng.2-4, esp.1, ita.1, ger.1, fra.1, usa.1
  (usa.1 = MLS now bypassed via V2; others still ESPN)
- /espn-gambit relay route still live (needed for non-V2 sports)
- /espn-summary relay route still live (WP, boxscore enrichment)

Phase 2 (next season or when needed): delete ESPN paths for V2 sports; re-enable European leagues.

## STILL OPEN (carried)
- Journalism recovery (Gemini quota)
- Dropbox refresh-token: add 3 secrets
- VAPID browser opt-in test
- Golf Doc 1 (1Ak_GPXkiKUvUr6dUpcto0BUbhKTibIwgR-o8SYUeBfM): scrub key + DECOMMISSIONED
- Build Session List paste (v7.26 draft → 19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ)

## TIER 0 DEADLINES
- NHL SCF shell (CAR) — IMMINENT
- NBA Finals G1 shell (June 3, vs NYK)
- World Cup 2026 Phase 1 (June 11 HARD)
- USPTO provisional (~June 25)

## CANONICAL IDs
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Repo: jeffunglesbee-create/jubilant-bassoon
Relay repo: jeffunglesbee-create/field-relay-nba
Build Session List: 19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ
ESPN Pivot spec (in-repo): docs/espn-pivot-phase0-1-2026-05-29.md
