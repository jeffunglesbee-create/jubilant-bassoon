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

# ── 2b. PITCHER xERA (POSTs to generic relay reconcile-sync endpoint,
#        not a local JSON file — first Savant field to flow into
#        change_log rather than a static outbox/mlb/*.json snapshot) ──
# Column names (era, xera) verified live 2026-07-02 via savant-csv-probe.yml
# run 28563922390: real columns are last_name/first_name (combined field,
# same as elsewhere in this script), player_id, year, pa, bip, ba, est_ba,
# est_ba_minus_ba_diff, slg, est_slg, est_slg_minus_slg_diff, woba,
# est_woba, est_woba_minus_woba_diff, era, xera, era_minus_xera_diff.
# Note the pitcher side uses bare "era"/"xera" — NOT the "est_*" prefix
# the batter-side variant of this same endpoint uses for its own expected
# fields (est_ba/est_slg/est_woba) — confirmed via probe, not assumed
# consistent across the two `type=` variants of one endpoint.
print("Fetching pitcher xERA...")
try:
    rows = fetch_csv("https://baseballsavant.mlb.com/leaderboard/expected_statistics"
                     "?type=pitcher&year=2026&min=50&csv=true")
    pitcher_rows = []
    for r in rows:
        name_raw = r.get("last_name, first_name") or r.get("last_name") or ""
        last = name_key(name_raw)
        if not last: continue
        # Check the raw string before conversion — safe_float() never
        # returns None (its own default is 0.0 on missing/invalid input),
        # so `if xera is None` after conversion would be dead code and
        # would silently record a real 0.0 ERA for a pitcher with
        # genuinely missing xera data instead of skipping them.
        if not r.get("xera"): continue
        era  = safe_float(r.get("era"))
        xera = safe_float(r.get("xera"))
        pitcher_rows.append({"id": last, "era": era, "xera": xera})
except Exception as e:
    print(f"  ❌ Savant fetch failed: {e}")
    pitcher_rows = None

if pitcher_rows:
    try:
        # Cloudflare error 1010 ("blocked based on your browser's
        # signature") on the first live attempt (run 28564197874,
        # 2026-07-02) — root cause confirmed via the captured response
        # body, not guessed: this was the ONLY request in this entire
        # script without a User-Agent header (urllib defaults to
        # "Python-urllib/3.x", a well-known bot signature). Every other
        # request here — Savant GETs (HEADERS) and MLB Stats API (
        # MLB_JSON_HEADERS) — already sets one and succeeds.
        req = urllib.request.Request(
            "https://field-relay-nba.jeffunglesbee.workers.dev/savant/sync",
            data=json.dumps({
                "table": "pitcher_expected_stats",
                "rows": pitcher_rows,
                "source": "savant",
                "label": "pitcher_xera",
            }).encode(),
            headers={"Content-Type": "application/json", "User-Agent": HEADERS["User-Agent"]},
            method="POST",
        )
        # 30s timed out twice in a row (runs 28564267039, 28564309809) after
        # the User-Agent fix resolved the earlier Cloudflare 1010 block —
        # the request is getting through, just not completing in time.
        # ~700 pitcher rows written to D1 could plausibly exceed 30s if the
        # relay's reconcile() does synchronous per-row writes rather than a
        # single batch insert. Bumped to 90s as a client-side-only,
        # low-risk adjustment before concluding this needs relay-side
        # investigation (Worker/D1 logs this session has no access to).
        with urllib.request.urlopen(req, timeout=90) as resp:
            result = json.loads(resp.read())
        print(f"  ✅ {len(pitcher_rows)} pitchers posted | relay result: {result}")
    except urllib.error.HTTPError as e:
        # Capture the response BODY, not just the status line — the relay
        # may return a diagnostic JSON error (missing auth, unknown table,
        # payload shape mismatch) that a bare str(e) would discard.
        try:
            body = e.read().decode('utf-8', errors='replace')[:500]
        except Exception:
            body = '<could not read response body>'
        print(f"  ❌ relay POST failed: HTTP {e.code} {e.reason} | body: {body}")
    except Exception as e:
        print(f"  ❌ relay POST failed: {e}")
elif pitcher_rows is not None:
    print("  ⚠️ no pitcher xERA rows parsed")

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
    # pitch-arsenal-stats is LONG format: one row per pitch type per pitcher,
    # not one row per pitcher. Confirmed 2026-05-30 probe (rows:49, real CSV
    # columns: last_name, first_name, player_id, team_name_alt, pitch_type,
    # pitch_name, run_value_per_100, run_value, pitches, pitch_usage, pa, ba,
    # slg, woba, whiff_percent, k_percent, put_away, est_ba, est_slg,
    # est_woba, hard_hit_percent). There is no velocity column in this
    # dataset — run_value_per_100 is used instead as the pitch-quality metric.
    # pitch_usage and whiff_percent are 0-100 percentages (not 0-1 fractions),
    # confirmed from probe sample row (Gausman FF: pitch_usage=53.3).
    rows = fetch_csv("https://baseballsavant.mlb.com/leaderboard/pitch-arsenal-stats"
                     "?type=pitcher&year=2026&min=100&csv=true")
    arsenals = {}
    for r in rows:
        name_raw = r.get("last_name, first_name") or r.get("last_name") or ""
        last = name_key(name_raw)
        if not last: continue
        pitch_type = r.get("pitch_name") or r.get("pitch_type") or ""
        if not pitch_type: continue
        usage = safe_float(r.get("pitch_usage"))
        whiff = r.get("whiff_percent")
        rv100 = safe_float(r.get("run_value_per_100"))
        if usage <= 3:  # pitch_usage is a 0-100 percentage; skip negligible pitch types
            continue
        arsenals.setdefault(last, {"team": r.get("team_name_alt","").strip(), "pitches": []})
        arsenals[last]["pitches"].append({
            "type": pitch_type,
            "usage": round(usage / 100, 3),
            "whiffRate": round(safe_float(whiff) / 100, 3) if whiff not in (None, "") else None,
            "runValuePer100": rv100,
        })
    for v in arsenals.values():
        v["pitches"].sort(key=lambda p: p["usage"], reverse=True)
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
    # {game_pk: {date, challenged, overturned, zones}}
    game_events = {}
    for row in sc_rows:
        des = row.get("des", "") or ""
        if not des: continue
        m = challenge_re.search(des)
        if not m: continue
        gpk = (row.get("game_pk") or "").strip()
        gdate = (row.get("game_date") or "").strip()
        if not gpk or gpk in processed_pks: continue
        zone = (row.get("zone") or "").strip()
        if gpk not in game_events:
            game_events[gpk] = {"date": gdate, "challenged": 0, "overturned": 0, "zones": {}}
        game_events[gpk]["challenged"] += 1
        overturned = m.group(1).lower() == "overturned"
        if overturned:
            game_events[gpk]["overturned"] += 1
        if zone:
            z = game_events[gpk]["zones"].setdefault(zone, {"challenged": 0, "overturned": 0})
            z["challenged"] += 1
            if overturned:
                z["overturned"] += 1

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
                               "fullName": ump_full, "weakness": None, "zones": {}}
        ump_stats[last]["challenged"] += ev["challenged"]
        ump_stats[last].setdefault("zones", {})
        for z, zc in ev.get("zones", {}).items():
            uz = ump_stats[last]["zones"].setdefault(z, {"challenged": 0, "overturned": 0})
            uz["challenged"] += zc["challenged"]
            uz["overturned"] += zc["overturned"]
        ump_stats[last]["overturned"] += ev["overturned"]
        if not ump_stats[last].get("fullName"):
            ump_stats[last]["fullName"] = ump_full
        processed_pks.add(gpk)

    # Zone-to-label mapping — verified 2026-07-01 against real ABS challenge
    # rows (workflow run 28554428622, savant-csv-probe.yml, 40-row sample of
    # a real 14-day challenge set): zone number correlates with a consistent
    # plate_x sign (negative=catcher's-left/3B-side, positive=catcher's-
    # right/1B-side, standard Statcast plate_x convention) and plate_z tier
    # (high/mid/low), matching the standard 3x3 strike-zone grid (1-9) plus
    # 4-corner shadow/edge zones (11-14). Directly sampled and confirmed:
    # 1 (neg-x,high), 4 (neg-x,mid), 6 (pos-x,mid), 7 (neg-x,low), 8 (~0-x,low),
    # 9 (pos-x,low), 11 (neg-x,high), 12 (pos-x,high), 14 (pos-x,low).
    # 2/3/5/13 not directly sampled (zero real challenges in the probe
    # window) — filled in by the now-confirmed grid pattern (2=top-center,
    # 3=top-right, 5=heart/center, 13=bottom-left corner), not invented from
    # scratch. Labels use catcher's-eye view (same as every broadcast strike-
    # zone graphic), not batter-handedness-relative terms (inside/outside
    # would be wrong ~half the time since this is a season aggregate mixing
    # LHB/RHB at-bats).
    ZONE_LABELS = {
        "1": "up-left",    "2": "up",         "3": "up-right",
        "4": "left",       "5": "middle",     "6": "right",
        "7": "down-left",  "8": "down",       "9": "down-right",
        "11": "up-left",   "12": "up-right",  "13": "down-left", "14": "down-right",
    }

    # Compute rates
    final_ump = {}
    for last, s in ump_stats.items():
        c = s.get("challenged", 0)
        o = s.get("overturned", 0)
        if c < 3: continue  # min 3 challenges for meaningful rate
        rate = round(o / c, 3) if c > 0 else 0.0
        weakness = None
        zones = s.get("zones", {})
        # Min 2 challenges in a zone to avoid a 1-challenge zone producing a
        # misleading 100% "weakness".
        candidates = [(z, zc["overturned"] / zc["challenged"]) for z, zc in zones.items() if zc["challenged"] >= 2]
        if candidates:
            worst_zone, worst_rate = max(candidates, key=lambda x: x[1])
            if worst_rate > rate:  # only flag if genuinely worse than their overall rate
                weakness = ZONE_LABELS.get(worst_zone, worst_zone)  # fall back to raw zone number if unmapped
        final_ump[last] = {
            "challenged": c, "overturned": o, "rate": rate,
            "fullName": s.get("fullName",""),
            "weakness": weakness,
            "zones": zones,
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
