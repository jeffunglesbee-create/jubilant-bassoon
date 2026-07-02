#!/usr/bin/env python3
"""Probe Baseball Savant CSV endpoints — confirms automatable from CI."""
import urllib.request, json, os, csv, io
from datetime import datetime, timezone, timedelta

HEADERS = {"User-Agent":"Mozilla/5.0 (compatible; FIELD/1.0)","Accept":"text/csv,*/*"}

# Yesterday's date for Statcast game data (today's games may still be live)
yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

ENDPOINTS = [
    # ── LEADERBOARD CSV ENDPOINTS ────────────────────────────────────────────
    # NOTE: challengeType=hp_umpire crashes Savant's server with Node.js TypeError.
    # This probe checks if the bug is still present, and tries alternative params.
    ("umpire_hp_umpire",  "https://baseballsavant.mlb.com/leaderboard/abs-challenges?challengeType=hp_umpire&year=2026&min=3&csv=true"),
    ("umpire_umpire",     "https://baseballsavant.mlb.com/leaderboard/abs-challenges?challengeType=umpire&year=2026&min=3&csv=true"),
    ("team_abs",          "https://baseballsavant.mlb.com/leaderboard/abs-challenges?challengeType=batting-team&year=2026&min=1&csv=true"),
    ("expected_stats",    "https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=batter&year=2026&min=50&csv=true"),
    ("sprint_speed",      "https://baseballsavant.mlb.com/leaderboard/sprint_speed?year=2026&min=10&pos=&team=&csv=true"),
    ("pitch_tempo",       "https://baseballsavant.mlb.com/leaderboard/pitch-tempo?type=Pit&year=2026&min=100&csv=true"),
    ("pitch_arsenals",    "https://baseballsavant.mlb.com/leaderboard/pitch-arsenals?type=PA&year=2026&min=100&csv=true"),
    # ── PITCH ARSENAL STATS (velocity + whiff — column names unknown) ─────────
    ("pitch_arsenal_stats","https://baseballsavant.mlb.com/leaderboard/pitch-arsenal-stats?type=pitcher&year=2026&min=100&csv=true"),
    # ── STATCAST PER-PITCH CSV — probe for ABS challenge events ──────────────
    # Key question: does the per-pitch CSV include ABS challenge events?
    # If events column contains 'abs_challenge' or similar, umpire stats can be
    # derived from this endpoint instead of the broken hp_umpire leaderboard.
    (f"statcast_{yesterday}", f"https://baseballsavant.mlb.com/statcast_search/csv?type=details&game_date={yesterday}"),
    # Also try May 28 (known game date) for full column + events analysis
    ("statcast_2026-05-28", "https://baseballsavant.mlb.com/statcast_search/csv?type=details&game_date=2026-05-28"),
    # Try May 27 — known day with many games
    ("statcast_2026-05-27", "https://baseballsavant.mlb.com/statcast_search/csv?type=details&game_date=2026-05-27"),
    # Try May 1 — older date, data should be fully processed
    ("statcast_2026-05-01", "https://baseballsavant.mlb.com/statcast_search/csv?type=details&game_date=2026-05-01"),
    # Try date range format instead of single date
    ("statcast_range_may01", "https://baseballsavant.mlb.com/statcast_search/csv?all=true&hfGT=R%7C&hfSea=2026%7C&game_date_gt=2026-05-01&game_date_lt=2026-05-02&type=details"),
    # ── UMPIRE WEAKNESS ZONE PROBE (CC-CMD-2026-07-01) ─────────────────────
    # 14-day range matching mlb-weekly-update.py's "subsequent run" window,
    # to maximize odds of finding real ABS challenge rows with zone data.
    # Needs a long timeout (180s, matching mlb-weekly-update.py's own
    # statcast fetch — "large file — 3min timeout") — the default 30s used
    # by every other endpoint here timed out on this range (confirmed via
    # a real run, not assumed): probe run 28554345808 returned
    # {"status": 0, "error": "The read operation timed out"}.
    ("statcast_ump_zone_probe",
     "https://baseballsavant.mlb.com/statcast_search/csv?all=true&hfGT=R%7C&hfSea=2026%7C"
     f"&game_date_gt={(datetime.now(timezone.utc) - timedelta(days=15)).strftime('%Y-%m-%d')}"
     f"&game_date_lt={(datetime.now(timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d')}&type=details",
     180),
    # ── PITCHER xERA PROBE (CC-CMD-2026-07-01 savant-xera-fetch-post) ──────
    # Confirms the exact column names (expecting era, xera) on the
    # pitcher-side expected_statistics endpoint before writing fetch code
    # against them — the batter-side variant of this endpoint (probed
    # above as "expected_stats") uses "est_ba"/"est_slg"/"est_woba", NOT a
    # bare "xera"-style name, so the pitcher-side naming should not be
    # assumed identical without checking.
    ("expected_stats_pitcher",
     "https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=pitcher&year=2026&min=50&csv=true"),
]

ts  = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
out = {"probeTime": ts, "statcastDate": yesterday, "endpoints": {}}

for entry in ENDPOINTS:
    label, url = entry[0], entry[1]
    timeout = entry[2] if len(entry) > 2 else 30
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8", errors="replace")
            rows = list(csv.reader(io.StringIO(body)))
            header = rows[0] if rows else []
            sample = rows[1] if len(rows) > 1 else []

            # For Statcast CSV: extract unique events + check for umpire columns
            extra = {}
            if label.startswith("statcast_") and header:
                all_rows = rows[1:]  # skip header
                try:
                    ev_idx = header.index("events")
                    unique_events = sorted(set(row[ev_idx] for row in all_rows if ev_idx < len(row) and row[ev_idx]))
                    extra["unique_events"] = unique_events
                    abs_events = [e for e in unique_events if 'challenge' in e.lower() or 'abs' in e.lower() or 'review' in e.lower()]
                    extra["abs_related_events"] = abs_events
                except ValueError:
                    extra["events_col_missing"] = True
                # Check description/des for ABS challenge text
                for desc_col in ["description", "des"]:
                    try:
                        d_idx = header.index(desc_col)
                        unique_desc = sorted(set(row[d_idx] for row in all_rows if d_idx < len(row) and row[d_idx]))
                        abs_desc = [d for d in unique_desc if 'challenge' in d.lower() or 'abs' in d.lower() or 'overturn' in d.lower() or 'review' in d.lower()]
                        extra[f"abs_in_{desc_col}"] = abs_desc
                        extra[f"unique_{desc_col}_count"] = len(unique_desc)
                        extra[f"unique_{desc_col}_sample"] = unique_desc[:15]
                    except ValueError:
                        pass
                # Also check type column (B/S/X) for called-strike context
                try:
                    t_idx = header.index("type")
                    type_counts = {}
                    for row in all_rows:
                        if t_idx < len(row): type_counts[row[t_idx]] = type_counts.get(row[t_idx], 0) + 1
                    extra["type_counts"] = type_counts
                except ValueError: pass
                # Check for umpire-related columns
                ump_cols = [c for c in header if 'ump' in c.lower() or 'official' in c.lower()]
                extra["umpire_columns"] = ump_cols
                chal_cols = [c for c in header if 'challenge' in c.lower() or 'overturn' in c.lower() or 'review' in c.lower()]
                extra["challenge_columns"] = chal_cols
                # Sample the umpire column values
                try:
                    ump_idx = next(i for i,c in enumerate(header) if 'umpire' in c.lower())
                    ump_vals = sorted(set(row[ump_idx] for row in all_rows if ump_idx < len(row) and row[ump_idx]))
                    extra["umpire_sample_values"] = ump_vals[:10]
                except: pass
                # CC-CMD-2026-07-01 umpire-weakness-zone: for real ABS challenge
                # rows specifically (des matches the challenge pattern), extract
                # zone + plate_x + plate_z + full des so the zone-to-label
                # mapping can be verified against real data, not assumed.
                try:
                    challenge_re = __import__('re').compile(
                        r'challenged \(pitch result\), call on the field was (confirmed|overturned)', __import__('re').IGNORECASE)
                    des_idx = header.index('des')
                    zone_idx = header.index('zone') if 'zone' in header else None
                    px_idx = header.index('plate_x') if 'plate_x' in header else None
                    pz_idx = header.index('plate_z') if 'plate_z' in header else None
                    extra['zone_column_present'] = zone_idx is not None
                    extra['plate_x_column_present'] = px_idx is not None
                    extra['plate_z_column_present'] = pz_idx is not None
                    zone_dist = {}
                    challenge_samples = []
                    for row in all_rows:
                        if des_idx >= len(row) or not row[des_idx]: continue
                        if not challenge_re.search(row[des_idx]): continue
                        z = row[zone_idx] if zone_idx is not None and zone_idx < len(row) else None
                        px = row[px_idx] if px_idx is not None and px_idx < len(row) else None
                        pz = row[pz_idx] if pz_idx is not None and pz_idx < len(row) else None
                        if z: zone_dist[z] = zone_dist.get(z, 0) + 1
                        if len(challenge_samples) < 40:
                            challenge_samples.append({'zone': z, 'plate_x': px, 'plate_z': pz, 'des': row[des_idx]})
                    extra['challenge_row_count'] = len(challenge_samples) if len(challenge_samples) < 40 else f"{len(challenge_samples)}+ (capped sample)"
                    extra['challenge_zone_distribution'] = zone_dist
                    extra['challenge_zone_samples'] = challenge_samples
                except Exception as e:
                    extra['zone_probe_error'] = str(e)

            print(f"{'✅' if r.status == 200 else '⚠️ '} {label}: HTTP {r.status} | {len(rows)} rows")
            print(f"   Columns ({len(header)}): {header[:10]}")
            if extra.get("unique_events"):
                print(f"   Events: {extra['unique_events'][:20]}")
            if extra.get("abs_related_events"):
                print(f"   ABS events: {extra['abs_related_events']}")
            if extra.get("umpire_columns"):
                print(f"   Umpire cols: {extra['umpire_columns']}")
            if extra.get("challenge_columns"):
                print(f"   Challenge cols: {extra['challenge_columns']}")
            if sample:
                print(f"   Sample: {sample[:8]}")

            out["endpoints"][label] = {
                "status": r.status, "rows": len(rows),
                "columns": header, "sample_row": sample[:10],
                **extra
            }
    except Exception as e:
        print(f"❌ {label}: {e}")
        out["endpoints"][label] = {"status": 0, "error": str(e)}

# ── ESPN ROSTER ABBREVIATION MAPPING — ALL 30 REAL TEAM CODES
# (CC-CMD-2026-07-02 player-mismatch-detector) ──────────────────────────
# A prior probe round (2 of 4 codes tested: ATH ok, TOR ok, AZ 400,
# CWS 400) confirmed ESPN's team abbreviation scheme does NOT match
# Savant-sourced outbox/mlb/*.json's codes 1:1 for every team. Rather
# than guess alternates for the 2 known-divergent codes and hope the
# other 26 are fine, tests ALL 30 real codes actually present in the
# source data (outbox/mlb/sprint_speed.json's real team set) — for each,
# tries the Savant code verbatim first, then a small set of common ESPN
# alternates if that 400s. Builds a complete, verified SAVANT_TO_ESPN_TEAM
# map for the detector script, not a partial one.
SAVANT_TEAM_CODES = ["ATH","ATL","AZ","BAL","BOS","CHC","CIN","CLE","COL","CWS",
                      "DET","HOU","KC","LAA","LAD","MIA","MIL","MIN","NYM","NYY",
                      "PHI","PIT","SD","SEA","SF","STL","TB","TEX","TOR","WSH"]
ESPN_ALTERNATES = {
    "AZ": ["az", "ari"], "CWS": ["cws", "chw"], "KC": ["kc", "kan"],
    "SD": ["sd", "sdp"], "SF": ["sf", "sfg"], "TB": ["tb", "tbr"],
    "WSH": ["wsh", "was"],
}

def _try_espn_team(code):
    """Try each candidate ESPN abbreviation for a Savant code; return
    (working_code, resolved_name, resolved_abbrev) or (None, None, None)."""
    candidates = ESPN_ALTERNATES.get(code, [code.lower()])
    for cand in candidates:
        try:
            req = urllib.request.Request(
                f"https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/{cand}/roster",
                headers=HEADERS,
            )
            with urllib.request.urlopen(req, timeout=15) as r:
                roster = json.loads(r.read())
            team_block = roster.get("team") or {}
            return cand, team_block.get("displayName"), team_block.get("abbreviation"), roster
        except Exception:
            continue
    return None, None, None, None

team_mapping = {}
first_roster_shape_captured = False
for code in SAVANT_TEAM_CODES:
    working, name, abbrev, roster = _try_espn_team(code)
    if working:
        team_mapping[code] = working
        print(f"  ✅ {code} -> espn/{working} ({name})")
        if not first_roster_shape_captured and roster:
            # Capture full shape detail once, from whichever team resolves first.
            athletes_block = roster.get("athletes")
            shape = {"top_level_keys": list(roster.keys())}
            if isinstance(athletes_block, list) and athletes_block:
                first_group = athletes_block[0]
                shape["athletes_group_keys"] = list(first_group.keys()) if isinstance(first_group, dict) else None
                items = first_group.get("items") if isinstance(first_group, dict) else None
                if isinstance(items, list) and items:
                    shape["sample_athlete_keys"] = list(items[0].keys())
                    shape["sample_athlete"] = {k: items[0].get(k) for k in
                        ("id", "fullName", "displayName", "shortName", "lastName", "firstName") if k in items[0]}
            out["endpoints"]["espn_roster_shape"] = shape
            first_roster_shape_captured = True
    else:
        team_mapping[code] = None
        print(f"  ❌ {code} -> no working ESPN code found (tried {ESPN_ALTERNATES.get(code, [code.lower()])})")

out["endpoints"]["espn_team_abbrev_mapping"] = team_mapping
unmapped = [k for k, v in team_mapping.items() if v is None]
print(f"\n{len(team_mapping) - len(unmapped)}/{len(team_mapping)} team codes resolved; unmapped: {unmapped}")

# ── ESPN SUMMARY ENDPOINT PROBES (CC-CMD-2026-07-02 drama-backfill-client) ──
# The existing fetchESPNWinProb() precedent in index.html routes ESPN's
# `summary` endpoint through a relay proxy (ESPN_SUMMARY_RELAY), NOT a
# direct fetch — comment there states "CORS locked to espn.com". That's a
# browser-side restriction; this probe runs server-side (no CORS
# enforcement), so a direct fetch here is a valid way to inspect the real
# shape even though the CLIENT script must still go through the relay.
#
# MLB: confirms plays[] has homeScore/awayScore/period.number/wallclock
# (dramaScoreLive()'s required input shape) — event 401815989 (Rays 4,
# Royals 0, real confirmed result).
print("\nProbing ESPN MLB summary (event 401815989, Rays 4 Royals 0)...")
try:
    req = urllib.request.Request(
        "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=401815989",
        headers=HEADERS,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        summary = json.loads(r.read())
    plays = summary.get("plays") or []
    result = {"status": r.status, "top_level_keys": list(summary.keys()), "plays_count": len(plays)}
    if plays:
        last = plays[-1]
        result["sample_play_keys"] = list(last.keys())
        result["last_play"] = {k: last.get(k) for k in
            ("homeScore", "awayScore", "period", "wallclock", "text") if k in last}
        result["final_homeScore"] = last.get("homeScore")
        result["final_awayScore"] = last.get("awayScore")
    out["endpoints"]["espn_mlb_summary_401815989"] = result
    print(f"  ✅ plays: {result['plays_count']}, final score: {result.get('final_homeScore')}-{result.get('final_awayScore')} (expect 4-0 or 0-4 depending on home/away)")
    print(f"  last_play: {result.get('last_play')}")
except Exception as e:
    print(f"  ❌ {e}")
    out["endpoints"]["espn_mlb_summary_401815989"] = {"status": 0, "error": str(e)}

# Soccer: resolves Task 3's explicitly stated gap — which field identifies
# the scoring team on a keyEvents entry. Event 760495 (England 2-1 Congo
# DR, real confirmed result) — verify the reconstructed final score
# actually matches 2-1 before trusting any field-name guess. League slug
# unknown — try a small set of plausible candidates for an England vs
# Congo DR fixture rather than guess one and assume it's right.
print("\nProbing ESPN soccer summary (event 760495, England 2-1 Congo DR)...")
_SOCCER_LEAGUE_CANDIDATES = ["fifa.friendly", "uefa.friendly", "fifa.world"]
_soccer_result = None
for _league in _SOCCER_LEAGUE_CANDIDATES:
    try:
        req = urllib.request.Request(
            f"https://site.api.espn.com/apis/site/v2/sports/soccer/{_league}/summary?event=760495",
            headers=HEADERS,
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            summary = json.loads(r.read())
        key_events = summary.get("keyEvents") or []
        header = summary.get("header") or {}
        competitions = (header.get("competitions") or [{}])[0]
        competitors = competitions.get("competitors") or []
        result = {
            "status": r.status, "league_used": _league,
            "top_level_keys": list(summary.keys()),
            "key_events_count": len(key_events),
            "competitors": [{"homeAway": c.get("homeAway"), "team_id": (c.get("team") or {}).get("id"),
                              "team_name": (c.get("team") or {}).get("displayName")} for c in competitors],
        }
        scoring_events = [e for e in key_events if e.get("scoringPlay")]
        result["scoring_events_count"] = len(scoring_events)
        if scoring_events:
            result["sample_scoring_event_keys"] = list(scoring_events[0].keys())
            result["sample_scoring_events_full"] = scoring_events[:3]
        _soccer_result = result
        print(f"  ✅ league={_league}: keyEvents={result['key_events_count']}, scoring={result['scoring_events_count']}")
        print(f"  competitors: {result['competitors']}")
        if scoring_events:
            print(f"  sample scoring event: {json.dumps(scoring_events[0], indent=2)[:800]}")
        break
    except Exception as e:
        print(f"  ❌ league={_league}: {e}")
out["endpoints"]["espn_soccer_summary_760495"] = _soccer_result or {"status": 0, "error": "no candidate league slug worked", "tried": _SOCCER_LEAGUE_CANDIDATES}

os.makedirs("outbox/mlb", exist_ok=True)
fn = f"outbox/mlb/savant-probe-{ts}.json"
with open(fn, "w") as f:
    json.dump(out, f, indent=2)
print(f"\nWritten: {fn}")
