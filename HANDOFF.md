# FIELD HANDOFF

## Session: 2026-06-30 · Daily Update

**CLIENT HEAD: cce3738**
**SW_VERSION: 2026-06-30a**
**RELAY HEAD: 96dea28**
**SMOKE: 801/2 → targeting 803/0 after A704 self-heal**

---

## CURRENT STATE

### Smoke failures (2)
- A190 — FIXED this session (sw.js SW_VERSION synced, commit cce3738)
- A704 — HANDOFF.md format (self-healing via this write)

### Deploy
- Relay: 96dea28 deployed ✅, match ✅
- Client: cce3738 (sw.js fix on top of 04da2e3 automation chain)

### Data Health (6/10 healthy)
- ✅ MLB ABS, Pitch Arsenals, Expected Stats
- ✅ WC Group Standings, Odds Monthly, Journalism Briefs
- ❌ NBA Clutch x2 — expected (off-season)
- ❌ NHL Series — expected (off-season)
- ❌ Odds Daily Counter — investigate

### Health Pipelines
- Oura: ✅ fetched 2026-06-30
- Whoop: ✅ fetched 2026-06-30, auto-auth ✅
- Night Owl email: ✅ sent 2026-06-30

---

## TODAY'S SLATE (June 30)

- MLB: 13 games
- WNBA: 1 (LV vs NY, 7 PM EDT)
- WC 2026: 3 (NOR-CIV, SWE-FRA, ECU-MEX)
- MLS: 4 games
- NBA: Off-season (Knicks won Finals 4-1 vs Spurs)
- NHL: Off-season

---

## ANALYTICS PHASES

| Phase | Date | Status |
|-------|------|--------|
| field_pick | 2026-06-30 | ✅ |
| circadian_preview | 2026-06-30 | ✅ |
| night_stars | 2026-06-29 | ❌ DEGRADED |
| truth_is | 2026-06-29 | ✅ |
| morning_report | 2026-06-29 | ✅ |
| circadian_late | 2026-06-29 | ✅ |
| streak_board | 2026-06-29 | ✅ |
| quality_feedback | 2026-06-29 | ✅ |
| quality_alert | 2026-06-29 | ✅ |

---

## PRIORITY LIST

### 🚨 URGENT
1. API-Sports Football Pro — JUNE 29 DEADLINE PASSED — verify renewal status

### 🔧 QUEUED CC-CMDs
2. Relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
3. Client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md)

### 🔨 INFRASTRUCTURE
4. Bosnia DB fix + identity-resolver CANONICAL map
5. team_form CONTEXT_SOURCE v3
6. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
7. wentToOT hardcoded false
8. KV editorial keys not consulted
9. NFL SPORT_TO_V2 — September 9
10. Odds Daily Counter stale
11. night_stars phase degraded

### 🏗️ NEXT ADAPTER BACKFILL
NBA CDN → NHLE → Squiggle AFL → ...

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon

SESSION ACTIVE: RELAY 96dea28 · CLIENT cce3738 · 2026-06-30 · Daily Update · via chat
