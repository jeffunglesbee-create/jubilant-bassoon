#!/usr/bin/env python3
"""ESPN UFL PBP probe — finds completed games, checks EPA field depth."""
import json, urllib.request, os
from datetime import datetime, timezone

BASE    = "https://site.api.espn.com/apis/site/v2/sports/football/ufl"
HEADERS = {"Accept": "application/json", "User-Agent": "Mozilla/5.0"}
EPA_FIELDS = ["down","distance","yardLine","yardsToEndzone","clock",
              "period","homeScore","awayScore","yardsGained","statYardage",
              "type","shortDownDistanceText","downDistanceText",
              "isPenalty","isTurnover","scoringPlay","start","end","text"]

def fetch(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:300]}
    except Exception as ex:
        return 0, {"error": str(ex)}

ts  = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
out = {"probeTime": ts, "games_checked": [], "steps": {}}

# Search across recent weeks for completed games
# Try specific date ranges (Week 9 was ~May 23-25)
game_id = ""
for dates in ["20260523-20260526", "20260516-20260522", "20260509-20260515", "20260501-20260508"]:
    s, d = fetch(f"{BASE}/scoreboard?dates={dates}")
    events = d.get("events", [])
    print(f"dates={dates}: HTTP {s} | {len(events)} events")
    for e in events:
        comp  = e.get("competitions",[{}])[0]
        state = comp.get("status",{}).get("type",{}).get("state","")
        name  = e.get("name","")
        gid   = e.get("id","")
        out["games_checked"].append({"id":gid,"name":name,"state":state,"dates":dates})
        print(f"  {gid} | {name} | {state}")
        if state == "post" and not game_id:
            game_id = gid

    if game_id:
        break

print(f"\nUsing game: {game_id}")
out["steps"]["selected_game"] = game_id

if not game_id:
    print("No completed game found — trying first available")
    s, d = fetch(f"{BASE}/scoreboard")
    events = d.get("events",[])
    if events: game_id = events[0]["id"]

# Fetch summary
s2, summary = fetch(f"{BASE}/summary?event={game_id}")
out["steps"]["summary_status"] = s2
top_keys = list(summary.keys()) if isinstance(summary, dict) else []
out["steps"]["summary_top_keys"] = top_keys
print(f"\nSummary HTTP {s2} | keys: {top_keys}")

# Extract plays from drives
plays = []
drives = summary.get("drives", {})
if isinstance(drives, dict):
    print(f"Drives keys: {list(drives.keys())}")
    # Try current drive first
    for key in ["current"]:
        d2 = drives.get(key)
        if isinstance(d2, dict):
            plays = d2.get("plays", [])
    # Then all previous drives
    prev = drives.get("previous", [])
    if isinstance(prev, list):
        all_prev_plays = []
        for drv in prev:
            all_prev_plays += drv.get("plays", [])
        out["steps"]["prev_drive_count"] = len(prev)
        out["steps"]["prev_play_count"]  = len(all_prev_plays)
        if all_prev_plays and not plays:
            plays = all_prev_plays
        print(f"Previous drives: {len(prev)} | plays: {len(all_prev_plays)}")

out["steps"]["play_count"] = len(plays)
print(f"Total plays for analysis: {len(plays)}")

if plays:
    sample = plays[-1]  # use last play (more likely to have full data)
    out["steps"]["play_fields"] = list(sample.keys())
    out["steps"]["play_sample"] = sample

    flat  = json.dumps(sample).lower()
    found   = [f for f in EPA_FIELDS if f'"'+f.lower()+'"' in flat]
    missing = [f for f in EPA_FIELDS if f not in found]
    out["steps"]["epa_found"]   = found
    out["steps"]["epa_missing"] = missing
    verdict = "✅ EPA-computable" if len(found) >= 7 else f"⚠️ {len(found)} fields"
    out["steps"]["epa_verdict"] = f"{verdict} ({len(found)}/{len(EPA_FIELDS)})"

    print(f"\nPlay fields: {list(sample.keys())}")
    print(f"EPA found ({len(found)}/{len(EPA_FIELDS)}): {found}")
    print(f"Missing: {missing}")
    print(f"Verdict: {out['steps']['epa_verdict']}")
    print(f"\nSample play:\n{json.dumps(sample, indent=2)[:1000]}")
else:
    out["steps"]["drives_debug"] = str(drives)[:500]
    print("No plays extracted. Drives debug:", str(drives)[:300])

os.makedirs("outbox", exist_ok=True)
fn = f"outbox/espn-ufl-result-{ts}.json"
with open(fn, "w") as f: json.dump(out, f, indent=2)
print(f"\nWritten: {fn}")
