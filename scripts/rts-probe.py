#!/usr/bin/env python3
"""RealtimeSports direct API probe — calls realtimesportsapi.com directly from CI."""
import json, urllib.request, sys, os
from datetime import datetime, timezone

API_BASE = "https://www.realtimesportsapi.com/api"
TOKEN = os.environ.get("REALTIMESPORTS_KEY", "")
EPA_FIELDS = ["down","distance","yardLine","yard_line","yardline","clock",
              "quarter","yardsGained","yards_gained","playType","play_type",
              "homeScore","awayScore","score","description","type"]

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
        return e.code, e.read().decode()[:800]
    except Exception as ex:
        return 0, str(ex)

def epa_check(body):
    low = body.lower()
    return [f for f in EPA_FIELDS if f'"{f.lower()}"' in low]

def probe(path, label):
    status, body = fetch(path)
    try:
        data = json.loads(body)
        preview = json.dumps(data)[:800]
    except Exception:
        data = None; preview = body[:800]
    epa = epa_check(body)
    return {"label": label, "path": path, "status": status,
            "epa_fields": epa, "epa_count": len(epa), "preview": preview}

ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
results = {"probeTime": ts, "api_base": API_BASE, "endpoints": []}

# ── NFL schedule ────────────────────────────────────────────────────────────
results["endpoints"].append(probe("/schedule?league=nfl&days=30", "NFL schedule 30d"))
results["endpoints"].append(probe("/schedule?league=nfl&season=2025&week=1", "NFL W1 2025"))

# ── NBA: get live eventId ────────────────────────────────────────────────────
nba_status, nba_body = fetch("/schedule?league=nba&days=7")
event_id = ""
try:
    d = json.loads(nba_body)
    games = (d.get("data",{}).get("nba",{}).get("live",[]) or
             d.get("data",{}).get("nba",{}).get("upcoming",[]))
    if games:
        event_id = str(games[0].get("eventId", games[0].get("id", "")))
        results["nba_event_id"] = event_id
        results["nba_game_sample"] = games[0]
except Exception as ex:
    results["nba_error"] = str(ex)

print(f"NBA event_id: {event_id}")

# ── PBP path discovery ────────────────────────────────────────────────────────
pbp_paths = [
    f"/pbp?league=nba&eventId={event_id}",
    f"/play-by-play?league=nba&eventId={event_id}",
    f"/game?league=nba&eventId={event_id}",
    f"/game?id={event_id}",
    f"/pbp?eventId={event_id}",
    f"/events?league=nba&eventId={event_id}",
    f"/plays?league=nba&eventId={event_id}",
    f"/plays?league=nba&season=2025",
    f"/teams?league=nfl",
    f"/teams?league=nba",
]
for p in pbp_paths:
    r = probe(p, p)
    results["endpoints"].append(r)
    print(f"  {r['status']} | epa:{r['epa_count']} | {p}")

# ── Summary ───────────────────────────────────────────────────────────────────
ok = [e for e in results["endpoints"] if e["status"] == 200]
epa_hits = [e for e in results["endpoints"] if e["epa_count"] > 0]
results["summary"] = {
    "total": len(results["endpoints"]),
    "http_200": len(ok),
    "epa_endpoints": len(epa_hits),
    "200_paths": [e["path"] for e in ok],
    "epa_findings": [{"path": e["path"], "fields": e["epa_fields"]} for e in epa_hits],
}

os.makedirs("outbox", exist_ok=True)
out = f"outbox/rts-result-{ts}.json"
with open(out, "w") as f:
    json.dump(results, f, indent=2)
print(f"\nWritten: {out}")
print(json.dumps(results["summary"], indent=2))
