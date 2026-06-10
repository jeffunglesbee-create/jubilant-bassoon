# FIELD HANDOFF — 2026-06-10 (R2 Pipelines: MLB-A + NFL-A)

## HEADS
- jubilant-bassoon HEAD: 9aa1e30
- SW_VERSION: 2026-06-10a
- Smoke: 552/0
- field-relay-nba HEAD: de8d88a

## SESSION TYPE
TYPE A+B (Verification + Feature build)

## WHAT SHIPPED THIS SESSION

### R2 Bucket Created
field-relay-data (ENAM, Standard, June 10 2026)
FIELD_DATA binding in wrangler.toml

### MLB-A: MLB Savant → R2 (relay 6622bea)
src/mlb-savant-r2.js — 5 tables:
  team_abs, expected_stats, sprint_speed, pitch_tempo, pitch_arsenals
Cron: Monday UTC 10-13
/mlb-stats/ route: R2-first, GitHub raw fallback
POST /mlb-savant-update admin endpoint
[VERIFY] resolved: Savant HTTP 200 from Workers Plus IPs

### NFL-A: nflverse → R2 (relay de8d88a)
src/nfl-r2.js — 3 tables:
  player-stats (passing/receiving EPA, target share, WOPR/RACR)
  ngs-passing (CPOE, aggressiveness, time to throw)
  pfr-rec (contested targets, drops, first contact yards)
Cron: Wednesday UTC 12-15
/nflverse/ route: R2-first for new files, GitHub raw for epa_table.json
POST /nfl-r2-update admin endpoint
First population: Wednesday cron (NFL pre-season data until Sept 9)
Health string: r2-mlb + r2-nfl

### Verification Results
FBref BLOCKED (403 + CF challenge). SOCCER-A cannot use CF Cron.
  Options: GitHub Actions fetches FBref, uploads to R2 (hybrid approach)
Savant ACCESSIBLE (200 from Workers Plus IPs)
nflverse ACCESSIBLE (GitHub releases CDN, Workers follow redirect)

## R2 STATUS
Bucket: field-relay-data (ENAM)
Keys populated by cron (next Monday for MLB, Wednesday for NFL):
  mlb/2026/team_abs.json, expected_stats.json, sprint_speed.json,
  pitch_tempo.json, pitch_arsenals.json
  nfl/2026/player-stats.json, ngs-passing.json, pfr-rec.json
Fallbacks: outbox/mlb/ (GitHub raw) and outbox/nfl/ (GitHub raw)

## NEXT R2 ITEMS
SOCCER-A (FBref) — BLOCKED by CF bot detection. Options:
  (a) GitHub Actions fetches FBref HTML weekly, parses, uploads JSON to R2
      (relay serves from R2 as-is — hybrid architecture)
  (b) Accept manual TYPE A updates for WC soccer analytics
  Recommendation: hybrid (a) if WC analytics depth is a priority

NHL-B (MoneyPuck GSAX): [VERIFY] ToS permits programmatic access
NHL-C (NST PDO): [VERIFY] NST HTML table structure
  Both: small R2 cron files, same pattern as MLB-A

Wimbledon draw context: ~25 min TYPE A, before July 7
  R2 key: tennis/wimbledon-2026/draw.json
  One-time write at tournament start, static through tournament

## WC STATUS
All WC items complete except bracket (~June 18-20).
Deferred items from June 9: BOTH CLOSED.
  Item 1: WC team context → CLOSED (inline relay module, June 4)
  Item 2: WC journalism tab brief → CLOSED (index.html 9aa1e30)

## OPEN ITEMS
### HIGH (product spec surfaces)
- Series dots board — 6a
- Arc sparkline SVG — 6b
- WHOLE FIELD toggle — 6c
- Night Owl amnesty arc — 6d
- State transition timeline — 6e
- Drama spectrum RUWT-safe — 6f
- Focus trap bottom sheet
- M5: score ticker desktop fade
- WC bracket render ~June 18-20

## SMOKE
552/0 (jubilant-bassoon — unchanged from this afternoon)

## SESSION DOCS
Drive 1L5QCzn4dWvUwZP8forvpX-CxHyzagc-5 (primary session doc)
Queue Pattern Architecture: Drive 10gBfFiZaW7lKpZnXK1SEEwuzAuAagBHk
Scout's Pick Architecture: Drive 1xqXEOzok608gYUmZbU5d4GEDqAMQw3W2
Current State June 10: Drive 1eLeM7PFkapkqbcu9pQKvi6gWJiw5b4La
