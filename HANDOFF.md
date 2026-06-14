# FIELD HANDOFF

## Current State
- **Client HEAD:** 3ddb632 (jubilant-bassoon)
- **Relay HEAD:** 0aa14d9 (field-relay-nba)
- **Smoke:** 624/0
- **SW_VERSION:** 2026-06-14e
- **Last session:** June 14 2026

## Today's Shipped Features (5 sessions, 9 client commits + 4 relay commits)

### Post-Game Brief Pipelines (NBA + NHL)
- Relay: NBA (`2b9f62e`), NHL (`053d44e`) — game final → player stats → JOURNALISM_QUEUE → Haiku → KV
- Client: NBA (`33cdae2`), NHL (`5c75fdc`) — V2 poll final detect → fetch brief → matchupNote inject

### Live In-Play Odds (Complete — all 8 spec steps)
- Relay (`0aa14d9`): teamNameMatch generalization, AmbientDO _fetchLiveOdds, priority tiers, peak/urgency tracking, wp_update SSE, /live-wp/test
- Client (`bab2a1e`): wp_update SSE handler, espnScores writeback
- Client (`ebf5bba`): WP bar on live game cards (2-way + 3-way), comeback badge, attention bar (fixed-bottom, urgency chips)

### Temporal Polyfill
- Client (`3ddb632`): fieldNowET() + fieldDatesToQuery() — DST-correct via Intl.DateTimeFormat
- Fixed: hardcoded `-4*3600*1000` ET offset in fetchV2AllScores and MLS relay
- Eliminates bug class: EDT→EST clock change would have broken dual-date logic

## Architecture Notes
- fieldNowET(): returns {date, year, month, day, hour, minute} in FIELD_TZ via formatToParts
- fieldDatesToQuery(): returns {dates[], etDate, utcDate, etHour} with evening expansion
- Existing isToday(), fieldDateKey(), TODAY_ISO were already DST-correct (toLocaleDateString with timeZone)
- Only the V2 poll and MLS relay used raw arithmetic offsets — both now fixed

## Priority Queue
- [ ] Dixon-Coles BLEND mode for soccer WP (~45 min, gated on visual WP bar verification)
- [ ] web-push-browser (~120 min)
- [ ] winkNLP JQ Gate pre-filter (~60 min)
- [ ] Viewport artifact v4 (~150 min)
- [ ] Design system BUILD (~110 min)
- [ ] xG model pipeline
- [ ] WC knockout prep (group ends June 27)
- [ ] Wimbledon draw (before July 7)
