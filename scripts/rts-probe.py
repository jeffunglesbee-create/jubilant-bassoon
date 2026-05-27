#!/usr/bin/env python3
"""RealtimeSports probe — correct /api/v1/sports/{sport}/leagues/{league}/... paths."""
import json, urllib.request, os
from datetime import datetime, timezone

API_BASE = "https://www.realtimesportsapi.com/api/v1"
TOKEN    = os.environ.get("REALTIMESPORTS_KEY", "")
EPA_FIELDS = ["down","distance","yardLine","yardsToEndzone","clock","quarter",
              "period","yardsGained","yards_gained","playType","type",
              "homeScore","awayScore","score","statYardage","description","text"]

def fetch(path):
    url = API_BASE + path
    try:
        req = urllib.request.Request(url, headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {TOKEN}",
        })
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:600]
    except Exception as ex:
        return 0, str(ex)

def epa_check(body):
    low = body.lower()
    return [f for f in EPA_FIELDS if f'"{f.lower()}"' in low]

def probe(path, label):
    status, body = fetch(path)
    try:    data = json.loads(body); preview = json.dumps(data)[:1000]
    except: data = None;            preview = body[:600]
    epa = epa_check(body)
    return {"label": label, "path": path, "status": status,
            "epa_fields": epa, "epa_count": len(epa), "preview": preview}

ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
results = {"probeTime": ts, "endpoints": []}

# ── Correct paths: /sports/{sport}/leagues/{league}/... ───────────────────────
PATHS = [
    ("/sports/football/leagues/nfl/events/live",              "NFL live events"),
    ("/sports/football/leagues/nfl/events/live?includeOdds=false", "NFL live events (no odds)"),
    ("/sports/basketball/leagues/nba/events/live",            "NBA live events"),
    ("/sports/football/leagues/nfl/teams",                    "NFL teams"),
    ("/sports/football/leagues/nfl/athletes",                 "NFL athletes"),
]

# Get a recent NFL event ID for boxscore/plays tests
event_id = ""
status, body = fetch("/sports/football/leagues/nfl/events/live")
try:
    d = json.loads(body)
    events = d.get("data", [])
    if events:
        event_id = str(events[0].get("id", ""))
        results["live_event_sample"] = events[0]
    else:
        results["note"] = "No live NFL games (off-season) — using NBA live event for boxscore test"
        # Try NBA since it's in playoffs
        status2, body2 = fetch("/sports/basketball/leagues/nba/events/live")
        d2 = json.loads(body2)
        nba_events = d2.get("data", [])
        if nba_events:
            results["nba_live_sample"] = nba_events[0]
            nba_id = str(nba_events[0].get("id", ""))
            PATHS.append((f"/sports/basketball/leagues/nba/events/{nba_id}/boxscore", "NBA boxscore (live)"))
            PATHS.append((f"/sports/basketball/leagues/nba/events/{nba_id}", "NBA event detail"))
except Exception as ex:
    results["parse_error"] = str(ex)

# Add NFL boxscore test if we have an event ID
if event_id:
    PATHS.append((f"/sports/football/leagues/nfl/events/{event_id}/boxscore", "NFL boxscore"))
    PATHS.append((f"/sports/football/leagues/nfl/events/{event_id}", "NFL event detail"))

for path, label in PATHS:
    r = probe(path, label)
    results["endpoints"].append(r)
    epa_note = f" ⚡ EPA:{r['epa_fields']}" if r["epa_count"] > 0 else ""
    print(f"  {'✅' if r['status']==200 else '❌'} {r['status']} {path}{epa_note}")

ok   = [e for e in results["endpoints"] if e["status"] == 200]
epa  = [e for e in results["endpoints"] if e["epa_count"] > 0]
results["summary"] = {
    "http_200": len(ok), "epa_endpoints": len(epa),
    "200_paths": [e["path"] for e in ok],
    "epa_findings": [{"path": e["path"], "fields": e["epa_fields"]} for e in epa],
}

os.makedirs("outbox", exist_ok=True)
out = f"outbox/rts-result-{ts}.json"
with open(out, "w") as f:
    json.dump(results, f, indent=2)
print(f"\n{json.dumps(results['summary'], indent=2)}")
