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
    ("statcast_ump_zone_probe",
     "https://baseballsavant.mlb.com/statcast_search/csv?all=true&hfGT=R%7C&hfSea=2026%7C"
     f"&game_date_gt={(datetime.now(timezone.utc) - timedelta(days=15)).strftime('%Y-%m-%d')}"
     f"&game_date_lt={(datetime.now(timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d')}&type=details"),
]

ts  = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
out = {"probeTime": ts, "statcastDate": yesterday, "endpoints": {}}

for label, url in ENDPOINTS:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as r:
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

os.makedirs("outbox/mlb", exist_ok=True)
fn = f"outbox/mlb/savant-probe-{ts}.json"
with open(fn, "w") as f:
    json.dump(out, f, indent=2)
print(f"\nWritten: {fn}")
