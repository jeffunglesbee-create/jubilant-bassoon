# Claude Code Command — Backfill Zone Data for Already-Processed Umpire Games

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-umpire-weakness-backfill-2026-07-01.md.

## CONTEXT

`outbox/mlb/umpire_abs.json` has 327 `processed_game_pks`, spanning
roughly `2026-05-01` through `2026-06-30` (first run pulled "last 30
days" as of `2026-05-30`; confirmed via commit history — only 8 commits
have ever touched this file, earliest `2026-05-30T19:52:39Z`). Zero of
these 327 games have any `zones` data — the zone-tracking code
(CC-CMD-2026-07-01-umpire-weakness-zone.md, commit `db4fd9c7`) only
applies to NEW games processed going forward. Without a backfill, most
umpires won't show a real `weakness` value for weeks, waiting on the
normal incremental trickle of new games.

**Why this needs a separate code path, not just re-running the normal
flow:** the existing per-pitch loop explicitly skips already-processed
`game_pk`s (`if not gpk or gpk in processed_pks: continue`) specifically
to prevent double-counting `challenged`/`overturned` on repeat runs.
This backfill must re-touch those same 327 games for `zones` data
*only* — it must NOT re-increment `challenged`/`overturned`, which are
already correct.

**Why this needs chunking, not one pull:** the 14-day window that
already required extending the timeout to 180s returned 25,000 pitches.
A ~60-day range is roughly 4x that — extrapolating linearly suggests a
single fetch could be unreliable or exceed what a single HTTP request
should reasonably attempt. Chunk into 2-week windows (matching the
already-proven-working 14-day/180s pattern) run sequentially within one
job, not one giant request.

**Dollar cost: $0**, same basis as every other Savant fetch this
session — public repo (unlimited free Actions minutes), free public
Savant data, output stays a static repo file (no paid Cloudflare
resource touched).

## PRE-BUILD PROBE (Rule 87)

```bash
sed -n '237,420p' scripts/mlb-weekly-update.py
python3 -c "
import json
d = json.load(open('outbox/mlb/umpire_abs.json'))
print(len(d.get('processed_game_pks', [])))
print(len(d.get('data', {})))
"
```

Confirm the exact current shape of the umpire section and the real
current `processed_game_pks` count before writing anything — 327 is
from the 2026-07-01 investigation and may have grown since (weekly cron
runs on Mondays; if today is past the next Monday, expect more).

**Also confirm the real earliest processed game date** — don't assume
`2026-05-01` from the commit-history inference above. Check whether
`game_events`/output data anywhere records per-game dates for the
already-processed set (if not, deriving the exact earliest date may
require a broader initial probe fetch before chunking — verify what's
actually available before committing to a chunk boundary).

## TASK 1: Write a standalone backfill script

Create `scripts/mlb-umpire-zone-backfill.py`, structured as a one-time
utility (not part of the weekly cron), following the same fetch/parse
conventions already established in `mlb-weekly-update.py`'s Section 6
(same `challenge_re`, same `ZONE_LABELS`, same `fetch_csv` helper — do
not duplicate/reinvent, import or copy exactly, keep the two files
consistent):

```python
# One-time backfill: populate `zones` for games already in
# processed_game_pks whose challenge/overturn counts are correct but
# whose zone data predates the zone-tracking feature (commit db4fd9c7,
# 2026-07-01). Does NOT touch challenged/overturned — only zones.
# Run manually via workflow_dispatch, not on a schedule.

import json, os, re, urllib.request
from datetime import datetime, timedelta, timezone

# [import/copy: fetch_csv, challenge_re, ZONE_LABELS from mlb-weekly-update.py]

ump_path = "outbox/mlb/umpire_abs.json"
with open(ump_path) as f:
    existing = json.load(f)

target_pks = set(existing.get("processed_game_pks", []))
print(f"Backfilling zone data for {len(target_pks)} already-processed games")

# Chunk into 14-day windows across the full historical range (confirm
# real earliest date via pre-build probe, don't hardcode 2026-05-01
# without verifying it first)
chunks = []  # [(since_str, until_str), ...] — build from verified real range

pk_to_ump_last = {}  # reverse-index: which umpire (by last-name key) owns each already-processed pk
# Build this from existing["data"] — but existing data is keyed by
# umpire, not game_pk, and doesn't currently store per-game breakdown.
# CONFIRM during the probe whether per-game umpire assignment is
# recoverable at all from the current output shape, or whether this
# backfill needs to re-fetch officials data too (MLB Stats API
# schedule?hydrate=officials, same as the normal flow) per chunk to
# rebuild the game_pk -> umpire mapping, since it may not be stored.
# If it's not recoverable, the backfill needs the SAME officials-fetch
# step as the normal weekly flow, scoped to target_pks only.

zone_updates = {}  # {umpire_last: {zone: {challenged, overturned}}}

for since_str, until_str in chunks:
    statcast_url = (
        "https://baseballsavant.mlb.com/statcast_search/csv"
        f"?all=true&hfGT=R%7C&hfSea=2026%7C"
        f"&game_date_gt={since_str}&game_date_lt={until_str}&type=details"
    )
    rows = fetch_csv(statcast_url, timeout=180)
    print(f"  {since_str}→{until_str}: {len(rows)} pitches")
    for row in rows:
        gpk = (row.get("game_pk") or "").strip()
        if gpk not in target_pks: continue
        des = row.get("des", "") or ""
        m = challenge_re.search(des)
        if not m: continue
        zone = (row.get("zone") or "").strip()
        if not zone: continue
        ump_last = pk_to_ump_last.get(gpk)
        if not ump_last: continue
        overturned = m.group(1).lower() == "overturned"
        d = zone_updates.setdefault(ump_last, {}).setdefault(zone, {"challenged": 0, "overturned": 0})
        d["challenged"] += 1
        if overturned: d["overturned"] += 1

# Merge zone_updates into existing data (zones field only), recompute weakness
for last, zones in zone_updates.items():
    if last not in existing["data"]: continue
    existing["data"][last].setdefault("zones", {})
    for z, zc in zones.items():
        uz = existing["data"][last]["zones"].setdefault(z, {"challenged": 0, "overturned": 0})
        uz["challenged"] += zc["challenged"]
        uz["overturned"] += zc["overturned"]
    # Recompute weakness using the same threshold logic as the normal flow
    c = existing["data"][last]["challenged"]
    o = existing["data"][last]["overturned"]
    rate = round(o / c, 3) if c > 0 else 0.0
    zones_now = existing["data"][last]["zones"]
    candidates = [(z, zc["overturned"]/zc["challenged"]) for z, zc in zones_now.items() if zc["challenged"] >= 2]
    if candidates:
        worst_zone, worst_rate = max(candidates, key=lambda x: x[1])
        if worst_rate > rate:
            existing["data"][last]["weakness"] = ZONE_LABELS.get(worst_zone, worst_zone)

with open(ump_path, "w") as f:
    json.dump(existing, f, indent=2)

backfilled = sum(1 for v in existing["data"].values() if v.get("weakness"))
print(f"✅ {backfilled}/{len(existing['data'])} umpires now have a weakness value")
```

**This pseudocode has a real, disclosed gap** (marked inline above) —
whether per-game umpire assignment is recoverable from the current
output shape. Resolve this during the probe, not by guessing; if it
requires re-fetching officials data, add that step following the exact
pattern already in `mlb-weekly-update.py`'s Section 6 (one call per
date, not per game).

## TASK 2: Add a workflow_dispatch entry point

Add a manually-triggered job to `.github/workflows/mlb-weekly-update.yml`
(or a new dedicated workflow file if that's cleaner — CC's judgment,
matching existing conventions) to run this script on demand. This is
explicitly NOT a scheduled job — it runs once, backfill complete, done.

## TASK 3: Verification

Trigger the real workflow via `workflow_dispatch` (same technique used
successfully twice already this session) and confirm via the actual
committed `umpire_abs.json` that a meaningful fraction of the 44
umpires now have a non-null `weakness` — not just that the job
completed without error.

```bash
node smoke.js index.html
```

Done condition: 0 failures (Python-only change), real live confirmation
of non-null `weakness` values on real umpires, not just a clean job log.

## TASK 4: Outbox manifest (last task)

State explicitly: the resolved per-game-umpire-mapping approach (was it
recoverable from existing data, or did it require re-fetching
officials?), the real chunk boundaries used and why, and the real
before/after count of umpires with a populated `weakness` value.
