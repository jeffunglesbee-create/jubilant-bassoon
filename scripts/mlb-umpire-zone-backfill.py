#!/usr/bin/env python3
"""
One-time backfill: populate `zones` for games already in
processed_game_pks whose challenge/overturn counts are correct but whose
zone data predates the zone-tracking feature (commit db4fd9c7,
2026-07-01). Does NOT touch challenged/overturned/processed_game_pks —
only zones (and weakness, recomputed from the backfilled zones).

Run manually via workflow_dispatch, not on a schedule
(.github/workflows/mlb-umpire-zone-backfill.yml).

Fetch/parse conventions (fetch_csv, challenge_re, ZONE_LABELS,
MLB_API_BASE/officials lookup) are copied verbatim from
mlb-weekly-update.py Section 6, not reinvented — kept consistent
deliberately. Copied rather than imported because mlb-weekly-update.py
is a top-level script (no __main__ guard); importing it would execute
its entire fetch pipeline (sections 1-6, all network calls) as a side
effect.

Per-game umpire assignment is NOT recoverable from the current
outbox/mlb/umpire_abs.json shape (confirmed via probe: existing entries
have no per-game breakdown, only umpire-level aggregates) — this script
re-fetches officials data via MLB Stats API schedule?hydrate=officials,
scoped to only the dates that actually have a target-pk challenge (not
every date in the range), same one-call-per-date pattern as the normal
weekly flow.

Date range: 2026-04-01 (matching mlb-weekly-update.py's own "first run =
full season (April 1)" convention — the codebase's own established floor
for this data, not invented here) through yesterday, chunked into 14-day
windows (matching the already-proven-working 14-day/180s pattern from the
umpire-weakness-zone CC-CMD). Chunking errs wide deliberately: git commit
history for umpire_abs.json turned out to be an unreliable proxy for the
true earliest processed date (the file's first appearance in a clean
commit was bundled into an unrelated "ci: update current state" commit;
its internal `updated` timestamp showed an earlier, uncommitted-cleanly
run existed). Extra chunks with no matching target_pks are cheap (filtered
out, no zone data added) — under-covering the range would silently miss
real backfill targets, which is the worse failure mode.
"""
import csv, io, json, os, re, urllib.request
from datetime import datetime, timedelta, timezone

HEADERS = {"User-Agent":"Mozilla/5.0 (compatible; FIELD-MLB-Updater/1.0)","Accept":"text/csv,*/*"}

def fetch_csv(url, timeout=30):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        body = r.read().decode("utf-8", errors="replace")
        body = body.lstrip("﻿")
        rows = list(csv.DictReader(io.StringIO(body)))
        cleaned = [{k.strip().lstrip('﻿').strip('"').strip(): v
                    for k,v in row.items()} for row in rows]
        return cleaned

MLB_API_BASE = "https://statsapi.mlb.com/api/v1"
MLB_JSON_HEADERS = {"User-Agent": "FIELD-Sports-Intelligence/1.0", "Accept": "application/json"}

def fetch_mlb_json(url):
    req = urllib.request.Request(url, headers=MLB_JSON_HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())

challenge_re = re.compile(
    r'challenged \(pitch result\), call on the field was (confirmed|overturned)',
    re.IGNORECASE
)

# Verified 2026-07-01 against real ABS challenge rows (workflow run
# 28554428622, savant-csv-probe.yml) — copied verbatim from
# mlb-weekly-update.py, see that file for the full derivation comment.
ZONE_LABELS = {
    "1": "up-left",    "2": "up",         "3": "up-right",
    "4": "left",       "5": "middle",     "6": "right",
    "7": "down-left",  "8": "down",       "9": "down-right",
    "11": "up-left",   "12": "up-right",  "13": "down-left", "14": "down-right",
}

ump_path = "outbox/mlb/umpire_abs.json"
with open(ump_path) as f:
    existing = json.load(f)

target_pks = set(existing.get("processed_game_pks", []))
print(f"Backfilling zone data for {len(target_pks)} already-processed games")

# Build 14-day chunks from 2026-04-01 through yesterday. Intended calendar
# ranges are perfectly adjacent (no overlap, no gap): [start, end], then
# [end+1day, next_end], etc. game_date_gt/game_date_lt are STRICT
# inequalities (confirmed by param naming — standard gt/lt convention), so
# back-to-back chunks sharing a literal boundary date as both bounds would
# silently skip any game dated exactly on that boundary. Fixed by padding
# each chunk's ACTUAL query bounds by 1 day beyond its intended calendar
# range on each side, while keeping the intended ranges themselves
# perfectly adjacent — guarantees full coverage with zero gap and zero
# double-count (each calendar day belongs to exactly one intended range).
today_utc = datetime.now(timezone.utc)
range_start = datetime(2026, 4, 1, tzinfo=timezone.utc)
range_end = today_utc - timedelta(days=1)
chunks = []
cursor = range_start
while cursor <= range_end:
    intended_end = min(cursor + timedelta(days=13), range_end)  # 14 inclusive days
    query_since = (cursor - timedelta(days=1)).strftime("%Y-%m-%d")
    query_until = (intended_end + timedelta(days=1)).strftime("%Y-%m-%d")
    chunks.append((query_since, query_until))
    cursor = intended_end + timedelta(days=1)
print(f"Chunks ({len(chunks)}): {chunks}")

# Pass 1: scan each chunk for challenge rows belonging to already-processed
# games, collecting zone tallies keyed by game_pk (not umpire — we don't
# know the umpire yet).
pk_zone_updates = {}  # {gpk: {date, zones: {zone: {challenged, overturned}}}}
for since_str, until_str in chunks:
    statcast_url = (
        "https://baseballsavant.mlb.com/statcast_search/csv"
        f"?all=true&hfGT=R%7C&hfSea=2026%7C"
        f"&game_date_gt={since_str}&game_date_lt={until_str}&type=details"
    )
    try:
        rows = fetch_csv(statcast_url, timeout=180)
    except Exception as e:
        print(f"  {since_str}→{until_str}: FAILED ({e})")
        continue
    print(f"  {since_str}→{until_str}: {len(rows)} pitches")
    for row in rows:
        gpk = (row.get("game_pk") or "").strip()
        if gpk not in target_pks: continue
        des = row.get("des", "") or ""
        if not des: continue
        m = challenge_re.search(des)
        if not m: continue
        zone = (row.get("zone") or "").strip()
        if not zone: continue
        gdate = (row.get("game_date") or "").strip()
        overturned = m.group(1).lower() == "overturned"
        entry = pk_zone_updates.setdefault(gpk, {"date": gdate, "zones": {}})
        z = entry["zones"].setdefault(zone, {"challenged": 0, "overturned": 0})
        z["challenged"] += 1
        if overturned:
            z["overturned"] += 1

print(f"Games with recoverable zone data: {len(pk_zone_updates)}/{len(target_pks)}")

# Pass 2: resolve HP umpire per game, scoped ONLY to dates that actually
# have a target-pk challenge (not every date in the range) — same
# one-call-per-date batching pattern as the normal weekly flow.
dates_to_pks = {}
for gpk, ev in pk_zone_updates.items():
    dates_to_pks.setdefault(ev["date"], []).append(gpk)

pk_to_umpire = {}
for gdate, pks in sorted(dates_to_pks.items()):
    try:
        sched = fetch_mlb_json(
            f"{MLB_API_BASE}/schedule?sportId=1&date={gdate}"
            f"&gamePks={','.join(pks)}&hydrate=officials"
            f"&fields=dates,games,gamePk,officials,officialType,official,fullName"
        )
        for date_block in (sched.get("dates") or []):
            for game in (date_block.get("games") or []):
                gpk = str(game.get("gamePk",""))
                for off in (game.get("officials") or []):
                    if (off.get("officialType","")).lower() == "home plate":
                        pk_to_umpire[gpk] = off.get("official",{}).get("fullName","")
                        break
    except Exception as e:
        print(f"  ⚠ schedule fetch for {gdate}: {e}")

print(f"HP umpires resolved: {len(pk_to_umpire)}/{len(pk_zone_updates)}")

# Pass 3: merge per-game zone tallies into per-umpire zones (zones ONLY —
# challenged/overturned/processed_game_pks are untouched, already correct).
zone_updates_by_ump = {}  # {umpire_last: {zone: {challenged, overturned}}}
for gpk, ev in pk_zone_updates.items():
    ump_full = pk_to_umpire.get(gpk)
    if not ump_full: continue
    last = ump_full.split()[-1].lower().replace("'","").replace(".","").replace("-","_")
    bucket = zone_updates_by_ump.setdefault(last, {})
    for z, zc in ev["zones"].items():
        uz = bucket.setdefault(z, {"challenged": 0, "overturned": 0})
        uz["challenged"] += zc["challenged"]
        uz["overturned"] += zc["overturned"]

before_count = sum(1 for v in existing["data"].values() if v.get("weakness"))

for last, zones in zone_updates_by_ump.items():
    if last not in existing["data"]: continue
    existing["data"][last].setdefault("zones", {})
    for z, zc in zones.items():
        uz = existing["data"][last]["zones"].setdefault(z, {"challenged": 0, "overturned": 0})
        uz["challenged"] += zc["challenged"]
        uz["overturned"] += zc["overturned"]
    # Recompute weakness using the same threshold logic as the normal flow.
    c = existing["data"][last]["challenged"]
    o = existing["data"][last]["overturned"]
    rate = round(o / c, 3) if c > 0 else 0.0
    zones_now = existing["data"][last]["zones"]
    candidates = [(z, zc["overturned"]/zc["challenged"]) for z, zc in zones_now.items() if zc["challenged"] >= 2]
    weakness = None
    if candidates:
        worst_zone, worst_rate = max(candidates, key=lambda x: x[1])
        if worst_rate > rate:
            weakness = ZONE_LABELS.get(worst_zone, worst_zone)
    existing["data"][last]["weakness"] = weakness

with open(ump_path, "w") as f:
    json.dump(existing, f, indent=2)

after_count = sum(1 for v in existing["data"].values() if v.get("weakness"))
print(f"✅ weakness populated: {before_count} → {after_count} of {len(existing['data'])} umpires")
