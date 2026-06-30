#!/usr/bin/env python3
"""
Seed post-WC MLS Regular Season schedule (July 22 - Nov 7 2026) into ARCHIVE_DB.
Uses stats-api.mlssoccer.com - official MLS stats API, no auth required.
Replaces the removed api-sports.io /fixtures/fetch source (June 2026).

Source verification: codex key mls-schedule-stats-api-2026-06-30
Audit artefact: outbox/mls-schedule-2026.json
"""

import json, os, sys, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timezone

RELAY     = os.environ.get("RELAY_URL", "https://field-relay-nba.jeffunglesbee.workers.dev").rstrip("/")
D1_URL    = f"{RELAY}/d1/execute"
UA        = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
D1_HDR    = {"X-FIELD-Relay": "field-relay-cron-2026", "Content-Type": "application/json", "User-Agent": UA}

MLS_API   = "https://stats-api.mlssoccer.com"
SEASON    = "MLS-SEA-0001KA"
COMP      = "MLS-COM-000001"
DATE_FROM = "2026-07-22"
DATE_TO   = "2026-11-07"

def d1_exec(sql, params=None):
    payload = {"sql": sql}
    if params:
        payload["params"] = params
    body = json.dumps(payload).encode()
    req = urllib.request.Request(D1_URL, data=body, headers=D1_HDR)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def fetch_schedule():
    all_games = []
    token = None
    page = 1
    while True:
        qp = {
            "competition_id": COMP,
            "match_date[gte]": DATE_FROM,
            "match_date[lte]": DATE_TO,
            "per_page": "100",
        }
        if token:
            qp["page_token"] = token
        url = f"{MLS_API}/matches/seasons/{SEASON}?{urllib.parse.urlencode(qp)}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "FIELD-Sports-Intelligence/1.0",
            "Accept": "application/json",
        })
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
        games = data.get("schedule", [])
        all_games.extend(games)
        print(f"  Page {page}: {len(games)} games (total: {len(all_games)})")
        token = data.get("next_page_token")
        if not token or not games:
            break
        page += 1
    return all_games

def game_to_row(g):
    kickoff = g.get("planned_kickoff_time", g["start_date"])
    date = kickoff[:10]
    h = g["home_team_three_letter_code"].lower()
    a = g["away_team_three_letter_code"].lower()
    return {
        "id": f"{date}-mls-{h}-{a}",
        "sport": "MLS",
        "date": date,
        "home": g["home_team_name"],
        "away": g["away_team_name"],
        "venue": g.get("stadium_name"),
    }

def main():
    existing = d1_exec(
        "SELECT COUNT(*) as c FROM regular_season_games WHERE sport='MLS' AND date >= ?",
        [DATE_FROM]
    )
    print(f"Existing post-WC MLS games: {existing['results'][0]['c']}")

    print(f"\nFetching MLS schedule {DATE_FROM} to {DATE_TO}...")
    games = fetch_schedule()
    print(f"Total: {len(games)}")

    print(f"\nInserting into D1 (INSERT OR IGNORE)...")
    rows = [game_to_row(g) for g in games]
    inserted = 0
    for i in range(0, len(rows), 5):
        batch = rows[i:i+5]
        ph = []
        params = []
        for r in batch:
            ph.append("(?, ?, ?, ?, ?, ?)")
            params.extend([r["id"], r["sport"], r["date"], r["home"], r["away"], r["venue"]])
        sql = f"INSERT OR IGNORE INTO regular_season_games (id, sport, date, home, away, venue) VALUES {', '.join(ph)}"
        result = d1_exec(sql, params)
        inserted += result.get("meta", {}).get("changes", 0)

    result = d1_exec(
        "SELECT COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest "
        "FROM regular_season_games WHERE sport='MLS' AND date >= ?",
        [DATE_FROM]
    )
    s = result["results"][0]
    print(f"\nPost-WC MLS: {s['count']} games ({s['earliest']} to {s['latest']})")

    total = d1_exec("SELECT COUNT(*) as t FROM regular_season_games WHERE sport='MLS'")["results"][0]["t"]
    print(f"Total MLS in D1: {total}")
    print(f"New rows: {inserted}")

    os.makedirs("outbox", exist_ok=True)
    audit = {
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "source": "stats-api.mlssoccer.com",
        "season_id": SEASON,
        "competition_id": COMP,
        "date_range": f"{DATE_FROM} to {DATE_TO}",
        "fetched": len(games),
        "inserted": inserted,
        "total_post_wc": s["count"],
        "total_mls": total,
    }
    with open("outbox/mls-schedule-2026.json", "w") as f:
        json.dump(audit, f, indent=2)
    print("Audit: outbox/mls-schedule-2026.json")

    if len(games) == 0:
        print("WARNING: No games returned")
        sys.exit(1)
    print(f"\nDone")

if __name__ == "__main__":
    main()
