# CC Session — 2026-08-15 — P3 BDB separation + route entropy

## Scope
Build the two remaining STAGED BDB tracking metrics (separation, route entropy)
end-to-end: Kaggle public dataset → build → R2 → relay → client scout rows.

## Probes (Rule 68 PRE-BUILD — all completed before writing build code)
- `bdb-schema-probe.yml` → plays.csv/player_play.csv headers, tracking `event`
  values, route-label presence. Confirmed: `wasTargettedReceiver`, `defensiveTeam`,
  `pass_arrived` event, tracking-level route labels = FALSE.
- `bdb-header-probe.yml` → full player_play header. Confirmed `routeRan` +
  `wasRunningRoute` columns EXIST (route entropy feasible from player_play.csv).
- `bdb-ds2-probe.yml` → dataset 2 (llkh0a) file layout. It's the live BDB 2026
  COMPETITION dataset: kaggle_evaluation/ gRPC scaffolding + train/input_2023_wNN.csv
  (2023 season, stripped prediction-input format, NO plays/player_play metadata).
  NOT a drop-in source — dataset 1 (alexandermeau, BDB 2025 schema, 2022 season)
  remains correct. Documented, not used.

## Metrics built (in build-bdb-data.py)
- `build_bdb_route_entropy(players, min_routes=20)` — Shannon entropy (bits) over
  each player's routeRan mix, gated by wasRunningRoute==1. player_play.csv only.
  Output: bdb_route_entropy.json, 354 players. Top: Kupp/Deebo/Hill/Pitts (~3.3 bits).
- `build_bdb_separation(players, min_targets=8)` — targeted receiver (wasTargettedReceiver)
  vs nearest defensiveTeam player at the pass_arrived tracking frame, euclidean yards.
  Output: bdb_separation.json, 250 players. RB-led (correct: checkdown/screen cushion).

## HEAD progression
- client feat commit 8d782a6 (field.js scout rows + smoke, SW 2026-08-15d)
- relay allow-list activate 40128f5
- relay R2-first FIX bd395e9 (see "Bug caught" below)

## Bug caught (Rule 77)
First serve probe returned 404/404. Root cause: relay `/nflverse/` handler has TWO
lists — `NFL_R2_FILES` (served R2-first) and `NFLVERSE_OUT_ALLOWED` (raw-github
fallback). The two new files were added only to OUT_ALLOWED, not NFL_R2_FILES
(bdb_speed was in both). Fix bd395e9 added them to NFL_R2_FILES.

## Integration status: VERIFIED (E2E)
- RELAY CONTRACT: GET /nflverse/bdb_separation.json, /nflverse/bdb_route_entropy.json
  → R2 nfl/{year}/, X-Source:r2, 24h cache. Shapes:
  separation {data:{nflId:{name,team,pos,targets,avgSepYds}}, metric:'avg_separation_yds'}
  route     {data:{nflId:{name,team,pos,routesRun,distinctRoutes,entropyBits}}, metric:'route_entropy_bits'}
- CLIENT CONSUMER: nflTeamTablesInit fetches both; NFL_BDB_SEP/NFL_BDB_ROUTE (team→
  [{...}] desc); getTeamTopSep/getTeamTopRoute; scout rows "Top separation" / "Route tree".
- ARTIFACT (Rule 90): outbox/bdb-serve-probe.log →
  `PASS bdb_separation.json HTTP 200 rows=250` / `PASS bdb_route_entropy.json HTTP 200 rows=354`.
- Smoke: 974/0 (A-NFLSEP-1, A-NFLRTE-1 added). SW 2026-08-15d.

## Compliance (Rule 47 / ADR-002)
Both are commodity metrics NGS publishes (separation, route diversity). Served on
pull only, no autonomous push. No composite/watch-value. Relay-permitted.

## Carry-forwards
None required for this task. Still-STAGED BDB targets (no builder, no user request):
bdb_xblock_pass_rush.json, bdb_tendency_fingerprint.json. Kept in OUT_ALLOWED with
STILL STAGED comment; unblock = add builder fn in build-bdb-data.py.
