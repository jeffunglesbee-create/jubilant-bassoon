#!/usr/bin/env python3
"""Probe the two PUBLIC BDB datasets under multiple auth schemes. New Kaggle
tokens are `kgat_...` and may need Bearer rather than Basic. Never prints the key
— only lengths, statuses, and CSV column headers."""
import os, urllib.parse, urllib.request, urllib.error, base64, re
U = (os.environ.get("KAGGLE_USERNAME", "") or "").strip()
K = (os.environ.get("KAGGLE_KEY", "") or "").strip()
os.makedirs("outbox", exist_ok=True); out = []
def log(s): print(s); out.append(s)
log(f"[creds] USERNAME len {len(U)} | KEY len {len(K)} | starts_with_kgat={K.startswith('kgat')} | 32hex={bool(re.fullmatch(r'[0-9a-fA-F]{32}', K))}")

def hdrs(mode):
    h = {"User-Agent": "FIELD/1.0"}
    if mode == "basic" and U and K: h["Authorization"] = "Basic " + base64.b64encode(f"{U}:{K}".encode()).decode()
    elif mode == "bearer" and K:    h["Authorization"] = "Bearer " + K
    return h

def req(url, mode, first_line=False):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=hdrs(mode)), timeout=60) as resp:
            return resp.status, (resp.readline(8192) if first_line else resp.read(4096))
    except urllib.error.HTTPError as e:
        return e.code, (e.read() or b"")[:160]
    except Exception as e:
        return -1, str(e).encode()[:160]

DATASETS = [("alexandermeau", "nfl-big-data-bowl-archived-data-2025"),
            ("llkh0a", "nfl-big-data-bowl-2026-prediction-public")]
for owner, slug in DATASETS:
    log(f"\n===== {owner}/{slug} =====")
    view = f"https://www.kaggle.com/api/v1/datasets/view/{owner}/{slug}"
    for mode in ("none", "basic", "bearer"):
        st, body = req(view, mode)
        log(f"  view [{mode}] -> HTTP {st}  {body[:100].decode(errors='replace')}")
    # once any auth works, grab a tracking header
    for fn in ("tracking_week_1.csv", "big-data-bowl-data/tracking_week_1.csv"):
        url = f"https://www.kaggle.com/api/v1/datasets/download/{owner}/{slug}?file_name={urllib.parse.quote(fn)}"
        for mode in ("basic", "bearer"):
            st, body = req(url, mode, first_line=True)
            hdr = body.decode(errors='replace').strip()
            csvish = ("," in hdr and not hdr.startswith("PK"))
            log(f"  dl {fn} [{mode}] -> HTTP {st}  csv={csvish}")
            if csvish:
                log(f"    HEADER: {hdr[:400]}")
                break
open("outbox/kaggle-probe.txt", "w").write("\n".join(out))
print("\n[wrote outbox/kaggle-probe.txt]")
