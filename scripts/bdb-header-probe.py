#!/usr/bin/env python3
"""Full (untruncated) header of plays.csv + player_play.csv for the archived BDB
dataset — confirm whether a route-label column (routeRan/route) exists before
building route-entropy. Never prints the key. Writes outbox/bdb-header-probe.txt.
"""
import os, base64, urllib.parse, urllib.request, urllib.error
U = (os.environ.get("KAGGLE_USERNAME", "") or "").strip()
K = (os.environ.get("KAGGLE_KEY", "") or "").strip()
AUTH = "Basic " + base64.b64encode(f"{U}:{K}".encode()).decode() if (U and K) else None
OWNER, SLUG, PFX = "alexandermeau", "nfl-big-data-bowl-archived-data-2025", "big-data-bowl-data/"
out = []
def log(s): print(s); out.append(str(s))

def header(fn):
    url = f"https://www.kaggle.com/api/v1/datasets/download/{OWNER}/{SLUG}?file_name={urllib.parse.quote(PFX+fn)}"
    req = urllib.request.Request(url, headers={"Authorization": AUTH, "User-Agent": "FIELD/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.readline(65536).decode("utf-8", "replace").strip()
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}"

if not AUTH:
    log("no creds")
else:
    for fn in ("player_play.csv", "plays.csv"):
        h = header(fn)
        cols = [c.strip().strip('"') for c in h.split(",")]
        log(f"\n== {fn} ({len(cols)} cols) ==")
        log(h)
        route_cols = [c for c in cols if "route" in c.lower()]
        log(f"  route-ish columns: {route_cols}")
os.makedirs("outbox", exist_ok=True)
open("outbox/bdb-header-probe.txt", "w").write("\n".join(out))
log("\n[wrote outbox/bdb-header-probe.txt]")
