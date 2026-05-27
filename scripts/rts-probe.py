#!/usr/bin/env python3
"""RealtimeSports probe — boxscore/plays/pbp with real event ID from events list."""
import json, urllib.request, os
from datetime import datetime, timezone

API_BASE = "https://www.realtimesportsapi.com/api/v1"
TOKEN    = os.environ.get("REALTIMESPORTS_KEY", "")
EPA_FIELDS = ["down","distance","yardLine","yardsToEndzone","clock","quarter",
              "period","yardsGained","statYardage","type","text","description",
              "homeScore","awayScore","scoringPlay","isTurnover","isPenalty",
              "start","end","sequenceNumber"]

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

# Step 1: get real event IDs from events list
status, body = fetch("/sports/football/leagues/nfl/events?limit=5")
event_ids = []
try:
    d = json.loads(body)
    events = d.get("data", [])
    event_ids = [str(e["id"]) for e in events if "id" in e]
    results["available_events"] = [{"id":e["id"],"name":e["name"],"date":e.get("date",""),"state":e.get("status",{}).get("state","")} for e in events]
    print(f"Available events: {json.dumps(results['available_events'], indent=2)}")
except Exception as ex:
    results["events_error"] = str(ex)

# Use first available event ID
eid = event_ids[0] if event_ids else "401872656"
print(f"\nUsing event ID: {eid}\n")

TESTS = [
    (f"/sports/football/leagues/nfl/events/{eid}",           "Event detail"),
    (f"/sports/football/leagues/nfl/events/{eid}/boxscore",  "Boxscore ⭐"),
    (f"/sports/football/leagues/nfl/events/{eid}/plays",     "Plays ⭐"),
    (f"/sports/football/leagues/nfl/events/{eid}/pbp",       "PBP ⭐"),
]

# Also try NBA live (might have games now)
nba_status, nba_body = fetch("/sports/basketball/leagues/nba/events/live")
try:
    nba_events = json.loads(nba_body).get("data", [])
    if nba_events:
        nid = str(nba_events[0]["id"])
        TESTS += [
            (f"/sports/basketball/leagues/nba/events/{nid}/boxscore", "NBA boxscore (live)"),
            (f"/sports/basketball/leagues/nba/events/{nid}/plays",    "NBA plays (live)"),
            (f"/sports/basketball/leagues/nba/events/{nid}/pbp",      "NBA pbp (live)"),
        ]
        results["nba_live"] = nba_events[0]
    else:
        print("No live NBA games at probe time")
except: pass

for path, label in TESTS:
    status, body = fetch(path)
    try:    preview = json.dumps(json.loads(body))[:1200]
    except: preview = body[:600]
    epa = epa_check(body)
    results["endpoints"].append({"label":label,"path":path,"status":status,
                                  "epa_fields":epa,"epa_count":len(epa),"preview":preview})
    mark = "✅" if status==200 else "❌"
    epa_str = f" ⚡ EPA:{epa}" if epa else ""
    print(f"  {mark} {status} {label}{epa_str}")
    if status==200 or epa: print(f"     {preview[:500]}")

ok  = [e for e in results["endpoints"] if e["status"]==200]
epa = [e for e in results["endpoints"] if e["epa_count"]>0]
results["summary"] = {
    "http_200": len(ok), "epa_endpoints": len(epa),
    "200_paths": [e["path"] for e in ok],
    "epa_findings": [{"path":e["path"],"fields":e["epa_fields"],"preview":e["preview"][:600]} for e in epa],
}
os.makedirs("outbox", exist_ok=True)
out = f"outbox/rts-result-{ts}.json"
with open(out,"w") as f: json.dump(results,f,indent=2)
print(f"\n{json.dumps(results['summary'],indent=2)}")
