# Claude Code Command — Fetch Pitcher xERA, POST to Relay Reconcile Endpoint

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-savant-xera-fetch-post-2026-07-01.md.

## CONTEXT

Companion to `CC-CMD-2026-07-01-savant-xera-reconcile-relay.md`
(field-relay-nba repo) — that CC-CMD builds the relay-side write path
(`POST /savant/sync-pitcher-xera` → `reconcile()` → `change_log`). This
CC-CMD is the source side: fetch real pitcher xERA from Savant
(confirmed live: `expected_statistics?type=pitcher&year=2026&min=50
&csv=true` has a genuine `xera` column) and POST it to that endpoint.

**Do not run before the relay CC-CMD has landed** — check whether
`CC-CMD-2026-07-01-savant-xera-reconcile-relay.md`'s commit is
confirmed merged to `field-relay-nba`'s `main` before proceeding (if
unsure, note it in the outbox and hold rather than POST to an endpoint
that may not exist yet).

## PRE-BUILD PROBE (Rule 87)

```bash
sed -n '84,110p' scripts/mlb-weekly-update.py
grep -n "def name_key" scripts/mlb-weekly-update.py
```

Confirm the exact current batter-side `expected_statistics` fetch block
(the pattern to mirror) and `name_key()`'s current implementation
(needed to build matching player keys) before writing anything — this
file has been edited multiple times this session, re-read fresh.

## TASK 1: Add a new section fetching pitcher xERA

Add after the existing batter expected-stats section, following the
exact same fetch/parse conventions:

```python
# ── 2b. PITCHER xERA (POSTs to relay reconcile endpoint, not a local
#        JSON file — this is the first Savant field that flows into
#        change_log rather than a static outbox/mlb/*.json snapshot) ──
print("Fetching pitcher xERA...")
try:
    rows = fetch_csv("https://baseballsavant.mlb.com/leaderboard/expected_statistics"
                     "?type=pitcher&year=2026&min=50&csv=true")
    pitcher_rows = []
    for r in rows:
        name_raw = r.get("last_name, first_name") or r.get("last_name") or ""
        last = name_key(name_raw)
        if not last: continue
        era  = safe_float(r.get("era"))
        xera = safe_float(r.get("xera"))
        if xera is None: continue
        pitcher_rows.append({"id": last, "era": era, "xera": xera})
    if pitcher_rows:
        import urllib.request as _ur
        req = _ur.Request(
            "https://field-relay-nba.jeffunglesbee.workers.dev/savant/sync-pitcher-xera",
            data=json.dumps({"rows": pitcher_rows}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _ur.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
        print(f"  ✅ {len(pitcher_rows)} pitchers posted | relay result: {result}")
    else:
        print("  ⚠️ no pitcher xERA rows parsed")
except Exception as e:
    print(f"  ❌ {e}")
```

**Verify the exact CSV column names** (`era`, `xera`) against a fresh
fetch during the probe step, not assumed from the investigation
snapshot above — confirm they match exactly, including case.

**Do not write a local `outbox/mlb/pitcher_xera.json` file** — unlike
every other Savant section in this script, this data's destination is
the relay's D1 table via the POST, not a static committed file. This is
a deliberate, real architectural difference from the rest of the
script; do not "fix" it to match the other sections' pattern.

## TASK 2: Verification

```bash
python3 -c "import ast; ast.parse(open('scripts/mlb-weekly-update.py').read())"
```

Live execution will fail from the CC sandbox (Savant is proxy-blocked,
confirmed repeatedly this session) — note this in the outbox and defer
live verification to the next real `workflow_dispatch` trigger
(chat-side, same technique used successfully for the earlier
pitch_arsenals fix).

## TASK 3: Outbox manifest (last task)

Confirm whether the relay CC-CMD was verified merged before this ran,
and state explicitly that this is a source-and-POST script with no
local JSON output, unlike every other section in this file.
