# FIELD HANDOFF — June 23 2026 (updated ~11:50pm ET)

## State
- CLIENT HEAD: 961da82 · 2026-06-22 · via chat
- RELAY HEAD:  c3494a5 · 2026-06-23 · sentinel soccer_fbref entries removed
- RELAY LIVE:  c3494a5 · deployed · CI green
- JB HEAD:     58adcc3 · 2026-06-23 · FBref workflow schedules disabled
- Smoke: 725/0 (authoritative from CI — get_smoke_count tool reports 663, known drift)
- SW_VERSION: 2026-06-22a

## Session Start Protocol (Rule 85)
Call session_health MCP tool FIRST. Do NOT use read_handoff as primary state.

## What Shipped Tonight

### Soccer xG ESPN Core API ✅ (relay 9e9afa9 → 5ca06dc → c3494a5 + jb 58adcc3)
FBref pipeline fully retired. ESPN Core API serves per-game xG for WC2026.
- `GET /soccer/xg?league={slug}&event={id}` — live, names resolved (Argentina/ARG)
- `buildSoccerXGContext` in context-assembler.js — wired at callsites 5464 + 8519
- Context block verified: xG, npxG, xA, PPDA, big chances — ~55 tokens
- Pre-game: correctly empty (no xG until game starts)
- Post/live game: full block injects into journalism prompt
- Stale Data Sentinel: soccer_fbref_epl/wc/mls entries removed (c3494a5)
  Sentinel now 10 sources, 4 correctly stale (NBA/NHL off-season + odds_daily)

### What Shipped Earlier (June 22)
- Browser Rendering MCP ✅ · v4 Voice + Quality Chain ✅ · Backfill Re-gen ✅
- Stale Data Sentinel ✅ · MLS Return Prep ✅ · Odds Story Materializer ✅
- Smoke/A190 fix ✅ · Newspaper UX fixes ✅ · Desk CLS fix ✅

## Drive Docs
- 1n29dNf7_689ztxo4EzZtlS_FBER6O8khzij-c8GjKlE — Smoke analysis + newspaper UX
- 1U4KnG5zV6O-AYRZEqjGYQWH6JuS_EAroEmC_UEcgWCc — Desk CLS fix
- 1lOqcuv0fJM5zWegk89tyXXQeoPTEAq2P4SDVS1nUSUA — assembleContext root cause

## Probe Endpoints (all live)
- /health/sources · /soccer/xg?league=&event= · /journalism/context-probe
- /quality/report?days=7 · /briefs/spot-check?n=5 · /archive/query
- /odds-story/preview?date= · /fixtures/fetch (POST) · /deploy/verify

## Carry-Forwards
1. ~~Team displayName fix~~ ✅ closed (5ca06dc)
2. ~~Verify [SOCCER XG CONTEXT] in context-probe~~ ✅ closed (correct pre/post behavior confirmed)
3. **API-Sports Football Pro renewal — JUNE 29 DEADLINE** (6 days)
4. assembleContext golf/WNBA — no builder, no active season urgency
5. ~~Stale Data Sentinel soccer false greens~~ ✅ closed (c3494a5)
6. wentToOT hardcoded false in newspaper
7. KV editorial keys not consulted by newspaper
8. nba_clutch + nhl_series R2 stale — heals Oct/Nov
9. NFL SPORT_TO_V2 — September 9 deadline
10. CLS residual ~0.5 — cosmetic
11. Club league xG (EPL/MLS/La Liga) — verify August when seasons resume
12. mlb_pitch_arsenals entries:0 false green — Savant scraper issue, separate from FBref
13. STAT deploy broken — expired CLOUDFLARE_API_TOKEN GitHub secret,
    S14 UI changes undeployed, 8/10 cross-engine test failures against stale UI

## Priority (next session)
1. API-Sports Football Pro renewal decision (JUNE 29 DEADLINE)
2. wentToOT newspaper carry-forward
3. STAT deploy (separate session — field-relay-nba session risks cross-contamination)
