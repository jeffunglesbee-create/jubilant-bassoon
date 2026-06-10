#!/usr/bin/env python3
"""
NBA Clutch Stats → R2

Fetches team clutch stats (last 5 min, within 5 pts) from stats.nba.com.
GitHub Actions (ubuntu-latest) can access stats.nba.com; CF Workers get 520.

Output: R2 field-relay-data/nba/2026/clutch-stats.json
Schema: {teamId: {abbrev, name, clutchDrtg, clutchOrtg, clutchNetRtg, clutchWinPct, gp}}

Spec: Sport-Specific × Workers Plus NBA-B
"""

import json, os, urllib.request
from datetime import datetime, timezone

NBA_STATS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.nba.com/stats/",
    "Origin": "https://www.nba.com",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}

def fetch_nba_stats(endpoint, params):
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"https://stats.nba.com/stats/{endpoint}?{qs}"
    req = urllib.request.Request(url, headers=NBA_STATS_HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# Team abbrev lookup (same as NBA_ABBREV_MAP pattern in FIELD)
TEAM_ABBREVS = {
    1610612747: "LAL", 1610612744: "GSW", 1610612751: "BRK",
    1610612752: "NYK", 1610612745: "HOU", 1610612760: "OKC",
    1610612753: "ORL", 1610612741: "CHI", 1610612748: "MIA",
    1610612755: "PHI", 1610612738: "BOS", 1610612766: "CAR",  # CHO
    1610612761: "TOR", 1610612749: "MIL", 1610612759: "SAS",
    1610612765: "DET", 1610612740: "NOP", 1610612754: "IND",
    1610612756: "PHX", 1610612763: "MEM", 1610612743: "DEN",
    1610612757: "POR", 1610612758: "SAC", 1610612742: "DAL",
    1610612746: "LAC", 1610612764: "WAS", 1610612737: "ATL",
    1610612762: "UTA", 1610612750: "MIN", 1610612769: "ORL",
}

print("Fetching NBA clutch stats (playoffs, last 5 min, within 5 pts)...")

for season_type in ["Playoffs", "Regular Season"]:
    try:
        data = fetch_nba_stats("leaguedashteamclutch", {
            "LeagueID": "00",
            "Season": "2025-26",
            "SeasonType": season_type,
            "PerMode": "PerGame",
            "MeasureType": "Advanced",
            "ClutchTime": "Last+5+Minutes",
            "AheadBehind": "Ahead+or+Behind",
            "PointDiff": "5",
            "PlusMinus": "N",
            "PaceAdjust": "N",
            "Rank": "N",
            "Outcome": "",
            "Location": "",
            "Month": "0",
            "SeasonSegment": "",
            "DateFrom": "",
            "DateTo": "",
            "OpponentTeamID": "0",
            "VsConference": "",
            "VsDivision": "",
            "GameSegment": "",
            "Period": "0",
            "ShotClockRange": "",
            "LastNGames": "0",
            "GameScope": "",
            "PlayerExperience": "",
            "PlayerPosition": "",
            "StarterBench": "",
            "TwoWay": "0",
            "Conference": "",
            "Division": "",
        })

        result_set = data["resultSets"][0]
        headers = result_set["headers"]
        rows    = result_set["rowSet"]

        # Build index: {column_name: index}
        idx = {h: i for i, h in enumerate(headers)}

        teams = {}
        for row in rows:
            team_id   = row[idx["TEAM_ID"]]
            team_abbr = row[idx.get("TEAM_ABBREVIATION", -1)] if "TEAM_ABBREVIATION" in idx else TEAM_ABBREVS.get(team_id, "")
            teams[team_abbr or str(team_id)] = {
                "teamId":      team_id,
                "name":        row[idx.get("TEAM_NAME", -1)] if "TEAM_NAME" in idx else "",
                "gp":          row[idx.get("GP", -1)] if "GP" in idx else 0,
                "clutchOrtg":  row[idx.get("OFF_RATING", -1)] if "OFF_RATING" in idx else None,
                "clutchDrtg":  row[idx.get("DEF_RATING", -1)] if "DEF_RATING" in idx else None,
                "clutchNetRtg":row[idx.get("NET_RATING", -1)] if "NET_RATING" in idx else None,
                "clutchWinPct":row[idx.get("W_PCT", -1)] if "W_PCT" in idx else None,
            }

        print(f"  ✅ {season_type}: {len(teams)} teams")

        output = {
            "updated": datetime.now(timezone.utc).isoformat(),
            "source": "stats.nba.com via GitHub Actions",
            "seasonType": season_type,
            "definition": "Clutch = last 5 min of regulation, within 5 points",
            "teams": teams,
        }

        # Write local fallback
        os.makedirs("outbox/nba", exist_ok=True)
        fname = "clutch_playoffs.json" if season_type == "Playoffs" else "clutch_regular.json"
        with open(f"outbox/nba/{fname}", "w") as f:
            json.dump(output, f, indent=2, default=str)
        print(f"  ✅ Written to outbox/nba/{fname}")

        # R2 upload
        account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
        api_token  = os.environ.get("CLOUDFLARE_API_TOKEN", "")
        if account_id and api_token:
            r2_key = f"nba/2026/{fname}"
            url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/buckets/field-relay-data/objects/{r2_key}"
            body = json.dumps(output, default=str).encode("utf-8")
            req = urllib.request.Request(url, data=body, method="PUT", headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
                "Content-Length": str(len(body)),
            })
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    resp = json.loads(r.read())
                    if resp.get("success"):
                        print(f"  ✅ R2 upload OK → {r2_key}")
                    else:
                        print(f"  ⚠️  R2: {resp.get('errors')}")
            except Exception as e:
                print(f"  ❌ R2 upload failed: {e}")

    except Exception as e:
        print(f"  ❌ {season_type} fetch failed: {e}")
        import traceback; traceback.print_exc()

print(f"\n── Done {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} ──")
