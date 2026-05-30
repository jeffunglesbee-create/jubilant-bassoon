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
                    unique_events = sorted(set(r[ev_idx] for r in all_rows if ev_idx < len(r) and r[ev_idx]))
                    extra["unique_events"] = unique_events
                    # Check for ABS-challenge-related event types
                    abs_events = [e for e in unique_events if 'challenge' in e.lower() or 'abs' in e.lower() or 'review' in e.lower()]
                    extra["abs_related_events"] = abs_events
                except ValueError:
                    extra["events_col_missing"] = True
                # Check for umpire-related columns
                ump_cols = [c for c in header if 'ump' in c.lower() or 'official' in c.lower()]
                extra["umpire_columns"] = ump_cols
                # Check for challenge-related columns
                chal_cols = [c for c in header if 'challenge' in c.lower() or 'overturn' in c.lower() or 'review' in c.lower()]
                extra["challenge_columns"] = chal_cols

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
