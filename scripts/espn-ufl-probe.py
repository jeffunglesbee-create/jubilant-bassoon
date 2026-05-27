#!/usr/bin/env python3
"""ESPN UFL probe v3 — tries CDN + core API + live game detection."""
import json, urllib.request, os
from datetime import datetime, timezone

HEADERS = {"Accept":"application/json","User-Agent":"Mozilla/5.0"}
EPA_FIELDS = ["down","distance","yardLine","yardsToEndzone","clock",
              "period","homeScore","awayScore","statYardage","type",
              "text","isPenalty","isTurnover","scoringPlay","start","end"]

def fetch(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:500]
    except Exception as ex:
        return 0, str(ex)

def json_fetch(url):
    s, b = fetch(url)
    try: return s, json.loads(b)
    except: return s, {"raw": b[:400]}

ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
out = {"probeTime": ts, "results": {}}

# Known completed game IDs from previous probe
COMPLETED = ["401857557","401857558","401857559"]
gid = COMPLETED[0]  # Birmingham at Columbus

print(f"Using completed game: {gid}")

# Test 1: CDN gamepackage (has full PBP for many ESPN leagues)
url1 = f"https://cdn.espn.com/core/ufl/game?gameId={gid}&xhr=1"
s1, b1 = fetch(url1)
out["results"]["cdn_game"] = {"status": s1, "preview": b1[:500] if isinstance(b1,str) else str(b1)[:500]}
print(f"\n1. CDN game: HTTP {s1}")
if s1 == 200:
    try:
        d1 = json.loads(b1)
        keys = list(d1.keys()) if isinstance(d1, dict) else []
        print(f"   Keys: {keys}")
        out["results"]["cdn_game"]["keys"] = keys
        # Look for plays/drives
        gp = d1.get("gamepackageJSON", d1)
        drives = gp.get("drives", {})
        plays = []
        if isinstance(drives, dict):
            prev = drives.get("previous",[])
            for drv in (prev if isinstance(prev,list) else []):
                plays += drv.get("plays",[])
        print(f"   Plays found: {len(plays)}")
        out["results"]["cdn_game"]["play_count"] = len(plays)
        if plays:
            out["results"]["cdn_game"]["sample_play"] = plays[0]
            flat = json.dumps(plays[0]).lower()
            found = [f for f in EPA_FIELDS if f'"'+f.lower()+'"' in flat]
            out["results"]["cdn_game"]["epa_found"] = found
            print(f"   EPA fields: {found}")
    except Exception as ex:
        print(f"   Parse error: {ex}")

# Test 2: sports.core API plays endpoint
url2 = f"https://sports.core.api.espn.com/v2/sports/football/leagues/ufl/events/{gid}/competitions/{gid}/plays?limit=5"
s2, d2 = json_fetch(url2)
out["results"]["core_plays"] = {"status": s2, "preview": json.dumps(d2)[:500]}
print(f"\n2. Core API plays: HTTP {s2}")
if s2 == 200:
    items = d2.get("items", [])
    print(f"   Items: {len(items)}")
    out["results"]["core_plays"]["count"] = len(items)
    if items:
        print(f"   Sample: {json.dumps(items[0])[:300]}")

# Test 3: sports.core drives endpoint
url3 = f"https://sports.core.api.espn.com/v2/sports/football/leagues/ufl/events/{gid}/competitions/{gid}/drives?limit=5"
s3, d3 = json_fetch(url3)
out["results"]["core_drives"] = {"status": s3, "preview": json.dumps(d3)[:500]}
print(f"\n3. Core API drives: HTTP {s3}")

# Test 4: site.web.api ESPN gamepackage
url4 = f"https://site.web.api.espn.com/apis/site/v2/sports/football/ufl/summary?event={gid}&lang=en&region=us"
s4, d4 = json_fetch(url4)
drives4 = d4.get("drives", {}) if isinstance(d4, dict) else {}
out["results"]["summary_lang"] = {"status": s4, "has_drives": bool(drives4), "keys": list(d4.keys()) if isinstance(d4,dict) else []}
print(f"\n4. Summary (lang=en): HTTP {s4} | has drives: {bool(drives4)}")

# Test 5: This week's live games schedule (confirm upcoming game IDs)
url5 = "https://site.api.espn.com/apis/site/v2/sports/football/ufl/scoreboard?dates=20260527-20260531"
s5, d5 = json_fetch(url5)
upcoming = d5.get("events", []) if isinstance(d5, dict) else []
out["results"]["upcoming_games"] = [{"id":e["id"],"name":e.get("name",""),"date":e.get("competitions",[{}])[0].get("date","")} for e in upcoming]
print(f"\n5. Upcoming this week: {len(upcoming)} games")
for e in upcoming:
    comp = e.get("competitions",[{}])[0]
    print(f"   {e['id']} | {e.get('name','')} | {comp.get('date','')}")

os.makedirs("outbox", exist_ok=True)
fn = f"outbox/espn-ufl-result-{ts}.json"
with open(fn,"w") as f: json.dump(out, f, indent=2)
print(f"\nWritten: {fn}")
