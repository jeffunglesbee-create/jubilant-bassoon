# FIELD HANDOFF

## Current State
- **Client HEAD:** 33cdae2 (jubilant-bassoon)
- **Relay HEAD:** 2b9f62e (field-relay-nba)
- **Smoke:** 614/0
- **SW_VERSION:** 2026-06-14a
- **Last session:** June 14 2026

## Commits This Session

### Relay (1)
1. `2b9f62e` — feat: NBA post-game brief pipeline (relay enqueue)

### Client (1)
1. `33cdae2` — feat: NBA post-game brief pipeline (client consumption)

## NBA Brief Pipeline (Complete End-to-End)
- **Write**: V2 poll detects NBA game `state==='final'` → KV dedup check → fetch player stats from api-sports `/games/statistics/players` (top 3 per team: pts/reb/ast) → build prompt → enqueue to JOURNALISM_QUEUE as `type:'game-brief'`
- **Queue**: Existing consumer handles `game-brief` generically → Haiku → cliché check → KV `brief:game:nba:{id}` (3600s TTL)
- **Read**: Client V2 poll detects `state==='post'` for NBA → `_nbaBriefsFetched` dedup → fetch `/journalism/game/nba:{id}` → inject matchupNote → render
- **Pattern**: Mirrors WC brief pipeline exactly (same queue consumer, same KV namespace, same `/journalism/game/` route)

## WC Brief Pipeline (Complete — prior session)
- Write: game final → writeWCResult() → D1 + BracketDO → JOURNALISM_QUEUE → Haiku → quality chain → KV `brief:game:football:{id}` (3600s TTL)
- Read: client V2 poll → detects final → fetch `/journalism/game/{eventId}` → relay sanitizer preserves colon → KV hit → injects matchupNote → render

## WC State
- 8 results recorded (Groups A-D MD1)
- Groups E-L started Jun 14

## Sandbox Network
- api.the-odds-api.com added to allowlist (Jun 14)
- field-relay-nba.jeffunglesbee.workers.dev and api.cloudflare.com already enabled (Jun 13)

## Approved Action Items (Pending)
1. ~~NBA brief pipeline~~ ✅ DONE
2. Netherlands vs Japan (4PM ET Jun 14) — first post-fix BracketDO recomputation, verify all fixes hold
3. Live odds BUILD — fully specced, ready to implement

## Priority Queue
- [ ] Live in-play odds BUILD (fully specced)
- [ ] Temporal polyfill (~90 min)
- [ ] web-push-browser (~120 min)
- [ ] winkNLP JQ Gate pre-filter (~60 min)
- [ ] Viewport artifact v4 (~150 min)
- [ ] Design system BUILD (~110 min)
- [ ] xG model pipeline
- [ ] WC knockout prep (group ends June 27)
- [ ] Wimbledon draw (before July 7)

## Vision Doc + Live Odds Spec
- Vision document: 1ZEvy5rSQgVM-_m_liiA7lvz0YDc-jYbxJEUPiGOQ_TQ (corrected, all claims verified)
- Corrections: 1Qxi2WlKfZNuGnOJrFZvQGc_ykyy2tJCMFiDcQYdeFDs
- Complete spec: Drive 17ErKnOlE0Hikq64Lvh8NjNwglEDRyWdyuqPlnTpiMJI
