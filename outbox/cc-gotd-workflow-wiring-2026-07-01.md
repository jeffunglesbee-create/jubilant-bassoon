# CC Outbox — Wire GOTD Workflow Inputs

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-gotd-workflow-wiring.md
**Commit:** (see below)
**Smoke:** n/a (workflow YAML change — no smoke assertion covers this)

---

## Pre-build probe results

Confirmed:
- `workflow_dispatch` inputs `espn_gotd` and `peacock_gotd` exist in `field-data.yml`
- `env:` block in "Build overlay JSON" step only passed `TODAY` — both GOTD inputs were
  missing
- `scripts/build-field-data.js` already reads `ESPN_GOTD_IDS` and `PEACOCK_GOTD_IDS`
  from env (lines 28–29), with full parsing and `assignMLBBroadcast()` wiring (line 131+)
- This was confirmed to be an abandoned half-wire, not a missing feature

---

## Task 1 — Fix

Added 2 lines to the `env:` block of the "Build overlay JSON" step in
`.github/workflows/field-data.yml`:

```yaml
ESPN_GOTD_IDS:    ${{ github.event.inputs.espn_gotd    || '' }}
PEACOCK_GOTD_IDS: ${{ github.event.inputs.peacock_gotd || '' }}
```

No changes to `build-field-data.js` — it already reads these env vars and applies them
correctly (`assignMLBBroadcast()` manual override path, "always wins" priority).

---

## Task 2 — Verification

- YAML syntax: `python3 -c "import yaml; yaml.safe_load(...)"` → valid
- Diff: exactly 2 new lines (+ aligned spacing on TODAY line)

Chat-side follow-up (not checkable by CC): trigger `workflow_dispatch` with
`peacock_gotd=New York Yankees|Detroit Tigers` and confirm `field-data-today.json`
returns `peacockGOTD: true` for the NYY/DET game. Chat has PAT + GH Actions API access.

---

## Relationship to 814b00a (PEACOCK_GOTD_SCHEDULE fix)

These are NOT competing mechanisms — they are now a correct primary+fallback pair:

- **Primary (workflow-input):** When the `field-data` workflow is dispatched manually
  with `peacock_gotd`/`espn_gotd` values, `build-field-data.js` writes `peacockGOTD: true`
  into `field-data-today.json`. `loadMLBSlate()` reads `g.peacockGOTD` first.

- **Fallback (PEACOCK_GOTD_SCHEDULE):** When the workflow runs without manual input
  (daily cron), `field-data-today.json` will have `peacockGOTD: false` (auto-detect
  can't determine GOTD from `statsapi.mlb.com`). The schedule const catches it.

The `|| SCHEDULE[TODAY_ISO] === key` logic in `loadMLBSlate()` wires the OR correctly.
`PEACOCK_GOTD_SCHEDULE` and `ESPN_GOTD_SCHEDULE` are NOT deprecated by this change.

---

## Done Conditions

- [x] `ESPN_GOTD_IDS` and `PEACOCK_GOTD_IDS` forwarded from workflow_dispatch inputs
      to `build-field-data.js` env
- [x] YAML valid
- [x] Diff is exactly the 2 new lines
- [x] Outbox written
