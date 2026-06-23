# FIELD HANDOFF — June 22 2026 (updated ~9:10pm ET)

## State
- CLIENT HEAD: 961da82 · 2026-06-22 · via chat
- RELAY HEAD:  5b7d261 · 2026-06-22 · via CC (manifest [skip ci])
- RELAY LIVE:  2350242 · deployed 2026-06-22T23:53:43Z · CI green
- Smoke: 725/0 (authoritative from CI — get_smoke_count tool reports 663, known drift)
- SW_VERSION: 2026-06-22a

Note: 5b7d261 is [skip ci] manifest. 2350242 is true relay live HEAD.
deploy_match false on relay is expected.

## Session Start Protocol (Rule 85)
Call session_health MCP tool FIRST. Do NOT use read_handoff as primary state.

## What Shipped This Session (June 22 full day)

### Browser Rendering MCP ✅ (relay)
- browser_quick + BrowserDO working. Verification URLs: /?tab=journal|groups

### v4 Voice + Quality Chain ✅
- FIELD_VOICE_REGISTER at 7 call sites, queue consumer runQualityChain

### Backfill Re-gen ✅
- 60/60 game_briefs scored, avg 159, zero NULLs

### Stale Data Sentinel ✅ (relay 73a4a52)
- GET /health/sources — 13 sources, 8 healthy, 4 stale, 1 skipped

### MLS Return Prep ✅
- 263 MLS games seeded to D1 (July 22 – Oct 31)
- soccer/fbref/mls.json in R2 green
- POST /fixtures/fetch relay endpoint (permanent, bypasses CF Bot Fight Mode)

### Odds Story Materializer ✅ (relay 2350242)
- GET /odds-story/preview?date=YYYY-MM-DD live, 4/5 games with movement

### Smoke / A190 fix ✅ (5e172ba)
- sw.js SW_VERSION synced to 2026-06-22a — A190 resolved

### Newspaper UX fixes ✅ (6b452fa + da10743)
- Fix 1: scroll-to-top after renderNewspaper (window.scrollTo instant)
- Fix 2: first-visit modal deferred 2500ms unconditionally when field_setup_done not set
  (race fix: bootNewspaper + fetchSchedule run in parallel; defer is unconditional)
- ?wpt bypasses modal for returning visitors; headless browser has no localStorage

### Desk CLS fix ✅ (3050b30 + 961da82)
- renderFieldDesk was called 6× per page load (journalism pipeline async paths)
- Each call wiped grid.innerHTML → section collapsed 60px → re-expanded → CLS spike
- Root cause in screenshot: CLS 8.3285 total, max window 5.5056, 14 events
- Fix 1: scheduleFieldDesk(delay) debounce wrapper — coalesces all calls into one
- Fix 2: skip-if-same guard — grid.innerHTML only written when content changes
- All 6 setTimeout(renderFieldDesk, N) call sites replaced with scheduleFieldDesk(N)
- Smoke assertions A254/A257 updated to match new function name
- Expected CLS reduction: ~8.3 → ~0.4–0.5 (one unavoidable initial population)

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
1. assembleContext sport-label mismatch — golf/WNBA still get empty context
2. Phase 8b quality_alert threshold tuning — re-baseline after June 29
3. wentToOT hardcoded false in newspaper
4. KV editorial keys not consulted by newspaper
5. nba_clutch + nhl_series R2 stale (seasons over — heals Oct/Nov)
6. API-Sports Football Pro renewal — JUNE 29 DEADLINE
7. NFL SPORT_TO_V2 — September 9 deadline
8. CLS residual: initial desk populate (~0.5) still unavoidable — consider content-visibility:auto
9. soccer_fbref_mls weekly cron first run July 20 (not yet confirmed)

## Priority (next session)
1. API-Sports renewal decision (June 29 DEADLINE)
2. assembleContext golf/WNBA empty context
3. wentToOT newspaper carry-forward
4. Phase 8b threshold tuning
