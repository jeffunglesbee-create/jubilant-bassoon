#!/usr/bin/env python3
"""SportRadar UFL API probe — official data partner, full play-by-play schema analysis."""
import json, urllib.request, os
from datetime import datetime, timezone

BASE    = "https://api.sportradar.com/ufl/trial/v7/en"
API_KEY = os.environ.get("SPORTRADAR_UFL_KEY","")
HEADERS = {"Accept":"application/json"}

# EPA fields for American football — SR naming convention
EPA_FIELDS_SR = ["down","yfd","yardline","home_points","away_points","clock",
                 "play_type","start_situation","end_situation","possession",
                 "location","fake_punt","play_action","rush","pass"]

def fetch(path):
    url = f"{BASE}{path}{'&' if '?' in path else '?'}api_key={API_KEY}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:400], "url": url}
    except Exception as ex:
        return 0, {"error": str(ex), "url": url}

ts  = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
out = {"probeTime": ts, "base": BASE, "endpoints": {}}

print("══ SportRadar UFL API Probe ══════════════════════════════")

# ── 1. 2026 Season Schedule ──────────────────────────────────────────────────
print("\n1. 2026 Regular Season Schedule...")
s, sched = fetch("/games/2026/REG/schedule.json")
out["endpoints"]["schedule_2026"] = {"status": s}
print(f"   HTTP {s}")

if s == 200:
    weeks = sched.get("weeks", [])
    games = []
    for w in weeks:
        for g in w.get("games", []):
            games.append({
                "id": g.get("id"),
                "name": f"{g.get('away',{}).get('alias','')} @ {g.get('home',{}).get('alias','')}",
                "week": w.get("sequence"),
                "status": g.get("status",""),
                "scheduled": g.get("scheduled","")
            })
    out["endpoints"]["schedule_2026"]["game_count"] = len(games)
    out["endpoints"]["schedule_2026"]["games_sample"] = games[:5]
    print(f"   Total games: {len(games)}")
    for g in games[:5]:
        print(f"   W{g['week']} | {g['id']} | {g['name']} | {g['status']}")

    # Find a completed game
    completed = [g for g in games if g["status"] == "closed"]
    scheduled = [g for g in games if g["status"] == "scheduled"]
    print(f"   Completed: {len(completed)} | Scheduled: {len(scheduled)}")
    out["endpoints"]["schedule_2026"]["completed_count"] = len(completed)
else:
    completed = []
    print(f"   Error: {sched}")

# ── 2. Game Play-by-Play (completed game) ────────────────────────────────────
game_id = completed[0]["id"] if completed else None
print(f"\n2. Game Play-by-Play for {game_id}...")
out["endpoints"]["pbp"] = {"game_id": game_id}

if game_id:
    s2, pbp = fetch(f"/games/{game_id}/pbp.json")
    out["endpoints"]["pbp"]["status"] = s2
    print(f"   HTTP {s2}")

    if s2 == 200:
        periods = pbp.get("periods",[])
        all_plays = []
        for period in periods:
            for pbp_play in period.get("pbp",[]):
                all_plays.append(pbp_play)

        out["endpoints"]["pbp"]["period_count"] = len(periods)
        out["endpoints"]["pbp"]["play_count"]   = len(all_plays)
        print(f"   Periods: {len(periods)} | Plays: {len(all_plays)}")

        if all_plays:
            # Find a scrimmage play (rush or pass) for best EPA field coverage
            scrimmage = [p for p in all_plays if p.get("play_type") in ("rush","pass","sack","scramble")]
            sample = scrimmage[0] if scrimmage else all_plays[0]
            out["endpoints"]["pbp"]["sample_play"] = sample
            out["endpoints"]["pbp"]["play_fields"] = list(sample.keys())

            flat = json.dumps(sample).lower()
            found   = [f for f in EPA_FIELDS_SR if f in flat]
            missing = [f for f in EPA_FIELDS_SR if f not in found]
            out["endpoints"]["pbp"]["epa_fields_found"]   = found
            out["endpoints"]["pbp"]["epa_fields_missing"] = missing
            verdict = "✅ FULL EPA-computable" if len(found) >= 8 else f"⚠️ {len(found)}/{len(EPA_FIELDS_SR)}"
            out["endpoints"]["pbp"]["epa_verdict"] = verdict

            print(f"\n   Top-level play fields: {list(sample.keys())}")
            print(f"   EPA fields found ({len(found)}/{len(EPA_FIELDS_SR)}): {found}")
            print(f"   Missing: {missing}")
            print(f"   Verdict: {verdict}")
            print(f"\n   Sample play:\n{json.dumps(sample, indent=2)[:1200]}")
    else:
        print(f"   Error: {pbp}")

# ── 3. Game Summary (for boxscore + stats) ───────────────────────────────────
print(f"\n3. Game Summary for {game_id}...")
if game_id:
    s3, summary = fetch(f"/games/{game_id}/summary.json")
    out["endpoints"]["summary"] = {"status": s3, "top_keys": list(summary.keys()) if isinstance(summary,dict) else []}
    print(f"   HTTP {s3} | keys: {out['endpoints']['summary']['top_keys']}")

# ── 4. Team statistics (season level) ───────────────────────────────────────
print("\n4. Team seasonal stats...")
s4, tstats = fetch("/seasons/2026/REG/teams/statistics.json")
out["endpoints"]["team_stats"] = {"status": s4}
print(f"   HTTP {s4}")
if s4 == 200:
    teams = tstats.get("teams", [])
    out["endpoints"]["team_stats"]["team_count"] = len(teams)
    if teams:
        stat_keys = list(teams[0].get("statistics",{}).keys())
        out["endpoints"]["team_stats"]["stat_categories"] = stat_keys
        print(f"   Teams: {len(teams)} | Stat categories: {stat_keys}")

# ── 5. Weekly schedule (current week) ───────────────────────────────────────
print("\n5. Current week schedule...")
s5, week = fetch("/seasons/2026/REG/weeks/current/schedule.json")
out["endpoints"]["current_week"] = {"status": s5}
print(f"   HTTP {s5}")
if s5 == 200:
    week_games = week.get("games", [])
    out["endpoints"]["current_week"]["games"] = [
        {"id":g.get("id"),"name":f"{g.get('away',{}).get('alias','')} @ {g.get('home',{}).get('alias','')}","status":g.get("status"),"scheduled":g.get("scheduled")}
        for g in week_games]
    print(f"   Games this week: {len(week_games)}")
    for g in week_games:
        print(f"   {g.get('id')} | {g.get('away',{}).get('alias','')} @ {g.get('home',{}).get('alias','')} | {g.get('status')} | {g.get('scheduled','')[:16]}")

os.makedirs("outbox", exist_ok=True)
fn = f"outbox/sportradar-ufl-result-{ts}.json"
with open(fn,"w") as f: json.dump(out, f, indent=2)
print(f"\n══ Written: {fn}")
print(json.dumps({k: v.get("status") for k,v in out["endpoints"].items()}, indent=2))
