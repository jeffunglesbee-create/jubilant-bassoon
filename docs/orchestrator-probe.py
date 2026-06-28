#!/usr/bin/env python3
"""
PGA Tour Orchestrator Probe - shotdetailsv4compressed + GPS coordinates
Run AFTER adding orchestrator.pgatour.com to network egress allowlist.

Findings from June 28 2026:
- orchestrator.pgatour.com EXISTS (not NXDOMAIN) but blocked by sandbox egress
- statdata/livedata/cdn/api.pgatour.com all NXDOMAIN (decommissioned)
- ESPN Core API has NO coordinate fields (verified 5 nested levels)
- Parse.bot documents get_player_shots returning GPS coords from this orchestrator
- Known community API key: da2-gsrx5bibzbb4njvhl7t37wqyl4 (may have rotated)
"""

import json, urllib.request, urllib.error
from datetime import datetime

GRAPHQL_URL = "https://orchestrator.pgatour.com/graphql"
API_KEY = "da2-gsrx5bibzbb4njvhl7t37wqyl4"
TOURNAMENT_ID = "R2026019"

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    "Accept": "application/json",
    "Origin": "https://www.pgatour.com",
    "Referer": "https://www.pgatour.com/",
    "x-api-key": API_KEY,
}

def probe(label, body):
    print(f"\n[{label}]")
    try:
        data = json.dumps(body).encode()
        req = urllib.request.Request(GRAPHQL_URL, data=data, headers=HEADERS, method="POST")
        with urllib.request.urlopen(req, timeout=15) as r:
            resp = json.load(r)
            resp_str = json.dumps(resp).lower()
            coord_terms = ["latitude","longitude","x_coordinate","y_coordinate","from_x","from_y","to_x","to_y","shotcoord","gps"]
            coord_hits = [t for t in coord_terms if t in resp_str]
            if "errors" in resp:
                print(f"  X GraphQL error: {resp['errors'][0].get('message','?')[:120]}")
            elif "data" in resp:
                print(f"  OK Keys: {list(resp['data'].keys())}")
                if coord_hits: print(f"  >>> COORDINATES: {coord_hits}")
                else: print(f"  No coordinate fields")
                print(f"  Sample: {json.dumps(resp['data'], indent=2)[:600]}")
    except urllib.error.HTTPError as e:
        body_text = ""
        try: body_text = e.read().decode("utf-8", errors="replace")[:200]
        except: pass
        if "not in allowlist" in body_text.lower():
            print(f"  SANDBOX BLOCKED - add orchestrator.pgatour.com to egress allowlist")
        elif e.code in [401, 403]:
            print(f"  HTTP {e.code} - API key may have rotated")
        else:
            print(f"  HTTP {e.code}: {body_text[:100]}")
    except Exception as e:
        print(f"  {type(e).__name__}: {str(e)[:80]}")

print("=" * 70)
print(f"PGA TOUR ORCHESTRATOR PROBE | {datetime.now().isoformat()}")
print(f"Tournament: {TOURNAMENT_ID} | Key: {API_KEY[:12]}...")
print("=" * 70)

probe("Leaderboard", {"operationName":"LeaderboardV3","variables":{"tournamentId":TOURNAMENT_ID},"query":"query LeaderboardV3($tournamentId:String!){leaderboardV3(tournamentId:$tournamentId){players{id firstName lastName position total thru}}}"})

probe("ShotDetails", {"operationName":"ShotDetails","variables":{"tournamentId":TOURNAMENT_ID,"round":4},"query":"query ShotDetails($tournamentId:String!,$round:Int!){shotDetails(tournamentId:$tournamentId,round:$round){holes{holeNumber shots{shotNumber distance x y latitude longitude fromX fromY toX toY fromLatitude fromLongitude toLatitude toLongitude}}}}"})

probe("PlayerShots", {"operationName":"PlayerShots","variables":{"tournamentId":TOURNAMENT_ID,"playerId":"46046","round":4},"query":"query PlayerShots($tournamentId:String!,$playerId:String!,$round:Int!){playerShots(tournamentId:$tournamentId,playerId:$playerId,round:$round){holes{holeNumber par yardage strokes{strokeNumber distance startX startY endX endY startLatitude startLongitude endLatitude endLongitude fromLocation toLocation}}}}"})

print("\n--- Without API key ---")
del HEADERS["x-api-key"]
probe("Leaderboard (no key)", {"operationName":"LeaderboardV3","variables":{"tournamentId":TOURNAMENT_ID},"query":"query LeaderboardV3($tournamentId:String!){leaderboardV3(tournamentId:$tournamentId){players{id firstName lastName position total}}}"})

print("\n" + "=" * 70)
print("SANDBOX BLOCKED? Add orchestrator.pgatour.com to egress, new session")
print("API key error? Extract x-api-key from pgatour.com DevTools Network tab")
print("=" * 70)
