#!/usr/bin/env python3
"""docs/CC-CMD-2026-10-16-bdb-vintage-retrofit.md, Task 0 measurement 3: can a
CURRENT season of BDB-style tracking be obtained at all, or is 2022 the only
thing the builder can reach? Read-only. Changes no envelope, no builder.

It re-measures, rather than inherits, three claims:
  1. nflverse publishes no tracking release (relay probe 2026-08-15: HTTP 404).
  2. llkh0a/nfl-big-data-bowl-2026-prediction-public is 2023, prediction-input
     only, no plays/player_play (outbox/bdb-ds2-probe.txt, 2026-08-15).
  3. Nothing newer exists on Kaggle under "big data bowl" (never measured).

Every listing reports its own coverage (how many items it saw, how many pages),
so an empty answer cannot pass for "nothing exists". Never prints the key.
Writes outbox/bdb-availability-probe-latest.json.
"""
import os, json, base64, re, sys, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timezone

U = (os.environ.get("KAGGLE_USERNAME", "") or "").strip()
K = (os.environ.get("KAGGLE_KEY", "") or "").strip()
AUTH = "Basic " + base64.b64encode(f"{U}:{K}".encode()).decode() if (U and K) else None

def get(url, auth=False, timeout=60):
    h = {"User-Agent": "FIELD/1.0", "Accept": "application/json"}
    if auth and AUTH: h["Authorization"] = AUTH
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, (e.read() or b"")[:400]
    except Exception as e:
        return -1, str(e).encode()[:400]

def seasons_in(text):
    """Four-digit NFL seasons named in a string, 2015-2030."""
    return sorted({int(y) for y in re.findall(r"(?<!\d)(20(?:1[5-9]|2\d|30))(?!\d)", text or "")})

out = {"ran_at": datetime.now(timezone.utc).isoformat(), "kaggle_creds": bool(AUTH)}

# 1. nflverse releases — every tag, paginated.
tags, pages, status = [], 0, None
for page in range(1, 11):
    st, body = get(f"https://api.github.com/repos/nflverse/nflverse-data/releases?per_page=100&page={page}")
    status, pages = st, page
    if st != 200: break
    batch = json.loads(body)
    tags += [r.get("tag_name") for r in batch]
    if len(batch) < 100: break
out["nflverse"] = {"status": status, "pages": pages, "tags_seen": len(tags), "tags": sorted(tags),
                   "tracking_like": sorted(t for t in tags if re.search(r"track|bdb|big.?data|ngs_tracking", t or "", re.I))}
st, _ = get("https://api.github.com/repos/nflverse/nflverse-data/releases/tags/tracking")
out["nflverse"]["tag_tracking_status"] = st

# 2 + 3. Kaggle: datasets and competitions matching "big data bowl", every page.
def kaggle_list(kind, search):
    rows, page, st = [], 1, None
    while page <= 20:
        q = urllib.parse.urlencode({"search": search, "page": page})
        st, body = get(f"https://www.kaggle.com/api/v1/{kind}/list?{q}", auth=True)
        if st != 200: break
        try: batch = json.loads(body)
        except Exception: st = "unparseable"; break
        if not batch: break
        rows += batch; page += 1
    return st, page - 1, rows

if AUTH:
    st, pages, ds = kaggle_list("datasets", "big data bowl")
    out["kaggle_datasets"] = {"status_last": st, "pages_read": pages, "seen": len(ds), "rows": [
        {"ref": d.get("ref"), "title": d.get("title") or d.get("titleNullable"),
         "lastUpdated": d.get("lastUpdated"), "totalBytes": d.get("totalBytes") or d.get("totalBytesNullable"),
         "seasons_named": seasons_in(f"{d.get('ref')} {d.get('title') or d.get('titleNullable')} {d.get('subtitle') or d.get('subtitleNullable') or ''}")}
        for d in ds]}
    st, pages, cs = kaggle_list("competitions", "big data bowl")
    out["kaggle_competitions"] = {"status_last": st, "pages_read": pages, "seen": len(cs), "rows": []}
    for c in cs:
        ref = c.get("ref") or c.get("url") or ""
        slug = ref.rstrip("/").split("/")[-1]
        fst, fbody = get(f"https://www.kaggle.com/api/v1/competitions/data/list/{slug}", auth=True)
        files = []
        if fst == 200:
            try:
                j = json.loads(fbody); files = [f.get("name") or f.get("ref") for f in (j if isinstance(j, list) else j.get("files", []))]
            except Exception: fst = "unparseable"
        out["kaggle_competitions"]["rows"].append({
            "ref": ref, "title": c.get("title"), "deadline": c.get("deadline"),
            "files_status": fst, "files_seen": len(files), "files_sample": files[:25],
            "seasons_in_filenames": seasons_in(" ".join(files)), "seasons_named": seasons_in(f"{ref} {c.get('title')}")})
    # The second dataset, re-listed.
    st, body = get("https://www.kaggle.com/api/v1/datasets/list/llkh0a/nfl-big-data-bowl-2026-prediction-public", auth=True)
    names = []
    if st == 200:
        try:
            j = json.loads(body); names = [f.get("name") for f in (j.get("datasetFiles") or [])]
        except Exception: st = "unparseable"
    out["ds2"] = {"status": st, "files_seen": len(names), "seasons_in_filenames": seasons_in(" ".join(names)),
                  "has_plays_csv": any(n and n.endswith("plays.csv") for n in names),
                  "has_player_play_csv": any(n and n.endswith("player_play.csv") for n in names),
                  "files": names}

os.makedirs("outbox", exist_ok=True)
with open("outbox/bdb-availability-probe-latest.json", "w") as f: json.dump(out, f, indent=1)
n = out["nflverse"]
print(f"nflverse: HTTP {n['status']}, {n['tags_seen']} tags over {n['pages']} page(s); tracking-like {n['tracking_like']}; /tags/tracking HTTP {n['tag_tracking_status']}")
if AUTH:
    for k in ("kaggle_datasets", "kaggle_competitions"):
        print(f"{k}: {out[k]['seen']} seen over {out[k]['pages_read']} page(s), last HTTP {out[k]['status_last']}")
    d = out["ds2"]
    print(f"ds2: HTTP {d['status']}, {d['files_seen']} files, seasons {d['seasons_in_filenames']}, plays.csv {d['has_plays_csv']}, player_play.csv {d['has_player_play_csv']}")
else:
    print("no Kaggle creds: Kaggle UNMEASURED (not 'nothing found')"); sys.exit(1)
