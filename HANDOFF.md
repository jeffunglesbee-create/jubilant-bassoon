# FIELD Handoff — May 28 2026 (Session End — Deep Analysis + Multi-Build)

## Code HEAD
`6ec9d65` — NBA Lineup Edge (RAI), smoke 248/0

## Smoke / gates
- `field_smoke.js` 248/0 ✅ — all passing
- SW_VERSION: auto-synced via deploy-gate.yml (fixed this session)

## COMPLETED THIS SESSION (full day, many builds)

### Commits shipped:
- `3e6f374` Star picker Option B — two-button picker when neither team starred
- `59e385a` SW_VERSION sync + post-game drama numbers (L9) + OTW state labels
- `6ec9d65` NBA Lineup Edge (RAI — Roster Advantage Index)

### Specs written to Drive today:
- Push Notification Architecture: 1IhrdaVGVCjdX4Asc_WXxAKbtXXuL8JpxDfVPNPFXmRk
- Night Owl Media Brand: 1LaHQBS3JGxTWn3eQzl3PHZGg8rHpBg65VH-h2VK14Ok
- UEFA Arc Poisson Patch: 1sYDPO_8zwT02XxzjfIxQFNrmv2V6QORon36_1Z8sH2s
- Penalty Intelligence Suite: 1zD_iy5boYsEgNLjY7mQ-eNigmhA1kAW1jPUSGMLBoDg
- Final Matchday Advantage Calculator: 1nMK2kqJ3MguWdvbYeI6LCkP1kj47B_1mjbw90gNaMtM
- OTW Redesign + Extended Concept: 1-x0MiybQ6uci--MXjbwsrcFgBy2rYwU1-UKGKir1moI
- RAI Roster Advantage Index: 1XwUC3lV3I6YnMc35rYogNvbwIwZmRYRBmAy-XDvwAWA

### Key decisions:
- BNI + EMBER patent fixes confirmed DONE (per Jeff — not rebuilt this session)
- Night Owl Audio deferred (Fish Audio S2 ~$5.50/mo, needs revenue first)
- OTW banner: Option B (factual state labels) BUILT; Option C specced for future session
- Post-game drama numbers: L9 Amnesty Zone — shows 🔥 89 / ⚡ 73 / · 52 for peak ≥ 50
- RAI uses BDL season +/- × ESPN boxscore minutes (approximation) — upgrade next session

## NEXT SESSION BUILD: NBA PBP — Lineup Edge Upgrade

### Goal: NBA CDN primary + ESPN fallback for exact lineup tracking

### Three-tier fallback:
1. NBA CDN: `https://field-relay-nba.jeffunglesbee.workers.dev/nba-live/playbyplay/playbyplay_{nbaId}.json`
   → exact 5-man lineup from SUB events + stint net score (Layer 3 intelligence)
2. ESPN `data.plays[]`: existing ESPN_SUMMARY_RELAY with `site.web.api.espn.com` subdomain
   → sub events if ESPN relay switched to site.web.api.espn.com
3. ESPN boxscore minutes: current RAI approach (already working, always fallback)

### Relay changes needed (separate relay session):
- Add `/nba-live/*` route to field-relay-nba worker
  Proxies: cdn.nba.com/static/json/liveData/*
  Headers: x-nba-stats-token:true, x-nba-stats-origin:stats, Referer:https://stats.nba.com/
- Consider: change espn-summary route from site.api.espn.com → site.web.api.espn.com
  (unlocks data.plays for ESPN fallback path)

### Build in index.html (this session):
- NBA_CDN_RELAY constant
- fetchNBAScoreboard() → ESPN→NBA game ID map (via scoreboard JSON)
- fetchNBAPBP(homeLabel, awayLabel) → relay PBP call
- parseNBAPBP(actions) → exact current lineup + stint net score per team
- Upgrade fetchRosterAdvantage() → 3-tier fallback
- Upgrade buildRaiSheetSection() → show stint stats when available
- [CLOSING UNIT] badge more accurate with exact lineup

### FIELD feature unlocked by PBP:
"Stint Intelligence": current lineup's net score TONIGHT (not just season avg)
OKC ●●●●● +9.7 (tonight: +8 in 4:32) — delivering as expected
SAS ●●○○○ -1.4 (tonight: -6 in 2:15) — struggling vs season avg

PlayByPlayV2 DEPRECATED for 2025-26 — use CDN endpoint only.

## QUEUE AFTER THIS BUILD
- NHL SCF shell (TODAY if ECF resolves) — ~30 min
- NBA Finals G1 shell — June 3 deadline
- World Cup 2026 Phase 1 — June 11 DEADLINE
- Relay session: add /nba-live/* route + espn-summary subdomain fix
- USPTO provisional — ~June 25

## CANONICAL IDs (unchanged)
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Current State: 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8 (STALE — needs update)
Master Feature Priority: 1k2pq5dB6pKeegBzVBo1ee-Xo98-Qri5aq-2WqMg_suU
PAT: [PAT-in-repo-secrets] (exp May 2027)
Repo: jeffunglesbee-create/jubilant-bassoon
