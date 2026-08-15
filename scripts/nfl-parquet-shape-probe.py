#!/usr/bin/env python3
"""Shape probe for nflverse pbp_participation (P3 without Kaggle): formation,
personnel, defenders_in_box, number_of_pass_rushers. Verified reachable (302)."""
import urllib.request, io, os
import pyarrow.parquet as pq
BASE = "https://github.com/nflverse/nflverse-data/releases/download"
HEADERS = {"User-Agent": "FIELD/1.0", "Accept": "application/octet-stream"}
os.makedirs("outbox", exist_ok=True); out = []
def log(s): print(s); out.append(s)
def probe(name, paths):
    for url in paths:
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=180) as r: data = r.read()
        except Exception as e:
            log(f"\n=== {name} :: {url.split('/')[-1]}\n  MISS: {e}"); continue
        tbl = pq.read_table(io.BytesIO(data))
        log(f"\n=== {name} :: {url.split('/')[-1]}  bytes={len(data):,} rows={tbl.num_rows} cols={tbl.num_columns}")
        log(f"  columns: {tbl.column_names}")
        d = tbl.slice(0, 2).to_pydict()
        for row in range(min(2, tbl.num_rows)):
            log("  row%d: " % row + ", ".join(f"{k}={d[k][row]!r}" for k in tbl.column_names))
        return
    log(f"\n=== {name}: NO PARQUET in {paths}")
probe("pbp_participation", [f"{BASE}/pbp_participation/pbp_participation_{y}.parquet" for y in (2025, 2024, 2023)])
open("outbox/nfl-parquet-shape-probe.txt", "w").write("\n".join(out))
print("\n[wrote outbox/nfl-parquet-shape-probe.txt]")
