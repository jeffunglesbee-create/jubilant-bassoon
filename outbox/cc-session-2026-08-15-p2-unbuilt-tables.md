# CC session — P2 complete: snap_counts + depth_charts + team_epa built & wired

**Date:** 2026-08-15
**Repos:** jubilant-bassoon (builders + client) + field-relay-nba (serving)
**Branch:** main throughout (both repos)

## What shipped — the 3 genuinely-unbuilt P2 tables, end-to-end

Data layer (jubilant-bassoon `build-ngs-data.py`, Monday NFL-B cron), each written
against the CI-probed REAL parquet schema (Rule 68 — `nfl-parquet-shape-probe.py`,
committed shapes for snap_counts/depth_charts/pbp):

- **snap-counts.json** — season-avg offense/defense snap share per player
  (`build_snap_counts`, keyed TEAM|name; snap_counts has no gsis_id). 2311 players.
- **depth-charts.json** — latest-snapshot starters (pos_rank==1) per team →
  {pos_abb: name} (`build_depth_charts`). 32 teams, season 2026 (current).
- **team_epa.json** — per-team off/def EPA/play + success rate from nflfastR pbp
  (`build_team_epa`, pass/rush plays with real epa). 32 teams. Fills a
  previously-orphaned allow-list entry. Commodity stat (Rule 47-clean).

Shared `_walkback_parquet` helper (most-recent published season). Empty-write
guarded via `emit`. Client commits: builders `e85cf36`; relay serving `7861289`.

## Serving E2E (Rule 61) — artifact

`field-relay-nba/outbox/nfl-tables-serve-probe-20260815T141825Z.log`: **6/6 NFL
tables serve HTTP 200 non-empty from R2** — snap-counts 2311, depth-charts 32,
team_epa 32, ngs-rushing 81, player-stats 1666, nfl-injuries 1453. Route: R2-first
via `NFL_R2_FILES` + GitHub-raw fallback via `NFLVERSE_OUT_ALLOWED`.

## Client consumers (client `c194828`, SW 2026-08-15a, smoke 970/0)

All in `buildScoutingReport` (Rule 62 — same scout surface, `toNGSAbbr` resolution):
- team_epa → **Team EPA** row (off EPA/play + def).
- depth-charts → **Start QB** row (official depth-chart QB1 — Mahomes/Allen/Nix verified).
- snap-counts → **● starter marker** on INJ-row players with offense snap share ≥50%
  (a starter Out matters more than a backup — ties snap + injury tables).
`nflTeamTablesInit` loader + boot + `_riFns`. smoke A-NFLTEAM-1.

## P2 status — COMPLETE

| Table | Built | Served | Consumed |
|-------|-------|--------|----------|
| ngs-passing/receiving | ✅ | ✅ | ✅ QB CPOE / WR YAC |
| ngs-rushing | ✅ | ✅ | ✅ RB RYOE |
| player-stats | ✅ | ✅ | ✅ QB szn EPA |
| nfl-injuries | ✅ | ✅ | ✅ INJ row |
| snap-counts | ✅ | ✅ | ✅ ● starter marker |
| depth-charts | ✅ | ✅ | ✅ Start QB |
| team_epa | ✅ | ✅ | ✅ Team EPA |

**Deliberately not wired:** `pfr-rec.json` (redundant with ngs-receiving — Rule 63).

**Orphaned allow-list entries (separate cleanup, NOT P2 tables):** team_tendencies,
qb_metrics, receiver_metrics, defense_metrics, schedule_refs, bdb_* — allow-listed
but no builder exists; they'd 404. Flagged for a future dead-allow-list cleanup.

## Verification note (Rule 90)
Data + serving are verified with committed artifacts (parquet shapes, 6/6 serve
probe, table row counts + sample values). Client rows render in `renderStatsSection`
via `buildScoutingReport` by parallel construction with the proven NGS rows in the
same function (identical `rows.push` pattern, same abbr resolution); not separately
visual-probed (added rows in a proven-rendering function), called out honestly.
