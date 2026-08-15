#!/usr/bin/env python3
"""Discover dataset-2 (llkh0a/nfl-big-data-bowl-2026-prediction-public) file layout.
Uses Kaggle's files-list API endpoint (what `kaggle datasets files` calls), then
prints each file's name + size. Never prints the key. Writes outbox/bdb-ds2-probe.txt."""
import os, json, base64, urllib.request, urllib.error
U = (os.environ.get("KAGGLE_USERNAME","") or "").strip()
K = (os.environ.get("KAGGLE_KEY","") or "").strip()
AUTH = "Basic " + base64.b64encode(f"{U}:{K}".encode()).decode() if (U and K) else None
OWNER, SLUG = "llkh0a", "nfl-big-data-bowl-2026-prediction-public"
out=[]
def log(s): print(s); out.append(str(s))
def get(url):
    req=urllib.request.Request(url, headers={"Authorization":AUTH,"User-Agent":"FIELD/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=90) as r: return r.status, r.read()
    except urllib.error.HTTPError as e: return e.code,(e.read() or b"")[:300]
    except Exception as e: return -1,str(e).encode()[:300]

if not AUTH:
    log("no creds")
else:
    # files-list API (paginated)
    for url in (f"https://www.kaggle.com/api/v1/datasets/list/{OWNER}/{SLUG}",
                f"https://www.kaggle.com/api/v1/datasets/view/{OWNER}/{SLUG}"):
        st,body=get(url)
        log(f"\n[{url.rsplit('/',3)[0].split('/')[-1] or url}] HTTP {st}")
        try:
            j=json.loads(body)
            files=j.get("datasetFiles") or j.get("files") or (j if isinstance(j,list) else [])
            for f in files:
                nm=f.get("name") or f.get("nameNullable") or f.get("ref")
                sz=f.get("totalBytes") or f.get("totalBytesNullable") or f.get("size")
                log(f"    {nm}  ({sz} bytes)")
            if not files: log(f"    (no files parsed) raw head: {body[:200].decode(errors='replace')}")
        except Exception as e:
            log(f"    parse err: {e} | raw: {body[:200].decode(errors='replace')}")
os.makedirs("outbox",exist_ok=True); open("outbox/bdb-ds2-probe.txt","w").write("\n".join(out))
log("\n[wrote outbox/bdb-ds2-probe.txt]")
