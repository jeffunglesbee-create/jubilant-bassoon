#!/usr/bin/env python3
"""ESPN NFL play-by-play probe — checks if summary endpoint has EPA-computable fields."""
import json, urllib.request, os
from datetime import datetime, timezone

BASE    = "https://site.api.espn.com/apis/site/v2/sports/football/nfl"
HEADERS = {"Accept": "application/json", "User-Agent": "Mozilla/5.0"}

EPA_FIELDS = ["down","distance","yardLine","yardsToEndzone","clock",
              "period","scoreValue","homeScore","awayScore",
              "yardsGained","type","shortDownDistanceText","downDistanceText"]

def fetch(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:400]}
    except Exception as ex:
        return 0, {"error": str(ex)}

ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
result = {"probeTime": ts, "steps": {}}

# ── Step 1: Get a real 2025 NFL game ID (Week 1 regular season) ───────────────
url = f"{BASE}/scoreboard?dates=2025&seasontype=2&week=1&limit=5"
status, data = fetch(url)
result["steps"]["scoreboard"] = {"status": status, "gameCount": len(data.get("events", []))}

game_id = ""
game_name = ""
events = data.get("events", [])
if events:
    game_id   = events[0]["id"]
    game_name = events[0].get("name", "")
    result["steps"]["scoreboard"]["first_game"] = {"id": game_id, "name": game_name}

print(f"Scoreboard: HTTP {status} | {len(events)} games | using: {game_id} ({game_name})")

# ── Step 2: Fetch full game summary ───────────────────────────────────────────
url2 = f"{BASE}/summary?event={game_id}"
status2, summary = fetch(url2)
result["steps"]["summary_status"] = status2

top_keys = list(summary.keys()) if isinstance(summary, dict) else []
result["steps"]["summary_top_keys"] = top_keys
print(f"Summary: HTTP {status2} | top-level keys: {top_keys}")

# ── Step 3: Dig into plays ────────────────────────────────────────────────────
plays = []

# Try drives → plays
drives = summary.get("drives", {})
if isinstance(drives, dict):
    for drive_key in ["current", "previous"]:
        d = drives.get(drive_key)
        if isinstance(d, dict):
            plays = d.get("plays", [])
            if plays: break
        elif isinstance(d, list):
            for drv in d:
                plays = drv.get("plays", [])
                if plays: break

# Fallback: top-level plays
if not plays:
    plays = summary.get("plays", [])

result["steps"]["play_count"] = len(plays)
print(f"Plays found: {len(plays)}")

if plays:
    sample = plays[0]
    result["steps"]["play_fields"]  = list(sample.keys())
    result["steps"]["play_sample"]  = {k: sample[k] for k in list(sample.keys())[:20]}

    # EPA field check
    flat = json.dumps(sample).lower()
    found = [f for f in EPA_FIELDS if f'"' + f.lower() + '"' in flat]
    result["steps"]["epa_fields_found"]   = found
    result["steps"]["epa_fields_missing"] = [f for f in EPA_FIELDS if f not in found]
    result["steps"]["epa_verdict"]        = "✅ EPA-computable" if len(found) >= 6 else f"⚠️ only {len(found)}/{len(EPA_FIELDS)} fields"
    print(f"EPA fields found ({len(found)}/{len(EPA_FIELDS)}): {found}")
    print(f"Verdict: {result['steps']['epa_verdict']}")
    print(f"\nSample play:\n{json.dumps(sample, indent=2)[:1000]}")
else:
    # Try to understand why — dump summary structure
    result["steps"]["no_plays_debug"] = {k: str(v)[:200] for k, v in summary.items()}
    print("No plays found. Summary structure:")
    for k, v in summary.items():
        print(f"  {k}: {str(v)[:120]}")

os.makedirs("outbox", exist_ok=True)
out = f"outbox/espn-nfl-result-{ts}.json"
with open(out, "w") as f:
    json.dump(result, f, indent=2)
print(f"\nWritten: {out}")
