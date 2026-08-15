#!/usr/bin/env python3
"""PRE-BUILD shape probe (Rule 68) for the 3 unbuilt P2 tables: snap_counts,
depth_charts, and pbp (for a team-EPA derived table). Prints columns + a sample
row so the builders are written against the REAL nflverse schema, not assumed.
Runs in CI (pyarrow). Sandbox has no pyarrow, hence CI-as-proxy."""
import urllib.request, io, os
import pyarrow.parquet as pq

BASE = "https://github.com/nflverse/nflverse-data/releases/download"
HEADERS = {"User-Agent": "FIELD/1.0", "Accept": "application/octet-stream"}
os.makedirs("outbox", exist_ok=True)
out = []

def log(s):
    print(s); out.append(s)

def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()

def probe(name, paths, sample_cols=40):
    for url in paths:
        try:
            data = fetch(url)
        except Exception as e:
            log(f"\n=== {name} :: {url}\n  MISS: {e}")
            continue
        tbl = pq.read_table(io.BytesIO(data))
        log(f"\n=== {name} :: {url.split('/')[-1]}")
        log(f"  bytes={len(data):,} rows={tbl.num_rows} cols={tbl.num_columns}")
        log(f"  columns: {tbl.column_names}")
        d = tbl.slice(0, 1).to_pydict()
        items = list(d.items())[:sample_cols]
        log("  sample row: " + ", ".join(f"{k}={v[0]!r}" for k, v in items))
        return
    log(f"\n=== {name}: NO PARQUET FOUND in {paths}")

for yr in ("snap_counts", "depth_charts"):
    pass

# snap_counts + depth_charts are small; probe 2025 then 2024.
probe("snap_counts", [f"{BASE}/snap_counts/snap_counts_{y}.parquet" for y in (2025, 2024)])
probe("depth_charts", [f"{BASE}/depth_charts/depth_charts_{y}.parquet" for y in (2025, 2024)])
# pbp is large (~200MB); only need the schema/columns + one row.
probe("pbp", [f"{BASE}/pbp/play_by_play_{y}.parquet" for y in (2025, 2024)], sample_cols=0)

with open("outbox/nfl-parquet-shape-probe.txt", "w") as f:
    f.write("\n".join(out))
print("\n[wrote outbox/nfl-parquet-shape-probe.txt]")
