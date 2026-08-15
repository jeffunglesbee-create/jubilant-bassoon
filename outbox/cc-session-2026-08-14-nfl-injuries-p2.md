# CC session — NFL injury designations on cards (P2, Wow #7)

**Date:** 2026-08-14 ET / 2026-08-15 UTC
**Repo:** jubilant-bassoon
**Branch:** main throughout
**Commits:** `d90acb6` (feature), `42f7c9b` (ESPN→nflverse abbr normalization)
**SW_VERSION:** 2026-08-14c → 2026-08-14e · smoke 967/0 (adds A-NFLINJ-1)

## Context — P2 was ~70% built, not "0/6 unbuilt" (Rule 72)

The handoff's "nflverse tables 0/6 served, unbuilt" was badly stale. Actual state
found this session:
- Built + served + consumed: ngs-passing, ngs-receiving (nflNGSInit).
- Built + served, NOT consumed (the real gap): **nfl-injuries**, ngs-rushing,
  player-stats, pfr-rec.
- Genuinely unbuilt: snap_counts, depth_charts, weekly PBP.

This session wires the highest-value unconsumed table — injuries (Wow #7).

## What shipped

`nflInjuriesInit()` loads `/nflverse/nfl-injuries.json` into `NFL_INJURIES`
(keyed by team abbr). `getNFLInjuries(abbr)` returns **official designations
only — Out / Doubtful / Questionable** (Rule 1: no invention, no severity
guessing, empty-status rows dropped), severity-then-skill-position sorted.
Rendered as an `INJ` row in the existing NFL block of `buildScoutingReport`
(reuses its `espnTeamAbbrevs` ha/aa resolution — Rule 62). Boot via setTimeout +
`_riFns`. Data-freshness: the builder keeps one row per player at their most
recent week (= current designation in-season); off-season it's each player's
last 2025 report.

## Probe-first + a real mismatch caught (Rule 72)

Shape read from `outbox/nfl/nfl-injuries.json`: `{data:{gsisId:{name,team,
position,week,injury,status}}}`, status dist Out=194 / Q=316 / Doubt=7 / empty=936.

Cross-checked **all 32** team abbrevs: `espnTeamAbbrevs` returns ESPN codes but
nflverse tables key on nflverse codes, differing for exactly two teams —
**WSH vs WAS** and **LAR vs LA**. Left unfixed, injuries (and NGS) would silently
miss those two teams. `42f7c9b` normalizes at the `toNGSAbbr` boundary (Rule 60),
fixing the new injuries lookup AND a pre-existing latent NGS miss for
Washington/Rams. The other 30 teams are identical.

## Verification status

- **VERIFIED:** JSON shape + all-32 abbr mapping (local); wiring (smoke 967/0);
  served path by parity with ngs-passing (same `/nflverse/` route + allow-list;
  injuries confirmed live at 1453 rows earlier this session).
- **By parallel construction:** the INJ row renders in `renderStatsSection` via
  `buildScoutingReport` — the same function/return path as the NGS QB-CPOE/WR
  rows that already render live. The INJ row is line-for-line parallel to those.
  Not independently visual-probed (Stats-section is an interaction surface and an
  added row in a proven-rendering function is low-risk); called out honestly.

## Remaining P2 (per "eventually build everything")

1. Wire ngs-rushing consumer (built+served, 0 consumers).
2. Wire player-stats consumer.
3. Build genuinely-missing tables: snap_counts, depth_charts, weekly PBP
   (new nflverse parquet builders + R2 + allow-list + cron + consumers).

## Rule compliance
- **Rule 1** — official designations only; no invented "key player"/severity logic.
- **Rule 62** — reused the existing NFL scout block + abbr resolver, no new surface.
- **Rule 60** — abbr vendor-difference normalized at the boundary, not per-consumer.
- **Rule 66** — node --check clean, smoke 967/0 before push.
