# FIELD HANDOFF — June 23 2026 (updated ~1:35am ET)

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

## What Shipped (June 22 full day + June 23 early)

### Browser Rendering MCP ✅ (relay)
### v4 Voice + Quality Chain ✅
### Backfill Re-gen ✅ (60/60 scored, avg 159)
### Stale Data Sentinel ✅ (relay 73a4a52, GET /health/sources)
### MLS Return Prep ✅ (263 games D1, R2 green, POST /fixtures/fetch)
### Odds Story Materializer ✅ (relay 2350242, /odds-story/preview)

### Smoke / A190 fix ✅ (5e172ba)
- sw.js SW_VERSION synced to 2026-06-22a
- Root cause: 913ebfb pushed via Contents API, bypassed deploy gate SW sync

### Newspaper UX fixes ✅ (6b452fa + da10743)
- scroll-to-top after renderNewspaper (window.scrollTo instant)
- first-visit modal deferred 2500ms unconditionally (race fix)
  Race: bootNewspaper + fetchSchedule run in parallel; conditional check
  on #field-newspaper was unreliable. Fix: check localStorage directly.

### Desk CLS fix ✅ (3050b30 + 961da82)
- CLS 8.3285 total, max window 5.5056 (screenshot confirmed)
- Root cause: renderFieldDesk called 6× per load, each wiped grid.innerHTML
- Fix 1: scheduleFieldDesk() debounce — coalesces all calls into one render
- Fix 2: skip-if-same guard — no DOM write if content unchanged
- A254/A257 smoke assertions updated for scheduleFieldDesk rename
- Expected CLS: ~8.3 → ~0.4–0.5

### assembleContext root cause identified (June 23 session)
- ALL soccer contexts empty: WC, EPL, MLS, all leagues
- Root cause: FBref blocks GitHub Actions runner IPs with HTTP 403
- Every soccer-fbref-wc.yml run since June 10 uploaded teams:{} to R2
- Health sentinel shows "ok" (file exists + fresh) but 0 teams — bug
- CC-CMD written: field-relay-nba docs/CC-CMD-2026-06-23-soccer-fbref-fetch.md (7425738)
- Fix: POST /soccer/fbref/fetch relay endpoint (CF IPs not blocked by FBref)
  Same pattern as /fixtures/fetch. Workflows replaced with curl to relay.

## Drive Docs (this session)
- 1n29dNf7_689ztxo4EzZtlS_FBER6O8khzij-c8GjKlE — Smoke analysis + newspaper UX
- 1U4KnG5zV6O-AYRZEqjGYQWH6JuS_EAroEmC_UEcgWCc — Desk CLS fix
- 1lOqcuv0fJM5zWegk89tyXXQeoPTEAq2P4SDVS1nUSUA — assembleContext root cause + CC-CMD

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
1. EXECUTE CC-CMD: field-relay-nba docs/CC-CMD-2026-06-23-soccer-fbref-fetch.md
   One-liner: "git pull. Read docs/CC-CMD-2026-06-23-soccer-fbref-fetch.md. Execute all tasks."
   Then verify: /journalism/context-probe WC contextLength > 0
2. assembleContext golf/WNBA — separate from FBref fix. No builder in CONTEXT_SOURCES.
3. Stale Data Sentinel improvement: check team count > 0 for soccer sources
4. Phase 8b quality_alert threshold tuning — re-baseline after June 29
5. wentToOT hardcoded false in newspaper
6. KV editorial keys not consulted by newspaper
7. nba_clutch + nhl_series R2 stale (seasons over — heals Oct/Nov)
8. API-Sports Football Pro renewal — JUNE 29 DEADLINE
9. NFL SPORT_TO_V2 — September 9 deadline
10. CLS residual: initial desk populate (~0.5) — consider content-visibility:auto
11. soccer_fbref_mls weekly cron first run July 20 (not yet confirmed)

## Priority (next session)
1. EXECUTE CC-CMD soccer-fbref-fetch (Priority 1 from last session — CC executes the fix)
2. Verify context-probe WC contextLength > 0 after CC ships
3. API-Sports renewal decision (June 29 DEADLINE)
4. wentToOT newspaper carry-forward
