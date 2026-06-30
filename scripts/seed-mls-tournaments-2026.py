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
    # Exclude MLS Test (MLS-COM-00002R) — test/placeholder competition with
    # garbled section_name values (e.g. "Total") and no real fixtures
    EXCLUDE = {"MLS Test"}
    return [c for c in data.get("competitions", [])
            if c.get("competition_type") == "Tournament"
            and c.get("competition_name") not in EXCLUDE]

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
