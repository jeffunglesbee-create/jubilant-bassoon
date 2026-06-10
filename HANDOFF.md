# FIELD HANDOFF — 2026-06-10 (R2 Pipeline Session)

## HEADS
- jubilant-bassoon HEAD: 9aa1e30
- SW_VERSION: 2026-06-10a
- Smoke: 552/0
- field-relay-nba HEAD: bd30ebd

## SESSION TYPE
TYPE A+B (Verification + Feature build)

## WHAT SHIPPED THIS SESSION

### R2 Infrastructure
- R2 bucket created: field-relay-data (ENAM, Standard, June 10 2026)
- FIELD_DATA binding added to wrangler.toml
- Health string updated: r2-mlb included

### MLB-A: MLB Savant → R2 Weekly Pipeline (relay 6622bea)
src/mlb-savant-r2.js: ports mlb-weekly-update.py to Cloudflare Worker
  5 Savant CSV endpoints (all return 200 from Workers Plus IPs — verified):
    team_abs, expected_stats, sprint_speed, pitch_tempo, pitch_arsenals
  Writes to R2: mlb/2026/{name}.json
  Umpire ABS excluded (Statcast search CSV = 3-min fetch, exceeds Worker CPU)
scheduled(): fires on Monday UTC 10-13
POST /mlb-savant-update: admin endpoint (X-FIELD-Admin: 1)
/mlb-stats/ route: R2-first, GitHub raw fallback (seamless — no regression)

### Verification Results
FBref BLOCKED: 403 + Cloudflare challenge from Workers IPs.
  SOCCER-A (FBref pipeline) cannot use CF Cron. Alternative needed.
Baseball Savant ACCESSIBLE: 200 from Workers Plus IPs.
  MLB-A [VERIFY] resolved in our favor.

### WC Journalism Tab Brief (index.html 9aa1e30)
Closed deferred item 2 from June 9 (see prior handoff).

### Documentation
Queue Pattern Architecture: Drive 10gBfFiZaW7lKpZnXK1SEEwuzAuAagBHk
Scout's Pick Architecture: Drive 1xqXEOzok608gYUmZbU5d4GEDqAMQw3W2
Current State June 10: Drive 1eLeM7PFkapkqbcu9pQKvi6gWJiw5b4La

## R2 STATUS
- Bucket: field-relay-data (ENAM)
- Binding: FIELD_DATA in wrangler.toml
- First population: Monday cron (next Monday 6AM ET) OR wrangler trigger
- Fallback: GitHub raw outbox/mlb/ files (existing — no regression)
- stat-salary-cache: STAT project (separate bucket)

## NEXT R2 ITEMS
- NFL-A: nflverse Pipeline 2 → R2 (~90 min) — Sept 9 deadline, same CF Cron pattern
  URLs: raw.githubusercontent.com/nflverse/nflverse-data (allowed domain — no block)
  wrangler.toml R2 binding already done — just add the cron function
- SOCCER-A: FBref BLOCKED by CF bot detection — need alternative
  Options: (a) GitHub Actions fetches FBref, writes to R2 (hybrid); (b) skip
- NHL-B (MoneyPuck GSAX): needs [VERIFY] on ToS
- NHL-C (NST PDO): needs [VERIFY] on HTML structure

## OPEN ITEMS
### HIGH
- Series dots board — spec surface 6a
- Arc sparkline SVG — spec surface 6b
- WHOLE FIELD toggle — spec surface 6c
- Night Owl amnesty arc — spec surface 6d
- State transition timeline — spec surface 6e
- Drama spectrum RUWT-safe — spec surface 6f
- Focus trap bottom sheet
- M5: score ticker desktop fade
- WC bracket render — deferred ~June 18-20

## SMOKE
552/0

## SESSION DOCS
Drive 1L5QCzn4dWvUwZP8forvpX-CxHyzagc-5 (morning session)
New docs: 10gBfFiZaW7lKpZnXK1SEEwuzAuAagBHk, 1xqXEOzok608gYUmZbU5d4GEDqAMQw3W2, 1eLeM7PFkapkqbcu9pQKvi6gWJiw5b4La
