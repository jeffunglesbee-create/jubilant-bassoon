# FIELD HANDOFF — 2026-06-10 (R2 Pipelines: MLB-A + NFL-A + SOCCER-A)

## HEADS
- jubilant-bassoon HEAD: 176bd80
- SW_VERSION: 2026-06-10a
- Smoke: 552/0
- field-relay-nba HEAD: d36d74f

## SESSION TYPE
TYPE A+B (Verification + Feature build)

## WHAT SHIPPED

### R2 Bucket
field-relay-data (ENAM, Standard) — created June 10 2026
FIELD_DATA binding in wrangler.toml

### MLB-A (relay 6622bea): Baseball Savant → R2
src/mlb-savant-r2.js — 5 tables (team_abs, expected_stats, sprint_speed,
  pitch_tempo, pitch_arsenals) written to mlb/2026/*.json in R2
Cron: Monday UTC 10-13 in scheduled()
/mlb-stats/ route: R2-first, GitHub raw fallback
POST /mlb-savant-update admin endpoint

### NFL-A (relay de8d88a): nflverse → R2
src/nfl-r2.js — 3 tables (player-stats, ngs-passing, pfr-rec)
  written to nfl/2026/*.json in R2
Cron: Wednesday UTC 12-15 in scheduled()
/nflverse/ route: R2-first for new files, GitHub raw for epa_table.json
POST /nfl-r2-update admin endpoint
Deadline: September 9 2026 (NFL Week 1)

### SOCCER-A (hybrid): FBref WC Squad Stats
scripts/soccer-fbref-wc.py — fetches 4 FBref table types:
  shooting (xG for/against), misc (pressing), passing (progressive),
  GK (PSxG diff). Derives xGDivergence. Writes to R2 + outbox/soccer/
.github/workflows/soccer-fbref-wc.yml — every 3 days UTC 08:00, WD trigger
  Passes CLOUDFLARE_API_TOKEN + ACCOUNT_ID for CF REST API R2 upload.
relay /soccer-fbref/ route: R2-first, outbox/soccer GitHub raw fallback
First run dispatched June 10 — data in R2 before WC opener June 11.

## HYBRID ARCHITECTURE NOTE (SOCCER-A)
FBref blocks CF Worker IPs (Cloudflare bot detection challenges CF Workers).
Solution: GitHub Actions (ubuntu-latest, not CF-blocked) fetches FBref HTML,
parses squad stats tables, uploads JSON to R2 via CF REST API.
Relay serves from R2 at microseconds latency. Zero per-game cost.

## R2 STATUS
Bucket: field-relay-data (ENAM)
Keys (once crons run):
  mlb/2026/team_abs.json, expected_stats.json, sprint_speed.json,
  pitch_tempo.json, pitch_arsenals.json
  nfl/2026/player-stats.json, ngs-passing.json, pfr-rec.json
  soccer/fbref/wc2026.json ← first run dispatched June 10

## CRON CADENCE
Monday UTC 10-13:    MLB Savant update (in-season weekly)
Wednesday UTC 12-15: nflverse update (in-season weekly)
Every 3 days UTC 08: FBref WC update (June 11 – July 19)

## NEXT R2 ITEMS
NHL-B (MoneyPuck GSAX): [VERIFY] ToS — 1 line in wrangler + cron function
NHL-C (NST PDO): [VERIFY] NST HTML structure — same pattern
Wimbledon draw: ~25 min TYPE A, before July 7

## WC STATUS
All WC items complete. FBref WC stats pipeline now live.
Bracket render deferred ~June 18-20.

## OPEN ITEMS
### HIGH (product spec surfaces)
Series dots / Arc sparkline / WHOLE FIELD / Night Owl amnesty arc /
State transition timeline / Drama spectrum / Focus trap / M5 ticker fade
WC bracket ~June 18-20

## SMOKE
552/0

## SESSION DOCS
Drive 1L5QCzn4dWvUwZP8forvpX-CxHyzagc-5 (primary session doc)
Queue Pattern Architecture: Drive 10gBfFiZaW7lKpZnXK1SEEwuzAuAagBHk
Scout's Pick Architecture: Drive 1xqXEOzok608gYUmZbU5d4GEDqAMQw3W2
Current State June 10: Drive 1eLeM7PFkapkqbcu9pQKvi6gWJiw5b4La
