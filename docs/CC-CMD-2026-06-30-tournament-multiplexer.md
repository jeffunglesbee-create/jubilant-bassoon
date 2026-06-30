# CC-CMD — Tournament Competition Multiplexer (MLS Cup Playoffs, Leagues Cup, US Open Cup, etc.)

**Repos:** jubilant-bassoon (script + workflow), field-relay-nba (read-only — uses existing `/archive/game`, no relay changes)
**Date:** 2026-06-30
**Baseline:** jubilant-bassoon HEAD 4363aaf0 · field-relay-nba HEAD d78db9d4
**Builds on:** CC-CMD-2026-06-30-soccer-stats-dual-source.md, today's MLS Regular Season seed

git pull. Read CLAUDE.md. Run `git log --oneline -5` first.

Write all findings to outbox/cc-tournament-multiplexer-2026-06-30.md.

---

## BACKGROUND

Confirmed live 2026-06-30: stats-api's `/competitions` registry has 20
entries, 15 tagged `competition_type: "Tournament"`. One of these (US Open
Cup, MLS-COM-00002U) is a real single-elimination bracket — confirmed via
live pull of all 32 2026 matches across 7 rounds (First Round → Final).
Each match carries `bracket_structure_id` (`QF-01`, `SF-01`, `F-01`) and
unresolved future rounds use literal `"TBC Home"` / `"TBC Away"` team names
with placeholder team_ids that are NOT in the real 30-club roster (confirmed:
`MLS-CLU-00001H`/`MLS-CLU-00001J` absent from
`/clubs/competitions/MLS-COM-000001/seasons/{season}`, which returned exactly
30 real ids).

This does not fit `regular_season_games`'s write-once, team-code-based ID
scheme (TBC has no stable team code; INSERT OR IGNORE can never pick up a
slot resolving from TBC to a real team).

It does fit `postseason_games`, confirmed via live UPSERT test
(`ON CONFLICT(id) DO UPDATE` works; NOT NULL columns are id, sport,
series_key, round, game_number, date, home, away). Better: there's already
a generic write endpoint, `POST /archive/game` (index.js:7685), that
auto-routes to `postseason_games` when `series_key` is present and does
`COALESCE`-based partial UPSERT — built for NBA/NHL series, sport-agnostic
by design. Confirmed via direct read of index.js:7710-7760. Use this
endpoint. Do not write raw SQL to postseason_games from the new script.

**Entity filter (the actual multiplexer mechanism):** fetch the real 30-club
MLS roster live each run from `/clubs/competitions/MLS-COM-000001/seasons/
{season}` (key: `club_id`, confirmed format `MLS-CLU-XXXXXX`). For any
Tournament-type competition, keep a match only if `home_team_id` or
`away_team_id` is in that set. This is self-updating (expansion teams
included automatically), excludes TBC rows (placeholder ids aren't in the
roster), and excludes lower-tier competitions entirely (MLS NEXT Pro club
ids are a different roster, so NEXT Pro Playoffs naturally yields zero
matches without being hardcoded out). No competition_id allowlist needed —
iterate all Tournament-type competitions; ones with no MLS-club participation
(Gold Cup, Nations League, Copa America, FIFA World Cup, MLS NEXT Pro,
MLS Test) simply contribute zero rows.

---

## PRE-BUILD PROBES (Rule 68 — run before writing any code)

```bash
cd jubilant-bassoon

# 1. Re-confirm /archive/game signature + postseason_games NOT NULL columns
#    (this doc's claims may be stale by the time this runs — verify, don't trust)
curl -s -H "Authorization: token $FIELD_PAT" \
  "https://api.github.com/repos/jeffunglesbee-create/field-relay-nba/contents/src/index.js" \
  | python3 -c "
import json,sys,base64
c = base64.b64decode(json.load(sys.stdin)['content']).decode()
i = c.find(\"pathname === '/archive/game'\")
print(c[i-200:i+2500])
"

# 2. Re-confirm real club roster shape + count (expect 30)
curl -s "https://stats-api.mlssoccer.com/clubs/competitions/MLS-COM-000001/seasons/MLS-SEA-0001KA?per_page=50" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['clubs']), d['clubs'][0])"

# 3. Re-confirm competition registry + type tags (expect 20 total, 15 Tournament)
curl -s "https://stats-api.mlssoccer.com/competitions" \
  | python3 -c "
import json,sys
d = json.load(sys.stdin)
types = {}
for c in d['competitions']:
    types.setdefault(c['competition_type'], []).append(c['competition_id'])
for t, ids in types.items():
    print(t, len(ids), ids)
"

# 4. Spot-check US Open Cup bracket still has the TBC/bracket_structure_id shape
curl -s "https://stats-api.mlssoccer.com/matches/seasons/MLS-SEA-0001KA?competition_id=MLS-COM-00002U&match_date%5Bgte%5D=2026-01-01&match_date%5Blte%5D=2026-12-31&per_page=5" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d['schedule'][0], indent=2))"
```

STOP CONDITION: if probe 1 shows `/archive/game` no longer exists, or its
`series_key`-presence routing logic has changed, halt and write findings to
the outbox doc instead of guessing a substitute write path.

---

## TASK 1 — New script: scripts/seed-mls-tournaments-2026.py

```python
#!/usr/bin/env python3
"""
Sync MLS-club tournament matches (MLS Cup Playoffs, Leagues Cup, US Open Cup,
Concacaf Champions Cup, Campeones Cup, etc.) into postseason_games via the
relay's generic /archive/game endpoint.

Entity-filtered: only syncs matches where a real MLS club (from the live
30-club roster) is participating. No hardcoded competition list — iterates
every competition tagged "Tournament" by stats-api's own registry.

Source verification: codex key mls-schedule-stats-api-2026-06-30,
CC-CMD-2026-06-30-tournament-multiplexer.md
"""

import json, os, sys, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timezone

RELAY      = os.environ.get("RELAY_URL", "https://field-relay-nba.jeffunglesbee.workers.dev").rstrip("/")
ARCHIVE_URL = f"{RELAY}/archive/game"
UA         = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
RELAY_HDR  = {"X-FIELD-Relay": "field-relay-cron-2026", "Content-Type": "application/json", "User-Agent": UA}

MLS_API    = "https://stats-api.mlssoccer.com"
REG_SEASON_COMP = "MLS-COM-000001"
SEASON_ID  = "MLS-SEA-0001KA"
DATE_FROM  = datetime.now(timezone.utc).strftime("%Y-%m-%d")
DATE_TO    = "2026-12-31"   # generous catch-all; entity+type filters do the real narrowing

def api_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "FIELD-Sports-Intelligence/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def get_real_club_roster():
    """Live MLS club roster — self-updating, not hardcoded."""
    data = api_get(f"{MLS_API}/clubs/competitions/{REG_SEASON_COMP}/seasons/{SEASON_ID}?per_page=50")
    return {c["club_id"] for c in data.get("clubs", [])}

def get_tournament_competitions():
    data = api_get(f"{MLS_API}/competitions")
    return [c for c in data.get("competitions", []) if c.get("competition_type") == "Tournament"]

def fetch_matches(comp_id):
    all_games = []
    token = None
    while True:
        qp = {
            "competition_id": comp_id,
            "match_date[gte]": DATE_FROM,
            "match_date[lte]": DATE_TO,
            "per_page": "100",
        }
        if token:
            qp["page_token"] = token
        url = f"{MLS_API}/matches/seasons/{SEASON_ID}?{urllib.parse.urlencode(qp)}"
        try:
            data = api_get(url)
        except urllib.error.HTTPError:
            break  # competition may have no matches in range — not an error
        games = data.get("schedule", [])
        all_games.extend(games)
        token = data.get("next_page_token")
        if not token or not games:
            break
    return all_games

def post_archive_game(game, comp, roster):
    home_id = game.get("home_team_id")
    away_id = game.get("away_team_id")
    if home_id not in roster and away_id not in roster:
        return False  # neither side is a real MLS club — skip (TBC or non-MLS opponent)

    kickoff = game.get("planned_kickoff_time", game["start_date"])
    date = kickoff[:10]
    status = game.get("match_status", "")
    is_final = status in ("finalWhistle", "fulltime", "finished")

    bracket_id = game.get("bracket_structure_id")
    series_key = f"{comp['competition_id']}_{bracket_id or game['match_id']}"

    body = {
        "sport": "MLS",
        "league": comp["competition_name"],
        "date": date,
        "home": game["home_team_name"],
        "away": game["away_team_name"],
        "home_score": game.get("home_team_goals") if is_final else None,
        "away_score": game.get("away_team_goals") if is_final else None,
        "venue": game.get("stadium_name"),
        "series_key": series_key,
        "round": game.get("section_name") or game.get("match_type"),
        "game_number": 1,
        # NOTE: deliberately NOT setting source_id here. The /archive/game
        # endpoint writes source_id into the espn_event_id column, which
        # other pipelines (soccer xG context, June 23 CC-CMD) treat as
        # ESPN-namespaced. Populating it with a stats-api match_id risks
        # cross-system confusion. Leave null; idempotency comes from the
        # endpoint's own {sport}_{date}_{home}_{away} id generation.
    }
    payload = json.dumps(body).encode()
    req = urllib.request.Request(ARCHIVE_URL, data=payload, headers=RELAY_HDR)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            json.loads(r.read())
        return True
    except urllib.error.HTTPError as e:
        print(f"  FAILED {comp['competition_name']} {game['match_id']}: {e.code} {e.read().decode()[:150]}")
        return False

def main():
    print("Fetching real MLS club roster...")
    roster = get_real_club_roster()
    print(f"  {len(roster)} clubs")

    print("Fetching tournament-type competitions...")
    comps = get_tournament_competitions()
    print(f"  {len(comps)} tournament competitions")

    total_synced = 0
    summary = []
    for comp in comps:
        games = fetch_matches(comp["competition_id"])
        synced = sum(1 for g in games if post_archive_game(g, comp, roster))
        if synced > 0:
            print(f"  {comp['competition_name']}: {synced}/{len(games)} synced (MLS-club filter)")
            summary.append({"competition": comp["competition_name"], "fetched": len(games), "synced": synced})
        total_synced += synced

    print(f"\nTotal matches synced: {total_synced}")

    os.makedirs("outbox", exist_ok=True)
    audit = {
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "source": "stats-api.mlssoccer.com",
        "date_range": f"{DATE_FROM} to {DATE_TO}",
        "competitions_checked": len(comps),
        "total_synced": total_synced,
        "by_competition": summary,
    }
    with open("outbox/mls-tournaments-2026.json", "w") as f:
        json.dump(audit, f, indent=2)
    print("Audit: outbox/mls-tournaments-2026.json")

if __name__ == "__main__":
    main()
```

---

## TASK 2 — New workflow: .github/workflows/mls-tournaments-seed.yml

Daily cron (tournaments need same-day TBC-resolution propagation — weekly
is too slow once elimination rounds start). Offset from the existing weekly
MLS Regular Season cron (Monday 10am UTC) to avoid resource contention.

```yaml
name: MLS Tournament Matches Sync (Cup Playoffs, Leagues Cup, US Open Cup, etc.)

on:
  workflow_dispatch:
  schedule:
    - cron: '0 11 * * *'  # Daily 11am UTC — catches prior evening's US results

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Sync MLS-club tournament matches into postseason_games
        run: python3 scripts/seed-mls-tournaments-2026.py

      - name: Commit audit JSON
        run: |
          git config user.email "mls-tournaments@field"
          git config user.name "MLS-Tournaments-Bot"
          git add outbox/
          git diff --cached --quiet && echo "No changes to commit" && exit 0
          git commit -m "MLS tournament sync $(date -u +%Y-%m-%d) [skip ci]"
          for i in 1 2 3; do
            git pull --rebase --autostash origin main && git push origin main && break
            sleep $((i * 5))
          done
```

---

## TASK 3 — Smoke assertions

```
# A-TOURN-1: scripts/seed-mls-tournaments-2026.py exists and is syntactically valid Python
# A-TOURN-2: .github/workflows/mls-tournaments-seed.yml exists with daily schedule
# A-TOURN-3: script does NOT contain a hardcoded competition_id allowlist
#   (grep for "MLS-COM-0000" literal strings outside REG_SEASON_COMP — should only
#   match REG_SEASON_COMP itself, confirming the generic iteration wasn't reverted
#   to a hand-maintained list)
# A-TOURN-4: script does not set source_id in the /archive/game payload
```

---

## TASK 4 — Verify end-to-end

```bash
# 1. Dry run locally (does NOT require CF secrets — relay write is unauthenticated
#    aside from the X-FIELD-Relay header already in the script)
python3 scripts/seed-mls-tournaments-2026.py

# 2. Confirm rows landed in postseason_games
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/d1/execute" \
  -H "X-FIELD-Relay: field-relay-cron-2026" -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" \
  -d '{"sql":"SELECT id, sport, round, home, away, date FROM postseason_games WHERE sport='"'"'MLS'"'"' ORDER BY date"}' \
  | python3 -m json.tool

# 3. Confirm a TBC-vs-TBC match was correctly excluded (Final, before semis resolve)
#    — expect zero MLS rows with home/away containing "TBC"
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/d1/execute" \
  -H "X-FIELD-Relay: field-relay-cron-2026" -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" \
  -d '{"sql":"SELECT COUNT(*) as c FROM postseason_games WHERE sport='"'"'MLS'"'"' AND (home LIKE '"'"'%TBC%'"'"' OR away LIKE '"'"'%TBC%'"'"')"}'

# 4. Re-run the script a second time — confirm idempotent (synced count should
#    match or be lower, never duplicate rows; total row count unchanged on rerun)
python3 scripts/seed-mls-tournaments-2026.py
```

---

## SCOPE (Rule 69 — TOUCH-ONLY-A)

DO:
- `scripts/seed-mls-tournaments-2026.py` (new file)
- `.github/workflows/mls-tournaments-seed.yml` (new file)
- Run the script once to seed current data
- Single commit

DO NOT:
- Modify `scripts/seed-mls-return-2026.py` or its workflow (Regular Season
  stays on its own write-once INSERT OR IGNORE path — different problem,
  already solved, don't touch)
- Modify `src/index.js` or any field-relay-nba file — `/archive/game`
  already does everything needed
- Build two-legged-tie `game_number=2` handling — every confirmed match this
  session was single-leg (`series_type` was empty on all samples). Document
  as a future gap if a competition with real two-legged ties is found during
  probe 4, do not build speculative handling for it now
- Add a hardcoded competition_id list "for safety" — the entity filter is
  the whole point; resist the urge to also allowlist competitions

---

## KNOWN GAPS TO DOCUMENT (not solve here)

1. `espn_event_id` stays null on all tournament rows (see source_id note in
   Task 1) — if a future need arises to cross-reference these against ESPN's
   own event ids for xG/stats context, that's a separate identity-resolution
   problem, not a missing field.
2. Client-side card rendering for the `round` field specifically (e.g.
   showing "Quarterfinal" as a badge vs just a date) is unverified — dozens
   of existing index.js read paths serve postseason_games generically with
   no sport gating, so cards should appear, but whether index.html's
   soccer-specific card template surfaces `round` distinctly the way it
   might for NBA series is unknown and untested this session.

---

## OUTBOX MANIFEST (last task)

Write `outbox/cc-tournament-multiplexer-2026-06-30.md` containing:
1. Probe 1-4 results (especially: did the live registry/roster counts match
   this doc's claims, or had something changed)
2. Per-competition sync counts from Task 4 step 2
3. Confirmation Task 4 steps 3 (TBC exclusion) and 4 (idempotency) passed
4. Whether any competition showed a real two-legged tie (`series_type`
   non-empty) — if so, flag explicitly as the next gap, do not patch in
   this session
