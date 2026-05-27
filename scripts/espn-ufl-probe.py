#!/usr/bin/env python3
"""ESPN UFL play-by-play probe — same structure test as NFL probe."""
import json, urllib.request, os
from datetime import datetime, timezone

BASE    = "https://site.api.espn.com/apis/site/v2/sports/football/ufl"
HEADERS = {"Accept": "application/json", "User-Agent": "Mozilla/5.0"}
EPA_FIELDS = ["down","distance","yardLine","yardsToEndzone","clock",
              "period","scoreValue","homeScore","awayScore",
              "yardsGained","type","shortDownDistanceText","downDistanceText",
              "statYardage","isPenalty","isTurnover","scoringPlay",
              "start","end","sequenceNumber","text"]

def fetch(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:400]}
    except Exception as ex:
        return 0, {"error": str(ex)}

ts  = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
out = {"probeTime": ts, "steps": {}}

# Step 1: UFL scoreboard — get game IDs
print("── Step 1: UFL scoreboard ──────────────────────────────")
status, data = fetch(f"{BASE}/scoreboard")
out["steps"]["scoreboard_status"] = status
events = data.get("events", [])
out["steps"]["game_count"] = len(events)
print(f"HTTP {status} | {len(events)} games")

for e in events[:5]:
    comp = e.get("competitions",[{}])[0]
    state = comp.get("status",{}).get("type",{}).get("state","")
    name  = e.get("name","")
    gid   = e.get("id","")
    print(f"  {gid} | {name} | {state}")
out["steps"]["events"] = [{"id":e["id"],"name":e.get("name",""),
    "state":e.get("competitions",[{}])[0].get("status",{}).get("type",{}).get("state","")} for e in events[:5]]

# Step 2: Try to get a completed game summary with plays
game_id = ""
# Prefer completed or in-progress over scheduled
for e in events:
    comp  = e.get("competitions",[{}])[0]
    state = comp.get("status",{}).get("type",{}).get("state","")
    if state in ("post","in"):
        game_id = e["id"]
        break
if not game_id and events:
    game_id = events[0]["id"]

print(f"\n── Step 2: UFL summary for game {game_id} ──────────────")
status2, summary = fetch(f"{BASE}/summary?event={game_id}")
out["steps"]["summary_status"] = status2
out["steps"]["summary_game_id"] = game_id
top_keys = list(summary.keys()) if isinstance(summary, dict) else []
out["steps"]["summary_top_keys"] = top_keys
print(f"HTTP {status2} | top keys: {top_keys}")

# Step 3: Extract plays
plays = []
drives = summary.get("drives", {})
if isinstance(drives, dict):
    for key in ["current", "previous"]:
        d = drives.get(key)
        if isinstance(d, dict):
            plays = d.get("plays", [])
            if plays: break
        elif isinstance(d, list):
            for drv in d:
                plays += drv.get("plays", [])
            if plays: break
if not plays:
    plays = summary.get("plays", [])

out["steps"]["play_count"] = len(plays)
print(f"\n── Step 3: Plays found: {len(plays)} ────────────────────")

if plays:
    sample = plays[0]
    out["steps"]["play_fields"]  = list(sample.keys())
    out["steps"]["play_sample"]  = {k: sample[k] for k in list(sample.keys())[:25]}
    flat = json.dumps(sample).lower()
    found   = [f for f in EPA_FIELDS if f'"'+f.lower()+'"' in flat]
    missing = [f for f in EPA_FIELDS if f not in found]
    out["steps"]["epa_found"]   = found
    out["steps"]["epa_missing"] = missing
    verdict = "✅ EPA-computable" if len(found) >= 7 else f"⚠️ only {len(found)} fields"
    out["steps"]["epa_verdict"] = f"{verdict} ({len(found)}/{len(EPA_FIELDS)})"
    print(f"Fields: {list(sample.keys())}")
    print(f"EPA found ({len(found)}/{len(EPA_FIELDS)}): {found}")
    print(f"Missing: {missing}")
    print(f"Verdict: {out['steps']['epa_verdict']}")
    print(f"\nSample play:\n{json.dumps(sample, indent=2)[:800]}")
else:
    out["steps"]["no_plays_debug"] = {k: str(v)[:150] for k,v in summary.items()}
    print("No plays. Drives structure:")
    print(json.dumps({k: str(v)[:100] for k,v in drives.items() if isinstance(drives,dict)}, indent=2)[:500])
    print("Top-level summary keys:", top_keys)

# Step 4: Also test full drives structure to find all plays
if isinstance(drives, dict) and "previous" in drives:
    prev = drives["previous"]
    if isinstance(prev, list) and len(prev) > 0:
        all_plays = []
        for drv in prev:
            all_plays += drv.get("plays", [])
        out["steps"]["total_plays_all_drives"] = len(all_plays)
        print(f"\n── Step 4: Total plays across all previous drives: {len(all_plays)}")
        if all_plays and not plays:
            sample2 = all_plays[0]
            flat2 = json.dumps(sample2).lower()
            found2 = [f for f in EPA_FIELDS if f'"'+f.lower()+'"' in flat2]
            out["steps"]["epa_found_drives"] = found2
            print(f"EPA fields from drives: {found2}")

os.makedirs("outbox", exist_ok=True)
fn = f"outbox/espn-ufl-result-{ts}.json"
with open(fn, "w") as f:
    json.dump(out, f, indent=2)
print(f"\nWritten: {fn}")
