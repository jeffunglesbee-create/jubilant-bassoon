# FIELD HANDOFF — June 22 2026 (updated ~2:45pm ET)

## State
- CLIENT HEAD: 83ade4c · 2026-06-22 · via chat
- RELAY HEAD:  16be68a · 2026-06-22 · via CC (Browser MCP Phase 1)
- RELAY LIVE:  16be68a · deployed 2026-06-22T18:31:56Z · CI green
- Smoke: 663 (client — unchanged; browser MCP is relay-only)
- SW_VERSION: 2026-06-22a

## Session Start Protocol (Rule 85)
Call session_health MCP tool FIRST. Returns live HEADs, deploy match,
quality degradation, degraded analytics phases, open Codex incidents.
Do NOT read_handoff as primary state source — this document goes stale.

## What Shipped This Session (June 22 full day)

### O(1) Newspaper (relay 64f71d7 + client db5ded4)
- GET /analytics/newspaper/{date} — relay bundles recap+preview
- Client renders above schedule, 11-viewport CSS, smoke A692-A696

### Brief Archive Pipeline (relay f50fb1b + 931fd05)
- sweepKVBriefs every cron tick
- /backfill/game-briefs endpoint (dry/limit/force)
- 59 game_briefs backfilled (low quality — pending v4 re-gen)
- 931fd05: JQ_STYLE + runQualityChain + force mode in backfill

### Automation Loop (relay 621726e + client 83ade4c)
- GET /quality/report — brief quality degradation by type
- GET /briefs/spot-check — prose quality gate (FAIL = session not done)
- POST /session/record — session state to Codex at close
- session_health MCP tool — machine-generated session start state
- Phase 8b quality_alert → analytics_output → O(1) Newspaper
- Client renders quality_alert section in newspaper (83ade4c)
- SESSION-END template: docs/CC-CMD-TEMPLATE-session-end.md
- Codex seeded: 38 CLAUDE.md rules

### CFL Schedule (client c8d62d5)
- Weeks 1-10 (Jun 4 – Aug 8), 38 games

### Browser Rendering MCP (relay cf21215 + 16be68a) ✅ FULLY SHIPPED
- Phase 0 (cf21215): browser_quick — stateless Quick Actions
  screenshot / json / markdown / links via CF Browser Rendering REST API
- Phase 1 (16be68a): BrowserDO — Puppeteer session persistence
  browser_navigate / browser_interact / browser_extract / browser_close
- Meta-infra: added package.json (@cloudflare/puppeteer ^0.0.14, type:module)
  + removed empty package-lock.json so wrangler-action@v3 auto-runs npm install
- v5-browser-do DO migration applied — CI green
- Spec: Drive 1Fite5hBaJviHxvqp33EwR-vqnOeHXYe9fli6C34_cuE
- Outbox: outbox/cc-browser-mcp-2026-06-22.md
- VERIFICATION PENDING: MCP tools/list gated by OAuth — end-to-end
  tool verification requires claude.ai connector or OAuth-authenticated client.
  5 new tools visible only after connector reconnect or new chat session.

## Pending CC-CMDs (relay field-relay-nba) — PRIORITY ORDER
1. docs/CC-CMD-2026-06-22-v4-voice-and-scoring.md (HEAD 2cf9f29) ← DO FIRST
   ONE-LINER: git pull. Read docs/CC-CMD-2026-06-22-v4-voice-and-scoring.md. Execute all tasks.
   After CC: /backfill/game-briefs?force=true&limit=50 (re-gen 59 bad briefs)
2. docs/CC-CMD-2026-06-22-stale-data-sentinel.md (existing, unexecuted)
3. docs/CC-CMD-2026-06-22-odds-story-materializer.md (existing, unexecuted)

## Probe Endpoints (all live)
- /analytics/newspaper/{date}     — O(1) bundle
- /quality/report?days=7          — brief quality degradation
- /briefs/spot-check?n=5          — prose quality gate
- /backfill/game-briefs?dry=true  — archive gap check
- /journalism/context-probe       — Context Assembler
- /budget/odds                    — daily + monthly spend
- /identity/mismatches            — unmatched team names
- /integrity/briefs               — KV vs D1 divergence
- /integrity/games                — ESPN vs D1 gaps
- /deploy/verify                  — GitHub HEAD vs deployed SHA
- /freshness/{date}               — brief staleness
- NOT BUILT: /health/sources (Stale Data Sentinel CC-CMD exists)

## Carry-Forwards
1. v4 voice register not in relay — pending CC-CMD 2cf9f29
2. Backfill briefs need re-gen after v4 CC-CMD
3. /session/record POST returns "Method not allowed" from direct curl — needs CC verification
4. Phase 8b threshold tuning — re-baseline after June 29
5. session_health analytics_phases — phases not using value.degraded won't surface
6. wentToOT hardcoded false in newspaper
7. KV editorial keys not consulted by newspaper
8. WC sport label mismatch (FIFA World Cup 2026 vs wc26) — fixed in v4 CC-CMD
9. pitch_arsenals.json stale (heals Monday cron)
10. wc2026.json FBref empty (heals every 3 days)
11. Smoke 663 — regressed from 724, root cause unknown (investigate before next client build)
12. /health/sources not built (CC-CMD exists)
13. Odds Story Materializer not built (CC-CMD exists)
14. FIELD's Pick badge game_id format unverified
15. CFL matchup accuracy unverified (Weeks 2-10 from web search)
16. API-Sports Football Pro renewal — JUNE 29 DEADLINE
17. NFL SPORT_TO_V2 — September 9 deadline
18. Browser MCP end-to-end verification pending (OAuth gate blocks curl — use claude.ai connector)

## Priority (next session)
1. Execute v4 voice CC-CMD (2cf9f29), then force re-gen backfill briefs
2. Verify Browser MCP tools via claude.ai connector (reconnect or new chat)
3. Verify /session/record POST from CC environment
4. Stale Data Sentinel (/health/sources)
5. Odds Story Materializer
6. Investigate smoke regression 724→663
7. API-Sports renewal decision (June 29)
