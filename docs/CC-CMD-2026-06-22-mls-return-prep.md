# Claude Code Command — MLS Return Preparation (July 19 2026)

git pull. Read CLAUDE.md. Run `git log --oneline -5` first.

Write all findings to outbox/cc-mls-return-2026-06-22.md.

## CONTEXT

MLS paused May 24 for the FIFA World Cup. Resumes July 19-20 weekend.
Three gaps block FIELD from covering MLS on return:

1. Post-WC MLS schedule not in D1 (regular_season_games stops at 2026-05-23)
2. soccer/fbref/mls.json missing from R2 (key was never populated)
3. No MLS FBref cron exists — context will be stale from day one of return

WC final is July 19. The existing soccer-fbref-wc.yml cron (every 3 days,
no end date) correctly runs through the tournament. DO NOT modify it.
The MLS cron should start July 20 (first Monday after the final).

Context assembler is already wired for MLS ('mls' → 'soccer/fbref/mls.json');
once R2 key exists, journalism works automatically.

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
# Confirm last MLS date in D1 — expected: 2026-05-23
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/d1/execute \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT MAX(date) as last FROM regular_season_games WHERE sport=\'MLS\'"}\'

# Confirm mls.json missing from R2
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/health/sources | python3 -c "
import json,sys
d=json.load(sys.stdin)
for s in d['sources']:
    if 'mls' in s['key']: print(s)
"

# Confirm WC cron is intact (should NOT be modified)
grep -A5 'schedule:' .github/workflows/soccer-fbref-wc.yml
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
  - id: f"{date}-mls-{home[:5].lower().replace(' ','')}-{away[:5].lower().replace(' ','')}"
  - date: fixture["fixture"]["date"][:10]
  - sport: "MLS"
  - home: fixture["teams"]["home"]["name"]
  - away: fixture["teams"]["away"]["name"]
  - home_score: NULL (all future games)
  - away_score: NULL

INSERT OR IGNORE into regular_season_games — do not overwrite completed games.

Write results to outbox/mls-schedule-2026.json for audit.
INSERT via relay /d1/execute endpoint in batches of 20 rows.

Verify count after:
  SELECT COUNT(*) FROM regular_season_games WHERE sport='MLS' AND date >= '2026-07-19'
Expected: 150-250 games (MLS plays ~2 games/week/team, 29 teams).

APISPORTS_KEY: available as APISPORTS_KEY env var — same key used by relay
(add to workflow env same pattern as odds-backfill.yml uses CLOUDFLARE_API_TOKEN).

## TASK 2: Create scripts/soccer-fbref-mls.py

Clone soccer-fbref-wc.py with ONE league only: MLS.

MLS FBref config:
  name: "MLS 2025"
  comp_id: "22"
  season: "2025"
  url_pattern: "single"
  slug: "Major-League-Soccer"
  r2_key: "mls.json"

Copy the full script structure (fetch_html, parse_squad_table, upload_to_r2,
4 stat tables), remove all leagues except MLS. Output:
  R2: soccer/fbref/mls.json   (matches context-assembler lookup)
  Outbox: outbox/soccer/mls.json (fallback, matches existing pattern)

Run it immediately at end of task to seed the R2 key now:
  python3 scripts/soccer-fbref-mls.py

## TASK 3: Create .github/workflows/soccer-fbref-mls.yml

Clone soccer-fbref-wc.yml with these changes:

name: Soccer FBref MLS Stats Update

Schedule:
  - cron: '0 11 * * 1'   # Every Monday 11am UTC (matches MLB weekly cadence)
  # MLS resumes July 19-20. First Monday run: July 20 2026.
  # Runs year-round; FBref returns empty tables in off-season (handled gracefully).

workflow_dispatch: true  # Manual trigger always available

Script: python3 scripts/soccer-fbref-mls.py
Commit message pattern: "MLS FBref update $(date -u +%Y-%m-%d) [skip ci]"
Outbox path: outbox/soccer/

## TASK 4: DO NOT modify soccer-fbref-wc.yml

The WC cron ('0 8 */3 * *') has no end date and correctly runs through
the July 19 final. Leave it completely unchanged.

Verify it is intact after your changes:
  grep schedule .github/workflows/soccer-fbref-wc.yml

## SCOPE

Repo: jubilant-bassoon only.

DO:
- scripts/seed-mls-return-2026.py (one-time schedule seed)
- scripts/soccer-fbref-mls.py (MLS FBref fetcher)
- .github/workflows/soccer-fbref-mls.yml (weekly MLS cron from July 20)
- Run seed-mls-return-2026.py to populate D1
- Run soccer-fbref-mls.py to seed R2 now
- Verify /health/sources shows soccer_fbref_mls green after deploy

DO NOT:
- Modify soccer-fbref-wc.yml in any way
- Modify context-assembler.js (already wired)
- Modify relay source (no relay changes needed)
- Touch index.html
- Overwrite any MLS game rows that already have scores

## VERIFICATION

After all tasks:

1. D1 count:
   SELECT COUNT(*) FROM regular_season_games
   WHERE sport='MLS' AND date >= '2026-07-19'
   Expected: > 100

2. R2 key: hit /health/sources
   soccer_fbref_mls should be "ok" not "stale" or "missing"

3. WC cron intact:
   grep -A3 'schedule:' .github/workflows/soccer-fbref-wc.yml
   Expected: cron still present

4. New MLS workflow exists:
   ls .github/workflows/soccer-fbref-mls.yml

## COMMITS

Two commits:
  1. "feat: MLS return prep — post-WC schedule seed script + FBref fetcher"
  2. "feat: soccer-fbref-mls weekly cron (MLS resumes July 20)"
