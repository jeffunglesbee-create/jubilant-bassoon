#!/usr/bin/env python3
"""BDB tracking → derived metrics (P3, no-Kaggle-competition path).

Source: public Kaggle dataset alexandermeau/nfl-big-data-bowl-archived-data-2025
(files under big-data-bowl-data/). Auth: HTTP Basic (KAGGLE_USERNAME/KAGGLE_KEY).
Tracking schema verified 2026-08-15 via kaggle-probe:
  gameId,playId,nflId,displayName,frameId,frameType,time,jerseyNumber,club,
  playDirection,x,y,s,a,dis,o,dir,event   (s = yards/sec)

First metric: player MAX SPEED (mph) — commodity (NGS publishes it), and cheap:
stream each tracking_week_N.csv line-by-line, hold only per-player max(s). Never
writes the 8 GB to disk. Self-gates on creds (skips cleanly if absent).

Writes bdb_speed.json to R2 (nfl/{year}/) + outbox/nfl/ (GitHub-raw fallback),
same emit discipline as build-ngs-data.py.
"""
import os, io, csv, json, base64, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone

OWNER, SLUG = "alexandermeau", "nfl-big-data-bowl-archived-data-2025"
PFX = "big-data-bowl-data/"  # dataset internal path prefix (probe-confirmed 2026-08-15)
MPH = 2.045454545  # yards/sec → mph
CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
CF_TOKEN   = os.environ.get("CLOUDFLARE_API_TOKEN", "")
KU = (os.environ.get("KAGGLE_USERNAME", "") or "").strip()
KK = (os.environ.get("KAGGLE_KEY", "") or "").strip()
AUTH = "Basic " + base64.b64encode(f"{KU}:{KK}".encode()).decode() if (KU and KK) else None

def kaggle_open(file_name, timeout=600):
    url = f"https://www.kaggle.com/api/v1/datasets/download/{OWNER}/{SLUG}?file_name={urllib.parse.quote(file_name)}"
    req = urllib.request.Request(url, headers={"Authorization": AUTH, "User-Agent": "FIELD/1.0"})
    return urllib.request.urlopen(req, timeout=timeout)

def detect_season():
    """Read games.csv (tiny) to get the real season — never invent it (Rule 1)."""
    try:
        with kaggle_open("big-data-bowl-data/games.csv", timeout=60) as r:
            reader = csv.DictReader(io.TextIOWrapper(r, encoding="utf-8"))
            seasons = set()
            for row in reader:
                s = row.get("season") or ""
                if s.isdigit():
                    seasons.add(int(s))
                else:
                    d = row.get("gameDate") or ""
                    m = d[-4:] if len(d) >= 4 and d[-4:].isdigit() else (d[:4] if d[:4].isdigit() else "")
                    if m: seasons.add(int(m))
            return max(seasons) if seasons else None
    except Exception as e:
        print(f"    season detect failed: {e}")
        return None

def build_bdb_speed(max_weeks=9):
    if not AUTH:
        print("  ℹ️  No KAGGLE creds in env — skipping BDB speed")
        return {}, None
    season = detect_season()
    print(f"  season detected: {season}")
    best = {}  # nflId -> {name, club, maxS}
    for wk in range(1, max_weeks + 1):
        fn = f"big-data-bowl-data/tracking_week_{wk}.csv"
        try:
            with kaggle_open(fn) as resp:
                reader = csv.DictReader(io.TextIOWrapper(resp, encoding="utf-8"))
                rows = 0
                for row in reader:
                    nid = row.get("nflId")
                    if not nid or nid == "NA":
                        continue
                    try:
                        s = float(row.get("s") or 0)
                    except ValueError:
                        continue
                    if s > 11.73:   # >24 mph = tracking glitch (human max ~23 mph); drop frame
                        continue
                    b = best.get(nid)
                    if b is None or s > b["maxS"]:
                        best[nid] = {"name": row.get("displayName", ""), "club": row.get("club", ""), "maxS": s}
                    rows += 1
            print(f"    week {wk}: {rows:,} rows, {len(best)} players tracked")
        except urllib.error.HTTPError as e:
            print(f"    week {wk}: HTTP {e.code} — stopping (likely last available week)")
            break
        except Exception as e:
            print(f"    week {wk} failed: {e}")
            break
    data = {}
    for nid, b in best.items():
        if b["maxS"] < 5:          # drop linemen / noise; keep skill-position speed
            continue
        data[nid] = {"name": b["name"], "team": b["club"],
                     "maxSpeedMph": round(b["maxS"] * MPH, 2), "maxSpeedYps": round(b["maxS"], 2)}
    print(f"  Players kept (>=5 yd/s): {len(data)}")
    return data, season

def _truthy(v):
    return (v or "").strip().lower() in ("1", "true", "t", "yes")

def load_players():
    """nflId -> {name, pos} from players.csv (small)."""
    out = {}
    try:
        with kaggle_open(PFX + "players.csv", timeout=60) as r:
            for row in csv.DictReader(io.TextIOWrapper(r, encoding="utf-8")):
                nid = row.get("nflId")
                if nid and nid != "NA":
                    out[nid] = {"name": row.get("displayName", ""), "pos": row.get("position", "")}
    except Exception as e:
        print(f"    players.csv load failed: {e}")
    return out

def build_bdb_route_entropy(players, min_routes=20):
    """Per-player route-tree diversity: Shannon entropy (bits) over routeRan mix.
    Commodity (route distribution is factual/NGS-publishable). player_play.csv only —
    no tracking. wasRunningRoute==1 gates to actual route-runners."""
    if not AUTH:
        return {}
    import math
    counts = {}  # nflId -> {team, routes: Counter-ish dict}
    try:
        with kaggle_open(PFX + "player_play.csv") as r:
            for row in csv.DictReader(io.TextIOWrapper(r, encoding="utf-8")):
                if not _truthy(row.get("wasRunningRoute")):
                    continue
                route = (row.get("routeRan") or "").strip()
                if not route or route == "NA":
                    continue
                nid = row.get("nflId")
                if not nid or nid == "NA":
                    continue
                e = counts.get(nid)
                if e is None:
                    e = counts[nid] = {"team": row.get("teamAbbr", ""), "routes": {}}
                e["routes"][route] = e["routes"].get(route, 0) + 1
    except Exception as e:
        print(f"    route entropy read failed: {e}")
        return {}
    data = {}
    for nid, e in counts.items():
        total = sum(e["routes"].values())
        if total < min_routes:
            continue
        H = -sum((c / total) * math.log2(c / total) for c in e["routes"].values() if c)
        pl = players.get(nid, {})
        data[nid] = {"name": pl.get("name", ""), "team": e["team"], "pos": pl.get("pos", ""),
                     "routesRun": total, "distinctRoutes": len(e["routes"]),
                     "entropyBits": round(H, 2)}
    print(f"  route entropy players (>= {min_routes} routes): {len(data)}")
    return data

def build_bdb_separation(players, max_weeks=9, min_targets=8):
    """Avg separation (yards) of the targeted receiver from the nearest defender at
    the pass_arrived frame. Commodity (NGS publishes 'separation'). Needs tracking +
    plays (defensiveTeam) + player_play (wasTargettedReceiver)."""
    if not AUTH:
        return {}
    import math
    # plays: (gameId,playId) -> defensiveTeam  (pass plays only implied by pass_arrived)
    defteam = {}
    try:
        with kaggle_open(PFX + "plays.csv") as r:
            for row in csv.DictReader(io.TextIOWrapper(r, encoding="utf-8")):
                defteam[(row.get("gameId"), row.get("playId"))] = row.get("defensiveTeam", "")
    except Exception as e:
        print(f"    plays.csv load failed: {e}"); return {}
    # player_play: (gameId,playId) -> targeted receiver nflId
    target = {}
    try:
        with kaggle_open(PFX + "player_play.csv") as r:
            for row in csv.DictReader(io.TextIOWrapper(r, encoding="utf-8")):
                if _truthy(row.get("wasTargettedReceiver")):
                    target[(row.get("gameId"), row.get("playId"))] = (row.get("nflId"), row.get("teamAbbr", ""))
    except Exception as e:
        print(f"    player_play.csv load failed: {e}"); return {}
    agg = {}  # nflId -> {team, sum, n}
    for wk in range(1, max_weeks + 1):
        fn = PFX + f"tracking_week_{wk}.csv"
        # bucket pass_arrived frames per play: (gameId,playId) -> list of (nflId,x,y,club)
        frames = {}
        try:
            with kaggle_open(fn) as resp:
                for row in csv.DictReader(io.TextIOWrapper(resp, encoding="utf-8")):
                    if (row.get("event") or "") != "pass_arrived":
                        continue
                    nid = row.get("nflId")
                    if not nid or nid == "NA":
                        continue
                    try:
                        x = float(row.get("x") or 0); y = float(row.get("y") or 0)
                    except ValueError:
                        continue
                    frames.setdefault((row.get("gameId"), row.get("playId")), []).append(
                        (nid, x, y, row.get("club", "")))
        except urllib.error.HTTPError as e:
            print(f"    sep week {wk}: HTTP {e.code} — stopping"); break
        except Exception as e:
            print(f"    sep week {wk} failed: {e}"); break
        plays_done = 0
        for key, rows in frames.items():
            tgt = target.get(key); dteam = defteam.get(key)
            if not tgt or not dteam:
                continue
            tgt_id, tgt_team = tgt
            rec = next((r for r in rows if r[0] == tgt_id), None)
            if rec is None:
                continue
            defs = [r for r in rows if r[3] == dteam]
            if not defs:
                continue
            _, rx, ry, _ = rec
            sep = min(math.hypot(rx - dx, ry - dy) for _, dx, dy, _ in defs)
            if sep > 40:   # sanity: separation beyond 40yd = bad frame/mismatch, drop
                continue
            a = agg.get(tgt_id)
            if a is None:
                a = agg[tgt_id] = {"team": tgt_team, "sum": 0.0, "n": 0}
            a["sum"] += sep; a["n"] += 1
            plays_done += 1
        print(f"    sep week {wk}: {len(frames)} pass_arrived plays, {plays_done} scored")
    data = {}
    for nid, a in agg.items():
        if a["n"] < min_targets:
            continue
        pl = players.get(nid, {})
        data[nid] = {"name": pl.get("name", ""), "team": a["team"],
                     "pos": pl.get("pos", ""), "targets": a["n"],
                     "avgSepYds": round(a["sum"] / a["n"], 2)}
    print(f"  separation receivers (>= {min_targets} targets): {len(data)}")
    return data

def upload_to_r2(r2_key, payload):
    if not CF_ACCOUNT or not CF_TOKEN:
        print(f"    ℹ️  No CF creds — skipping R2 for {r2_key}")
        return
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/r2/buckets/field-relay-data/objects/{r2_key}"
    body = json.dumps(payload, default=str).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="PUT", headers={
        "Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json", "Content-Length": str(len(body))})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print("    ✅ R2 OK" if json.loads(r.read()).get("success") else "    ⚠️ R2 error")
    except Exception as e:
        print(f"    ❌ R2 upload failed: {e}")

def write_outbox(filename, payload):
    os.makedirs("outbox/nfl", exist_ok=True)
    with open(f"outbox/nfl/{filename}", "w") as f:
        json.dump(payload, f)

def main():
    now = datetime.now(timezone.utc)
    year = now.year if now.month >= 8 else now.year - 1
    print(f"BDB pipeline — {now.isoformat()}")
    data, season = build_bdb_speed()
    if not data:
        print("⛔ bdb_speed: 0 rows — refusing to overwrite"); return
    payload = {"updated": now.isoformat(), "season": season, "targetYear": year,
               "source": f"kaggle {OWNER}/{SLUG} (BDB tracking)", "metric": "max_speed_mph", "data": data}
    upload_to_r2(f"nfl/{year}/bdb_speed.json", payload)
    write_outbox("bdb_speed.json", payload)
    # top-5 log, human-readable proof
    top = sorted(data.values(), key=lambda p: -p["maxSpeedMph"])[:5]
    for p in top:
        print(f"    {p['maxSpeedMph']} mph  {p['name']} ({p['team']})")
    print(f"✅ bdb_speed: {len(data)} players")

    # ── Route entropy (player_play.csv only) ──
    players = load_players()
    print(f"  players loaded: {len(players)}")
    ent = build_bdb_route_entropy(players)
    if ent:
        ep = {"updated": now.isoformat(), "season": season, "targetYear": year,
              "source": f"kaggle {OWNER}/{SLUG} (BDB player_play)", "metric": "route_entropy_bits", "data": ent}
        upload_to_r2(f"nfl/{year}/bdb_route_entropy.json", ep)
        write_outbox("bdb_route_entropy.json", ep)
        for p in sorted(ent.values(), key=lambda p: -p["entropyBits"])[:5]:
            print(f"    {p['entropyBits']} bits  {p['name']} ({p['team']}) {p['distinctRoutes']}/{p['routesRun']}")
        print(f"✅ bdb_route_entropy: {len(ent)} players")
    else:
        print("⛔ bdb_route_entropy: 0 rows — not written")

    # ── Separation (tracking + plays + player_play) ──
    sep = build_bdb_separation(players)
    if sep:
        sp = {"updated": now.isoformat(), "season": season, "targetYear": year,
              "source": f"kaggle {OWNER}/{SLUG} (BDB tracking)", "metric": "avg_separation_yds", "data": sep}
        upload_to_r2(f"nfl/{year}/bdb_separation.json", sp)
        write_outbox("bdb_separation.json", sp)
        for p in sorted(sep.values(), key=lambda p: -p["avgSepYds"])[:5]:
            print(f"    {p['avgSepYds']} yd  {p['name']} ({p['team']}) {p['targets']} tgt")
        print(f"✅ bdb_separation: {len(sep)} players")
    else:
        print("⛔ bdb_separation: 0 rows — not written")

if __name__ == "__main__":
    main()
