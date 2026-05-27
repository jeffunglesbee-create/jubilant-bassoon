#!/usr/bin/env python3
"""SportRadar UFL via relay — confirm route is live and returning data."""
import json, urllib.request, os, time
from datetime import datetime, timezone

RELAY   = "https://field-relay-nba.jeffunglesbee.workers.dev"
HEADERS = {"Accept": "application/json"}

def fetch(path):
    try:
        req = urllib.request.Request(RELAY + path, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:300]}
    except Exception as ex:
        return 0, {"error": str(ex)}

ts  = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
out = {"probeTime": ts, "via": "relay", "endpoints": {}}

TESTS = [
    ("/sportradar-ufl/games/2026/REG/schedule.json", "UFL 2026 schedule"),
]

for path, label in TESTS:
    s, d = fetch(path)
    weeks = d.get("weeks", [])
    games = []
    for w in weeks:
        for g in w.get("games", []):
            if g.get("status") == "closed":
                games.append({"id": g["id"], "name": f"{g.get('away',{}).get('alias','')} @ {g.get('home',{}).get('alias','')}", "week": w.get("sequence")})
    print(f"{'✅' if s==200 else '❌'} {s} {label} | {len(weeks)} weeks | {len(games)} completed games")
    out["endpoints"][label] = {"status": s, "completed_game_count": len(games), "first_game_id": games[0]["id"] if games else None}
    if games:
        print(f"   First completed: {games[0]}")
    gid = games[0]["id"] if games else None

# PBP via relay
if gid:
    time.sleep(1)  # SR rate limit: 1 req/sec
    path2 = f"/sportradar-ufl/games/{gid}/pbp.json"
    s2, d2 = fetch(path2)
    periods = d2.get("periods", [])
    play_count = sum(len(p.get("pbp", [])) for p in periods)
    # Count actual play events inside drives
    event_count = 0
    for p in periods:
        for drive in p.get("pbp", []):
            event_count += len(drive.get("events", []))
    print(f"{'✅' if s2==200 else '❌'} {s2} PBP for {gid} | {len(periods)} periods | {play_count} drives | {event_count} play events")
    out["endpoints"]["pbp"] = {"status": s2, "periods": len(periods), "drives": play_count, "events": event_count}
    if s2 == 200 and event_count > 0:
        # Grab a scrimmage play sample
        for p in periods:
            for drive in p.get("pbp", []):
                for evt in drive.get("events", []):
                    if evt.get("play_type") in ("rush", "pass", "sack"):
                        print(f"\n   Sample scrimmage play:")
                        print(json.dumps(evt, indent=2)[:800])
                        out["endpoints"]["pbp"]["sample_play"] = evt
                        break
                else: continue
                break
            else: continue
            break

os.makedirs("outbox", exist_ok=True)
fn = f"outbox/sportradar-ufl-result-{ts}.json"
with open(fn, "w") as f: json.dump(out, f, indent=2)
print(f"\nWritten: {fn}")
