#!/usr/bin/env python3
"""Probe the two PUBLIC BDB datasets the user identified (datasets, not
competitions -> no rules-acceptance gate). Tests no-auth vs auth, lists access,
and stream-reads the header of a tracking CSV to get the real schema. Never
prints the key — only lengths, statuses, and CSV column headers."""
import os, urllib.parse, urllib.request, urllib.error, base64, re
U = (os.environ.get("KAGGLE_USERNAME", "") or "").strip()
K = (os.environ.get("KAGGLE_KEY", "") or "").strip()
os.makedirs("outbox", exist_ok=True)
out = []
def log(s): print(s); out.append(s)
log(f"[creds] USERNAME len {len(U)} | KEY len {len(K)} | KEY is 32-hex: {bool(re.fullmatch(r'[0-9a-fA-F]{32}', K))}")
AUTH = "Basic " + base64.b64encode(f"{U}:{K}".encode()).decode() if (U and K) else None

DATASETS = [
    ("alexandermeau", "nfl-big-data-bowl-archived-data-2025"),
    ("llkh0a", "nfl-big-data-bowl-2026-prediction-public"),
]

def req(url, auth=False, first_line_only=False):
    h = {"User-Agent": "FIELD/1.0"}
    if auth and AUTH: h["Authorization"] = AUTH
    r = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            if first_line_only:
                raw = resp.readline(8192)
                return resp.status, raw
            return resp.status, resp.read(4096)
    except urllib.error.HTTPError as e:
        return e.code, (e.read() or b"")[:200]
    except Exception as e:
        return -1, str(e).encode()[:200]

for owner, slug in DATASETS:
    log(f"\n===== dataset {owner}/{slug} =====")
    view = f"https://www.kaggle.com/api/v1/datasets/view/{owner}/{slug}"
    for auth in (False, True):
        st, body = req(view, auth=auth)
        log(f"  view [{'auth' if auth else 'noauth'}] -> HTTP {st}  {body[:120].decode(errors='replace')}")
    # try a tracking file header via single-file download (both plain and folder-prefixed)
    for fn in ("tracking_week_1.csv", "big-data-bowl-data/tracking_week_1.csv"):
        url = f"https://www.kaggle.com/api/v1/datasets/download/{owner}/{slug}?file_name={urllib.parse.quote(fn)}"
        st, body = req(url, auth=True, first_line_only=True)
        hdr = body.decode(errors='replace').strip()
        # a real CSV header contains commas + known tracking cols; a zip/binary won't
        looks_csv = ("," in hdr and not hdr.startswith("PK"))
        log(f"  dl file_name={fn} [auth] -> HTTP {st}  csv_header={looks_csv}")
        if looks_csv:
            log(f"    HEADER: {hdr[:400]}")

open("outbox/kaggle-probe.txt", "w").write("\n".join(out))
print("\n[wrote outbox/kaggle-probe.txt]")
