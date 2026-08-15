#!/usr/bin/env python3
"""PRE-BUILD probe (Rule 68) for the BDB tracking pipeline. With KAGGLE creds now
in CI, discover: (1) does auth work, (2) which Big Data Bowl competitions have
their rules accepted (200) vs not (403), (3) the real file list/schema. NEVER
prints the key — only competition refs, file names, sizes, HTTP statuses."""
import os, urllib.request, urllib.error, base64, json
U = os.environ.get("KAGGLE_USERNAME", "")
K = os.environ.get("KAGGLE_KEY", "")
os.makedirs("outbox", exist_ok=True)
out = []
def log(s): print(s); out.append(s)
if not U or not K:
    log("NO KAGGLE CREDS in env — secrets not wired to this workflow")
    open("outbox/kaggle-probe.txt", "w").write("\n".join(out)); raise SystemExit(1)
log(f"[creds] KAGGLE_USERNAME present (len {len(U)}), KAGGLE_KEY present (len {len(K)})")  # lengths only, never values
AUTH = "Basic " + base64.b64encode(f"{U}:{K}".encode()).decode()
def get(url):
    req = urllib.request.Request(url, headers={"Authorization": AUTH, "User-Agent": "FIELD/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return -1, str(e).encode()
# 1. auth check + discover BDB competitions
st, body = get("https://www.kaggle.com/api/v1/competitions/list?search=big%20data%20bowl")
log(f"\n[auth] competitions/list search='big data bowl' -> HTTP {st}")
if st == 200:
    try:
        for c in json.loads(body)[:25]:
            log(f"   comp: {c.get('ref')}  deadline={c.get('deadline','')}  title={c.get('title','')[:60]}")
    except Exception as e:
        log(f"   parse err {e}: {body[:200]!r}")
else:
    log(f"   body: {body[:300].decode(errors='replace')}")
# 2. file lists per candidate competition (200=rules accepted, 403=not accepted)
for comp in ["nfl-big-data-bowl-2025", "nfl-big-data-bowl-2024", "nfl-big-data-bowl-2023",
             "nfl-big-data-bowl-2022", "nfl-big-data-bowl-2021"]:
    st, body = get(f"https://www.kaggle.com/api/v1/competitions/data/list/{comp}")
    log(f"\n[files] {comp} -> HTTP {st}")
    if st == 200:
        try:
            data = json.loads(body)
            files = data if isinstance(data, list) else data.get("files", data.get("datasetFiles", []))
            for f in files:
                log(f"   {f.get('name') or f.get('ref')}  bytes={f.get('totalBytes') or f.get('size')}")
        except Exception as e:
            log(f"   parse err {e}: {body[:200]!r}")
    else:
        log(f"   body: {body[:200].decode(errors='replace')}")
open("outbox/kaggle-probe.txt", "w").write("\n".join(out))
print("\n[wrote outbox/kaggle-probe.txt]")
