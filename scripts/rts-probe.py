#!/usr/bin/env python3
"""RealtimeSports boxscore depth probe — using known AFC Championship game ID."""
import json, urllib.request, os
from datetime import datetime, timezone

API_BASE = "https://www.realtimesportsapi.com/api/v1"
TOKEN    = os.environ.get("REALTIMESPORTS_KEY", "")
EPA_FIELDS = ["down","distance","yardLine","yardsToEndzone","clock","quarter",
              "period","yardsGained","statYardage","type","text","description",
              "homeScore","awayScore","scoringPlay","isTurnover","isPenalty"]

def fetch(path):
    url = API_BASE + path
    try:
        req = urllib.request.Request(url, headers={
            "Accept":"application/json","Authorization":f"Bearer {TOKEN}"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:800]
    except Exception as ex:
        return 0, str(ex)

def epa_check(body):
    low = body.lower()
    return [f for f in EPA_FIELDS if f'"{f.lower()}"' in low]

ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
results = {"probeTime": ts, "endpoints": []}

# Known game IDs from Swagger example + probe for more
# 401542236 = KC Chiefs at Baltimore Ravens, Jan 28 2026 (AFC Championship)
KNOWN_NFL_ID = "401542236"

# Try to find a recent NBA game ID
nba_status, nba_body = fetch("/sports/basketball/leagues/nba/events/live")
nba_id = ""
try:
    d = json.loads(nba_body)
    events = d.get("data",[])
    if events:
        nba_id = str(events[0].get("id",""))
        results["nba_live_event"] = events[0]
except: pass

TESTS = [
    # NFL boxscore — the critical test
    (f"/sports/football/leagues/nfl/events/{KNOWN_NFL_ID}/boxscore", "NFL boxscore (AFC Champ)"),
    (f"/sports/football/leagues/nfl/events/{KNOWN_NFL_ID}",          "NFL event detail (AFC Champ)"),
    # Try to find a plays or pbp endpoint
    (f"/sports/football/leagues/nfl/events/{KNOWN_NFL_ID}/plays",    "NFL plays (AFC Champ)"),
    (f"/sports/football/leagues/nfl/events/{KNOWN_NFL_ID}/pbp",      "NFL pbp (AFC Champ)"),
    # Teams with full detail
    ("/sports/football/leagues/nfl/teams/7",                         "NFL team detail (Chiefs id:7)"),
    # Check what other event-level paths exist
    ("/sports/football/leagues/nfl/events?limit=3",                  "NFL events list (recent)"),
    ("/sports/football/leagues/nfl/events?season=2025&week=1&limit=2","NFL events W1 2025"),
]

if nba_id:
    TESTS.insert(0, (f"/sports/basketball/leagues/nba/events/{nba_id}/boxscore","NBA boxscore (live)"))

for path, label in TESTS:
    status, body = fetch(path)
    try:    data = json.loads(body); preview = json.dumps(data)[:1200]
    except: data = None;            preview = body[:600]
    epa = epa_check(body)
    results["endpoints"].append({"label":label,"path":path,"status":status,
                                  "epa_fields":epa,"epa_count":len(epa),"preview":preview})
    mark = "✅" if status==200 else "❌"
    epa_note = f" ⚡ EPA:{epa}" if epa else ""
    print(f"  {mark} {status} {label}{epa_note}")
    if status==200: print(f"     {preview[:400]}")

ok  = [e for e in results["endpoints"] if e["status"]==200]
epa = [e for e in results["endpoints"] if e["epa_count"]>0]
results["summary"] = {
    "http_200": len(ok),
    "epa_endpoints": len(epa),
    "200_paths": [e["path"] for e in ok],
    "epa_findings": [{"path":e["path"],"fields":e["epa_fields"]} for e in epa],
}

os.makedirs("outbox", exist_ok=True)
out = f"outbox/rts-result-{ts}.json"
with open(out,"w") as f: json.dump(results,f,indent=2)
print(f"\n{json.dumps(results['summary'],indent=2)}")
