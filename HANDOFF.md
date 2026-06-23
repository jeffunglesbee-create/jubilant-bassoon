# FIELD HANDOFF — June 22 2026 (updated ~8:10pm ET)

## State
- CLIENT HEAD: 913ebfb · 2026-06-22 · via chat
- RELAY HEAD:  5b7d261 · 2026-06-22 · via CC (manifest [skip ci])
- RELAY LIVE:  2350242 · deployed 2026-06-22T23:53:43Z · CI green
- Smoke: 663 (client — unchanged)
- SW_VERSION: 2026-06-22a

Note: 5b7d261 is [skip ci] manifest. 2350242 is true live HEAD.
deploy_match false is expected.

## Session Start Protocol (Rule 85)
Call session_health MCP tool FIRST. Do NOT use read_handoff as primary state.

## What Shipped This Session (June 22 full day)

### Browser Rendering MCP ✅ (relay 30f1709 + 2eb8a38)
- browser_quick + BrowserDO working. nodejs_compat_v2 + Response handling.
- Verification URLs: jubilant-bassoon.jeffunglesbee.workers.dev/?tab=journal|groups

### v4 Voice + Quality Chain ✅ (relay b3e8f5b + 3e4f75e)
- FIELD_VOICE_REGISTER at 7 call sites, queue consumer runQualityChain

### Backfill Re-gen ✅
- 60/60 game_briefs scored, avg 159, zero NULLs

### /session/record ✅ — working (prior incident was bad curl)

### Stale Data Sentinel ✅ (relay 73a4a52)
- GET /health/sources — 13 sources, 8 healthy, 4 stale, 1 skipped

### MLS Return Prep ✅ (jubilant-bassoon + relay 5c19efd + 78b9ee1)
- 263 MLS games seeded to D1 (July 22 – Oct 31)
- soccer/fbref/mls.json in R2 (age 0h, sentinel green)
- soccer-fbref-mls.yml weekly Monday cron added
- POST /fixtures/fetch relay endpoint (permanent, bypasses CF Bot Fight Mode)
- CF Bot Fight Mode (error 1010): jubilant-bassoon CI blocked from workers.dev
  Fix: move workflows to relay repo (field-relay-nba)

### Odds Story Materializer ✅ (relay 2350242)
- src/odds-story.js — computeOddsStory(opening, closing), FanDuel-no-spread null guards
- src/context-assembler.js — buildOddsStoryContext builder + odds_story priority-5 entry
- GET /odds-story/preview?date=YYYY-MM-DD probe endpoint
- E2E verified: 5 games on 2026-06-08, 4 with stories (TB@BOS ML +37 fav-ward, etc.)
- Mixed DK/FD source pairs work — matcher reads parsed fields not source string

## Probe Endpoints (all live)
- /analytics/newspaper/{date}
- /quality/report?days=7
- /briefs/spot-check?n=5
- /backfill/game-briefs?dry=true
- /journalism/context-probe
- /budget/odds
- /identity/mismatches
- /integrity/briefs
- /integrity/games
- /deploy/verify
- /freshness/{date}
- /health/sources                 ✅ Stale Data Sentinel
- /odds-story/preview?date=       ✅ Odds Story Materializer
- /fixtures/fetch (POST)          ✅ Server-side schedule seed

## Carry-Forwards
1. Smoke regression 724→663 — root cause unknown, investigate before next client build
2. assembleContext sport-label mismatch — golf/WNBA still get empty context
3. Phase 8b quality_alert threshold tuning — re-baseline after June 29
4. wentToOT hardcoded false in newspaper
5. KV editorial keys not consulted by newspaper
6. nba_clutch + nhl_series R2 stale (seasons over — heals Oct/Nov)
7. API-Sports Football Pro renewal — JUNE 29 DEADLINE
8. NFL SPORT_TO_V2 — September 9 deadline

## Priority (next session)
1. Smoke regression 724→663
2. assembleContext golf/WNBA empty context
3. Phase 8b threshold tuning (after June 29)
4. API-Sports renewal decision (June 29)
