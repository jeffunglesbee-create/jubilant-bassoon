# Claude Code Command — Fix pitch_arsenals + AVV Proof for Baseball Savant

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-avv-savant-2026-07-01.md.

## CONTEXT

Investigating a methodology for player-identity resolution surfaced a
real, standing bug: `outbox/mlb/pitch_arsenals.json` has produced zero
pitcher data on every single weekly run since at least June 1 2026
(confirmed by fetching 4 historical commits: June 8/15/22/29, all
`{"data": {}}`). `mlb-weekly-update.yml` runs every Monday and commits
successfully every time — the failure is silent, not a crash.

**Root cause, fully diagnosed, not guessed:** a May 30 2026 probe
(`outbox/fixtures/savant-probe-20260530T193956Z.json`, already in the
repo) confirmed the source endpoint is healthy — `pitch-arsenal-stats`
returned `status:200, rows:49` with real data. The bug is entirely in
`scripts/mlb-weekly-update.py`'s parsing (~line 168-198): the script
assumes a WIDE CSV format (one row per pitcher, columns named
`{code}_usage`, `{code}_avg_speed`, `{code}_whiff_percent` per pitch
type — e.g. `ff_usage`, `si_avg_speed`). The real CSV is LONG format —
**one row per pitch type per pitcher**, with columns `last_name`,
`first_name`, `player_id`, `team_name_alt`, `pitch_type`, `pitch_name`,
`run_value_per_100`, `run_value`, `pitches`, `pitch_usage`, `pa`, `ba`,
`slg`, `woba`, `whiff_percent`, `k_percent`, `put_away`, `est_ba`,
`est_slg`, `est_woba`, `hard_hit_percent` (confirmed directly from the
probe fixture's recorded columns). There is **no velocity/speed column
in this dataset at all** — the script's `vel = r.get(f"{code}_avg_speed")`
was always going to be `None` regardless of any column-name fix, since
that metric simply isn't in this endpoint's data. Every other weekly
output is genuinely healthy — confirmed live: `team_abs` (30 teams),
`sprint_speed` (419), `pitch_tempo` (337), `expected_stats` (407),
`umpire_abs` (41). Only `pitch_arsenals` is broken. Do not "fix" the
others — they don't need it.

**Why AVV, not just a bug fix:** this exact failure mode — a pipeline
that runs and commits successfully while silently producing nothing —
is precisely what AVV (Adapter-to-Visible-Value) exists to catch,
per the existing 4-adapter manifest (`docs/adapter-proof.manifest.json`).
Baseball Savant is not currently one of them. This CC-CMD adds it,
covering both the weekly-batch pipeline (6 outputs) and the separate
live per-game feed (`fetchSavantGameFeed`).

## PRE-BUILD PROBE (Rule 87)

```bash
cat scripts/mlb-weekly-update.py
cat outbox/fixtures/savant-probe-20260530T193956Z.json
cat docs/adapter-proof.manifest.json
grep -n "async function fetchSavantGameFeed" index.html
sed -n '19419,19442p' index.html
grep -n "PITCHER_ARSENAL\|TEAM_ABS_RANKINGS" index.html
grep -n "\.wp\b" index.html
```

Confirm current line numbers before editing — everything above is from
the 2026-07-01 investigation and may have shifted.

**Also confirm live, fresh, before writing the fix:** the May 30 probe
is over a month old. Re-fetch `https://baseballsavant.mlb.com/leaderboard/pitch-arsenal-stats?type=pitcher&year=2026&min=100&csv=true`
directly (if reachable from the CC sandbox — if not, note that in the
outbox and proceed on the probe fixture's columns, since they're the
best evidence available) to confirm the column names haven't changed
since May 30. Do not assume the schema is still identical without at
least attempting this.

## TASK 1: Fix pitch_arsenals parsing (long-format CSV)

Rewrite the block at `scripts/mlb-weekly-update.py` (~line 168-198) to
group rows by player instead of assuming one row = one player:

```python
# ── 5. PITCH ARSENAL STATS (per-pitch-type rows, grouped by player) ──────
print("Fetching pitch arsenal stats...")
try:
    rows = fetch_csv("https://baseballsavant.mlb.com/leaderboard/pitch-arsenal-stats"
                     "?type=pitcher&year=2026&min=100&csv=true")
    arsenals = {}
    for r in rows:
        last_raw  = r.get("last_name") or ""
        first_raw = r.get("first_name") or ""
        name_raw  = f"{first_raw} {last_raw}".strip() or last_raw
        key = name_key(name_raw)
        if not key: continue
        pitch_type = r.get("pitch_name") or r.get("pitch_type") or ""
        if not pitch_type: continue
        try:
            usage = safe_float(r.get("pitch_usage"))
            whiff = safe_float(r.get("whiff_percent"))
            rv100 = safe_float(r.get("run_value_per_100"))
        except Exception:
            continue
        if usage and usage > 3:  # pitch_usage appears to be a percentage (0-100), not 0-1 — confirm against real data before shipping, adjust threshold if the scale differs
            arsenals.setdefault(key, {"team": r.get("team_name_alt","").strip(), "pitches": []})
            arsenals[key]["pitches"].append({
                "type": pitch_type,
                "usage": round(usage / 100, 3) if usage > 1 else round(usage, 3),
                "whiffRate": round(whiff / 100, 3) if whiff else None,
                "runValuePer100": rv100,
            })
    for v in arsenals.values():
        v["pitches"].sort(key=lambda p: p["usage"], reverse=True)
    with open("outbox/mlb/pitch_arsenals.json","w") as f:
        json.dump({"updated": TS, "data": arsenals}, f, indent=2)
    print(f"  ✅ {len(arsenals)} pitchers")
except Exception as e:
    print(f"  ❌ {e}")
```

**Important — verify before shipping, don't trust the snippet blindly:**
the exact scale of `pitch_usage` (0-1 fraction vs 0-100 percentage) and
`whiff_percent` must be confirmed against the actual re-fetched CSV data
in the pre-build probe, not assumed from the snippet above. Adjust the
threshold/division logic to match what real values actually look like.
This replaces the velocity metric entirely (doesn't exist in this
dataset) with `runValuePer100` (a real, present, meaningful pitch-quality
metric) — update the client-side `PITCHER_ARSENAL` consumer (index.html,
found via probe) if it expects a `vel` field, since it will no longer
be present.

## TASK 2: Add AVV manifest entry for baseball-savant

Add to `docs/adapter-proof.manifest.json`, following the exact schema
of the 4 existing entries (confirmed via probe):

```json
"baseball-savant": {
  "status": "active",
  "sourceId": "baseball-savant-leaderboards",
  "sport": "Baseball",
  "components": {
    "weeklyBatch": {
      "script": "scripts/mlb-weekly-update.py",
      "workflow": ".github/workflows/mlb-weekly-update.yml",
      "outputs": [
        "outbox/mlb/team_abs.json",
        "outbox/mlb/expected_stats.json",
        "outbox/mlb/sprint_speed.json",
        "outbox/mlb/pitch_tempo.json",
        "outbox/mlb/pitch_arsenals.json",
        "outbox/mlb/umpire_abs.json"
      ]
    },
    "liveFeed": {
      "function": "fetchSavantGameFeed",
      "endpoint": "https://baseballsavant.mlb.com/gf?game_pk={sourceId}",
      "field": "wp (win probability) — NOTE: g.wp is also set from odds-derived probability elsewhere (index.html line ~11683); AVV proof for this must confirm the value came from Savant specifically, not conflate the two sources"
    }
  },
  "normalizer": "N/A — direct CSV/JSON consumption, no shared normalizer function",
  "requiredNormalizedFields": [
    "TEAM_ABS_RANKINGS entries: grade, battingWon, battingAttempted, battingRate",
    "PITCHER_ARSENAL entries: team, pitches[] (type, usage, whiffRate, runValuePer100)"
  ],
  "presentationConsumers": [
    "buildSavantContext (context-assembler.js, relay-side journalism prompt)",
    "client-side card win-probability display (index.html ~line 10522)"
  ],
  "visibleSurfaces": [
    {
      "surface": "journalism-context",
      "selector": "N/A (relay-side, not DOM) — proof is [SAVANT CONTEXT] block containing a 'pitcher ... best pitch' line",
      "proof": "buildSavantContext output includes a pitcher-arsenal line, not just ABS challenge grade"
    },
    {
      "surface": "card",
      "selector": ".game-card[data-sport='Baseball'] [data-proof='win-probability']",
      "proof": "win probability percentage visible, sourced from Savant gf feed specifically"
    }
  ],
  "fallbackSurfaces": [
    {
      "surface": "journalism-context",
      "proof": "[SAVANT CONTEXT] gracefully omits pitcher-arsenal line when data absent, ABS grade line still renders alone (confirmed this already works — this was the actual bug being fixed, not a fallback gap)"
    }
  ],
  "fixtures": {
    "ok": "tests/fixtures/adapters/baseball-savant.ok.json",
    "empty": "tests/fixtures/adapters/baseball-savant.empty.json",
    "malformed": "tests/fixtures/adapters/baseball-savant.malformed.json"
  },
  "proofMode": "required",
  "lastVerifiedAt": null
}
```

Build the three fixture files from REAL data only — do not invent
plausible-looking rows. Use:
- `ok`: a small real excerpt from the re-fetched (or May 30 probe, if
  re-fetch unavailable) `pitch-arsenal-stats` CSV, converted to the
  output JSON shape, for 2-3 real pitchers actually present in that data
- `empty`: `{"updated": "...", "data": {}}` — the actual current
  (pre-fix) broken state, which is real and reproducible
- `malformed`: a genuinely malformed variant (e.g. missing `pitch_usage`
  column) to prove the parser doesn't crash, not fabricated data values

## TASK 3: Smoke assertions

Add `AVV-SAVANT-001` through `AVV-SAVANT-004` (or the next available
numbers — check current max AVV assertion number in smoke.js via probe,
don't assume `001` is free) proving:
1. `pitch_arsenals.json`'s fix produces non-empty `data` against the ok
   fixture
2. The empty fixture is handled gracefully (no crash, no fabricated data)
3. `buildSavantContext` (or equivalent) includes a pitcher line when
   `PITCHER_ARSENAL` has real data
4. `fetchSavantGameFeed`'s win-probability field is distinguishable from
   odds-derived `wp` (per the note in Task 2)

## TASK 4: Verification

```bash
node smoke.js index.html
python3 scripts/mlb-weekly-update.py  # if runnable in CC sandbox — if not, note why in outbox and defer to next real Monday run
```

Done condition: all new AVV-SAVANT assertions pass against real
fixtures, existing smoke count unaffected elsewhere, CI green.

**Chat-side follow-up (not checkable by CC):** confirm the actual next
Monday `mlb-weekly-update.yml` run produces non-empty `pitch_arsenals.json`
— this cannot be verified until that cron actually fires; note the
target date explicitly in the outbox.

## TASK 5: Outbox manifest (last task)

State explicitly: (a) the exact pitch_usage/whiff_percent scale
confirmed from real re-fetched or probe data, (b) whether re-fetch was
possible from the CC sandbox or the May-30 probe was relied on instead,
(c) that this CC-CMD does NOT touch team_abs/expected_stats/sprint_speed/
pitch_tempo/umpire_abs since they're already confirmed healthy.
