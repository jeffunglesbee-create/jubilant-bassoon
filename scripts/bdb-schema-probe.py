#!/usr/bin/env python3
"""Schema probe for BDB separation + route-entropy builders (Rule 68 PRE-BUILD).

Separation needs: per pass play, the targeted receiver + nearest defender at the
catch frame → distance. That requires plays.csv (targetNflId, possessionTeam,
defensiveTeam) + tracking `event` values marking the catch.
Route entropy needs: per-player route labels → a routeRan column somewhere
(player_play.csv in modern BDB releases).

This probe DOES NOT ASSUME those columns exist. It downloads the small metadata
CSVs (games/plays/players/player_play) under both dataset layouts, prints their
headers, and samples the distinct `event` values + a routeRan sample from a
single tracking week. Never prints the key. Writes outbox/bdb-schema-probe.txt.
"""
import os, io, csv, json, base64, urllib.parse, urllib.request, urllib.error
from collections import Counter

U = (os.environ.get("KAGGLE_USERNAME", "") or "").strip()
K = (os.environ.get("KAGGLE_KEY", "") or "").strip()
AUTH = "Basic " + base64.b64encode(f"{U}:{K}".encode()).decode() if (U and K) else None
out = []
def log(s): print(s); out.append(str(s))

DATASETS = [("alexandermeau", "nfl-big-data-bowl-archived-data-2025"),
            ("llkh0a", "nfl-big-data-bowl-2026-prediction-public")]
# candidate path prefixes seen in BDB releases
PREFIXES = ["", "big-data-bowl-data/"]
META_FILES = ["games.csv", "plays.csv", "players.csv", "player_play.csv", "tackles.csv"]

def dl(owner, slug, fn, first_line=False, timeout=120):
    url = f"https://www.kaggle.com/api/v1/datasets/download/{owner}/{slug}?file_name={urllib.parse.quote(fn)}"
    req = urllib.request.Request(url, headers={"Authorization": AUTH, "User-Agent": "FIELD/1.0"})
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        return resp.status, resp
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:
        log(f"    ERR {fn}: {str(e)[:120]}"); return -1, None

def header_of(owner, slug, prefix, base):
    st, resp = dl(owner, slug, prefix + base, first_line=True)
    if st != 200 or resp is None:
        return st, None
    line = resp.readline(16384).decode("utf-8", "replace").strip()
    resp.close()
    return st, line

if not AUTH:
    log("No KAGGLE creds — cannot probe"); open("outbox/bdb-schema-probe.txt","w").write("\n".join(out)); raise SystemExit(0)

for owner, slug in DATASETS:
    log(f"\n===== {owner}/{slug} =====")
    working_prefix = None
    for base in META_FILES:
        found = False
        for prefix in PREFIXES:
            st, hdr = header_of(owner, slug, prefix, base)
            if st == 200 and hdr and "," in hdr and not hdr.startswith("{"):
                log(f"  [{prefix or '(root)'}]{base}  HTTP 200")
                log(f"    HEADER: {hdr[:600]}")
                working_prefix = prefix; found = True; break
        if not found:
            log(f"  {base}: not found under {PREFIXES}")
    # distinct event values + routeRan sample from tracking week 1 (stream first N rows)
    if working_prefix is not None:
        st, resp = dl(owner, slug, working_prefix + "tracking_week_1.csv")
        if st == 200 and resp is not None:
            reader = csv.DictReader(io.TextIOWrapper(resp, encoding="utf-8"))
            log(f"    tracking cols: {reader.fieldnames}")
            has_route = "routeRan" in (reader.fieldnames or []) or "route" in (reader.fieldnames or [])
            events, routes, n = Counter(), Counter(), 0
            for row in reader:
                ev = (row.get("event") or "").strip()
                if ev and ev != "NA": events[ev] += 1
                for rk in ("routeRan", "route"):
                    rv = (row.get(rk) or "").strip()
                    if rv and rv != "NA": routes[rv] += 1
                n += 1
                if n >= 400000: break
            resp.close()
            log(f"    tracking rows sampled: {n:,}")
            log(f"    distinct events (top 20): {events.most_common(20)}")
            log(f"    tracking-level route labels present: {has_route} | sample: {routes.most_common(10)}")

open("outbox/bdb-schema-probe.txt", "w").write("\n".join(out))
log("\n[wrote outbox/bdb-schema-probe.txt]")
