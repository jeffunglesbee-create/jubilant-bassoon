# Claude Code Command — Populate Umpire Weakness Field (Zone-Based)

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-umpire-weakness-zone-2026-07-01.md.

## CONTEXT

`scripts/mlb-weekly-update.py`'s umpire ABS section (~line 237-380) has
carried a `weakness` field since it shipped (May 31 2026) that has
never once been assigned a real value — confirmed via direct read:
`"weakness": None` on entry creation, `s.get("weakness", None)` on
finalize, no assignment anywhere in between. The client already has a
dormant display line waiting for this data (index.html, inside
`getUmpireABSRating`):

```javascript
const weakNote = d.weakness ? ` · weak: ${d.weakness} zone` : '';
```

This flows directly into the already-shipped `[UMP WATCH]` badge
tooltip on the MLB card (index.html ~line 10546,
`buildUmpWatchBadge`/`buildParkFactorBadge` call site) — no new UI work
needed, only real data.

**Why this is cheap:** the Statcast CSV already being fetched for
challenge detection (`statcast_url`, ~line 274) already includes a
`zone` column (confirmed live via direct probe 2026-07-01 — the same
fetch used for the challenge-narrative `des` parsing). No new fetch, no
new endpoint — read one more column from rows already being iterated.

## PRE-BUILD PROBE (Rule 87)

```bash
sed -n '237,383p' scripts/mlb-weekly-update.py
```

Confirm exact current line numbers before editing — line numbers above
are from the 2026-07-01 investigation.

**Also confirm before writing any zone-to-label mapping:** fetch a
small real Statcast sample and inspect the actual distribution of
`zone` values on CHALLENGED pitches specifically (not all pitches).
Standard Statcast zone convention is a 3x3 grid (1-9) for the strike
zone plus 11-14 for outside-zone regions, but verify this against real
data rather than assuming the mapping from memory — check what values
actually appear and confirm which zones correspond to "low"/"high"/
"inside"/"outside" by cross-referencing `plate_x`/`plate_z` (also
present in the same CSV) for a few sample rows, don't guess the mapping
from zone number alone.

## TASK 1: Capture zone per challenged pitch

In the per-game challenge loop (~line 291-301), extend `game_events` to
track per-zone challenge/overturn counts, not just the game-level
totals already there:

```python
for row in sc_rows:
    des = row.get("des", "") or ""
    if not des: continue
    m = challenge_re.search(des)
    if not m: continue
    gpk = (row.get("game_pk") or "").strip()
    gdate = (row.get("game_date") or "").strip()
    if not gpk or gpk in processed_pks: continue
    zone = (row.get("zone") or "").strip()
    if gpk not in game_events:
        game_events[gpk] = {"date": gdate, "challenged": 0, "overturned": 0, "zones": {}}
    game_events[gpk]["challenged"] += 1
    overturned = m.group(1).lower() == "overturned"
    if overturned:
        game_events[gpk]["overturned"] += 1
    if zone:
        z = game_events[gpk]["zones"].setdefault(zone, {"challenged": 0, "overturned": 0})
        z["challenged"] += 1
        if overturned:
            z["overturned"] += 1
```

## TASK 2: Aggregate zone data to the umpire level

In the umpire aggregation loop (~line 347-357), merge each game's
per-zone tallies into the umpire's running totals (seeded from existing
data the same way `challenged`/`overturned` already are):

```python
for gpk, ev in game_events.items():
    ump_full = pk_to_umpire.get(gpk)
    if not ump_full: continue
    last = ump_full.split()[-1].lower().replace("'","").replace(".","").replace("-","_")
    if last not in ump_stats:
        ump_stats[last] = {"challenged": 0, "overturned": 0,
                           "fullName": ump_full, "weakness": None, "zones": {}}
    ump_stats[last]["challenged"] += ev["challenged"]
    ump_stats[last]["overturned"] += ev["overturned"]
    ump_stats[last].setdefault("zones", {})
    for z, zc in ev.get("zones", {}).items():
        uz = ump_stats[last]["zones"].setdefault(z, {"challenged": 0, "overturned": 0})
        uz["challenged"] += zc["challenged"]
        uz["overturned"] += zc["overturned"]
    if not ump_stats[last].get("fullName"):
        ump_stats[last]["fullName"] = ump_full
    processed_pks.add(gpk)
```

## TASK 3: Compute weakness at finalize time

In the rate-computation loop (~line 359-371), determine each umpire's
weakest zone — the zone with the highest overturn rate among zones with
a minimum sample (avoid a 1-challenge zone producing a misleading
100%):

```python
ZONE_LABELS = {}  # fill in from the pre-build probe's verified mapping — do not invent

for last, s in ump_stats.items():
    c = s.get("challenged", 0)
    o = s.get("overturned", 0)
    if c < 3: continue
    rate = round(o / c, 3) if c > 0 else 0.0
    weakness = None
    zones = s.get("zones", {})
    candidates = [(z, zc["overturned"]/zc["challenged"]) for z, zc in zones.items() if zc["challenged"] >= 2]
    if candidates:
        worst_zone, worst_rate = max(candidates, key=lambda x: x[1])
        if worst_rate > rate:  # only flag if genuinely worse than their overall rate
            weakness = ZONE_LABELS.get(worst_zone, worst_zone)  # fall back to raw zone number if unmapped
    final_ump[last] = {
        "challenged": c, "overturned": o, "rate": rate,
        "fullName": s.get("fullName",""),
        "weakness": weakness
    }
```

Also persist `zones` in the written JSON (add to the per-umpire dict in
`final_ump`, or keep it in a separate section) so future runs can
continue accumulating zone data incrementally, the same way
`challenged`/`overturned` already accumulate via `existing_ump` seeding
— don't lose this data between weekly runs.

## TASK 4: Verification

```bash
python3 scripts/mlb-weekly-update.py  # if runnable in CC sandbox — if statcast/MLB API are proxy-blocked (confirmed likely, per prior session history), note this in outbox and defer live verification to a workflow_dispatch trigger, same pattern as the pitch_arsenals fix
node smoke.js index.html
```

Done condition: script runs without error (or the CC-sandbox network
limitation is documented if it can't), smoke unaffected (this is a
Python/data change, not a client-side JS change — should not require
new smoke assertions unless CC judges one useful for locking in the
`weakness` field's presence in the output schema).

**Chat-side follow-up (not checkable by CC):** trigger `mlb-weekly-update.yml`
via `workflow_dispatch` (same technique used for the pitch_arsenals fix)
and confirm real umpires end up with non-null `weakness` values in the
live output, then confirm the `[UMP WATCH]` tooltip actually shows the
new `· weak: X zone` text for a qualifying umpire.

## TASK 5: Outbox manifest (last task)

State explicitly the verified zone-to-label mapping used (with the
evidence — real `plate_x`/`plate_z` cross-reference, not assumed from
memory), and whether live verification was possible from the CC sandbox
or deferred to chat-side workflow_dispatch.
