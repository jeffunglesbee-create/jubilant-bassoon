#!/usr/bin/env python3
"""RealtimeSports API probe — tests relay endpoints, checks EPA fields."""
import json, urllib.request, sys, os
from datetime import datetime, timezone

RELAY = "https://field-relay-nba.jeffunglesbee.workers.dev"
EPA_FIELDS = ["down","distance","yardLine","yard_line","yardline","clock",
              "quarter","yardsGained","yards_gained","playType","play_type",
              "homeScore","awayScore","score"]

def fetch(path):
    url = RELAY + path
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode()
            return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:500]
    except Exception as ex:
        return 0, str(ex)

def epa_check(body):
    low = body.lower()
    return [f for f in EPA_FIELDS if f'"' + f.lower() + '"' in low]

def probe_endpoint(path, label):
    status, body = fetch(path)
    try:
        data = json.loads(body)
        preview = json.dumps(data)[:600]
    except Exception:
        data = None
        preview = body[:600]
    epa = epa_check(body)
    return {"label": label, "path": path, "status": status,
            "epa_fields": epa, "epa_count": len(epa), "preview": preview}

ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
results = {"probeTime": ts, "relay": RELAY, "endpoints": []}

# NFL schedule
results["endpoints"].append(probe_endpoint(
    "/realtimesports/schedule?league=nfl&days=30", "NFL schedule (30 days)"))
results["endpoints"].append(probe_endpoint(
    "/realtimesports/schedule?league=nfl&season=2025&week=1", "NFL schedule W1 2025"))

# Get NBA event ID for PBP tests
status, body = fetch("/realtimesports/schedule?league=nba&days=7")
event_id = ""
try:
    d = json.loads(body)
    games = (d.get("data",{}).get("nba",{}).get("live",[]) or
             d.get("data",{}).get("nba",{}).get("upcoming",[]))
    if games:
        event_id = games[0].get("eventId", games[0].get("id", ""))
        results["nba_event_id"] = event_id
        results["nba_game_sample"] = games[0]
except Exception as ex:
    results["nba_schedule_error"] = str(ex)

# PBP path discovery (using NBA event ID)
for path in [
    f"/realtimesports/pbp?league=nba&eventId={event_id}",
    f"/realtimesports/play-by-play?league=nba&eventId={event_id}",
    f"/realtimesports/game?league=nba&eventId={event_id}",
    f"/realtimesports/pbp?eventId={event_id}",
    f"/realtimesports/game?id={event_id}",
    f"/realtimesports/events?league=nba&eventId={event_id}",
]:
    results["endpoints"].append(probe_endpoint(path, f"PBP discovery: {path.split('/')[-1].split('?')[0]}"))

# NFL-specific paths
for path in [
    "/realtimesports/teams?league=nfl",
    "/realtimesports/statistics?league=nfl&season=2025&week=1",
]:
    results["endpoints"].append(probe_endpoint(path, path))

# Summary
ok = [e for e in results["endpoints"] if e["status"] == 200]
epa_hits = [e for e in results["endpoints"] if e["epa_count"] > 0]
results["summary"] = {
    "total": len(results["endpoints"]),
    "http_200": len(ok),
    "endpoints_with_epa_fields": len(epa_hits),
    "200_paths": [e["path"] for e in ok],
    "epa_findings": [{
        "path": e["path"],
        "fields_found": e["epa_fields"],
        "count": e["epa_count"]
    } for e in epa_hits],
}

out_path = f"outbox/rts-result-{ts}.json"
os.makedirs("outbox", exist_ok=True)
with open(out_path, "w") as f:
    json.dump(results, f, indent=2)

print(f"Written: {out_path}")
print(json.dumps(results["summary"], indent=2))
