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
        week = safe_int((df.get("week") or [0] * n)[i])
        existing = data.get(pid)
        # Prefer week=0 (season summary); only overwrite if we don't have week=0 yet
        if existing:
            if existing.get("_week") == 0:
                continue          # Already have season summary — keep it
            if week != 0:
                continue          # Have something, incoming is also not summary — skip
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
        if existing:
            if existing.get("_week") == 0:
                continue
            if week != 0:
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
        if existing:
            if existing.get("_week") == 0:
                continue
            if week != 0:
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
def build_injuries(year, max_lookback=3):
    """Returns (data, season_used). season_used is None when nothing was fetched.

    The NGS builders read a COMBINED parquet holding every season and select
    max_season, so when the target year has no data yet they degrade to the most
    recent season that does. Injuries reads a PER-YEAR url and had no equivalent,
    so every August — before the new season has been played — injuries_{year}
    404s and this returned {}. Measured 2026-08-10 (run 31369508254):

        → Fetching injuries_2026.parquet ...
          ⚠️  Could not fetch injuries_2026: HTTP Error 404: Not Found
          ✅ R2 OK → nfl/2026/nfl-injuries.json

    ...which then overwrote the populated table with an empty one and reported
    success. Walk back to the most recent season that actually exists, the same
    way the NGS path already does.
    """
    tbl = None
    season_used = None
    for candidate in range(year, year - max_lookback - 1, -1):
        print(f"\n[NFL Injuries {candidate}]")
        url = f"{NFLVERSE_BASE}/injuries/injuries_{candidate}.parquet"
        try:
            tbl = fetch_parquet(url)
            season_used = candidate
            if candidate != year:
                print(f"    ↩︎  injuries_{year} unavailable — using {candidate} (most recent published)")
            break
        except Exception as e:
            print(f"    ⚠️  Could not fetch injuries_{candidate}: {e}")
    if tbl is None:
        print(f"    ❌ No injuries parquet found for {year}..{year - max_lookback}")
        return {}, None

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
    return data, season_used

# ── Main ───────────────────────────────────────────────────────────────────────
def data_season(data, fallback=None):
    """The season the ROWS actually carry — not the season we asked for.

    The envelope used to be stamped `"season": year` (the target year) while the
    rows carried whatever season nflverse actually had. On 2026-08-10 that meant
    an envelope reading 2026 over rows reading 2025:

        envelope season : 2026
        row season      : 2025   (Caleb Williams, CHI, cpoe -6.875)

    A consumer captioning a chip from payload.season mislabels last season's
    numbers as this season's. NFL.com does the same thing on its own team-stats
    page (title "NFL 2026 REG", dropdown selected 2025), so the ambiguity is
    industry-wide — which is a reason to be explicit here, not a reason to copy it.
    """
    seasons = {r.get("season") for r in data.values() if isinstance(r, dict) and r.get("season")}
    return max(seasons) if seasons else fallback


def _walkback_parquet(subdir, stem, year, max_lookback=3):
    """Fetch {subdir}/{stem}_{year}.parquet, walking back to the most recent
    published season (same pattern as build_injuries). Returns (table, season)."""
    for cand in range(year, year - max_lookback - 1, -1):
        try:
            tbl = fetch_parquet(f"{NFLVERSE_BASE}/{subdir}/{stem}_{cand}.parquet")
            if cand != year:
                print(f"    ↩︎ {stem}_{year} unavailable — using {cand} (most recent published)")
            return tbl, cand
        except Exception as e:
            print(f"    ⚠️  Could not fetch {stem}_{cand}: {e}")
    return None, None

# ── 5. Snap counts (playing-time share) ──────────────────────────────────────
def build_snap_counts(year):
    """Season-average snap share per player. snap_counts has pfr_player_id + name
    (no gsis_id), so key by TEAM|name and store mean offense_pct/defense_pct, for a
    consumer to flag starters (e.g. an injured player with offPct>=0.5). Shape
    verified 2026-08-15 (snap_counts_2025.parquet): player/position/team/offense_pct/
    defense_pct per game×player. Returns (data, season_used)."""
    print("\n[NFL Snap Counts]")
    tbl, season_used = _walkback_parquet("snap_counts", "snap_counts", year)
    if tbl is None:
        return {}, None
    df = tbl.to_pydict(); n = len(df.get("season", []))
    players = df.get("player") or [""] * n
    teams   = df.get("team") or [""] * n
    poss    = df.get("position") or [""] * n
    offp    = df.get("offense_pct") or [0] * n
    defp    = df.get("defense_pct") or [0] * n
    agg = {}
    for i in range(n):
        nm = str(players[i] or ""); tm = str(teams[i] or "")
        if not nm or not tm:
            continue
        key = f"{tm}|{nm}"
        a = agg.get(key)
        if not a:
            a = agg[key] = {"name": nm, "team": tm, "position": str(poss[i] or ""),
                            "off_sum": 0.0, "def_sum": 0.0, "games": 0}
        a["off_sum"] += (safe_float(offp[i], 3) or 0.0)
        a["def_sum"] += (safe_float(defp[i], 3) or 0.0)
        a["games"] += 1
    data = {}
    for key, a in agg.items():
        g = a["games"] or 1
        data[key] = {"name": a["name"], "team": a["team"], "position": a["position"],
                     "season": season_used, "games": a["games"],
                     "offPct": round(a["off_sum"] / g, 3), "defPct": round(a["def_sum"] / g, 3)}
    print(f"    Players: {len(data)}")
    return data, season_used

# ── 6. Depth charts (starters) ───────────────────────────────────────────────
def build_depth_charts(year):
    """Latest depth-chart snapshot: starters (pos_rank==1) per team, keyed
    team -> { pos_abb: player_name }. The parquet holds many timestamped
    snapshots (dt), so take the most recent dt per team. Shape verified
    2026-08-15 (depth_charts_2025.parquet): dt/team/player_name/pos_abb/pos_rank.
    Returns (data, season_used)."""
    print("\n[NFL Depth Charts]")
    tbl, season_used = _walkback_parquet("depth_charts", "depth_charts", year)
    if tbl is None:
        return {}, None
    df = tbl.to_pydict(); n = len(df.get("team", []))
    dts   = df.get("dt") or [""] * n
    teams = df.get("team") or [""] * n
    ranks = df.get("pos_rank") or [0] * n
    posab = df.get("pos_abb") or [""] * n
    names = df.get("player_name") or [""] * n
    latest = {}
    for i in range(n):
        tm = str(teams[i] or "")
        if not tm:
            continue
        d = str(dts[i] or "")
        if tm not in latest or d > latest[tm]:
            latest[tm] = d
    data = {}
    for i in range(n):
        tm = str(teams[i] or "")
        if not tm or str(dts[i] or "") != latest.get(tm):
            continue
        if safe_int(ranks[i], 9) != 1:
            continue  # starters only
        pa = str(posab[i] or ""); nm = str(names[i] or "")
        if not pa or not nm:
            continue
        data.setdefault(tm, {})[pa] = nm
    print(f"    Teams: {len(data)}")
    return data, season_used

# ── 7. Team EPA/play (nflfastR pbp aggregate) ────────────────────────────────
def build_team_epa(year):
    """Per-team offensive & defensive EPA/play + offensive success rate, from
    nflfastR play-by-play. Commodity stat (ESPN/nflfastR publish team EPA). Only
    pass/rush scrimmage plays with a real epa. Shape verified 2026-08-15
    (play_by_play_2025.parquet, 372 cols): posteam/defteam/epa/play/pass/rush/
    success. Returns (data, season_used)."""
    print("\n[NFL Team EPA]")
    tbl, season_used = _walkback_parquet("pbp", "play_by_play", year)
    if tbl is None:
        return {}, None
    df = tbl.to_pydict(); n = len(df.get("epa", []))
    posteam = df.get("posteam") or [None] * n
    defteam = df.get("defteam") or [None] * n
    epa     = df.get("epa") or [None] * n
    play    = df.get("play") or [0] * n
    success = df.get("success") or [0] * n
    passv   = df.get("pass") or [0] * n
    rushv   = df.get("rush") or [0] * n
    agg = {}
    def slot(tm):
        if tm not in agg:
            agg[tm] = {"off_epa": 0.0, "off_n": 0, "def_epa": 0.0, "def_n": 0, "succ": 0, "succ_n": 0}
        return agg[tm]
    for i in range(n):
        if safe_int(play[i], 0) != 1:
            continue
        if safe_int(passv[i], 0) != 1 and safe_int(rushv[i], 0) != 1:
            continue
        ef = safe_float(epa[i], 4)
        if ef is None:
            continue
        pt = posteam[i]; dt = defteam[i]
        if pt:
            s = slot(str(pt)); s["off_epa"] += ef; s["off_n"] += 1
            s["succ"] += safe_int(success[i], 0); s["succ_n"] += 1
        if dt:
            s = slot(str(dt)); s["def_epa"] += ef; s["def_n"] += 1
    data = {}
    for tm, s in agg.items():
        if s["off_n"] < 50:
            continue
        data[tm] = {
            "team": tm, "season": season_used,
            "offEpaPerPlay": round(s["off_epa"] / s["off_n"], 3),
            "defEpaPerPlay": round(s["def_epa"] / s["def_n"], 3) if s["def_n"] else None,
            "offSuccessRate": round(s["succ"] / s["succ_n"], 3) if s["succ_n"] else None,
            "offPlays": s["off_n"],
        }
    print(f"    Teams: {len(data)}")
    return data, season_used


# ── 8. Participation tendencies (pbp_participation — P3 without Kaggle) ───────
def build_participation(year):
    """Offense-side formation/pressure tendencies from nflverse pbp_participation
    (public, tracking-DERIVED). The raw x/y tracking (routes, separation, man/zone
    coverage) is Kaggle-gated — and its route/coverage columns are EMPTY in recent
    participation parquets (verified 2026-08-15, pbp_participation_2025) — so those
    are STAGED, not built here. participation carries possession_team only (no
    defteam), so every metric is OFFENSE-side: this team's offense.
    Fields verified 2026-08-15: offense_formation, defenders_in_box,
    number_of_pass_rushers, was_pressure. Returns (data, season_used)."""
    print("\n[NFL Participation]")
    tbl, season_used = _walkback_parquet("pbp_participation", "pbp_participation", year)
    if tbl is None:
        return {}, None
    df = tbl.to_pydict(); n = len(df.get("play_id", []))
    poss  = df.get("possession_team") or [None] * n
    form  = df.get("offense_formation") or [None] * n
    box   = df.get("defenders_in_box") or [None] * n
    rush  = df.get("number_of_pass_rushers") or [None] * n
    press = df.get("was_pressure") or [None] * n
    off = {}
    def slot(tm):
        if tm not in off:
            off[tm] = {"plays": 0, "shotgun": 0, "boxSum": 0.0, "boxN": 0,
                       "drop": 0, "pressFaced": 0, "blitzFaced": 0}
        return off[tm]
    for i in range(n):
        tm = poss[i]
        if not tm or form[i] is None:   # skip special-teams / no-formation rows
            continue
        s = slot(str(tm)); s["plays"] += 1
        if str(form[i]).upper() == "SHOTGUN":
            s["shotgun"] += 1
        b = box[i]
        if b is not None and b > 0:
            s["boxSum"] += float(b); s["boxN"] += 1
        r = rush[i]
        if r is not None and r >= 1:                 # a defensive pass rush = a dropback
            s["drop"] += 1
            if r >= 5:
                s["blitzFaced"] += 1
            if press[i] is True:
                s["pressFaced"] += 1
    data = {}
    for tm, s in off.items():
        if s["plays"] < 50:
            continue
        data[tm] = {
            "team": tm, "season": season_used, "plays": s["plays"],
            "shotgunRate":    round(s["shotgun"] / s["plays"], 3),
            "avgBoxFaced":    round(s["boxSum"] / s["boxN"], 2) if s["boxN"] else None,
            "pressFacedRate": round(s["pressFaced"] / s["drop"], 3) if s["drop"] else None,
            "blitzFacedRate": round(s["blitzFaced"] / s["drop"], 3) if s["drop"] else None,
        }
    print(f"    Teams: {len(data)}")
    return data, season_used


def emit(results, name, filename, data, season, source, year, updated):
    """Write one table, refusing to publish an empty one.

    Guard rationale: an empty payload is indistinguishable, once stored, from
    "this table legitimately has no rows" — and it silently destroys the previous
    good copy in BOTH R2 and the repo. Same defect the relay hit with MLB Savant
    analytics (field-relay-nba 7588b24, 'never overwrite an R2 analytics table
    with an empty payload'); this is that guard for the NFL path.
    """
    if not data:
        print(f"    ⛔ {name}: 0 rows — refusing to overwrite the existing table")
        results[name] = {"ok": False, "error": "empty payload — refused to overwrite", "count": 0}
        return
    payload = {
        "updated": updated,
        # The season the DATA is from. Load-bearing for any consumer label.
        "season": season,
        # The season this run targeted. Kept separate and explicitly named so the
        # two can never be conflated again.
        "targetYear": year,
        "source": source,
        "data": data,
    }
    upload_to_r2(f"nfl/{year}/{filename}", payload)
    write_outbox(filename, payload)
    results[name] = {"ok": True, "count": len(data), "season": season}


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
        emit(results, "ngs-passing", "ngs-passing.json", passing,
             data_season(passing, year), "nflverse NGS parquet", year, updated)
    except Exception as e:
        print(f"  ❌ NGS Passing failed: {e}")
        results["ngs-passing"] = {"ok": False, "error": str(e)}

    # NGS Receiving
    try:
        receiving = build_ngs_receiving(year)
        emit(results, "ngs-receiving", "ngs-receiving.json", receiving,
             data_season(receiving, year), "nflverse NGS parquet", year, updated)
    except Exception as e:
        print(f"  ❌ NGS Receiving failed: {e}")
        results["ngs-receiving"] = {"ok": False, "error": str(e)}

    # NGS Rushing
    try:
        rushing = build_ngs_rushing(year)
        emit(results, "ngs-rushing", "ngs-rushing.json", rushing,
             data_season(rushing, year), "nflverse NGS parquet", year, updated)
    except Exception as e:
        print(f"  ❌ NGS Rushing failed: {e}")
        results["ngs-rushing"] = {"ok": False, "error": str(e)}

    # Injuries
    try:
        injuries, inj_season = build_injuries(year)
        emit(results, "nfl-injuries", "nfl-injuries.json", injuries,
             inj_season, "nflverse injuries parquet", year, updated)
    except Exception as e:
        print(f"  ❌ Injuries failed: {e}")
        results["nfl-injuries"] = {"ok": False, "error": str(e)}

    # Snap counts
    try:
        snaps, snap_season = build_snap_counts(year)
        emit(results, "snap-counts", "snap-counts.json", snaps,
             snap_season, "nflverse snap_counts parquet", year, updated)
    except Exception as e:
        print(f"  ❌ Snap counts failed: {e}")
        results["snap-counts"] = {"ok": False, "error": str(e)}

    # Depth charts (starters)
    try:
        depth, depth_season = build_depth_charts(year)
        emit(results, "depth-charts", "depth-charts.json", depth,
             depth_season, "nflverse depth_charts parquet", year, updated)
    except Exception as e:
        print(f"  ❌ Depth charts failed: {e}")
        results["depth-charts"] = {"ok": False, "error": str(e)}

    # Team EPA/play (pbp aggregate)
    try:
        tepa, tepa_season = build_team_epa(year)
        emit(results, "team-epa", "team_epa.json", tepa,
             tepa_season, "nflverse pbp aggregate", year, updated)
    except Exception as e:
        print(f"  ❌ Team EPA failed: {e}")
        results["team-epa"] = {"ok": False, "error": str(e)}

    # Participation tendencies (P3 — no-Kaggle formation/pressure)
    try:
        part, part_season = build_participation(year)
        emit(results, "participation", "team-participation.json", part,
             part_season, "nflverse pbp_participation", year, updated)
    except Exception as e:
        print(f"  ❌ Participation failed: {e}")
        results["participation"] = {"ok": False, "error": str(e)}

    # Summary
    succeeded = sum(1 for r in results.values() if r.get("ok"))
    print(f"\n{'='*50}")
    print(f"NFL-B complete: {succeeded}/{len(results)} succeeded")
    for name, r in results.items():
        status = f"✅ {r['count']} players" if r.get("ok") else f"❌ {r.get('error','?')}"
        print(f"  {name}: {status}")

    # Exit non-zero if ANY table failed, not only if all four did.
    #
    # The 2026-08-10 run (31369508254) is why: injuries 404'd, an empty table was
    # published, and the job printed "4/4 succeeded" and went green. Nobody saw it
    # for four days. `succeeded == 0` is too coarse a tripwire — it only fires when
    # the pipeline is totally dead, which is the one case somebody would notice
    # anyway. A false alarm here costs a red weekly job; a missed alarm costs a
    # silently empty table during the season.
    failed = [n for n, r in results.items() if not r.get("ok")]
    if failed:
        print(f"\n❌ FAILED TABLES: {', '.join(failed)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
