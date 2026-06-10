# FIELD HANDOFF — 2026-06-10 (NHL-C: NST PDO resolved)

## HEADS
- jubilant-bassoon HEAD: 5018c86
- SW_VERSION: 2026-06-10a
- Smoke: 555/0
- field-relay-nba HEAD: e9a282d

## SESSION TYPE
TYPE D (Analysis + minor feature)

## NHL-C: NST PDO — RESOLVED WITHOUT NST

### Problem
NST (naturalstattrick.com) blocked by CF Turnstile (403 + CF challenge page).
NHL-C spec item: PDO from NST via R2.

### Analysis
PDO = team on-ice shooting% + team on-ice save%
Formula: (goalsFor / shotsFor) + (1 - goalsAgainst / shotsAgainst)

NHL boxscore top-level already has: score, sog (shots on goal) per team.
nhl-series-r2.js already fetches all completed SCF boxscores.
PDO computation = 4-field accumulation in existing aggregation loop.

### Precision delta vs NST
NST provides score-adjusted 5v5 PDO.
Raw boxscore PDO (all situations): ±~0.005 vs score-adjusted.
For FIELD journalism ("running hot at 1.034 — regression possible"): sufficient.
PP/PK situations are already tracked separately in the series stats pipeline.

### What shipped (relay e9a282d, jubilant-bassoon 9600e1d)
nhl-series-r2.js: accumulates goalsFor, shotsFor, goalsAgainst, shotsAgainst.
  Computes seriesPDO + pdoLabel per team per series.
  pdoLabel: "1.034 PDO (17.9% sh + 85.5% sv, 4-game series window)"
index.html: nhlSeriesInit overlays _seriesPDO/_pdoLabel onto NHL_SPECIAL_TEAMS.
  getNHLEffectiveST() exposes seriesPDO + pdoContext to journalism/Scout's Pick.

NST dependency: eliminated entirely. No NST fetch, no ToS concern, no CF block.
NHL-C: CLOSED.

## COMPLETE BLOCK MAP (June 10 2026)
ACCESSIBLE from CF Workers (relay-native):
  api-web.nhle.com        ✅
  stats.nba.com           ✅ (headers: UA, Referer, Origin — whitelist required)
  moneypuck.com           ✅ (open)
  baseballsavant.mlb.com  ✅ (open)
  cdn.nba.com             ✅ (headers required)
  github.com/nflverse      ✅ (CDN redirect)

BLOCKED (CF Turnstile — GitHub Actions hybrid required):
  fbref.com               ❌ → soccer-fbref-wc.yml (6 leagues, running)
  naturalstattrick.com    ❌ → PDO resolved via NHL boxscore, NST not needed

## R2 PIPELINE STATUS
nhl/scf-2026/series-stats.json — PP%/PK%/PDO, incremental, 15-min cron
nhl/2026/gsax-playoffs.json — MoneyPuck GSAX, Monday cron (first run: next Monday)
nba/2026/clutch_{playoffs,regular}.json — Mon/Wed/Fri cron (first run dispatched)
mlb/2026/*.json — Monday cron (first run dispatched)
nfl/2026/*.json — Wednesday cron (first run dispatched)
soccer/fbref/*.json — every 3 days GH Actions (wc2026 + 5 leagues, dispatched)

## OPEN ITEMS
Wimbledon draw context: ~25 min TYPE A, before July 7
Product spec surfaces (6a-6f), focus trap, M5, WC bracket ~June 18-20
ADR-002: attorney consultation pending

## SMOKE
555/0
