# FIELD HANDOFF

## Current State
- **Client HEAD:** 5c75fdc (jubilant-bassoon)
- **Relay HEAD:** 053d44e (field-relay-nba)
- **Smoke:** 615/0
- **SW_VERSION:** 2026-06-14b
- **Last session:** June 14 2026

## Commits This Session (cumulative — NBA + NHL brief pipeline)

### Relay (3)
1. `2b9f62e` — feat: NBA post-game brief pipeline (relay enqueue)
2. `053d44e` — feat: NHL post-game brief pipeline (relay enqueue)

### Client (2)
1. `33cdae2` — feat: NBA post-game brief pipeline (client consumption)
2. `5c75fdc` — feat: NHL post-game brief pipeline (client consumption)

## Post-Game Brief Pipeline (Complete — NBA + NHL + WC)
Three sports now have end-to-end post-game brief pipelines:

| Sport | Relay trigger | Stats source | KV key format | Client filter |
|-------|--------------|-------------|---------------|--------------|
| WC26 | writeWCResult() | api-sports events (goals/cards) | brief:game:football:{id} | state==='final', _sport includes FIFA |
| NBA | /v2/games final detect | api-sports /games/statistics/players (pts/reb/ast) | brief:game:nba:{id} | state==='post', _sport matches nba |
| NHL | /v2/games final detect | api-sports /games/statistics/players (goals/assists/saves) | brief:game:{numericId} | state==='post', _sport matches nhl |

Common infrastructure (no changes needed):
- Queue consumer: handles type:'game-brief' generically (Haiku → cliché check → KV)
- /journalism/game/{id} route: serves from KV by eventId
- Client fetchPrerenderedGameBrief(): existing function for MLB pre-game briefs

## WC State
- 8 results recorded (Groups A-D MD1)
- Groups E-L started Jun 14

## Sandbox Network
- api.the-odds-api.com added to allowlist (Jun 14)
- field-relay-nba.jeffunglesbee.workers.dev and api.cloudflare.com already enabled (Jun 13)

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
- Vision document: 1ZEvy5rSQgVM-_m_liiA7lvz0YDc-jYbxJEUPiGOQ_TQ
- Complete spec: Drive 17ErKnOlE0Hikq64Lvh8NjNwglEDRyWdyuqPlnTpiMJI
