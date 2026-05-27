#!/usr/bin/env python3
"""
MLB Weekly Stats Update Pipeline
Runs every Monday 6am ET via mlb-weekly-update.yml
Downloads 5 Savant CSV endpoints → processes → commits JSON to outbox/mlb/

Outputs (served via /mlb-stats/* relay route, loaded by mlbStatsInit() in FIELD):
  outbox/mlb/team_abs.json          — team ABS challenge efficiency
  outbox/mlb/expected_stats.json    — xBA vs BA regression alerts
  outbox/mlb/sprint_speed.json      — player sprint speeds
  outbox/mlb/pitch_tempo.json       — pitcher tempo (Fast/Average/Slow)
  outbox/mlb/pitch_arsenals.json    — pitch mix + whiff rates per starter

NOTE on umpire ABS:
  Savant does not expose umpire ABS data in its CSV export endpoints.
  Umpire data (UMPIRE_ABS_RATINGS) must be updated manually via:
    1. baseballsavant.mlb.com/leaderboard/abs-challenges (Umpire tab)
    2. Or ESPN ABS tracker: espn.com/mlb/story/_/id/48305211
  Umpire data changes slowly — weekly manual check is sufficient.
  A future automation could scrape the Savant ABS page JS payload.
"""
import csv, io, json, os, urllib.request
from datetime import datetime, timezone

HEADERS = {"User-Agent":"Mozilla/5.0 (compatible; FIELD-MLB-Updater/1.0)","Accept":"text/csv,*/*"}
TS = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

def fetch_csv(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode("utf-8", errors="replace")
        # Strip BOM
        body = body.lstrip("\ufeff").lstrip('"').replace('\ufeff"','')
        rows = list(csv.DictReader(io.StringIO(body)))
        return rows

def clean_key(k):
    """Strip BOM and surrounding quotes from CSV header keys."""
    return k.strip().lstrip('\ufeff').strip('"').strip()

def normalize_rows(rows):
    """Normalize all row keys."""
    return [{clean_key(k): v for k, v in row.items()} for row in rows]

os.makedirs("outbox/mlb", exist_ok=True)

# ── 1. TEAM ABS ──────────────────────────────────────────────────────────────
print("Fetching team ABS...")
try:
    rows = normalize_rows(fetch_csv(
        "https://baseballsavant.mlb.com/leaderboard/abs-challenges"
        "?challengeType=batting-team&year=2026&min=1&csv=true"))
    team_abs = {}
    for r in rows:
        abbr = r.get("team_abbr","").strip()
        if not abbr or abbr == "MLB": continue
        # Savant fields: total_vs_expected (net overturns for batting team)
        # won = successful batting challenges, lost = unsuccessful
        try:
            net = float(r.get("total_vs_expected") or 0)
            won = int(float(r.get("won") or r.get("overturns_for") or 0))
            attempted = int(float(r.get("attempts") or r.get("challenged") or 0))
            rate = round(won / attempted, 3) if attempted > 0 else 0
            grade = ("A" if rate >= 0.60 else "A-" if rate >= 0.56
                     else "B+" if rate >= 0.52 else "B" if rate >= 0.48
                     else "C+" if rate >= 0.44 else "C")
            team_abs[abbr] = {
                "battingRate": rate, "battingWon": won, "battingAttempted": attempted,
                "netOverturns": round(net, 1), "grade": grade
            }
        except (ValueError, ZeroDivisionError):
            pass
    with open("outbox/mlb/team_abs.json","w") as f:
        json.dump({"updated": TS, "data": team_abs}, f, indent=2)
    print(f"  ✅ {len(team_abs)} teams")
except Exception as e:
    print(f"  ❌ {e}")

# ── 2. EXPECTED STATS ─────────────────────────────────────────────────────────
print("Fetching expected stats...")
try:
    rows = normalize_rows(fetch_csv(
        "https://baseballsavant.mlb.com/leaderboard/expected_statistics"
        "?type=batter&year=2026&min=50&csv=true"))
    exp_stats = {}
    for r in rows:
        name_raw = r.get("last_name, first_name") or r.get("last_name") or ""
        # Format: "Wood, James"
        parts = name_raw.split(",")
        last = parts[0].strip().lower().replace(" jr.","").replace(" sr.","").replace(" ","_") if parts else ""
        if not last: continue
        try:
            ba   = float(r.get("ba")   or 0)
            xba  = float(r.get("est_ba") or r.get("xba") or 0)
            slg  = float(r.get("slg")  or 0)
            xslg = float(r.get("est_slg") or r.get("xslg") or 0)
            woba = float(r.get("woba") or 0)
            xwoba= float(r.get("est_woba") or r.get("xwoba") or 0)
            pa   = int(float(r.get("pa") or 0))
            if pa < 50: continue
            exp_stats[last] = {
                "ba": round(ba,3), "xba": round(xba,3),
                "slg": round(slg,3), "xslg": round(xslg,3),
                "woba": round(woba,3), "xwoba": round(xwoba,3),
                "pa": pa
            }
        except (ValueError, TypeError):
            pass
    with open("outbox/mlb/expected_stats.json","w") as f:
        json.dump({"updated": TS, "data": exp_stats}, f, indent=2)
    print(f"  ✅ {len(exp_stats)} players")
except Exception as e:
    print(f"  ❌ {e}")

# ── 3. SPRINT SPEED ───────────────────────────────────────────────────────────
print("Fetching sprint speed...")
try:
    rows = normalize_rows(fetch_csv(
        "https://baseballsavant.mlb.com/leaderboard/sprint_speed"
        "?year=2026&min=10&pos=&team=&csv=true"))
    speed = {}
    MLB_AVG = 27.0
    for r in rows:
        name_raw = r.get("last_name, first_name") or r.get("last_name") or ""
        parts = name_raw.split(",")
        last = parts[0].strip().lower().replace(" jr.","").replace(" sr.","").replace(" ","_") if parts else ""
        if not last: continue
        try:
            ft_s = float(r.get("r_sprint_speed_fps") or r.get("sprint_speed") or 0)
            team = r.get("team","").strip()
            pctile = int(float(r.get("pct_rank") or 0))
            if ft_s < 25: continue
            tier = ("elite" if ft_s >= 29.5 else "above_avg" if ft_s >= 28.5
                    else "average" if ft_s >= 26.5 else "below_avg")
            speed[last] = {"sprintSpeed": round(ft_s,1), "pctile": pctile, "tier": tier, "team": team}
        except (ValueError, TypeError):
            pass
    with open("outbox/mlb/sprint_speed.json","w") as f:
        json.dump({"updated": TS, "leagueAvg": MLB_AVG, "data": speed}, f, indent=2)
    print(f"  ✅ {len(speed)} players")
except Exception as e:
    print(f"  ❌ {e}")

# ── 4. PITCH TEMPO ────────────────────────────────────────────────────────────
print("Fetching pitch tempo...")
try:
    rows = normalize_rows(fetch_csv(
        "https://baseballsavant.mlb.com/leaderboard/pitch-tempo"
        "?type=Pit&year=2026&min=100&csv=true"))
    tempo = {}
    for r in rows:
        name_raw = r.get("entity_name","")
        # Format: "Suter, Brent"
        parts = name_raw.split(",")
        last = parts[0].strip().lower().replace(" jr.","").replace(" ","_") if parts else ""
        if not last: continue
        try:
            # Savant fields: tempo_empty (bases empty), tempo_nonempty
            t = float(r.get("tempo_empty") or r.get("median_time") or 0)
            timer_equiv = float(r.get("timer_diff_empty") or 0)
            if t <= 0: continue
            tc = "Fast" if t < 15 else "Slow" if t > 30 else "Average"
            tempo[last] = {"medianTempo": round(t,1), "tempoClass": tc, "timerEquiv": round(timer_equiv,1)}
        except (ValueError, TypeError):
            pass
    with open("outbox/mlb/pitch_tempo.json","w") as f:
        json.dump({"updated": TS, "data": tempo}, f, indent=2)
    print(f"  ✅ {len(tempo)} pitchers")
except Exception as e:
    print(f"  ❌ {e}")

# ── 5. PITCH ARSENALS ─────────────────────────────────────────────────────────
print("Fetching pitch arsenals...")
try:
    rows = normalize_rows(fetch_csv(
        "https://baseballsavant.mlb.com/leaderboard/pitch-arsenals"
        "?type=PA&year=2026&min=100&csv=true"))
    arsenals = {}
    # Savant columns: ff_PA (4-seam usage), ff_avg_speed, ff_avg_whiff_percent
    # si_PA (sinker), sl_PA (slider), ch_PA (changeup), cu_PA (curveball)
    # kc_PA (knuckle-curve), fc_PA (cutter), fs_PA (splitter), sv_PA (sweeper)
    PITCH_MAP = [
        ("ff","4-Seam"), ("si","Sinker"), ("sl","Slider"), ("ch","Changeup"),
        ("cu","Curveball"), ("kc","Knuckle-Curve"), ("fc","Cutter"),
        ("fs","Splitter"), ("sv","Sweeper"), ("st","Sweeper"), ("fp","Forkball"),
    ]
    for r in rows:
        name_raw = r.get("last_name, first_name") or r.get("last_name") or ""
        parts = name_raw.split(",")
        last = parts[0].strip().lower().replace(" jr.","").replace(" ","_") if parts else ""
        if not last: continue
        pitches = []
        for code, label in PITCH_MAP:
            usage_key = f"{code}_PA"
            vel_key   = f"{code}_avg_speed"
            whiff_key = f"{code}_avg_whiff_percent"
            try:
                usage = float(r.get(usage_key) or 0)
                vel   = float(r.get(vel_key)   or 0)
                whiff = float(r.get(whiff_key) or 0)
                if usage > 0.03 and vel > 0:  # > 3% usage
                    pitches.append({
                        "type": label,
                        "vel": round(vel,1),
                        "whiffRate": round(whiff/100, 3),
                        "usage": round(usage, 3)
                    })
            except (ValueError, TypeError): pass
        if pitches:
            pitches.sort(key=lambda p: p["usage"], reverse=True)
            team = r.get("team","").strip()
            arsenals[last] = {"team": team, "pitches": pitches}
    with open("outbox/mlb/pitch_arsenals.json","w") as f:
        json.dump({"updated": TS, "data": arsenals}, f, indent=2)
    print(f"  ✅ {len(arsenals)} pitchers")
except Exception as e:
    print(f"  ❌ {e}")

# ── 6. Summary ────────────────────────────────────────────────────────────────
print(f"\n── Update complete {TS} ──")
for fn in ["team_abs","expected_stats","sprint_speed","pitch_tempo","pitch_arsenals"]:
    path = f"outbox/mlb/{fn}.json"
    if os.path.exists(path):
        size = os.path.getsize(path)
        print(f"  {path} — {size//1024}KB")
