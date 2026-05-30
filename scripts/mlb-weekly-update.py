#!/usr/bin/env python3
"""
MLB Weekly Stats Update Pipeline — corrected column mappings from Savant CSV probe.
Runs Monday 6am ET via mlb-weekly-update.yml.

Column discoveries (from savant-csv-probe, 2026-05-27):
  team_abs:       n_challenges, n_overturns, rate_overturns, net_for, total_vs_expected
  expected_stats: ba, est_ba (=xBA), est_ba_minus_ba_diff, est_slg, est_woba
  sprint_speed:   sprint_speed, team, competitive_runs, bolts, hp_to_1b
  pitch_tempo:    median_seconds_empty, entity_name ("Last, First"), entity_code
  pitch_arsenals: pitch-arsenal-stats endpoint for velocity+whiff (NOT pitch-arsenals)

Section 6 — umpire ABS now automated via Statcast des field:
  ABS pitch result challenges appear in Statcast per-pitch CSV des column.
  Pattern: "[Name] challenged (pitch result), call confirmed|overturned"
  HP umpire resolved via MLB Stats API schedule?hydrate=officials (1 call/date).
  Source: probe confirmed on May 30 2026. No scraping required.
"""
import csv, io, json, os, urllib.request
from datetime import datetime, timezone

HEADERS = {"User-Agent":"Mozilla/5.0 (compatible; FIELD-MLB-Updater/1.0)","Accept":"text/csv,*/*"}
TS = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

def fetch_csv(url, label="", timeout=30):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        body = r.read().decode("utf-8", errors="replace")
        body = body.lstrip("\ufeff")
        rows = list(csv.DictReader(io.StringIO(body)))
        cleaned = [{k.strip().lstrip('\ufeff').strip('"').strip(): v
                    for k,v in row.items()} for row in rows]
        return cleaned

def safe_float(val, default=0.0):
    try: return float(val or 0)
    except: return default

def safe_int(val, default=0):
    try: return int(float(val or 0))
    except: return default

def name_key(raw):
    """'Wood, James' → 'wood'  |  'Witt Jr., Bobby' → 'witt'"""
    parts = raw.split(",")
    last = parts[0].strip().lower()
    last = last.replace(" jr.","").replace(" sr.","").replace(" ii","").replace(" iii","")
    return last.replace(" ","_").replace("-","_")

os.makedirs("outbox/mlb", exist_ok=True)

# ── 1. TEAM ABS ──────────────────────────────────────────────────────────────
print("Fetching team ABS...")
try:
    rows = fetch_csv("https://baseballsavant.mlb.com/leaderboard/abs-challenges"
                     "?challengeType=batting-team&year=2026&min=1&csv=true")
    team_abs = {}
    for r in rows:
        abbr = r.get("team_abbr","").strip()
        if not abbr or abbr in ("MLB",""):
            continue
        attempts  = safe_int(r.get("n_challenges"))
        overturned= safe_int(r.get("n_overturns"))
        rate      = safe_float(r.get("rate_overturns"))
        net_for   = safe_float(r.get("net_for"))
        total_vs  = safe_float(r.get("total_vs_expected"))
        grade = ("A" if rate >= 0.60 else "A-" if rate >= 0.56
                 else "B+" if rate >= 0.52 else "B" if rate >= 0.48
                 else "C+" if rate >= 0.44 else "C")
        team_abs[abbr] = {
            "battingRate": round(rate, 3),
            "battingWon": overturned, "battingAttempted": attempts,
            "netOverturns": round(net_for, 1),
            "totalVsExpected": round(total_vs, 1),
            "grade": grade
        }
    with open("outbox/mlb/team_abs.json","w") as f:
        json.dump({"updated": TS, "data": team_abs}, f, indent=2)
    print(f"  ✅ {len(team_abs)} teams | top: {sorted(team_abs.items(),key=lambda x:-x[1]['battingRate'])[:3]}")
except Exception as e:
    print(f"  ❌ {e}")

# ── 2. EXPECTED STATS ─────────────────────────────────────────────────────────
print("Fetching expected stats...")
try:
    rows = fetch_csv("https://baseballsavant.mlb.com/leaderboard/expected_statistics"
                     "?type=batter&year=2026&min=50&csv=true")
    exp_stats = {}
    for r in rows:
        name_raw = r.get("last_name, first_name") or r.get("last_name") or ""
        last = name_key(name_raw)
        if not last: continue
        pa   = safe_int(r.get("pa"))
        if pa < 50: continue
        ba   = safe_float(r.get("ba"))
        xba  = safe_float(r.get("est_ba"))   # est_ba = expected BA (xBA)
        slg  = safe_float(r.get("slg"))
        xslg = safe_float(r.get("est_slg"))
        woba = safe_float(r.get("woba"))
        xwoba= safe_float(r.get("est_woba"))
        exp_stats[last] = {
            "ba": round(ba,3), "xba": round(xba,3),
            "slg": round(slg,3), "xslg": round(xslg,3),
            "woba": round(woba,3), "xwoba": round(xwoba,3),
            "pa": pa
        }
    with open("outbox/mlb/expected_stats.json","w") as f:
        json.dump({"updated": TS, "data": exp_stats}, f, indent=2)
    # Show most divergent (lucky/unlucky)
    sorted_by_div = sorted(exp_stats.items(), key=lambda x: abs(x[1]['ba']-x[1]['xba']), reverse=True)
    print(f"  ✅ {len(exp_stats)} players | most divergent: {[(k,round(v['ba']-v['xba'],3)) for k,v in sorted_by_div[:3]]}")
except Exception as e:
    print(f"  ❌ {e}")

# ── 3. SPRINT SPEED ───────────────────────────────────────────────────────────
print("Fetching sprint speed...")
try:
    rows = fetch_csv("https://baseballsavant.mlb.com/leaderboard/sprint_speed"
                     "?year=2026&min=10&pos=&team=&csv=true")
    speed = {}
    for r in rows:
        name_raw = r.get("last_name, first_name") or r.get("last_name") or ""
        last = name_key(name_raw)
        if not last: continue
        ft_s  = safe_float(r.get("sprint_speed"))   # ft/sec
        team  = r.get("team","").strip()
        runs  = safe_int(r.get("competitive_runs"))
        bolts = safe_int(r.get("bolts"))             # runs at 30+ ft/s
        if ft_s < 25 or runs < 10: continue
        tier = ("elite" if ft_s >= 29.5 else "above_avg" if ft_s >= 28.5
                else "average" if ft_s >= 26.5 else "below_avg")
        # Approximate percentile from known distribution (avg=27, stdev~1.1)
        raw_pctile = min(99, max(1, int(50 + (ft_s - 27.0) / 1.1 * 34)))
        speed[last] = {
            "sprintSpeed": round(ft_s,1), "pctile": raw_pctile,
            "tier": tier, "team": team, "bolts": bolts
        }
    with open("outbox/mlb/sprint_speed.json","w") as f:
        json.dump({"updated": TS, "leagueAvg": 27.0, "data": speed}, f, indent=2)
    top5 = sorted(speed.items(), key=lambda x:-x[1]['sprintSpeed'])[:5]
    print(f"  ✅ {len(speed)} players | top5: {[(k,v['sprintSpeed'],v['team']) for k,v in top5]}")
except Exception as e:
    print(f"  ❌ {e}")

# ── 4. PITCH TEMPO ────────────────────────────────────────────────────────────
print("Fetching pitch tempo...")
try:
    rows = fetch_csv("https://baseballsavant.mlb.com/leaderboard/pitch-tempo"
                     "?type=Pit&year=2026&min=100&csv=true")
    tempo = {}
    for r in rows:
        name_raw = r.get("entity_name","")
        last = name_key(name_raw)
        if not last: continue
        t = safe_float(r.get("median_seconds_empty"))
        if t <= 0: continue
        # timer_equiv: approx = median_seconds - 6s (pitch release + return time)
        timer_equiv = round(max(0, t - 6.0), 1)
        tc = "Fast" if t < 15 else "Slow" if t > 30 else "Average"
        tempo[last] = {"medianTempo": round(t,1), "tempoClass": tc, "timerEquiv": timer_equiv}
    with open("outbox/mlb/pitch_tempo.json","w") as f:
        json.dump({"updated": TS, "data": tempo}, f, indent=2)
    fast = [k for k,v in tempo.items() if v['tempoClass']=='Fast'][:5]
    print(f"  ✅ {len(tempo)} pitchers | fast workers: {fast}")
except Exception as e:
    print(f"  ❌ {e}")

# ── 5. PITCH ARSENAL STATS (velocity + whiff rate) ────────────────────────────
print("Fetching pitch arsenal stats...")
try:
    # pitch-arsenal-stats has velocity + whiff rates (different from pitch-arsenals)
    rows = fetch_csv("https://baseballsavant.mlb.com/leaderboard/pitch-arsenal-stats"
                     "?type=pitcher&year=2026&min=100&csv=true")
    arsenals = {}
    PITCH_MAP = [
        ("ff","4-Seam"),("si","Sinker"),("sl","Slider"),("ch","Changeup"),
        ("cu","Curveball"),("kc","Knuckle-Curve"),("fc","Cutter"),
        ("fs","Splitter"),("st","Sweeper"),("sv","Sweeper"),("fp","Forkball"),
    ]
    for r in rows:
        name_raw = r.get("last_name, first_name") or r.get("last_name") or ""
        last = name_key(name_raw)
        if not last: continue
        pitches = []
        for code, label in PITCH_MAP:
            try:
                usage = safe_float(r.get(f"{code}_usage") or r.get(f"{code}_pa_used"))
                vel   = safe_float(r.get(f"{code}_avg_speed") or r.get(f"{code}_velocity"))
                whiff = safe_float(r.get(f"{code}_whiff_percent") or r.get(f"{code}_whiff"))
                if usage > 0.03 and vel > 65:
                    pitches.append({"type":label,"vel":round(vel,1),
                                    "whiffRate":round(whiff/100,3),"usage":round(usage,3)})
            except: pass
        if pitches:
            pitches.sort(key=lambda p: p["usage"], reverse=True)
            team = r.get("team","").strip()
            arsenals[last] = {"team": team, "pitches": pitches}
    with open("outbox/mlb/pitch_arsenals.json","w") as f:
        json.dump({"updated": TS, "data": arsenals}, f, indent=2)
    print(f"  ✅ {len(arsenals)} pitchers")
except Exception as e:
    print(f"  ❌ {e}")

print(f"\n── Update complete {TS} ──")
for fn in ["team_abs","expected_stats","sprint_speed","pitch_tempo","pitch_arsenals"]:
    path = f"outbox/mlb/{fn}.json"
    if os.path.exists(path):
        try:
            d = json.load(open(path))
            n = len(d.get("data", {}))
            print(f"  ✅ {path} — {n} entries")
        except: print(f"  ⚠️  {path} — unreadable")
    else:
        print(f"  ❌ {path} — missing")


# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\n── Update complete {TS} ──")
for fn in ["team_abs","expected_stats","sprint_speed","pitch_tempo","pitch_arsenals","umpire_abs"]:
    path = f"outbox/mlb/{fn}.json"
    if os.path.exists(path):
        try:
            d = json.load(open(path))
            n = len(d.get("data", {}))
            src = d.get("source","Savant")
            print(f"  ✅ {path} — {n} entries [{src}]")
        except: print(f"  ⚠️  {path} — unreadable")
    else:
        print(f"  ❌ {path} — missing")


# ── 6. UMPIRE ABS — Statcast des field + MLB Stats API officials ─────────────
# Replaces the broken CF Worker /mlb-umpire-scrape approach.
# Source: Statcast per-pitch CSV (des col has challenge text) + MLB Stats API
#         schedule?hydrate=officials (one call per date, not per game).
# ABS challenges appear in des as:
#   "[Name] challenged (pitch result), call on the field was [confirmed|overturned]"
# HP umpire comes from MLB Stats API schedule with officials hydration.
# Incremental: processed_game_pks prevents double-counting across weekly runs.
print("\nFetching umpire ABS from Statcast des + MLB Stats API...")
import re
from datetime import timedelta

try:
    MLB_API_BASE = "https://statsapi.mlb.com/api/v1"
    MLB_JSON_HEADERS = {"User-Agent": "FIELD-Sports-Intelligence/1.0", "Accept": "application/json"}

    def fetch_mlb_json(url):
        req = urllib.request.Request(url, headers=MLB_JSON_HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())

    # Load existing umpire data for incremental merge
    ump_path = "outbox/mlb/umpire_abs.json"
    existing_ump = {}
    processed_pks = set()
    if os.path.exists(ump_path):
        with open(ump_path) as f:
            prev = json.load(f)
            existing_ump = prev.get("data", {})
            processed_pks = set(prev.get("processed_game_pks", []))

    # Date range: first run = full season (April 1); subsequent = last 14 days
    today_utc = datetime.now(timezone.utc)
    if not processed_pks:
        # First run: last 30 days (hardcoded stubs cover earlier; avoid timeout on full season)
        since_dt = today_utc - timedelta(days=30)
        print("  First run — fetching last 30 days of Statcast data...")
    else:
        since_dt = today_utc - timedelta(days=14)
    until_dt = today_utc - timedelta(days=1)
    since_str = since_dt.strftime("%Y-%m-%d")
    until_str = until_dt.strftime("%Y-%m-%d")

    # Fetch Statcast CSV for the date range
    statcast_url = (
        "https://baseballsavant.mlb.com/statcast_search/csv"
        f"?all=true&hfGT=R%7C&hfSea=2026%7C"
        f"&game_date_gt={since_str}&game_date_lt={until_str}&type=details"
    )
    sc_rows = fetch_csv(statcast_url, timeout=180)  # large file — 3min timeout
    print(f"  Statcast: {len(sc_rows)} pitches ({since_str}→{until_str})")

    # Pattern: ABS challenge in des column
    challenge_re = re.compile(
        r'challenged \(pitch result\), call on the field was (confirmed|overturned)',
        re.IGNORECASE
    )

    # Group challenge events by (game_pk, game_date)
    # {game_pk: {date, challenged, overturned}}
    game_events = {}
    for row in sc_rows:
        des = row.get("des", "") or ""
        if not des: continue
        m = challenge_re.search(des)
        if not m: continue
        gpk = (row.get("game_pk") or "").strip()
        gdate = (row.get("game_date") or "").strip()
        if not gpk or gpk in processed_pks: continue
        if gpk not in game_events:
            game_events[gpk] = {"date": gdate, "challenged": 0, "overturned": 0}
        game_events[gpk]["challenged"] += 1
        if m.group(1).lower() == "overturned":
            game_events[gpk]["overturned"] += 1

    new_game_count = len(game_events)
    print(f"  New games with ABS challenges: {new_game_count}")

    # Group new games by date → batch MLB Stats API calls (1 per date)
    dates_to_pks = {}
    for gpk, ev in game_events.items():
        d = ev["date"]
        dates_to_pks.setdefault(d, []).append(gpk)

    # Fetch HP umpire per game via schedule hydrate=officials (1 call per date)
    pk_to_umpire = {}
    for gdate, pks in sorted(dates_to_pks.items()):
        try:
            sched = fetch_mlb_json(
                f"{MLB_API_BASE}/schedule?sportId=1&date={gdate}"
                f"&gamePks={','.join(pks)}&hydrate=officials"
                f"&fields=dates,games,gamePk,officials,officialType,official,fullName"
            )
            for date_block in (sched.get("dates") or []):
                for game in (date_block.get("games") or []):
                    gpk = str(game.get("gamePk",""))
                    for off in (game.get("officials") or []):
                        if (off.get("officialType","")).lower() == "home plate":
                            pk_to_umpire[gpk] = off.get("official",{}).get("fullName","")
                            break
        except Exception as e:
            print(f"  ⚠ schedule fetch for {gdate}: {e}")

    print(f"  HP umpires resolved: {len(pk_to_umpire)}/{new_game_count}")

    # Build new stats, seeded from existing
    ump_stats = {}
    for last, d in existing_ump.items():
        ump_stats[last] = dict(d)

    for gpk, ev in game_events.items():
        ump_full = pk_to_umpire.get(gpk)
        if not ump_full: continue
        last = ump_full.split()[-1].lower().replace("'","").replace(".","").replace("-","_")
        if last not in ump_stats:
            ump_stats[last] = {"challenged": 0, "overturned": 0,
                               "fullName": ump_full, "weakness": None}
        ump_stats[last]["challenged"] += ev["challenged"]
        ump_stats[last]["overturned"] += ev["overturned"]
        if not ump_stats[last].get("fullName"):
            ump_stats[last]["fullName"] = ump_full
        processed_pks.add(gpk)

    # Compute rates
    final_ump = {}
    for last, s in ump_stats.items():
        c = s.get("challenged", 0)
        o = s.get("overturned", 0)
        if c < 3: continue  # min 3 challenges for meaningful rate
        rate = round(o / c, 3) if c > 0 else 0.0
        final_ump[last] = {
            "challenged": c, "overturned": o, "rate": rate,
            "fullName": s.get("fullName",""),
            "weakness": s.get("weakness", None)
        }

    with open(ump_path, "w") as f:
        json.dump({
            "updated": TS,
            "source": "Statcast des + MLB Stats API officials",
            "processed_game_pks": sorted(list(processed_pks)),
            "data": final_ump
        }, f, indent=2)

    top3 = sorted(final_ump.items(), key=lambda x: x[1]["rate"], reverse=True)[:3]
    print(f"  ✅ {len(final_ump)} umpires tracked")
    top3_fmt = [(k, v['rate'], f"{v['overturned']}/{v['challenged']}") for k,v in top3]
    print(f"  Top overturn: {top3_fmt}")

except Exception as e:
    print(f"  ❌ Umpire ABS: {e}")
    import traceback; traceback.print_exc()
