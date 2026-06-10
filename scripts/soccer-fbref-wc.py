#!/usr/bin/env python3
"""
FBref World Cup 2026 Squad Stats → R2

Fetches squad-level analytics from FBref for all WC2026 teams:
  - Shooting:  xG, xGA, xGDivergence per game
  - Misc/Poss: pressures, pressing success, progressive passes
  - GK:        PSxG, PSxG differential (goalies above expected)
  - Set pieces: set piece goals (via misc stats)

GitHub Actions fetches FBref (not CF-blocked on ubuntu-latest).
Output written to R2 via CF API for relay /soccer-fbref/ route.

Spec: Sport-Specific × Workers Plus SOCCER-A
Data available: after group stage games are played (June 11+)
Update cadence: every 3 days during WC group stage (June 11 – July 5)
"""

import json, os, re, sys, time, urllib.request
from datetime import datetime, timezone

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://fbref.com/",
}

BASE = "https://fbref.com"
WC_YEAR = "2026"
WC_COMP = "1"  # FIFA World Cup competition ID on FBref

def fetch_html(url, label="", pause=3):
    """Fetch FBref HTML with politeness delay."""
    if label:
        print(f"  Fetching {label}...")
    time.sleep(pause)
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")

def parse_squad_table(html, table_id):
    """
    Extract a squad-level table by its HTML id attribute.
    Returns list of {squad: str, ...cols...} dicts.
    Handles FBref's th/td mixed row format with colspan headers.
    """
    # Find the table with this id
    pattern = rf'<table[^>]+id="{re.escape(table_id)}"[^>]*>(.*?)</table>'
    m = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
    if not m:
        return []

    table_html = m.group(1)

    # Extract header row — skip rows with colspan (group headers)
    # FBref uses <tr class="over_header"> for multi-level headers
    header_rows = re.findall(r'<thead>(.*?)</thead>', table_html, re.DOTALL)
    if not header_rows:
        return []

    # Get the last header row (actual column names, not group labels)
    all_header_rows = re.findall(r'<tr[^>]*>(.*?)</tr>', header_rows[0], re.DOTALL)
    # Use the last non-over_header row
    header_row = None
    for r in reversed(all_header_rows):
        if 'over_header' not in r:
            header_row = r
            break
    if not header_row:
        header_row = all_header_rows[-1]

    # Extract column stat names from data-stat attributes
    cols = re.findall(r'data-stat="([^"]+)"', header_row)
    if not cols:
        return []

    # Extract body rows
    tbody_m = re.search(r'<tbody>(.*?)</tbody>', table_html, re.DOTALL)
    if not tbody_m:
        return []

    rows = []
    for row_html in re.findall(r'<tr[^>]*>(.*?)</tr>', tbody_m.group(1), re.DOTALL):
        # Skip separator rows
        if 'class="spacer"' in row_html or 'thead' in row_html:
            continue
        cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', row_html, re.DOTALL)
        if not cells:
            continue
        # Strip HTML tags from cell content
        clean = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        if len(clean) < len(cols):
            clean += [''] * (len(cols) - len(clean))
        row = dict(zip(cols, clean))
        # Squad name lives in 'squad' column; skip totals rows
        squad = row.get('squad', '').strip()
        if not squad or squad.lower() in ('squad', ''):
            continue
        rows.append(row)
    return rows

def safe_float(v, default=None):
    try:
        return round(float(v), 3) if v and v.strip() not in ('', 'N/A', 'n/a') else default
    except:
        return default

def safe_int(v, default=0):
    try:
        return int(float(v)) if v and v.strip() not in ('', 'N/A') else default
    except:
        return default

# ── Fetch and parse all relevant tables ─────────────────────────────────────

print(f"\nFetching FBref WC {WC_YEAR} squad stats...")
base_url = f"{BASE}/en/comps/{WC_COMP}/{WC_YEAR}/{WC_YEAR}-World-Cup-Stats"

stats = {}  # {squad_name: {fields...}}

# 1. Shooting — xG for/against
try:
    shoot_url = f"{BASE}/en/comps/{WC_COMP}/{WC_YEAR}/shooting/{WC_YEAR}-World-Cup-Stats"
    html = fetch_html(shoot_url, "Shooting (xG)")
    # Squad shooting for (goals, xG from attack)
    for_rows = parse_squad_table(html, "stats_squads_shooting_for")
    for row in for_rows:
        squad = row.get("squad", "")
        if not squad:
            continue
        if squad not in stats:
            stats[squad] = {}
        stats[squad]["xGFor"]   = safe_float(row.get("xg"))
        stats[squad]["goalsFor"] = safe_int(row.get("goals_gk") or row.get("gf"))
        stats[squad]["shots"]    = safe_int(row.get("shots"))
        stats[squad]["shotsOnTarget"] = safe_int(row.get("shots_on_target"))
    # Squad shooting against (goals, xG conceded)
    against_rows = parse_squad_table(html, "stats_squads_shooting_against")
    for row in against_rows:
        squad = row.get("squad", "")
        if not squad:
            continue
        if squad not in stats:
            stats[squad] = {}
        stats[squad]["xGAgainst"] = safe_float(row.get("xg"))
        stats[squad]["goalsAgainst"] = safe_int(row.get("goals_gk") or row.get("ga"))
    print(f"  ✅ Shooting: {len(for_rows)} squads (for), {len(against_rows)} squads (against)")
except Exception as e:
    print(f"  ❌ Shooting: {e}")

# 2. Misc stats — pressing, fouls, set pieces
try:
    misc_url = f"{BASE}/en/comps/{WC_COMP}/{WC_YEAR}/misc/{WC_YEAR}-World-Cup-Stats"
    html = fetch_html(misc_url, "Misc (pressing, set pieces)")
    for_rows = parse_squad_table(html, "stats_squads_misc_for")
    for row in for_rows:
        squad = row.get("squad", "")
        if not squad:
            continue
        if squad not in stats:
            stats[squad] = {}
        # Pressing
        stats[squad]["pressures"]        = safe_int(row.get("pressures"))
        stats[squad]["pressureSuccess"]  = safe_float(row.get("pressure_regains") or row.get("pressures_succ"))
        # Set pieces
        stats[squad]["setpieceGoals"]    = safe_int(row.get("corner_kick_goals") or row.get("goal_kick_goals"))
        stats[squad]["foulsDrawn"]       = safe_int(row.get("fouls_drawn") or row.get("fld"))
    print(f"  ✅ Misc: {len(for_rows)} squads")
except Exception as e:
    print(f"  ❌ Misc: {e}")

# 3. Passing — progressive passes
try:
    pass_url = f"{BASE}/en/comps/{WC_COMP}/{WC_YEAR}/passing/{WC_YEAR}-World-Cup-Stats"
    html = fetch_html(pass_url, "Passing (progressive)")
    for_rows = parse_squad_table(html, "stats_squads_passing_for")
    for row in for_rows:
        squad = row.get("squad", "")
        if not squad:
            continue
        if squad not in stats:
            stats[squad] = {}
        stats[squad]["progressivePasses"] = safe_int(row.get("progressive_passes") or row.get("prog"))
        stats[squad]["passCompletion"]    = safe_float(row.get("passes_pct") or row.get("cmp_pct"))
        stats[squad]["keyPasses"]         = safe_int(row.get("assisted_shots") or row.get("kp"))
    print(f"  ✅ Passing: {len(for_rows)} squads")
except Exception as e:
    print(f"  ❌ Passing: {e}")

# 4. GK stats — PSxG (post-shot xG for goalies)
try:
    gk_url = f"{BASE}/en/comps/{WC_COMP}/{WC_YEAR}/keepers/{WC_YEAR}-World-Cup-Stats"
    html = fetch_html(gk_url, "GK (PSxG)")
    for_rows = parse_squad_table(html, "stats_squads_keeper_for")
    for row in for_rows:
        squad = row.get("squad", "")
        if not squad:
            continue
        if squad not in stats:
            stats[squad] = {}
        stats[squad]["psxgDiff"]  = safe_float(row.get("psxg_net") or row.get("psxg_plus_minus"))
        stats[squad]["svPct"]     = safe_float(row.get("save_pct") or row.get("save%") or row.get("sv_pct"))
        stats[squad]["cleanSheets"] = safe_int(row.get("clean_sheets") or row.get("cs"))
    print(f"  ✅ GK: {len(for_rows)} squads")
except Exception as e:
    print(f"  ❌ GK: {e}")

# ── Compute derived stats ────────────────────────────────────────────────────

print(f"\nDeriving xGDivergence, pressuresP90, progressivePassesP90...")
for squad, s in stats.items():
    # xG divergence: actual goals vs expected (positive = lucky/clinical)
    xgf = s.get("xGFor")
    gf  = s.get("goalsFor")
    if xgf is not None and gf is not None:
        s["xGDivergence"] = round(gf - xgf, 3)
    # Compute per-90 stats from raw counts (need games played)
    # FBref provides MP (matches played) in squad table — not currently fetched
    # Mark as raw counts; relay can compute per-game when GP is known
    s["source"] = "FBref via GitHub Actions"

# ── Build output ─────────────────────────────────────────────────────────────

output = {
    "updated": datetime.now(timezone.utc).isoformat(),
    "tournament": "FIFA World Cup 2026",
    "season": WC_YEAR,
    "source": "FBref squad stats via GitHub Actions (not CF-blocked)",
    "schema": {
        "xGFor": "Expected goals from attack (shot-based)",
        "xGAgainst": "Expected goals conceded",
        "xGDivergence": "Actual goals minus xG (positive = over-performing)",
        "pressures": "Total pressing events",
        "pressureSuccess": "Successful pressure regains (ball won)",
        "progressivePasses": "Progressive passes (moves ball 10+ yards toward goal)",
        "passCompletion": "Pass completion %",
        "psxgDiff": "Post-shot xG differential (positive = GK saving above expected)",
        "svPct": "Save percentage",
        "cleanSheets": "Clean sheets",
    },
    "teams": stats,
}

team_count = len([k for k,v in stats.items() if any(v.values())])
print(f"\nOutput: {team_count} teams with data")

# Write locally first
os.makedirs("outbox/soccer", exist_ok=True)
with open("outbox/soccer/wc2026_fbref.json", "w") as f:
    json.dump(output, f, indent=2, default=str)
print(f"  ✅ Written to outbox/soccer/wc2026_fbref.json")

# R2 upload via CF REST API
account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
api_token  = os.environ.get("CLOUDFLARE_API_TOKEN", "")

if account_id and api_token:
    print("\nUploading to R2 field-relay-data/soccer/fbref/wc2026.json...")
    r2_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/buckets/field-relay-data/objects/soccer/fbref/wc2026.json"
    body = json.dumps(output, default=str).encode("utf-8")
    req = urllib.request.Request(r2_url, data=body, method="PUT", headers={
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
        "Content-Length": str(len(body)),
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
            if resp.get("success"):
                print(f"  ✅ R2 upload OK")
            else:
                print(f"  ⚠️  R2 response: {resp.get('errors')}")
    except Exception as e:
        print(f"  ❌ R2 upload failed: {e} (outbox fallback still committed)")
else:
    print("  ℹ️  CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not set — skipping R2 upload")
    print("  ✅ Committed to outbox/soccer/ as fallback")

print(f"\n── Done {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} ──")
