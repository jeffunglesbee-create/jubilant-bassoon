#!/usr/bin/env python3
"""Probe Baseball Savant CSV endpoints — confirms automatable from CI."""
import urllib.request, json, os, csv, io
from datetime import datetime, timezone

HEADERS = {"User-Agent":"Mozilla/5.0 (compatible; FIELD/1.0)","Accept":"text/csv,*/*"}

ENDPOINTS = [
    ("umpire_abs",    "https://baseballsavant.mlb.com/leaderboard/abs-challenges?challengeType=umpire&year=2026&min=3&csv=true"),
    ("team_abs",      "https://baseballsavant.mlb.com/leaderboard/abs-challenges?challengeType=batting-team&year=2026&min=1&csv=true"),
    ("expected_stats","https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=batter&year=2026&min=50&csv=true"),
    ("sprint_speed",  "https://baseballsavant.mlb.com/leaderboard/sprint_speed?year=2026&min=10&pos=&team=&csv=true"),
    ("pitch_tempo",   "https://baseballsavant.mlb.com/leaderboard/pitch-tempo?type=Pit&year=2026&min=100&csv=true"),
    ("pitch_arsenals","https://baseballsavant.mlb.com/leaderboard/pitch-arsenals?type=PA&year=2026&min=100&csv=true"),
]

ts  = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
out = {"probeTime": ts, "endpoints": {}}

for label, url in ENDPOINTS:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read().decode("utf-8", errors="replace")
            rows = list(csv.reader(io.StringIO(body)))
            header = rows[0] if rows else []
            sample = rows[1] if len(rows) > 1 else []
            print(f"✅ {label}: HTTP {r.status} | {len(rows)} rows")
            print(f"   Columns: {header[:8]}")
            if sample: print(f"   Sample:  {sample[:8]}")
            out["endpoints"][label] = {
                "status": r.status, "rows": len(rows),
                "columns": header, "sample_row": sample
            }
    except Exception as e:
        print(f"❌ {label}: {e}")
        out["endpoints"][label] = {"status": 0, "error": str(e)}

os.makedirs("outbox/mlb", exist_ok=True)
fn = f"outbox/mlb/savant-probe-{ts}.json"
with open(fn, "w") as f:
    json.dump(out, f, indent=2)
print(f"\nWritten: {fn}")
