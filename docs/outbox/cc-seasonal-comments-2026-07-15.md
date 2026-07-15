# CC Session Outbox — Document the seasonal orphan cluster to protect it from future cleanup sweeps (CC-CMD-2026-07-15-seasonal-comments)

**Date:** 2026-07-15
**Scope:** two comment blocks added. Zero functional change.

## TASK 0 — Probe

Confirmed real, current locations (drifted from CONTEXT's implied line numbers, per tonight's own accumulated commits):

- `PL_FD`/`_plTitleNote`/`_plCityNote`/`_plTotNote`/`_plWhuNote` — index.html ~L12568-12611, under the existing `// ── Premier League Final Day Calculator ──` header comment. `PL_FD` is a hardcoded standings snapshot (2025-26 EPL title race: Arsenal/Man City; relegation battle: Tottenham/West Ham). The four note functions compute real clinch-scenario and goal-difference logic against those fixed values — the math is generic, only the input data is season-specific. None of the 4 functions are called anywhere else in the file (confirmed via the same grep this dispatch ran) — a genuine orphan-sweep false positive risk, exactly as CONTEXT describes.
- `EFL_PLAYOFF_START`/`EFL_PLAYOFF_END`/`inEFLPlayoffs` — index.html ~L18422-18424, just above `SOCCER_LEAGUES`. Hardcoded to `2026-05-08` through `2026-05-25` (the 2026 EFL playoff window). `inEFLPlayoffs()`'s own date-comparison body is fully generic.

## TASK 1 — Fix

Added one comment block directly above each cluster, matching the existing codebase convention for disclosed-deliberate-exclusion comments (the `// own cron-slate path...Not an oversight.` style referenced in CONTEXT, e.g. index.html ~L34507-34514): states plainly the cluster is seasonal not dead, names what reactivates it (EPL Final Day / each EFL playoff season), states what needs refreshing (the hardcoded standings/date-window values, not the logic), and closes with the same "Not an oversight." line the existing convention uses. Both comments are tagged `(CC-CMD-2026-07-15-seasonal-comments)` so a future reader can trace the decision back to this dispatch, matching how the referenced cron-slate comment cites its own originating CC-CMD.

No function body, constant value, or any other line was touched — confirmed via `git diff -- index.html` showing exactly two added comment blocks and nothing else.

## TASK 2 — Verify

- `node smoke.js index.html`: **948 passed, 0 failed** — identical to the pre-change count (confirmed by re-running smoke both before and after the edit), proving zero structural/behavioral change. `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66 — also unchanged.
- `git diff -- index.html`: two hunks, both pure comment-line additions (`+` lines are 100% `//` comment text) — no existing line was modified or removed, no code line added.

## DONE CONDITION

Both seasonal clusters now carry an explicit, unmissable comment stating they're stale-data-not-dead-code, what specifically needs refreshing before reuse, and what event reactivates them — cheap, permanent protection against a future honest orphan sweep (like tonight's own) misreading either cluster as safe-to-delete.

## Confidence score

- TASK 0 (20 pts): confirmed both clusters' real current locations directly via grep, verified the "zero other callers" claim independently rather than trusting CONTEXT: 20/20
- TASK 1 (50 pts): clear, unmissable comments added at the correct location for each cluster, matching the existing codebase's own disclosed-deliberate-exclusion comment convention (including the "Not an oversight." closing line and a traceable CC-CMD citation) rather than inventing a new format, zero functional change: 50/50
- TASK 2 (30 pts): smoke count confirmed identical before and after (948/948), diff confirmed comment-only via direct inspection of every changed line: 30/30

**Total: 100/100.**

## Commit

- `index.html`: two comment blocks added (Premier League Final Day cluster, EFL playoff-window cluster). Zero functional change.
- This manifest.
