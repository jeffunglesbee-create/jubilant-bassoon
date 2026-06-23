#!/usr/bin/env python3
"""
FBref Soccer Squad Stats → R2 (multi-league)

Fetches squad-level xG/pressing/passing/GK analytics from FBref for:
  - FIFA World Cup 2026
  - EPL 2025-26, La Liga, Bundesliga, Serie A, Ligue 1

GitHub Actions fetches via DataImpulse residential proxy (FBref blocks
datacenter IPs from both GH Actions and CF Workers since June 2026).
Output written to R2 field-relay-data/soccer/fbref/{league}.json via CF API.

Spec: Sport-Specific × Workers Plus SOCCER-A (extended June 10 2026)
Update cadence: every 3 days during WC group stage; weekly for club leagues
"""

import json, os, re, sys, time, urllib.request
from datetime import datetime, timezone

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://fbref.com/",
}
BASE = "https://fbref.com"

# ── League configs ─────────────────────────────────────────────────────────────
LEAGUES = [
    {
        "name": "FIFA World Cup 2026",
        "comp_id": "1",
        "season": "2026",
        "url_pattern": "single",   # /comps/{id}/{year}/.../{year}-{slug}-Stats
        "slug": "World-Cup",
        "r2_key": "wc2026.json",
        "enabled": True,
    },
    {
        "name": "Premier League 2025-26",
        "comp_id": "9",
        "season": "2025-2026",
        "url_pattern": "double",   # /comps/{id}/{season}/.../{season}-{slug}-Stats
        "slug": "Premier-League",
        "r2_key": "epl.json",
        "enabled": True,
    },
    {
        "name": "La Liga 2025-26",
        "comp_id": "12",
        "season": "2025-2026",
        "url_pattern": "double",
        "slug": "La-Liga",
        "r2_key": "laliga.json",
        "enabled": True,
    },
    {
        "name": "Bundesliga 2025-26",
        "comp_id": "20",
        "season": "2025-2026",
        "url_pattern": "double",
        "slug": "Fussball-Bundesliga",
        "r2_key": "bundesliga.json",
        "enabled": True,
    },
    {
        "name": "Serie A 2025-26",
        "comp_id": "11",
        "season": "2025-2026",
        "url_pattern": "double",
        "slug": "Serie-A",
        "r2_key": "seriea.json",
        "enabled": True,
    },
    {
        "name": "Ligue 1 2025-26",
        "comp_id": "13",
        "season": "2025-2026",
        "url_pattern": "double",
        "slug": "Ligue-1",
        "r2_key": "ligue1.json",
        "enabled": True,
    },
]

def make_url(league, table_type):
    c, s, slug = league["comp_id"], league["season"], league["slug"]
    if league["url_pattern"] == "single":
        return f"{BASE}/en/comps/{c}/{s}/{table_type}/{s}-{slug}-Stats"
    return f"{BASE}/en/comps/{c}/{s}/{table_type}/{s}-{slug}-Stats"

def fetch_html(url, label="", pause=4):
    if label:
        print(f"    {label}...")
    time.sleep(pause)
    proxy_url = os.environ.get("DATAIMPULSE_PROXY", "")
    if proxy_url:
        import subprocess
        cmd = ["curl", "-s", "-f", "--max-time", "30", "--proxy", proxy_url]
        for k, v in HEADERS.items():
            cmd += ["-H", f"{k}: {v}"]
        cmd.append(url)
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            raise Exception(f"curl exit {result.returncode}: {result.stderr.strip()[:200]}")
        return result.stdout
    else:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8", errors="replace")

def parse_squad_table(html, table_id):
    pattern = rf'<table[^>]+id="{re.escape(table_id)}"[^>]*>(.*?)</table>'
    m = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
    if not m:
        return []
    table_html = m.group(1)
    header_rows_m = re.search(r'<thead>(.*?)</thead>', table_html, re.DOTALL)
    if not header_rows_m:
        return []
    all_header_rows = re.findall(r'<tr[^>]*>(.*?)</tr>', header_rows_m.group(1), re.DOTALL)
    header_row = None
    for r in reversed(all_header_rows):
        if 'over_header' not in r:
            header_row = r
            break
    if not header_row:
        header_row = all_header_rows[-1]
    cols = re.findall(r'data-stat="([^"]+)"', header_row)
    if not cols:
        return []
    tbody_m = re.search(r'<tbody>(.*?)</tbody>', table_html, re.DOTALL)
    if not tbody_m:
        return []
    rows = []
    for row_html in re.findall(r'<tr[^>]*>(.*?)</tr>', tbody_m.group(1), re.DOTALL):
        if 'class="spacer"' in row_html or 'thead' in row_html:
            continue
        cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', row_html, re.DOTALL)
        if not cells:
            continue
        clean = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        if len(clean) < len(cols):
            clean += [''] * (len(cols) - len(clean))
        row = dict(zip(cols, clean))
        squad = row.get('squad', '').strip()
        if not squad or squad.lower() in ('squad', ''):
            continue
        rows.append(row)
    return rows

def sf(v, d=None):
    try:
        return round(float(v), 3) if v and v.strip() not in ('', 'N/A', 'n/a') else d
    except:
        return d

def si(v, d=0):
    try:
        return int(float(v)) if v and v.strip() not in ('', 'N/A') else d
    except:
        return d

# ── R2 uploader ────────────────────────────────────────────────────────────────
def upload_to_r2(r2_key, output):
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    api_token  = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    if not account_id or not api_token:
        print(f"    ℹ️  No CF credentials — skipping R2 upload for {r2_key}")
        return
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/buckets/field-relay-data/objects/soccer/fbref/{r2_key}"
    body = json.dumps(output, default=str).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="PUT", headers={
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
        "Content-Length": str(len(body)),
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
            if resp.get("success"):
                print(f"    ✅ R2 upload OK → soccer/fbref/{r2_key}")
            else:
                print(f"    ⚠️  R2 response: {resp.get('errors')}")
    except Exception as e:
        print(f"    ❌ R2 upload failed: {e}")

# ── Process each league ────────────────────────────────────────────────────────
for league in LEAGUES:
    if not league.get("enabled"):
        continue

    name     = league["name"]
    r2_key   = league["r2_key"]
    print(f"\n── {name} ──────────────────────────────────────────")
    stats = {}

    # 1. Shooting: xG for/against
    try:
        html = fetch_html(make_url(league, "shooting"), "Shooting (xG)")
        for row in parse_squad_table(html, "stats_squads_shooting_for"):
            sq = row.get("squad", "")
            if not sq: continue
            if sq not in stats: stats[sq] = {}
            stats[sq]["xGFor"]    = sf(row.get("xg"))
            stats[sq]["goalsFor"] = si(row.get("goals_gk") or row.get("gf"))
            stats[sq]["shots"]    = si(row.get("shots"))
            stats[sq]["shotsOnTarget"] = si(row.get("shots_on_target"))
        for row in parse_squad_table(html, "stats_squads_shooting_against"):
            sq = row.get("squad", "")
            if not sq: continue
            if sq not in stats: stats[sq] = {}
            stats[sq]["xGAgainst"]    = sf(row.get("xg"))
            stats[sq]["goalsAgainst"] = si(row.get("goals_gk") or row.get("ga"))
        print(f"    ✅ Shooting: {len(stats)} squads")
    except Exception as e:
        print(f"    ❌ Shooting: {e}")

    # 2. Misc: pressing, set pieces
    try:
        html = fetch_html(make_url(league, "misc"), "Misc (pressing)")
        for row in parse_squad_table(html, "stats_squads_misc_for"):
            sq = row.get("squad", "")
            if not sq: continue
            if sq not in stats: stats[sq] = {}
            stats[sq]["pressures"]       = si(row.get("pressures"))
            stats[sq]["pressureSuccess"] = sf(row.get("pressure_regains") or row.get("pressures_succ"))
            stats[sq]["setpieceGoals"]   = si(row.get("corner_kick_goals") or row.get("goal_kick_goals"))
        print(f"    ✅ Misc: OK")
    except Exception as e:
        print(f"    ❌ Misc: {e}")

    # 3. Passing: progressive passes, completion
    try:
        html = fetch_html(make_url(league, "passing"), "Passing")
        for row in parse_squad_table(html, "stats_squads_passing_for"):
            sq = row.get("squad", "")
            if not sq: continue
            if sq not in stats: stats[sq] = {}
            stats[sq]["progressivePasses"] = si(row.get("progressive_passes") or row.get("prog"))
            stats[sq]["passCompletion"]    = sf(row.get("passes_pct") or row.get("cmp_pct"))
            stats[sq]["keyPasses"]         = si(row.get("assisted_shots") or row.get("kp"))
        print(f"    ✅ Passing: OK")
    except Exception as e:
        print(f"    ❌ Passing: {e}")

    # 4. GK: PSxG, save%, clean sheets
    try:
        html = fetch_html(make_url(league, "keepers"), "GK (PSxG)")
        for row in parse_squad_table(html, "stats_squads_keeper_for"):
            sq = row.get("squad", "")
            if not sq: continue
            if sq not in stats: stats[sq] = {}
            stats[sq]["psxgDiff"]    = sf(row.get("psxg_net") or row.get("psxg_plus_minus"))
            stats[sq]["svPct"]       = sf(row.get("save_pct") or row.get("save%") or row.get("sv_pct"))
            stats[sq]["cleanSheets"] = si(row.get("clean_sheets") or row.get("cs"))
        print(f"    ✅ GK: OK")
    except Exception as e:
        print(f"    ❌ GK: {e}")

    # Derive xGDivergence
    for sq, s in stats.items():
        xgf = s.get("xGFor")
        gf  = s.get("goalsFor")
        if xgf is not None and gf is not None:
            s["xGDivergence"] = round(gf - xgf, 3)

    team_count = len([k for k,v in stats.items() if any(v.values())])
    print(f"    {team_count} squads with data")

    output = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "competition": name,
        "season": league["season"],
        "source": "FBref squad stats via GH Actions + residential proxy",
        "schema": {
            "xGFor": "Expected goals from attack",
            "xGAgainst": "Expected goals conceded",
            "xGDivergence": "Actual goals minus xG (positive = over-performing)",
            "pressures": "Total pressing events",
            "progressivePasses": "Progressive passes toward goal",
            "psxgDiff": "Post-shot xG differential (GK quality)",
        },
        "teams": stats,
    }

    # Write local fallback
    os.makedirs("outbox/soccer", exist_ok=True)
    with open(f"outbox/soccer/{r2_key}", "w") as f:
        json.dump(output, f, indent=2, default=str)
    print(f"    ✅ Written to outbox/soccer/{r2_key}")

    if team_count > 0:
        upload_to_r2(r2_key, output)
    else:
        print(f"    ⚠️  Rule 77: skipping R2 upload (0 squads)")
    time.sleep(5)  # politeness between leagues

print(f"\n── Done {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} ──")
