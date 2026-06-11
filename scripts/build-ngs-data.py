#!/usr/bin/env python3
"""
nflverse NGS + Injuries → R2 (NFL-B)

Fetches nflverse combined parquet files from GitHub releases:
  - nextgen_stats/ngs_passing.parquet   → nfl/{year}/ngs-passing.json
  - nextgen_stats/ngs_receiving.parquet → nfl/{year}/ngs-receiving.json
  - nextgen_stats/ngs_rushing.parquet   → nfl/{year}/ngs-rushing.json
  - injuries/injuries_{year}.parquet    → nfl/{year}/nfl-injuries.json

Key discovery: nflreadpy uses combined parquets (all seasons 2016-present in
one file, tag=nextgen_stats), not per-year CSVs. CF Workers can't parse
parquet, so this runs in GitHub Actions (ubuntu-latest) with pyarrow.

Writes to R2 FIELD_DATA bucket at nfl/{year}/*.json
Falls back to outbox/nfl/ for relay GitHub raw fallback path.

Spec: NFL-B (nflverse parquet pipeline)
Run: Weekly Monday 07:00 UTC (day after nflverse updates on Tue night)
"""

import io, json, os, sys, urllib.request
from datetime import datetime, timezone

import pyarrow.parquet as pq
import pyarrow as pa

NFLVERSE_BASE = "https://github.com/nflverse/nflverse-data/releases/download"
HEADERS = {
    "User-Agent": "FIELD-Sports-Intelligence/1.0",
    "Accept": "application/octet-stream",
}

def fetch_parquet(url):
    """Fetch a parquet file from URL and return as pyarrow Table."""
    print(f"  → Fetching {url.split('/')[-1]} ...")
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    print(f"    {len(data):,} bytes")
    return pq.read_table(io.BytesIO(data))

def safe_float(v, decimals=3):
    """Convert to rounded float or None."""
    if v is None:
        return None
    try:
        f = float(v)
        import math
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, decimals)
    except (TypeError, ValueError):
        return None

def safe_int(v, default=0):
    """Convert to int or default."""
    try:
        return int(v) if v is not None else default
    except (TypeError, ValueError):
        return default

def upload_to_r2(r2_key, payload):
    """Upload JSON to FIELD_DATA R2 bucket."""
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    api_token  = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    if not account_id or not api_token:
        print(f"    ℹ️  No CF credentials — skipping R2 for {r2_key}")
        return
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/buckets/field-relay-data/objects/{r2_key}"
    body = json.dumps(payload, default=str).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="PUT", headers={
        "Authorization": f"Bearer {api_token}",
        "Content-Type":  "application/json",
        "Content-Length": str(len(body)),
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
            if resp.get("success"):
                print(f"    ✅ R2 OK → {r2_key}")
            else:
                print(f"    ⚠️  R2 error: {resp.get('errors')}")
    except Exception as e:
        print(f"    ❌ R2 upload failed: {e}")

def write_outbox(filename, payload):
    """Write JSON to outbox/nfl/ for GitHub raw fallback."""
    os.makedirs("outbox/nfl", exist_ok=True)
    path = f"outbox/nfl/{filename}"
    with open(path, "w") as f:
        json.dump(payload, f, separators=(",", ":"), default=str)
    print(f"    📄 outbox → {path} ({os.path.getsize(path):,} bytes)")

# ── 1. NGS Passing ─────────────────────────────────────────────────────────────
def build_ngs_passing(year):
    print("\n[NGS Passing]")
    url = f"{NFLVERSE_BASE}/nextgen_stats/ngs_passing.parquet"
    tbl = fetch_parquet(url)
    df  = tbl.to_pydict()

    seasons = df.get("season", [])
    max_season = max((s for s in seasons if s), default=0)
    print(f"    Seasons: {sorted(set(seasons))} → using {max_season}")

    data = {}
    n = len(seasons)
    for i in range(n):
        s = seasons[i]
        if s != max_season:
            continue
        pid = (df.get("player_gsis_id") or [None] * n)[i]
        if not pid:
            continue
        # Latest week per player within season (season summary = week 0)
        week = safe_int((df.get("week") or [0] * n)[i])
        existing = data.get(pid)
        if existing and existing.get("_week", -1) > week:
            continue
        data[pid] = {
            "_week": week,
            "name":               str((df.get("player_display_name") or [""] * n)[i] or ""),
            "team":               str((df.get("team_abbr") or [""] * n)[i] or ""),
            "season":             max_season,
            "cpoe":               safe_float((df.get("completion_percentage_above_expectation") or [None] * n)[i]),
            "aggressiveness":     safe_float((df.get("aggressiveness") or [None] * n)[i]),
            "avgTimeToThrow":     safe_float((df.get("avg_time_to_throw") or [None] * n)[i]),
            "avgCompletedAirYards": safe_float((df.get("avg_completed_air_yards") or [None] * n)[i]),
            "avgAirYardsDiff":    safe_float((df.get("avg_air_yards_differential") or [None] * n)[i]),
            "avgAirYardsToSticks": safe_float((df.get("avg_air_yards_to_sticks") or [None] * n)[i]),
            "attempts":           safe_int((df.get("attempts") or [0] * n)[i]),
            "xCompPct":           safe_float((df.get("expected_completion_percentage") or [None] * n)[i]),
        }
    # Strip internal key
    for v in data.values():
        v.pop("_week", None)

    print(f"    Players: {len(data)}")
    return data

# ── 2. NGS Receiving ───────────────────────────────────────────────────────────
def build_ngs_receiving(year):
    print("\n[NGS Receiving]")
    url = f"{NFLVERSE_BASE}/nextgen_stats/ngs_receiving.parquet"
    tbl = fetch_parquet(url)
    df  = tbl.to_pydict()

    seasons = df.get("season", [])
    max_season = max((s for s in seasons if s), default=0)
    print(f"    Seasons: {sorted(set(seasons))} → using {max_season}")

    data = {}
    n = len(seasons)
    for i in range(n):
        if seasons[i] != max_season:
            continue
        pid = (df.get("player_gsis_id") or [None] * n)[i]
        if not pid:
            continue
        week = safe_int((df.get("week") or [0] * n)[i])
        existing = data.get(pid)
        if existing and existing.get("_week", -1) > week:
            continue
        data[pid] = {
            "_week": week,
            "name":               str((df.get("player_display_name") or [""] * n)[i] or ""),
            "team":               str((df.get("team_abbr") or [""] * n)[i] or ""),
            "season":             max_season,
            # Separation at time of catch/incompletion — key metric
            "avgSeparation":      safe_float((df.get("avg_separation") or [None] * n)[i]),
            # Cushion = distance from defender at snap
            "avgCushion":         safe_float((df.get("avg_cushion") or [None] * n)[i]),
            # YAC vs expectation
            "avgYAC":             safe_float((df.get("avg_yac") or [None] * n)[i]),
            "avgExpectedYAC":     safe_float((df.get("avg_expected_yac") or [None] * n)[i]),
            "avgYACAboveExp":     safe_float((df.get("avg_yac_above_expectation") or [None] * n)[i]),
            # Target share of team's deep passing
            "pctShareIntendedAirYards": safe_float((df.get("percent_share_of_intended_air_yards") or [None] * n)[i]),
            "targets":            safe_int((df.get("targets") or [0] * n)[i]),
            "receptions":         safe_int((df.get("receptions") or [0] * n)[i]),
            "catchPct":           safe_float((df.get("catch_percentage") or [None] * n)[i]),
        }
    for v in data.values():
        v.pop("_week", None)

    print(f"    Players: {len(data)}")
    return data

# ── 3. NGS Rushing ─────────────────────────────────────────────────────────────
def build_ngs_rushing(year):
    print("\n[NGS Rushing]")
    url = f"{NFLVERSE_BASE}/nextgen_stats/ngs_rushing.parquet"
    tbl = fetch_parquet(url)
    df  = tbl.to_pydict()

    seasons = df.get("season", [])
    max_season = max((s for s in seasons if s), default=0)
    print(f"    Seasons: {sorted(set(seasons))} → using {max_season}")

    data = {}
    n = len(seasons)
    for i in range(n):
        if seasons[i] != max_season:
            continue
        pid = (df.get("player_gsis_id") or [None] * n)[i]
        if not pid:
            continue
        week = safe_int((df.get("week") or [0] * n)[i])
        existing = data.get(pid)
        if existing and existing.get("_week", -1) > week:
            continue
        data[pid] = {
            "_week": week,
            "name":               str((df.get("player_display_name") or [""] * n)[i] or ""),
            "team":               str((df.get("team_abbr") or [""] * n)[i] or ""),
            "season":             max_season,
            # North/south metric: lower = more straight-line, higher = more lateral
            "efficiency":         safe_float((df.get("efficiency") or [None] * n)[i]),
            # % of carries facing 8+ defenders in box
            "pctVsStacked":       safe_float((df.get("percent_attempts_gte_eight_defenders") or [None] * n)[i]),
            # Time behind LOS before crossing
            "avgTimeToLOS":       safe_float((df.get("avg_time_to_los") or [None] * n)[i]),
            # Rush yards over expectation (RYOE)
            "rushYdsOverExp":     safe_float((df.get("rush_yards_over_expected") or [None] * n)[i]),
            "rushYdsOverExpPerAtt": safe_float((df.get("rush_yards_over_expected_per_att") or [None] * n)[i]),
            "expectedRushYds":    safe_float((df.get("expected_rush_yards") or [None] * n)[i]),
            "rushAttempts":       safe_int((df.get("rush_attempts") or [0] * n)[i]),
        }
    for v in data.values():
        v.pop("_week", None)

    print(f"    Players: {len(data)}")
    return data

# ── 4. NFL Injuries ────────────────────────────────────────────────────────────
def build_injuries(year):
    print(f"\n[NFL Injuries {year}]")
    url = f"{NFLVERSE_BASE}/injuries/injuries_{year}.parquet"
    try:
        tbl = fetch_parquet(url)
    except Exception as e:
        print(f"    ⚠️  Could not fetch injuries_{year}: {e}")
        return {}

    df = tbl.to_pydict()
    n  = len(df.get("season", []))

    # Build: { "player_id": { name, team, week, injury, status, practice } }
    # Keep only most recent week entry per player
    data = {}
    weeks = df.get("week") or [0] * n
    for i in range(n):
        pid = (df.get("gsis_id") or [None] * n)[i]
        if not pid:
            continue
        week = safe_int(weeks[i])
        existing = data.get(pid)
        if existing and existing.get("week", 0) >= week:
            continue

        status = str((df.get("report_status") or [""] * n)[i] or "")
        injury = str((df.get("report_primary_injury") or [""] * n)[i] or "")
        practice = str((df.get("practice_primary_injury") or [""] * n)[i] or "")

        # Only store players with an actual report
        if not status and not injury and not practice:
            continue

        data[pid] = {
            "name":     str((df.get("full_name") or [""] * n)[i] or ""),
            "team":     str((df.get("team") or [""] * n)[i] or ""),
            "position": str((df.get("position") or [""] * n)[i] or ""),
            "week":     week,
            "injury":   injury,
            "practice": practice,
            "status":   status,   # Out / Questionable / Doubtful / IR / ""
        }

    # Summary counts for logging
    statuses = [v["status"] for v in data.values() if v["status"]]
    from collections import Counter
    counts = Counter(statuses)
    print(f"    Players with reports: {len(data)}  {dict(counts)}")
    return data

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    # Determine active NFL year (current or most recent season)
    now = datetime.now(timezone.utc)
    # NFL season year = calendar year for Sept-Feb, previous year for Mar-Aug
    year = now.year if now.month >= 8 else now.year - 1
    print(f"NFL-B Pipeline — target year: {year}")
    print(f"Timestamp: {now.isoformat()}")

    updated = now.isoformat()
    results = {}

    # NGS Passing
    try:
        passing = build_ngs_passing(year)
        payload = {"updated": updated, "season": year, "source": "nflverse NGS parquet", "data": passing}
        upload_to_r2(f"nfl/{year}/ngs-passing.json", payload)
        write_outbox("ngs-passing.json", payload)
        results["ngs-passing"] = {"ok": True, "count": len(passing)}
    except Exception as e:
        print(f"  ❌ NGS Passing failed: {e}")
        results["ngs-passing"] = {"ok": False, "error": str(e)}

    # NGS Receiving
    try:
        receiving = build_ngs_receiving(year)
        payload = {"updated": updated, "season": year, "source": "nflverse NGS parquet", "data": receiving}
        upload_to_r2(f"nfl/{year}/ngs-receiving.json", payload)
        write_outbox("ngs-receiving.json", payload)
        results["ngs-receiving"] = {"ok": True, "count": len(receiving)}
    except Exception as e:
        print(f"  ❌ NGS Receiving failed: {e}")
        results["ngs-receiving"] = {"ok": False, "error": str(e)}

    # NGS Rushing
    try:
        rushing = build_ngs_rushing(year)
        payload = {"updated": updated, "season": year, "source": "nflverse NGS parquet", "data": rushing}
        upload_to_r2(f"nfl/{year}/ngs-rushing.json", payload)
        write_outbox("ngs-rushing.json", payload)
        results["ngs-rushing"] = {"ok": True, "count": len(rushing)}
    except Exception as e:
        print(f"  ❌ NGS Rushing failed: {e}")
        results["ngs-rushing"] = {"ok": False, "error": str(e)}

    # Injuries
    try:
        injuries = build_injuries(year)
        payload = {"updated": updated, "season": year, "source": "nflverse injuries parquet", "data": injuries}
        upload_to_r2(f"nfl/{year}/nfl-injuries.json", payload)
        write_outbox("nfl-injuries.json", payload)
        results["nfl-injuries"] = {"ok": True, "count": len(injuries)}
    except Exception as e:
        print(f"  ❌ Injuries failed: {e}")
        results["nfl-injuries"] = {"ok": False, "error": str(e)}

    # Summary
    succeeded = sum(1 for r in results.values() if r.get("ok"))
    print(f"\n{'='*50}")
    print(f"NFL-B complete: {succeeded}/{len(results)} succeeded")
    for name, r in results.items():
        status = f"✅ {r['count']} players" if r.get("ok") else f"❌ {r.get('error','?')}"
        print(f"  {name}: {status}")

    if succeeded == 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
