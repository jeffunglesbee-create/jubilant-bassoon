# Claude Code Command — Fetch Pitcher xERA, POST to Generic Sync Endpoint (CORRECTED v2)

**SUPERSEDES the original version of this file** — the original posted
to a bespoke `/savant/sync-pitcher-xera` endpoint. That endpoint was
replaced with a generic `/savant/sync` in the companion relay CC-CMD
(field-relay-nba), caught and corrected before either ran. Only the
POST target/payload shape changes here — the fetch logic is identical.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-savant-xera-fetch-post-2026-07-01.md.

## CONTEXT

Companion to `CC-CMD-2026-07-01-savant-xera-reconcile-relay.md`
(field-relay-nba repo, corrected v2) — that CC-CMD builds a generic
`POST /savant/sync` endpoint accepting `{table, rows, source, label}`,
allowlisted by table name, writing through `reconcile()`. This CC-CMD
is the source side: fetch real pitcher xERA from Savant (confirmed
live: `expected_statistics?type=pitcher&year=2026&min=50&csv=true` has
a genuine `xera` column) and POST it in that shape.

**Do not run before the relay CC-CMD (corrected v2) has landed** — check
whether it's confirmed merged to `field-relay-nba`'s `main` before
proceeding.

## PRE-BUILD PROBE (Rule 87)

```bash
sed -n '84,110p' scripts/mlb-weekly-update.py
grep -n "def name_key" scripts/mlb-weekly-update.py
```

Confirm the exact current batter-side `expected_statistics` fetch block
and `name_key()`'s current implementation before writing anything.

## TASK 1: Add a new section fetching pitcher xERA, posting to the generic endpoint

```python
# ── 2b. PITCHER xERA (POSTs to generic relay reconcile-sync endpoint,
#        not a local JSON file — first Savant field to flow into
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
            "https://field-relay-nba.jeffunglesbee.workers.dev/savant/sync",
            data=json.dumps({
                "table": "pitcher_expected_stats",
                "rows": pitcher_rows,
                "source": "savant",
                "label": "pitcher_xera",
            }).encode(),
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
snapshot — confirm exact match including case.

**Do not write a local `outbox/mlb/pitcher_xera.json` file** — this
data's destination is the relay's D1 table via the generic sync POST,
not a static committed file. Deliberate, real difference from the rest
of this script's sections; do not "fix" it to match them.

## TASK 2: Verification

```bash
python3 -c "import ast; ast.parse(open('scripts/mlb-weekly-update.py').read())"
```

Live execution will fail from the CC sandbox (Savant proxy-blocked,
confirmed repeatedly this session) — note this and defer live
verification to the next real `workflow_dispatch` trigger.

## TASK 3: Outbox manifest (last task)

Confirm whether the relay CC-CMD (corrected v2) was verified merged
before this ran, and confirm the POST target/payload matches the
generic `/savant/sync` shape, not the original bespoke endpoint.
