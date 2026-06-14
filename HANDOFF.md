# FIELD HANDOFF

## Current State
- **Client HEAD:** 9d0d5d4 (jubilant-bassoon)
- **Relay HEAD:** 0aa14d9 (field-relay-nba)
- **Smoke:** 624/0
- **SW_VERSION:** 2026-06-14e
- **Last session:** June 14 2026

## Claude Code Setup (NEW)
- CLAUDE.md added to repo root — Claude Code reads this automatically
- Cloud environment configured: setup script `npm install && bash scripts/setup.sh`
- Pre-commit hook activates on every Claude Code session (smoke + units + lint gate)
- Codespaces devcontainer also available (Node 20 + wrangler 3.109.0)
- Verified working from iPad via claude.ai/code (624/0 smoke confirmed)

## Today's Shipped Features

### Post-Game Brief Pipelines (NBA + NHL)
- Relay: NBA (`2b9f62e`), NHL (`053d44e`)
- Client: NBA (`33cdae2`), NHL (`5c75fdc`)
- Three sports (WC + NBA + NHL) share one queue consumer and KV namespace

### Live In-Play Odds (Complete — all 8 spec steps)
- Relay (`0aa14d9`): AmbientDO _fetchLiveOdds, teamNameMatch, priority tiers, peak/urgency, wp_update SSE, /live-wp/test
- Client (`bab2a1e`): wp_update SSE handler, espnScores writeback
- Client (`ebf5bba`): WP bar on live cards + attention bar (fixed-bottom, urgency chips)

### Temporal Polyfill
- Client (`3ddb632`): fieldNowET() + fieldDatesToQuery() — DST-correct, eliminates hardcoded -4h offset

### Infrastructure
- Client (`e8caf38`): Codespaces devcontainer
- Client (`9d0d5d4`): CLAUDE.md for Claude Code

## Priority Queue
- [ ] Dixon-Coles BLEND mode for soccer WP (~45 min, gated on visual verification)
- [ ] web-push-browser (~120 min)
- [ ] winkNLP JQ Gate pre-filter (~60 min)
- [ ] Viewport artifact v4 (~150 min)
- [ ] Design system BUILD (~110 min)
- [ ] xG model pipeline
- [ ] WC knockout prep (group ends June 27)
- [ ] Wimbledon draw (before July 7)

## Spec Documents
- Vision: 1ZEvy5rSQgVM-_m_liiA7lvz0YDc-jYbxJEUPiGOQ_TQ
- Live odds spec: 17ErKnOlE0Hikq64Lvh8NjNwglEDRyWdyuqPlnTpiMJI
