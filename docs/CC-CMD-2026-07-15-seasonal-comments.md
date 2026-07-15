# Claude Code Command — Document the seasonal orphan cluster to protect it from future cleanup sweeps

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-seasonal-comments-2026-07-15.md. Commit with `[skip ci]`. Docs-only, zero behavior change.

## CONTEXT

Two real orphan clusters, both genuinely stale-data-not-dead-logic, both real, live risks for a future honest orphan sweep to misread as safe-to-delete (this session nearly made exactly that mistake on the first one):

- `_plTitleNote`/`_plCityNote`/`_plTotNote`/`_plWhuNote` — hardcoded to the 2025-26 EPL title race and relegation battle; the clinch-scenario/goal-difference math is fully generic, reactivates whenever a real title race or relegation battle materializes again
- `inEFLPlayoffs` — date range hardcoded to `2026-05-08`–`2026-05-25` (the 2026 EFL playoff window); the date-comparison logic is generic, needs the window updated for each new season

## TASK 0 — Probe

Confirm the real, current locations of both clusters (line numbers will have drifted since tonight).

## TASK 1 — Fix

Add a clear, one-line comment directly above each cluster stating plainly: this is seasonal, not dead — reactivates each [EPL final day / EFL playoff window], data needs refreshing before reuse, not deletion. Match the tone/format of similar deliberate-exclusion comments already in this codebase (e.g., the `cron-slate` WC-exclusion comment referenced in tonight's other work) rather than inventing a new convention.

## TASK 2 — Verify

`node smoke.js index.html`: unchanged pass count (docs-only). `git diff`: confirms only comment lines added, zero functional changes.

## DONE CONDITION

Both seasonal clusters carry an explicit, unmissable comment explaining they're stale-data-not-dead-code — cheap, permanent protection against a future sweep deleting real, reusable logic.

**Confidence scoring:**
- TASK 0 (20 pts): confirms real current locations
- TASK 1 (50 pts): clear comments added, matching existing convention, zero functional change
- TASK 2 (30 pts): smoke unchanged, diff confirms comment-only

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
