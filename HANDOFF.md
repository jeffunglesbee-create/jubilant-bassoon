# FIELD HANDOFF — 2026-06-11 (NFL-B NGS Pipeline + WC Opener)

## HEADS
- jubilant-bassoon HEAD: afb9ad0 (WC G1 Mexico 2-0 result)
- SW_VERSION: 2026-06-11b
- Smoke: 575/0 ✅
- field-relay-nba HEAD: a2e852b (NFL-B routes)

## WHAT SHIPPED THIS SESSION

### NFL-B Pipeline (client: cd31b6f, 9898f28 · relay: a2e852b)

**Discovery:** nflreadpy uses combined multi-season parquets (2016-present in one file),
NOT the per-year CSV files. URL: `releases/download/nextgen_stats/ngs_{type}.parquet`
All three types (passing, receiving, rushing) download via CF relay IP and GitHub Actions.

**scripts/build-ngs-data.py:**
- Fetches ngs_passing.parquet → ngs-passing.json (CPOE, aggressiveness, time-to-throw, xCOMP%)
- Fetches ngs_receiving.parquet → ngs-receiving.json (separation, cushion, YAC above exp, target share)
- Fetches ngs_rushing.parquet → ngs-rushing.json (efficiency N/S, RYOE, time-to-LOS, pct vs stacked)
- Fetches injuries_{year}.parquet → nfl-injuries.json (name, team, position, week, injury, status)
- Dynamic year: month≥8 = current year, else previous year
- Prefers week=0 (season summary); falls back to most recent weekly row during active season

**Bug fixed (9898f28):** Original logic took max(week) → single-game data (~40 att).
Fixed: prefer week=0 → full season aggregates (400-600 att for QBs).

**Verified 2025 season data (week=0 summaries):**
- Passing: 65 players, Drake Maye leads CPOE +9.139 (492 att)
- Receiving: 212 players, Luther Burden leads separation 4.63 yds (60 tgt)
- Rushing: 81 players, Bijan Robinson (ATL) among leaders

**.github/workflows/nfl-ngs-update.yml:**
- Cron: Monday 07:00 UTC
- CI run: ✅ SUCCESS (both cd31b6f and 9898f28)
- Commits outbox fallback to outbox/nfl/

**Relay routes added (a2e852b):**
- /nflverse/ngs-receiving.json → R2-first nfl/{year}/ngs-receiving.json
- /nflverse/ngs-rushing.json → R2-first nfl/{year}/ngs-rushing.json
- /nflverse/nfl-injuries.json → R2-first nfl/{year}/nfl-injuries.json
- Dynamic nflYear (month≥7 ? current : current-1) replaces hardcoded 2026

**Drive doc:** "FIELD — NFL-B NGS Pipeline: Live Data Latency + Weekly vs Season Analysis"
ID: 1j6Bd6B4DZCvV3Ol50VjUQK1NLSrcsxyqTnD9H3Uy3Cs
Key findings:
- Effective lag during season: 8 days (Monday cron, nflverse updates Tuesday nights)
- week=0 = season summary; week=1-18 = individual game rows
- Weekly trends (separation trend, CPOE streak, rushing efficiency trend) are high value
  but should be added at NFL card client-wiring time (Sept 2026), not now
- Move cron to Wednesday when "recent form" chips are scoped

### Daily Update (afb9ad0)

WC 2026 G1 — Mexico 2-0 South Africa (FT confirmed)
- Quiñones 9' (Lira ast) — first goal of the 2026 World Cup
- Jiménez 67' (Alvarado ast) — his first-ever World Cup goal, emotional
- Sithole red card 49' — will miss 2 matches
- Mexico top Group A with 3pts

## UPCOMING (not yet played)

### Tonight June 11
- Korea vs Czechia: WC G1, 10pm ET, FS1, Estadio Akron Guadalajara

### Tonight June 12 (already June 12 UTC)
- SCF G5: CAR vs VGK, 8pm ET, ABC, Lenovo Center Raleigh. Series tied 2-2.
- WNBA games

### Sunday June 14
- NBA Finals G5: SAS vs NYK, 8:30pm ET, ABC, Frost Bank Center. NYK leads 3-1.

### June 12 WC games
- Canada vs Bosnia: 19:00 UTC, BMO Field Toronto, FOX
- Many more group stage games begin

## PRIORITY LIST

1. WHOLE FIELD toggle 6c ← next
2. State transition 6e
3. Drama spectrum 6f
4. WC projections data quality — Ecuador/Ivory Coast ranking anomalously high
5. M5 score ticker fade
6. Wimbledon draw context (before July 7)
7. Design system (~90 min TYPE C)

## OPEN NFL-B ITEMS
- Probe /nflverse/ngs-receiving.json to confirm R2 populated correctly
- Move cron Monday → Wednesday when "recent form" chips are scoped
- Add weeklyTrend arrays at NFL card client-wiring time (Sept 2026)

## SMOKE
575/0 ✅ CI green at afb9ad0
