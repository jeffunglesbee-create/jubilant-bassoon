# Claude Code Command — MLS Return Preparation (July 19 2026)

git pull. Read CLAUDE.md. Run `git log --oneline -5` first.

Write all findings to outbox/cc-mls-return-2026-06-22.md.

## CONTEXT

MLS paused May 24 for the FIFA World Cup. Resumes July 19-20 weekend.
Three gaps block FIELD from covering MLS on return:

1. Post-WC MLS schedule not in D1 (regular_season_games stops at 2026-05-23)
2. soccer/fbref/mls.json missing from R2 (key was never populated)
3. soccer-fbref-wc.yml cron ends July 5 — no MLS cron starts on return

All three must be fixed. Context assembler is already wired for MLS
('mls' → 'soccer/fbref/mls.json'); once R2 key exists, journalism works.

D1 game row format (verified from existing MLS rows):
  id: "{date}-mls-{home_abbr5}-{away_abbr5}"  (lowercase, 5-char abbr)
  date: "YYYY-MM-DD"
  sport: "MLS"
  home: "Full Club Name"
  away: "Full Club Name"
  home_score: NULL (pre-game)
  away_score: NULL (pre-game)

ARCHIVE_DB id: cc49101c-0569-4d41-8e7a-be139cde4f26

## PRE-BUILD VERIFICATION

```bash
# Confirm last MLS date in D1
# Expected: 2026-05-23
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/d1/execute \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT MAX(date) as last FROM regular_season_games WHERE sport=\'MLS\'"}\'

# Confirm mls.json missing from R2
# (will 404 or return error — expected)
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/journalism/context-probe \
  | grep -i mls

# Confirm no mls workflow exists
ls .github/workflows/ | grep mls
```

## TASK 1: Seed post-WC MLS schedule into D1

File: scripts/seed-mls-return-2026.py

Fetch the MLS post-WC schedule (July 19 – October 2026) from the
api-sports.io Football API (same source used for WC games) and insert
into ARCHIVE_DB regular_season_games.

API endpoint:
  GET https://v3.football.api-sports.io/fixtures
  Headers: x-apisports-key: {APISPORTS_KEY from env}
  Params: league=253&season=2026&from=2026-07-19&to=2026-10-31

League 253 = MLS in api-sports.io.

For each fixture:
  - id: f"{fixture[date]}-mls-{home[:5].lower().replace(' ','')}-{away[:5].lower().replace(' ','')}"
  - date: fixture["fixture"]["date"][:10]
  - sport: "MLS"
  - home: fixture["teams"]["home"]["name"]
  - away: fixture["teams"]["away"]["name"]
  - home_score: NULL (all future games)
  - away_score: NULL

INSERT OR IGNORE into regular_season_games — do not overwrite completed games.

Upload script to R2 or write results to outbox/mls-schedule-2026.json
for audit. Then INSERT via the relay /d1/execute endpoint:

  POST https://field-relay-nba.jeffunglesbee.workers.dev/d1/execute
  Body: {"sql": "INSERT OR IGNORE INTO regular_season_games ..."}

Batch 20 rows per INSERT. Verify count after:
  SELECT COUNT(*) FROM regular_season_games WHERE sport='MLS' AND date >= '2026-07-19'

Expected: 150-250 games (MLS plays ~2 games/week/team, 29 teams).

APISPORTS_KEY: available as APISPORTS_KEY env var from repo secrets
  (already used by relay; add to workflow env same as odds-backfill.yml)

## TASK 2: Create scripts/soccer-fbref-mls.py

Clone soccer-fbref-wc.py with ONE league only: MLS.

MLS FBref config:
  name: "MLS 2025"
  comp_id: "22"
  season: "2025"
  url_pattern: "single"
  slug: "Major-League-Soccer"
  r2_key: "mls.json"

The existing script already handles single-season URL pattern, R2 upload,
and outbox fallback. Copy the full script, remove all other leagues,
update the LEAGUES list to MLS only.

Output R2 key: soccer/fbref/mls.json  (matches context-assembler lookup)
Output outbox: outbox/soccer/mls.json (fallback, matches existing pattern)

Run it immediately at end of task to seed the R2 key now:
  python3 scripts/soccer-fbref-mls.py

Verify R2 key populated by checking /health/sources after deploy.

## TASK 3: Create .github/workflows/soccer-fbref-mls.yml

Clone soccer-fbref-wc.yml with these changes:

name: Soccer FBref MLS Stats Update

Schedule:
  - cron: '0 11 * * 1'   # Every Monday 11am UTC (matches MLB weekly cadence)
    # Starts: July 19 2026 is a Sunday; first Monday run is July 20.
    # Covers full MLS season through October.

The cron runs year-round but script only fetches when MLS data is available.
No date-gating needed — FBref simply returns empty tables in the off-season,
script handles gracefully with zero-team output.

workflow_dispatch: true  # Manual trigger always available

Script: python3 scripts/soccer-fbref-mls.py
Commit message pattern: "MLS FBref update $(date -u +%Y-%m-%d) [skip ci]"
Outbox: outbox/soccer/

## TASK 4: Update soccer-fbref-wc.yml — disable WC cron, keep workflow_dispatch

The WC cron ('0 8 */3 * *') should be disabled after the WC final (July 19).
The WC final is July 19; last meaningful data refresh is ~July 20.

Replace the schedule cron with a comment-only block:

```yaml
on:
  # WC group stage cron ended July 5 2026.
  # Workflow retained for manual trigger (post-match stats, tournament archive).
  workflow_dispatch:
```

Keep the job and script intact — workflow_dispatch allows manual refreshes
for WC archive purposes (e.g., pulling final tournament stats).

DO NOT delete the workflow or script.

## SCOPE

Repo: jubilant-bassoon only.

DO:
- scripts/seed-mls-return-2026.py (one-time schedule seed)
- scripts/soccer-fbref-mls.py (MLS FBref fetcher)
- .github/workflows/soccer-fbref-mls.yml (weekly MLS cron)
- .github/workflows/soccer-fbref-wc.yml (remove cron, keep workflow_dispatch)
- Run seed-mls-return-2026.py to populate D1
- Run soccer-fbref-mls.py to seed R2 now
- Verify /health/sources shows soccer_fbref_mls green after deploy

DO NOT:
- Modify context-assembler.js (already wired)
- Modify relay source (no relay changes needed)
- Touch index.html
- Modify any existing MLS game rows with scores

## VERIFICATION

After all tasks:

1. D1 count: SELECT COUNT(*) FROM regular_season_games
   WHERE sport='MLS' AND date >= '2026-07-19'
   Expected: > 100

2. R2 key: hit /health/sources
   soccer_fbref_mls should be "ok" not "stale" or "missing"

3. Context probe: hit /journalism/context-probe with an MLS game
   Expected: non-empty context returned

4. WC workflow: confirm soccer-fbref-wc.yml has no schedule cron

## COMMIT

Two commits acceptable:
  1. "feat: MLS return prep — schedule seed + FBref fetcher + weekly cron"
  2. "fix: disable WC FBref cron (WC ends July 19)"

Or single commit combining all four changes.
