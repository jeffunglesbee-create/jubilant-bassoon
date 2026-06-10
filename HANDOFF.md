# FIELD HANDOFF — 2026-06-10 (WC2026 Pre-Flight + Architecture Session)

## HEADS
- jubilant-bassoon HEAD: 1c0332c
- SW_VERSION: 2026-06-10a
- Smoke: 551/0
- field-relay-nba HEAD: 979549d

## SESSION TYPE
TYPE A+B (Feature build + Architecture)
Heavy day: WC2026 gap closure, Queue infrastructure expansion, Scout's Pick
architectural rebuild, Night Owl expansion, Sports Media Watch upgrade.

## WHAT SHIPPED THIS SESSION

### WC2026 Gap Closure (relay)
- Gap A: Tubi pre-game push alerts — handleTubiPreGameAlerts() fires 30-65min
  before free WC games. Dedup via KV 'tubi-alert:{gameId}'. relay c2b065c
- Gap B: Morning WC catch-up brief — UTC 11-13 cron window, queries D1
  wc_results for last 24h, enqueues via JOURNALISM_QUEUE. relay 17bc79f
- Gap C: FIFA World Cup added to journalism LEAGUES array. relay f07053f
- Gap D: [FINAL MATCHDAY] injected into buildCompoundPrompt for MD3 games.
  index.html 3bf4523

### Queue Infrastructure Expansion (relay 979549d)
4 async optimisations:
1. WC D1 result writes — ctx.waitUntil (non-blocking, unblocks /v2/games)
2. Per-game briefs: sequential 1500ms loop — Queue enqueue per game
3. Push fan-out (handleCron): sequential — parallel Promise.allSettled flatMap
4. Tubi fan-out: same parallel pattern
Queue consumer extended with type:'game-brief' route handler.

### Finals Desk Queue-backed (index.html b9cd159)
- _buildFinalsDeskPrompt() extracted (sync, shared by enqueue + fallback)
- fetchFinalsDesk: enqueue to relay, poll JOURNALISM_RESULT_RELAY every 2s (max 20s)
- Fallback to direct CLAUDE_PROXY_URL if queue times out
- Applies to NBA Finals + Stanley Cup Final
- JOURNALISM_ENQUEUE_RELAY + JOURNALISM_RESULT_RELAY constants added

### Scout's Pick Architectural Rebuild (index.html ee5f4dc + 9d26f80)
6 items:
1. getStatOfDay: NBA DRTG differential + NHL FO% added as anomaly candidates
2. isScoutsPick rewritten: WC Gate 0 carveout, Gate C (stat anomaly >= 0.25
   deviation fires year-round), Gate D (WC MD2/MD3 stakes + pAdv variance)
3. buildSlateScoutsPick(): cross-slate single-pick selector (one pick/night)
4. Desk Card 4: editorial single-pick card replaces "N games tonight" list
5. Queue-backed Scout's Pick brief (briefType:'scouts-pick', polls 20s)
6. Stat merged into badge: "Scout's Pick: CAR 93.5% PK%" — single badge,
   standalone stat badge suppressed for Scout's Pick games
_wcGetPAdv() helper added for WC advancement probability lookup.

### Night Owl Expansion (index.html b3f59a5)
4 items:
1. getStatOfDay injected into _owlStatCtx as [PRE-GAME STAT EDGE] tag
2. Scout's Pick localStorage payload enriched: statShort, statFull, gate name
3. Queue path: saveEspnFinal enqueues night-owl job when game goes final.
   renderNightOwlRecap polls 3x before falling back to fetchNightOwlFromClaude.
4. WC context: WC_TEAM_CONTEXT + [WC ADVANCEMENT] injected for WC games.

### Sports Media Watch Upgrade (index.html 8e6a66c)
6 items:
1. Dynamic journalNote in buildDynamicPregames: stat-of-day + Scout's Pick flag
2. scoreSMTCard: Scout's Pick pregame card +25 sort boost
3. buildPlayoffSpecials(): auto-generates NBA Finals + SCF cards from allData
4. buildWCMediaCards(): per-game WC cards (replaces blanket WC special)
5. buildDynamicPostgames(): Baseball Tonight + FIFA World Cup Postgame cards
6. Live-state suppression: pregame card loses 50pts when game state='in'
renderMedia priority: base < specials < playoffAuto < WCPerGame < pregames < postgames

### Daily Update (1c0332c)
SW_VERSION: 2026-06-09d -> 2026-06-10a (index.html + sw.js)

## KEY ARCHITECTURAL DECISIONS

[DECISION] Queue pattern: Finals Desk, per-game briefs, Scout's Pick brief,
Night Owl (on game-final), WC morning brief. Push fan-out uses Promise.allSettled.

[DECISION] Scout's Pick is cross-slate (buildSlateScoutsPick = one pick/night).
isScoutsPick per-game boolean retained for badge + Night Owl verdict.
Gate C (stat anomaly) fires year-round on regular season.

[DECISION] WC Gate 0 carveout: nationalBundle on WC = "no local alternative",
not "marquee broadcast". All 72 WC group games eligible for Scout's Pick.

[DECISION] SMW dedup: MEDIA_SPECIALS manual entries win over buildPlayoffSpecials.

## OPEN ISSUES

### DEFERRED (from June 9 — not addressed in this session)
- R2 WC team context (Drive 17D_EzrqoNUR4LN4OK3hr6MqKFUHitWlO72O1CWmqLks)
- WC journalism tab brief

### HIGH (product)
- Series dots board — spec surface 6a
- Arc sparkline SVG — spec surface 6b
- WHOLE FIELD toggle — spec surface 6c
- Night Owl amnesty arc — spec surface 6d
- State transition timeline — spec surface 6e
- Drama spectrum RUWT-safe — spec surface 6f
- Focus trap bottom sheet
- M5: score ticker desktop fade

### ADR-002
- Still PROPOSED — not ratified by counsel
- Free attorney consultation needed (split-operations live drama scoring)

### INFRA NOTE
.git is in .assetsignore — permanent.

## SMOKE
551/0

## SESSION DOCS
- This session: Drive TBD (writing)
- Prior patent audit: Drive 1I0Amjq-Qi1dAe0b5LGLdJYLkN3YNZWbb
- CI/Deploy (main): Drive 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
