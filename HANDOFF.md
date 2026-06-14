# FIELD HANDOFF

## Current State
- **Client HEAD:** bab2a1e (jubilant-bassoon)
- **Relay HEAD:** 0aa14d9 (field-relay-nba)
- **Smoke:** 617/0
- **SW_VERSION:** 2026-06-14c
- **Last session:** June 14 2026

## Commits This Session (cumulative — briefs + live odds)

### Relay (4)
1. `2b9f62e` — feat: NBA post-game brief pipeline (relay enqueue)
2. `053d44e` — feat: NHL post-game brief pipeline (relay enqueue)
3. `0aa14d9` — feat: live in-play odds — AmbientDO integration (teamNameMatch + _fetchLiveOdds + wp_update SSE + /live-wp/test)

### Client (3)
1. `33cdae2` — feat: NBA post-game brief pipeline (client consumption)
2. `5c75fdc` — feat: NHL post-game brief pipeline (client consumption)
3. `bab2a1e` — feat: live in-play odds — client SSE handler (wp_update writeback + field:wp_update dispatch)

## Live In-Play Odds (Deployed — Steps 1-5, 8 of spec)
Architecture verified via /live-wp/test (oddsApiConfigured: true, sport mappings confirmed).

### What's deployed:
1. **teamNameMatch** — generalized from WC-only to 11 sports (NBA/NHL/MLB/MLS aliases added)
2. **ODDS_SPORT_KEYS** — maps 11 FIELD sport keys → Odds API v4 sport keys
3. **ODDS_PRIORITY tiers** — high (30s: WC knockout, Finals), medium (60s: regular season), low (180s: MLS/WNBA)
4. **_fetchLiveOdds()** in AmbientDO — event-driven polling gated by live game detection
   - Per-sport cooldown enforcement
   - Odds API v4 /odds-live with CF edge caching (20s)
   - Implied odds → vig-removed WP (average across bookmakers)
   - Soccer: draw WP preserved (BLEND-ready for Dixon-Coles)
   - Non-soccer: 2-way normalization (REPLACE mode)
   - Confidence flag when bookmaker deviation > 10pp
   - Peak WP tracking + peakCollapse computation
   - Urgency formula: peakCollapse*4 + recentDelta*3 + closeness*2 + lateness*1
5. **wp_update SSE** — broadcast when |wpDelta| >= 0.02
6. **/live-wp/test** endpoint — deployment verification
7. **Client SSE handler** — wp_update writeback to espnScores (wp, wp_prev, _liveOddsWP) + field:wp_update custom event dispatch

### What's NOT yet built (spec steps 6-7):
- **Step 6: WP bar rendering** — reuse existing WC WP bar for all sports (client CSS + render logic)
- **Step 7: Attention bar** — bottom viewport bar showing top 3 games by urgency with comeback badges
- **Dixon-Coles blending** for soccer — currently REPLACE mode for all sports; soccer BLEND deferred until WP bars render correctly

## Post-Game Brief Pipeline (Complete — NBA + NHL + WC)
All three pipelines deployed and verified.

## WC State
- Groups E-L playing today (Jun 14)
- Live odds will activate on next AmbientDO poll cycle when WC games go live

## Priority Queue
- [ ] WP bar rendering (Step 6 — ~60 min)
- [ ] Attention bar (Step 7 — ~90 min)
- [ ] Dixon-Coles BLEND mode for soccer WP
- [ ] Temporal polyfill (~90 min)
- [ ] web-push-browser (~120 min)
- [ ] winkNLP JQ Gate pre-filter (~60 min)
- [ ] WC knockout prep (group ends June 27)
- [ ] Wimbledon draw (before July 7)

## Spec Documents
- Vision: 1ZEvy5rSQgVM-_m_liiA7lvz0YDc-jYbxJEUPiGOQ_TQ
- Live odds complete spec: 17ErKnOlE0Hikq64Lvh8NjNwglEDRyWdyuqPlnTpiMJI
