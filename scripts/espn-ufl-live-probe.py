#!/usr/bin/env python3
"""ESPN UFL LIVE game probe — runs during an active game to capture live play data."""
import json, urllib.request, os, time
from datetime import datetime, timezone

BASE    = "https://site.api.espn.com/apis/site/v2/sports/football/ufl"
CORE    = "https://sports.core.api.espn.com/v2/sports/football/leagues/ufl"
HEADERS = {"Accept":"application/json","User-Agent":"Mozilla/5.0"}
EPA_FIELDS = ["down","distance","yardLine","yardsToEndzone","clock",
              "period","homeScore","awayScore","statYardage","type",
              "text","isPenalty","isTurnover","scoringPlay","start","end"]

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
out = {"probeTime": ts, "attempts": []}

# Find any live or in-progress game
status, sb = fetch(f"{BASE}/scoreboard")
events = sb.get("events", []) if isinstance(sb, dict) else []

print(f"Scoreboard: HTTP {status} | {len(events)} events")
live_game_id = ""
all_game_ids = []

for e in events:
    comp  = e.get("competitions",[{}])[0]
    state = comp.get("status",{}).get("type",{}).get("state","")
    name  = e.get("name","")
    gid   = e.get("id","")
    all_game_ids.append(gid)
    print(f"  {gid} | {name} | state:{state}")
    if state == "in" and not live_game_id:
        live_game_id = gid

out["scoreboard_status"] = status
out["live_game_id"] = live_game_id
out["all_game_ids"]  = all_game_ids

if not live_game_id:
    print("\nNo live games at probe time — testing summary structure only")
    if all_game_ids:
        live_game_id = all_game_ids[0]  # test with whatever is available
    else:
        print("No games found at all")
        with open(f"outbox/espn-ufl-live-{ts}.json","w") as f:
            json.dump(out, f, indent=2)
        exit(0)

print(f"\nProbing game: {live_game_id}")

# Multiple attempts to capture live data
for attempt in range(3):
    if attempt > 0:
        print(f"\nAttempt {attempt+1} — waiting 10s...")
        time.sleep(10)

    s, summary = fetch(f"{BASE}/summary?event={live_game_id}")
    top_keys = list(summary.keys()) if isinstance(summary, dict) else []
    has_drives = "drives" in top_keys
    win_prob = summary.get("winprobability", [])

    drives = summary.get("drives", {})
    plays = []
    if isinstance(drives, dict):
        curr = drives.get("current")
        if isinstance(curr, dict):
            plays += curr.get("plays", [])
        prev = drives.get("previous", [])
        for drv in (prev if isinstance(prev, list) else []):
            plays += drv.get("plays", [])

    # Also try core API
    s_core, core_plays = fetch(f"{CORE}/events/{live_game_id}/competitions/{live_game_id}/plays?limit=5")
    core_items = core_plays.get("items", []) if isinstance(core_plays, dict) else []

    attempt_data = {
        "attempt": attempt + 1,
        "summary_status": s,
        "top_keys": top_keys,
        "has_drives": has_drives,
        "summary_play_count": len(plays),
        "win_prob_entries": len(win_prob),
        "core_plays_status": s_core,
        "core_play_count": len(core_items),
    }

    if plays:
        sample = plays[-1]
        flat  = json.dumps(sample).lower()
        found = [f for f in EPA_FIELDS if f'"'+f.lower()+'"' in flat]
        attempt_data["epa_found"]    = found
        attempt_data["epa_count"]    = len(found)
        attempt_data["play_sample"]  = sample
        attempt_data["play_fields"]  = list(sample.keys())
        verdict = "✅ EPA-computable" if len(found) >= 7 else f"⚠️ {len(found)}/{len(EPA_FIELDS)}"
        attempt_data["epa_verdict"]  = verdict
        print(f"  ✅ {len(plays)} plays | EPA: {found} | verdict: {verdict}")
        print(f"  Sample: {json.dumps(sample)[:400]}")
        out["attempts"].append(attempt_data)
        break  # got what we need

    elif core_items:
        attempt_data["core_sample"] = core_items[0]
        print(f"  Core API: {len(core_items)} plays (summary drives empty)")
        print(f"  Core sample: {json.dumps(core_items[0])[:400]}")
    else:
        game_state = summary.get("header",{}).get("competitions",[{}])[0].get("status",{}).get("type",{}).get("description","") if isinstance(summary, dict) else ""
        print(f"  No plays yet | drives:{has_drives} | game_state:{game_state} | wp_entries:{len(win_prob)}")

    out["attempts"].append(attempt_data)

os.makedirs("outbox", exist_ok=True)
fn = f"outbox/espn-ufl-live-{ts}.json"
with open(fn, "w") as f:
    json.dump(out, f, indent=2)
print(f"\nWritten: {fn}")
