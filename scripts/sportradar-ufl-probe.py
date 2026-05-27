#!/usr/bin/env python3
"""SportRadar UFL relay debug probe — captures full error body to diagnose 403."""
import json, urllib.request, os, time
from datetime import datetime, timezone

RELAY   = "https://field-relay-nba.jeffunglesbee.workers.dev"
HEADERS = {"Accept":"application/json"}
SR_DIRECT_BASE = "https://api.sportradar.com/ufl/trial/v7/en"
SR_KEY = os.environ.get("SPORTRADAR_UFL_KEY","")

def fetch_relay(path):
    url = RELAY + path
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read().decode()
            return r.status, dict(r.headers), body
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return e.code, dict(e.headers), body
    except Exception as ex:
        return 0, {}, str(ex)

def fetch_direct(path):
    url = f"{SR_DIRECT_BASE}{path}?api_key={SR_KEY}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:300]}
    except Exception as ex:
        return 0, {"error": str(ex)}

ts  = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
out = {"probeTime": ts, "results": {}}

# Test 1: Relay schedule — capture relay error if 403
print("══ Test 1: Schedule via relay ══════════════════════════════")
s1, hdrs1, body1 = fetch_relay("/sportradar-ufl/games/2026/REG/schedule.json")
relay_error = hdrs1.get("X-Relay-Error") or hdrs1.get("x-relay-error") or "(none)"
print(f"  HTTP {s1}")
print(f"  X-Relay-Error: {relay_error}")
print(f"  Body preview: {body1[:200]}")
out["results"]["relay_schedule"] = {"status": s1, "relay_error": relay_error, "body": body1[:300]}

# Test 2: Direct to SR (bypass relay) — confirm key works
print("\n══ Test 2: Schedule direct (no relay, confirm SR key) ══════")
s2, d2 = fetch_direct("/games/2026/REG/schedule.json")
print(f"  HTTP {s2}")
if s2 == 200:
    weeks = d2.get("weeks", [])
    games_closed = sum(1 for w in weeks for g in w.get("games",[]) if g.get("status")=="closed")
    print(f"  Weeks: {len(weeks)} | Closed games: {games_closed}")
    out["results"]["direct_schedule"] = {"status": s2, "weeks": len(weeks), "closed": games_closed}

    # Get a game ID and test PBP direct
    time.sleep(1)
    gid = None
    for w in weeks:
        for g in w.get("games",[]):
            if g.get("status") == "closed":
                gid = g["id"]
                break
        if gid: break

    if gid:
        print(f"\n══ Test 3: PBP direct for {gid} ══════════════════════════")
        s3, pbp = fetch_direct(f"/games/{gid}/pbp.json")
        print(f"  HTTP {s3}")
        if s3 == 200:
            periods = pbp.get("periods", [])
            drives = sum(len(p.get("pbp",[])) for p in periods)
            events = sum(len(e.get("events",[])) for p in periods for e in p.get("pbp",[]))
            print(f"  Periods: {len(periods)} | Drives: {drives} | Events: {events}")
            out["results"]["direct_pbp"] = {"status": s3, "periods": len(periods), "drives": drives, "events": events}
            # Sample scrimmage play
            for p in periods:
                for drive in p.get("pbp",[]):
                    for evt in drive.get("events",[]):
                        if evt.get("play_type") in ("rush","pass"):
                            ss = evt.get("start_situation",{})
                            print(f"\n  Sample play:")
                            print(f"    play_type: {evt.get('play_type')}")
                            print(f"    clock: {evt.get('clock')}")
                            print(f"    home: {evt.get('home_points')} away: {evt.get('away_points')}")
                            print(f"    down: {ss.get('down')} yfd: {ss.get('yfd')} yardline: {ss.get('location',{}).get('yardline')}")
                            print(f"    description: {evt.get('description','')[:100]}")
                            out["results"]["direct_pbp"]["sample"] = evt
                            break
                    else: continue
                    break
                else: continue
                break
else:
    out["results"]["direct_schedule"] = {"status": s2, "error": str(d2)[:200]}

# Test 4: Relay PBP — try with known game ID to confirm path matching
if s2 == 200 and out["results"].get("direct_schedule",{}).get("closed",0) > 0:
    time.sleep(1)
    gid2 = gid
    print(f"\n══ Test 4: PBP via relay for {gid2} ══════════════════════")
    s4, hdrs4, body4 = fetch_relay(f"/sportradar-ufl/games/{gid2}/pbp.json")
    relay_err4 = hdrs4.get("X-Relay-Error") or hdrs4.get("x-relay-error") or "(none)"
    print(f"  HTTP {s4}")
    print(f"  X-Relay-Error: {relay_err4}")
    print(f"  Body preview: {body4[:300]}")
    out["results"]["relay_pbp"] = {"status": s4, "relay_error": relay_err4, "body": body4[:300]}

os.makedirs("outbox", exist_ok=True)
fn = f"outbox/sportradar-ufl-result-{ts}.json"
with open(fn,"w") as f: json.dump(out, f, indent=2)
print(f"\nWritten: {fn}")
