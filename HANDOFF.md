# FIELD HANDOFF — 2026-06-10 (Whitelist Extension + Relay-Native Pipelines)

## HEADS
- jubilant-bassoon HEAD: d0f2644
- SW_VERSION: 2026-06-10a
- Smoke: 555/0
- field-relay-nba HEAD: 3120abf

## SESSION TYPE
TYPE A+B (Verification + Feature build)

## KEY FINDING: HEADER-BASED BLOCK, NOT IP-BASED

stats.nba.com: returns 200 through relay (with NBA headers: UA, Referer, Origin).
The 520 from direct probe was a header-verification artefact — not a CF IP block.
Implication: any stats.nba.com endpoint works if whitelisted in NBA_STATS_ALLOWED_PATHS.

NST (naturalstattrick.com): 403 + Cloudflare Turnstile — TRUE IP block. Cannot whitelist.
FBref: same — 403 + CF Turnstile. GitHub Actions hybrid permanent.
MoneyPuck: HTTP 200 from CF Workers — no block at all.

## WHITELIST EXTENSION (NBA_STATS_ALLOWED_PATHS, relay ee3ac21)
Added (Rule 45 extension, same ToS class as leagueLeaders):
  /leaguedashteamclutch    — team clutch stats (verified 200, returns DEF_RATING)
  /leaguedashteamstats     — team DRTG/ORTG/pace
  /teamdashboardbygeneralsplits
  /leaguedashplayerclutch  — per-player clutch

## WHAT SHIPPED

### NBA Clutch → Relay-Native (relay 467b35e)
src/nba-clutch-r2.js replaces GitHub Actions nba-clutch-update.yml hybrid.
  leaguedashteamclutch(Advanced) confirmed 200 with DEF_RATING, OFF_RATING.
  Cron: Mon/Wed/Fri UTC 12 during Finals (June-July), Wed-only otherwise.
  POST /nba-clutch-update admin endpoint.
  R2: nba/2026/clutch_playoffs.json + clutch_regular.json

### NHL-B MoneyPuck GSAX → Relay-Native (relay 467b35e)
src/nhl-gsax-r2.js (NHL-B spec item).
  MoneyPuck HTTP 200 from CF Workers — no hybrid needed.
  GSAX = xGoals - goalsAllowed (situation=all, min 3 GP).
  Cron: Monday UTC 11, April-July.
  Route: /nhl-gsax/playoffs.json
  R2: nhl/2026/gsax-playoffs.json

### Client (jubilant-bassoon d0f2644)
nhlGSAXInit() at T+4800ms — overlays _gsax/_gsaxTier on NHL_GOALIE_RATINGS.
Replaces save% proxy with true GSAX for SCF goalie journalism context.

### r2-init.yml (relay 3120abf)
Manual workflow for on-demand R2 population via admin endpoints.
First runs dispatched: nba-clutch-update, mlb-savant-update, nfl-r2-update.

## BLOCK MAP (verified June 10 2026)
ACCESSIBLE from CF Workers:
  api-web.nhle.com        ✅ (IP-open)
  stats.nba.com           ✅ (header-based — relay headers sufficient)
  moneypuck.com           ✅ (IP-open)
  baseballsavant.mlb.com  ✅ (IP-open, verified earlier session)
  cdn.nba.com             ✅ (relay headers required)
  github.com/nflverse      ✅ (public CDN redirect)

BLOCKED from CF Workers (CF Turnstile):
  fbref.com               ❌ → GitHub Actions hybrid (soccer-fbref-wc.yml)
  naturalstattrick.com    ❌ → no relay path, NST PDO deferred

## OPEN ITEMS
NHL-C (NST PDO): blocked — need alternative source or accept manual updates
Wimbledon draw context: ~25 min TYPE A, before July 7

Product spec surfaces (6a-6f), focus trap, M5, WC bracket ~June 18-20

## SMOKE
555/0

## SESSION DOCS
Drive 1L5QCzn4dWvUwZP8forvpX-CxHyzagc-5
