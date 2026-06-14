# FIELD HANDOFF

## Current State
- **Client HEAD:** ebf5bba (jubilant-bassoon)
- **Relay HEAD:** 0aa14d9 (field-relay-nba)
- **Smoke:** 621/0
- **SW_VERSION:** 2026-06-14d
- **Last session:** June 14 2026

## Live In-Play Odds — COMPLETE (All 8 Spec Steps)

### Infrastructure (Steps 1-5, 8 — relay 0aa14d9)
- teamNameMatch: generalized, 11 sports
- AmbientDO: _fetchLiveOdds(), priority tiers, peak tracking, urgency formula
- wp_update SSE broadcast (|delta| >= 0.02)
- /live-wp/test: confirmed working, oddsApiConfigured: true

### UI (Steps 6-7 — client ebf5bba)
- **WP bar (Step 6)**: injected on live game cards via renderESPNScores when espnScores.wp is set. Soccer: 3-way bar (home/draw/away). Non-soccer: 2-way. Width transitions (0.4s ease). Comeback badge (COMEBACK Xpp) pulses when peakCollapse > 15pp. Low-confidence dashed border. Removed on final.
- **Attention bar (Step 7)**: fixed-bottom viewport bar (#field-attention-bar). Top 3 games by urgency. Chips: red (urgency >= 3), yellow (>= 1.5), gray (other). 44px touch targets. Scroll-snap. iOS safe area. Driven by field:wp_update → _attnGames map → _renderAttentionBar(). Cleared on all_final. body.attn-bar-active adds padding-bottom to .main.

### Data flow
SSE wp_update → espnScores writeback (wp, wp_prev, _liveOddsWP) → renderESPNScores → WP bar on card
SSE wp_update → field:wp_update CustomEvent → _attnGames → _renderAttentionBar → attention bar chips

## Post-Game Brief Pipeline (NBA + NHL + WC)
All three deployed and operational.

## Today's Commits (cumulative)

### Relay (4)
1. `2b9f62e` — NBA post-game brief pipeline (relay enqueue)
2. `053d44e` — NHL post-game brief pipeline (relay enqueue)
3. `0aa14d9` — live in-play odds AmbientDO integration

### Client (4)
1. `33cdae2` — NBA post-game brief pipeline (client consumption)
2. `5c75fdc` — NHL post-game brief pipeline (client consumption)
3. `bab2a1e` — live odds SSE handler (wp_update writeback)
4. `ebf5bba` — live WP bar + attention bar (Steps 6-7 complete)

## Priority Queue
- [ ] Dixon-Coles BLEND mode for soccer WP (visual verification needed first)
- [ ] Temporal polyfill (~90 min)
- [ ] web-push-browser (~120 min)
- [ ] winkNLP JQ Gate pre-filter (~60 min)
- [ ] WC knockout prep (group ends June 27)
- [ ] Wimbledon draw (before July 7)
