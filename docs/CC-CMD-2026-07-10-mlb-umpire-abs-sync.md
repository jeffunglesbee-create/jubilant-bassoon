# Claude Code Command — MLB Umpire ABS Ratings: Wire Weekly Data to Live Constant

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** `UMPIRE_ABS_RATINGS` in index.html is frozen at May 27 launch data. A real weekly pipeline already refreshes fresher data into `outbox/mlb/umpire_abs.json` but nothing propagates it into the constant that actually ships.
**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-mlb-umpire-abs-sync-2026-07-10.md.

## CONTEXT — independently verified this session, re-verify from HEAD before building

- `UMPIRE_ABS_RATINGS` (index.html, currently ~line 7394) has been touched in exactly 3 commits, all 2026-05-27 (`b22f4102`, `493b8d48`, `bef6b282`) — confirmed via `git log -G"UMPIRE_ABS_RATINGS" -- index.html`. Zero updates in 44+ days.
- `.github/workflows/mlb-weekly-update.yml` already runs `scripts/mlb-weekly-update.py` every Monday 6am ET (cron `0 11 * * 1`) + on `workflow_dispatch`, and commits real output to `outbox/mlb/`. Last real run: 2026-07-06, commit `f037ad1d`. This part works correctly today — do not rebuild it.
- The script writes `outbox/mlb/umpire_abs.json`, shape: `{updated, source, processed_game_pks, data: {lastname: {challenged, overturned, rate, fullName, weakness, zones: {zoneId: {challenged, overturned}}}}}`. 48 umpires present as of the 2026-07-06 run — more than the hardcoded table's 22.
- Confirmed via repo-wide grep: nothing reads `umpire_abs.json` and writes into `index.html`. The only other reference to `UMPIRE_ABS_RATINGS` anywhere in the repo is `smoke.js`, and that's a shape assertion, not a generator.
- `getUmpireABSRating()` has 5 real callers (index.html ~8043, ~8073, ~19492, ~19924, ~31207) plus `getRegressionAlert()` at ~7996 — this is live, wired, user-facing. This is not dead code; it's stale-data code.
- `.weakness` is used in exactly 4 places, all as a truthy-check + free-text interpolation (`` `weak: ${d.weakness} zone` ``) — never an exact-value comparison. **The new JSON's weakness taxonomy (`down-right`/`down-left`/`left`, etc.) differs from the old hardcoded table's (`low`/`high`/`outside`/`null`) — confirmed safe to adopt directly, no consumer breaks.**
- **Known, real gap — do not silently drop:** the old table has a `pitchesCalled` field (referenced at index.html ~7902) that has no equivalent anywhere in the new JSON (Statcast ABS tracking counts challenges, not total pitches called). Confirm the one read site's actual behavior with `pitchesCalled: undefined` before deciding whether to drop the field, backfill it from a different source, or flag as a separate follow-up — do not guess.
- **Genuinely separate, do not touch:** `mlb-umpire-zone-backfill.yml` is a one-time, `workflow_dispatch`-only job (explicitly "deliberately no schedule" per its own header) for backfilling `zones`/`weakness` on games before the July 1 zone-tracking feature. Out of scope here.

## TASK 1 — Probe current deploy-gate behavior for index.html data-only changes

Before writing the generator, confirm whether a commit that only changes `UMPIRE_ABS_RATINGS`'s literal values (no function/structure changes) needs a SW_VERSION bump to actually deploy, or whether the existing deploy-gate trigger paths pick up any index.html change regardless. Check `.github/workflows/deploy-gate.yml`'s trigger paths and any SW_VERSION-vs-content-hash check directly — this determines whether TASK 2 needs a version bump step or not. Report the real answer; don't assume either way.

## TASK 2 — Wire the sync into the existing weekly workflow

Add a new step to `.github/workflows/mlb-weekly-update.yml`, after the existing `Download Savant CSVs and process into JSON` step and before `Commit updated tables`, that:

1. Reads `outbox/mlb/umpire_abs.json`.
2. Regenerates the `UMPIRE_ABS_RATINGS` object literal in index.html from it — keyed by the same lowercase-lastname convention already in use, fields `{challenged, overturned, rate, weakness}` at minimum (resolve `pitchesCalled` per TASK 1's own investigation, not a blind carry-forward).
3. Writes the updated index.html back in place, preserving everything outside the `UMPIRE_ABS_RATINGS` block byte-identical (confirm via diff — this is a narrow, surgical regeneration, not a broader rewrite).
4. If TASK 1 found a version bump is required for deploy: bump SW_VERSION as part of this same step, following the existing daily-suffix convention.

Extend the existing commit step (or add a second one) to include `index.html`/`sw.js` alongside `outbox/mlb/` in the same commit — keep this atomic, one commit per weekly run, not two.

## VERIFICATION

- Run the new step locally against the real `outbox/mlb/umpire_abs.json` already in the repo (not a fixture) and confirm the regenerated block parses as valid JS (`node --check` at minimum) and that entry count matches the JSON's real umpire count.
- Confirm `getUmpireABSRating()`'s 5 real call sites still resolve correctly against at least 3 real umpire names present in the new data.
- Confirm the rest of index.html is untouched (`git diff` should show only the `UMPIRE_ABS_RATINGS` block — and SW_VERSION/sw.js if TASK 1 required it — as changed).
- `node smoke.js` clean.

## DONE CONDITION

`UMPIRE_ABS_RATINGS` in index.html is generated from `outbox/mlb/umpire_abs.json` as part of the existing Monday weekly job, verified against real current data (not a fixture), smoke clean, and — if TASK 1 determined it's required — actually deployable (SW_VERSION bumped). Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 deploy-gate question genuinely answered from source, not assumed (25 pts)
- Generator produces valid, verified output against real current JSON (30 pts)
- Byte-identical diff outside the regenerated block, confirmed via `git diff` (25 pts)
- `pitchesCalled` gap explicitly resolved, not silently dropped (10 pts)
- smoke.js clean (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.