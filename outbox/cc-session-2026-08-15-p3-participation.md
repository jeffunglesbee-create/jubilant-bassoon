# CC session — dead allow-list cleanup + P3 (participation, no-Kaggle)

**Date:** 2026-08-15
**Repos:** jubilant-bassoon (builder + client) + field-relay-nba (serving + cleanup)
**Branch:** main throughout (both repos)

## Part 1 — dead allow-list cleanup (relay `4917cd2`, Rule 63)

Removed 5 nflverse allow-list entries that had ZERO builders and ZERO client
consumers (verified 0 refs in both repos — every request 404'd against a file
nothing produced): `qb_metrics`, `receiver_metrics`, `defense_metrics`,
`schedule_refs`, `team_tendencies`. Kept the 4 `bdb_*` entries but marked them
STAGED — they are P3 frame-tracking targets (see Part 2).

## Part 2 — P3 feasibility (Rule 72/88 — the "needs Kaggle" claim was overbroad)

`bdb-access-probe.mjs` (CI, `outbox/bdb-access-probe-20260815T143125Z.log`):
- Kaggle competition download → **HTTP 401** (raw frame tracking IS Kaggle-gated ✓).
- nflverse tracking release → 404 (no mirror).
- **nflverse `pbp_participation` → HTTP 302 (public!)** ← the unlock.

`pbp_participation` is nflverse's freely-published **tracking-DERIVED** participation
data. Shape probed (`nfl-parquet-shape-probe.py`, pbp_participation_2025, 26 cols):
`offense_formation`, `defenders_in_box`, `number_of_pass_rushers`, `was_pressure`
are populated; `route` / `defense_man_zone_type` / `defense_coverage_type` are EMPTY
for recent seasons (those need Kaggle's raw x/y). It carries `possession_team` only
(no defteam), so every metric is OFFENSE-side.

## What shipped — P3 buildable layer, end-to-end

- **Builder** (`build_participation`, build-ngs-data.py, Monday cron): offense-side
  formation/pressure tendencies → `team-participation.json`. Verified sane, all 32
  teams populated (DAL: 1163 plays, shotgun 62%, box faced 6.21, **pressure-faced
  31%, blitz-faced 28%**). Client `ea79e51`; relay serving `71a9285`.
- **Serving** (relay): `NFL_R2_FILES` + `NFLVERSE_OUT_ALLOWED`. Serve probe
  `outbox/nfl-tables-serve-probe-20260815T143657Z.log`: team-participation 200 / 32 rows.
- **Consumer** (client `1b26053`, SW 2026-08-15b, smoke 971/0): `nflTeamTablesInit`
  4th fetch → `NFL_PART`; `getTeamParticipation`; a **Pass pro** scout row (pressure-
  faced % + blitz-faced % — an O-line pass-protection stat shown nowhere else).
  smoke A-NFLPART-1.

## STAGED — the Kaggle-only P3 layer (Rule 74)

- **Staged:** frame-tracking features — route entropy, WR/DB separation, man/zone
  coverage type, individual route running (the original `bdb_*` targets).
- **Blocked by:** raw Big Data Bowl tracking data is Kaggle-gated (HTTP 401 verified),
  and the derived route/coverage columns are empty in recent `pbp_participation`.
  No Kaggle credentials exist in either repo.
- **Unblocked when:** a `KAGGLE_KEY`/`KAGGLE_USERNAME` secret is added to the
  nfl-ngs-update workflow. Then a BDB builder can fetch tracking, compute route
  entropy / separation, and populate `bdb_route_entropy.json` / `bdb_separation.json`
  (already allow-listed, kept for exactly this).
- **Verify when unblocked:** `curl -s RELAY/nflverse/bdb_separation.json | node -e
  'const d=JSON.parse(require("fs").readFileSync(0));process.exit(Object.keys(d.data||{}).length?0:1)'`

## Honest scope note

True P3 = frame-level tracking (routes/coverage/separation) and IS Kaggle-blocked.
What shipped is the **tracking-derived participation layer** that nflverse publishes
free — real, commodity, and the maximum P3 value obtainable without credentials. It
is labeled as such, not passed off as full tracking. Data + serving are artifact-
verified; the client Pass-pro row renders by parallel construction with the proven
scout rows in the same buildScoutingReport function.
