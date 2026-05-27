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

NOTE — umpire ABS not automated:
  challengeType=umpire defaults to batter data in Savant CSV API.
  Umpire overturn data not exposed in CSV export endpoints.
  Manual update required: baseballsavant.mlb.com/leaderboard/abs-challenges (Umpire tab)
  or ESPN ABS tracker. Update UMPIRE_ABS_RATINGS in index.html weekly.
"""
import csv, io, json, os, urllib.request
from datetime import datetime, timezone

HEADERS = {"User-Agent":"Mozilla/5.0 (compatible; FIELD-MLB-Updater/1.0)","Accept":"text/csv,*/*"}
TS = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

def fetch_csv(url, label=""):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
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


# ── 6. UMPIRE ABS — multi-source scraper ────────────────────────────────────
# Savant CSV is broken for hp_umpire (server crash on 'strikeout' property).
# Strategy: try Savant HTML page first, fall back to ESPN ABS tracker.
# Key format: last name only (matches getUmpireABSRating(lastName) in FIELD).
print("Fetching umpire ABS (Savant HTML → ESPN fallback)...")
try:
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        import subprocess, sys
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'beautifulsoup4',
                        '--quiet', '--break-system-packages'], check=True)
        from bs4 import BeautifulSoup

    # Carry forward zone weakness from previous run (no source provides zone data)
    existing = {}
    if os.path.exists("outbox/mlb/umpire_abs.json"):
        try:
            prev = json.load(open("outbox/mlb/umpire_abs.json"))
            existing = prev.get("data", {})
        except: pass

    def parse_umpire_table(html, source_label):
        """Parse umpire data from HTML. Returns dict keyed by last name."""
        soup = BeautifulSoup(html, 'html.parser')
        result = {}
        tables = soup.find_all('table')
        print(f"    [{source_label}] found {len(tables)} tables in HTML")
        # Find umpire table — look for one with overturn/challenged columns
        for table in tables:
            rows = table.find_all('tr')
            if not rows: continue
            hdr = rows[0].get_text(' ', strip=True).lower()
            # Must have overturn/challenge info but NOT team (teams table) or BA (batter table)
            if ('overturn' in hdr or 'chal' in hdr) and 'team' not in hdr and ' ba ' not in hdr:
                print(f"    [{source_label}] candidate table header: {hdr[:80]}")
                for row in rows[1:]:
                    cells = [td.get_text(strip=True) for td in row.find_all('td')]
                    if len(cells) < 3: continue
                    try:
                        # Try to find name in first few cells
                        name = ''
                        for c in cells[:3]:
                            if c and not c.isdigit() and len(c) > 2:
                                name = c; break
                        if not name: continue
                        # Parse numbers — find challenged, overturned, rate
                        nums = []
                        for c in cells:
                            v = c.replace('%','').strip()
                            try: nums.append(float(v))
                            except: nums.append(None)
                        # Heuristic: challenged is usually 3rd+ column, small int
                        # Rate is usually a value 0-100 or 0.0-1.0
                        challenged = next((int(n) for n in nums if n is not None and 3<=n<=50), 0)
                        overturned = 0
                        rate = 0.0
                        # Find rate (0-100 or 0.0-1.0 range)
                        for n in nums:
                            if n is None: continue
                            if 0 < n <= 1.0: rate = n; break
                            if 1 < n <= 100: rate = n/100; break
                        if challenged >= 3:
                            name_parts = [p for p in name.split() if not p.isdigit()]
                            last = name_parts[-1].lower().replace('.','').replace("'",'') if name_parts else ''
                            if last and len(last) > 2:
                                weakness = existing.get(last, {}).get('weakness', None)
                                result[last] = {
                                    'challenged': challenged,
                                    'overturned': int(challenged * rate + 0.5),
                                    'rate': round(rate, 3),
                                    'pitchesCalled': 0,
                                    'weakness': weakness,
                                    'displayName': name,
                                }
                    except: continue
        return result

    BROWSER_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

    umpire_abs = {}
    source_used = None

    # ── Attempt 1: Savant HTML page (hp_umpire challenge type) ──
    try:
        savant_url = ("https://baseballsavant.mlb.com/leaderboard/abs-challenges"
                      "?gameType=regular&groupBy=is_strike_calc&year=2026"
                      "&challengeType=hp_umpire&level=mlb&minChal=1")
        req = urllib.request.Request(savant_url, headers={
            "User-Agent": BROWSER_UA, "Accept": "text/html,*/*",
            "Accept-Language": "en-US,en;q=0.9",
        })
        with urllib.request.urlopen(req, timeout=25) as r:
            html = r.read().decode('utf-8', errors='replace')
        print(f"    Savant HTML: HTTP {r.status}, {len(html)} chars")
        parsed = parse_umpire_table(html, "Savant")
        if len(parsed) >= 10:
            umpire_abs = parsed
            source_used = "Savant HTML"
            print(f"    Savant parse: {len(parsed)} umpires")
        else:
            print(f"    Savant parse: only {len(parsed)} umpires — trying ESPN")
    except Exception as e:
        print(f"    Savant HTML failed: {e}")

    # ── Attempt 2: ESPN ABS Tracker ──
    if not umpire_abs:
        try:
            espn_url = ("https://www.espn.com/mlb/story/_/id/48305211"
                        "/2026-mlb-abs-challenge-system-tracker-team-player-rankings")
            req = urllib.request.Request(espn_url, headers={
                "User-Agent": BROWSER_UA,
                "Accept": "text/html,application/xhtml+xml,*/*",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.espn.com/mlb/",
            })
            with urllib.request.urlopen(req, timeout=25) as r:
                html = r.read().decode('utf-8', errors='replace')
            print(f"    ESPN HTML: HTTP {r.status}, {len(html)} chars")
            # Save a debug snippet to help diagnose parse failures
            with open("outbox/mlb/umpire_debug.txt", "w") as dbg:
                # Find section around "Umpire" keyword
                idx = html.lower().find('umpire')
                snippet = html[max(0,idx-200):idx+2000] if idx >= 0 else html[:2000]
                dbg.write(f"URL: {espn_url}\nHTTP: {r.status}\n\n{snippet}")
            parsed = parse_umpire_table(html, "ESPN")
            if len(parsed) >= 5:
                umpire_abs = parsed
                source_used = "ESPN ABS Tracker"
                print(f"    ESPN parse: {len(parsed)} umpires")
            else:
                print(f"    ESPN parse: only {len(parsed)} — see outbox/mlb/umpire_debug.txt")
        except Exception as e:
            print(f"    ESPN failed: {e}")

    if umpire_abs:
        with open("outbox/mlb/umpire_abs.json", "w") as f:
            json.dump({"updated": TS, "source": source_used, "data": umpire_abs}, f, indent=2)
        watch = [k for k,v in umpire_abs.items() if v['rate'] >= 0.65]
        print(f"  ✅ {len(umpire_abs)} umpires | source: {source_used} | watch: {watch}")
    else:
        print(f"  ⚠️  All umpire sources failed. See outbox/mlb/umpire_debug.txt if exists.")
        print(f"      Fallback: hardcoded UMPIRE_ABS_RATINGS in index.html stays active.")

except Exception as e:
    print(f"  ⚠️  Umpire scraper outer error: {e}")

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
