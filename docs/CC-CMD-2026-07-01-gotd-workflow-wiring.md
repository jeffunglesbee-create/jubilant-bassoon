# Claude Code Command — Wire GOTD Workflow Inputs (complete abandoned build)

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md / STANDARDS.md.

Write findings to outbox/cc-gotd-workflow-wiring-2026-07-01.md.

## CONTEXT

Found while automating the loose end from the 2026-07-01 GOTD fix
(commit `814b00a`): `.github/workflows/field-data.yml` declares two
`workflow_dispatch` inputs — `espn_gotd` and `peacock_gotd`, documented
format `"home|away, comma-sep"` — but the job's `env:` block only passes
`TODAY: ${{ github.event.inputs.force_date || '' }}` through to
`node scripts/build-field-data.js`. The inputs are never forwarded.

This isn't a design gap — `scripts/build-field-data.js` is fully ready
to consume them right now:

```javascript
const ESPN_GOTD_IDS   = (process.env.ESPN_GOTD_IDS   || '').split(',').filter(Boolean);
const PEACOCK_GOTD_IDS= (process.env.PEACOCK_GOTD_IDS || '').split(',').filter(Boolean);
```

with the exact matching format documented in its own header comment
(`ESPN_GOTD_IDS=home|away,home|away`) and consumed correctly in
`assignMLBBroadcast()` ("Manual env overrides always win"). This is an
abandoned half-wire, not a missing mechanism — the workflow input exists,
the script's consumption exists, only the connection between them is
missing.

This explains why `field-data-today.json`'s auto-detection has been
producing `peacockGOTD: false` for every game all season (confirmed
2026-07-01: 14/14 MLB games false) — `broadcasts(all)`'s live hydration
parsing genuinely cannot detect GOTD status from `statsapi.mlb.com` (it's
a marketing/rights designation, not schedule data), and the one path that
COULD supply it (manual env override via workflow_dispatch) has never
actually been reachable.

## PRE-BUILD PROBE (Rule 87)

```bash
sed -n '/workflow_dispatch:/,/^jobs:/p' .github/workflows/field-data.yml
sed -n '/^jobs:/,/run: node scripts\/build-field-data.js/p' .github/workflows/field-data.yml
grep -n "ESPN_GOTD_IDS\|PEACOCK_GOTD_IDS" scripts/build-field-data.js
```

Confirm the exact current `env:` block structure and indentation before
editing — line/structure details above are from the 2026-07-01 probe.

## TASK 1: Pass both inputs through in the env block

```yaml
env:
  TODAY:            ${{ github.event.inputs.force_date  || '' }}
  ESPN_GOTD_IDS:    ${{ github.event.inputs.espn_gotd    || '' }}
  PEACOCK_GOTD_IDS: ${{ github.event.inputs.peacock_gotd || '' }}
run: node scripts/build-field-data.js
```

No changes needed to `build-field-data.js` itself — it already correctly
parses these exact variable names and format.

## TASK 2: Verification

This is a workflow-only change — cannot be verified by `node smoke.js`
(no smoke assertion covers workflow YAML wiring) or by CC directly (no
way to trigger a `workflow_dispatch` run and inspect its env from inside
the CC sandbox). Done condition for CC is: YAML is valid (basic syntax
check — `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/field-data.yml'))"`
or equivalent), diff is exactly the 2 added lines, committed, pushed.

**Chat-side follow-up (not checkable by CC):** trigger the workflow
manually via `workflow_dispatch` with real `peacock_gotd`/`espn_gotd`
values (chat already has the mechanism to source these — web search,
same as the 2026-07-01 fix) and confirm `field-data-today.json` comes
back with `peacockGOTD: true`/`espnGOTD: true` set correctly for the
matching game, via the GitHub Actions API (chat has PAT access, can
trigger `workflow_dispatch` and poll run status directly — no need for
CC or the CC sandbox for this verification step).

## TASK 3: Outbox manifest

Note explicitly: this does NOT remove or deprecate `PEACOCK_GOTD_SCHEDULE`/
`ESPN_GOTD_SCHEDULE` (the client-side consts used in the 814b00a fix).
Both mechanisms will now genuinely work — the workflow-input path
populates `field-data-today.json` (checked first, per existing
`g.peacockGOTD || SCHEDULE[...]` OR-logic in `mergedGames`/render code),
the schedule consts remain a valid fallback if the workflow isn't
triggered on a given day. This is now correctly a primary+fallback pair,
not two redundant systems — the primary was just never wired until this
CC-CMD. Do not treat this as scope to also deprecate the fallback; that's
a separate decision for later if the primary proves reliable over time.
