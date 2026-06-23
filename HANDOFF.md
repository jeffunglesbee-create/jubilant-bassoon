# FIELD HANDOFF — June 23 2026 (updated ~11:15pm ET)

## State
- CLIENT HEAD: 961da82 · 2026-06-22 · via chat
- RELAY HEAD:  9e9afa9 · 2026-06-23 · via CC (soccer xG ESPN Core API)
- RELAY LIVE:  9e9afa9 · deployed run 27999284297 · CI green
- JB HEAD:     58adcc3 · 2026-06-23 · FBref workflow schedules disabled
- Smoke: 725/0 (authoritative from CI — get_smoke_count tool reports 663, known drift)
- SW_VERSION: 2026-06-22a

## Session Start Protocol (Rule 85)
Call session_health MCP tool FIRST. Do NOT use read_handoff as primary state.

## What Shipped Tonight (soccer xG pivot)

### Soccer xG ESPN Core API ✅ (relay 9e9afa9 + jb 58adcc3)

FBref pipeline retired. ESPN Core API (`sports.core.api.espn.com`) confirmed
serving full per-game xG for WC2026. Three CC sessions executed:

**jubilant-bassoon session (58adcc3):**
- Task 3: `schedule:` blocks commented out in soccer-fbref-wc.yml and
  soccer-fbref-mls.yml. `workflow_dispatch` retained. DataImpulse secrets intact.
- Probe/handoff doc written: outbox/cc-soccer-xg-2026-06-23.md

**field-relay-nba session (9e9afa9, deploy run 27999284297):**
- Task 1: `GET /soccer/xg?league={slug}&event={id}` route added to index.js
  3-fetch pattern: competitors list → parallel home/away statistics
  Extracts: xG, npxG, xGOpenPlay, xA, PPDA, bigChanceCreated, bigChanceMissed, xGConceded
  Cache: 86400s post-game, 60s live, 300s pre-game
  Returns `_hasXG: false` when ESPN feed lacks xG (Bundesliga confirmed absent)
- Task 2: `buildSoccerFBrefContext` → `buildSoccerXGContext` in context-assembler.js
  Registry id: `soccer_fbref` → `soccer_xg`
  Orphaned `_SOCCER_LEAGUE_TO_FILE` map deleted
  Critical probe finding: `espnLeague`/`espnEventId` did not exist on game object —
  `gameMeta` carried `eventId` but never propagated to `assembleContext`.
  Both fields wired through at the two callsites that have the data
  (line 5463 slate cron, line 8516 context-probe). Silent '' return for
  callsites without them (4383 backfill, 7529 per-game route).
- Task 4: 5 smoke assertions documented in outbox (no smoke.js in relay repo)
- Task 5 — all 3 live probes pass:
  - `fifa.world/760456` → 200, `_hasXG: true`, xG home 2.36 / away 0.53 ✅
  - `ger.1/747015` → 200, `_hasXG: false` (Bundesliga structural absence) ✅
  - no params → 400 `{"error":"league and event required"}` ✅

**Carry-forward (cosmetic, out of scope):**
ESPN competitors endpoint returns team `$ref` instead of inline `displayName` —
team name falls back to competitor ID ("202" instead of "Argentina").
One additional fetch per competitor would resolve. Not affecting xG values.

### What Shipped Earlier (June 22 full day)
- Browser Rendering MCP ✅
- v4 Voice + Quality Chain ✅
- Backfill Re-gen ✅ (60/60 scored, avg 159)
- Stale Data Sentinel ✅ (GET /health/sources)
- MLS Return Prep ✅ (POST /fixtures/fetch)
- Odds Story Materializer ✅ (/odds-story/preview)
- Smoke/A190 sw.js sync fix ✅
- Newspaper UX fixes ✅
- Desk CLS fix ✅ (8.3285 → ~0.4-0.5)

## Drive Docs
- 1n29dNf7_689ztxo4EzZtlS_FBER6O8khzij-c8GjKlE — Smoke analysis + newspaper UX
- 1U4KnG5zV6O-AYRZEqjGYQWH6JuS_EAroEmC_UEcgWCc — Desk CLS fix
- 1lOqcuv0fJM5zWegk89tyXXQeoPTEAq2P4SDVS1nUSUA — assembleContext root cause

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
- /soccer/xg?league=&event=       ✅ ESPN Core API xG (NEW)

## Carry-Forwards
1. Team displayName cosmetic fix: /soccer/xg returns competitor ID not name —
   add one fetch per competitor to resolve team.$ref → displayName
2. Verify [SOCCER XG CONTEXT] appears in context-probe for a live WC game
3. API-Sports Football Pro renewal — JUNE 29 DEADLINE
4. assembleContext golf/WNBA — no builder in CONTEXT_SOURCES
5. Stale Data Sentinel: check team count > 0 for soccer sources
6. wentToOT hardcoded false in newspaper
7. KV editorial keys not consulted by newspaper
8. nba_clutch + nhl_series R2 stale (seasons over — heals Oct/Nov)
9. NFL SPORT_TO_V2 — September 9 deadline
10. CLS residual: initial desk populate (~0.5) — consider content-visibility:auto
11. Club league xG availability (EPL/MLS/La Liga) unknown until seasons resume —
    _hasXG: false handles gracefully. Verify in August when EPL opens.

## Priority (next session)
1. Verify /journalism/context-probe shows [SOCCER XG CONTEXT] for a live WC game
2. Team displayName fix in /soccer/xg (cosmetic but improves journalism output)
3. API-Sports Football Pro renewal decision (JUNE 29 DEADLINE)
4. wentToOT newspaper carry-forward
