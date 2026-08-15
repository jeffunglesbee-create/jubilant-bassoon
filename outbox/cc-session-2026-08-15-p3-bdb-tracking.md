# CC session — P3 BDB real-tracking layer (player max speed)

**Date:** 2026-08-15
**Repos:** jubilant-bassoon (builder + client) + field-relay-nba (serving)
**Branch:** main throughout (both)

## The credential story (and a correction I owe the record)

The user added KAGGLE_USERNAME/KAGGLE_KEY to jubilant-bassoon secrets. I initially
mis-diagnosed the 401 as a malformed key ("37 chars, not 32-hex") — that was a STALE
assumption (old Kaggle key format). **The key works as-is; nothing about it needed
changing.** The probe authenticated fine and pulled real tracking data. Logged here
so the "32-hex" myth doesn't propagate (Rule 72 — I violated it, then caught it).

## The unblock (Rule 72/88) — public datasets, not competitions

`bdb-access-probe` + `kaggle-probe`: the Kaggle *competition* endpoint 401s, but the
two PUBLIC *datasets* the user identified bypass the competition-rules gate entirely:
- `alexandermeau/nfl-big-data-bowl-archived-data-2025` — used (complete: games/plays/
  players/player_play + tracking_week_1..N under `big-data-bowl-data/`). Apache-2.0.
- `view` endpoint returns 200 even with NO auth; file download works with Basic auth.

Tracking schema verified (kaggle-probe): `gameId,playId,nflId,displayName,frameId,
frameType,time,jerseyNumber,club,playDirection,x,y,s,a,dis,o,dir,event` (s = yards/sec).

## What shipped — bdb_speed (player max speed, mph)

- **Builder** (`build-bdb-data.py`, new isolated MONTHLY workflow `bdb-update.yml` so
  the 8 GB stream never slows the weekly NFL-B cron): streams each `tracking_week_N.csv`
  line-by-line (never holds 8 GB), tracks `max(s)` per player. Season auto-detected from
  games.csv = **2022** (not hardcoded — Rule 1). Self-gates on KAGGLE creds.
- **Rule 77 catch:** first build's #1 was `85.89 mph` (a sensor teleport-glitch frame).
  Added a physical ceiling — drop frames >24 mph (11.73 yd/s; NGS record ~23.24). Rebuild
  leaderboard is realistic: Jourdan Lewis 23.77, Woolen 22.93, Ward 22.46, Sneed 22.27.
- **Serving** (relay): `NFL_R2_FILES` + `NFLVERSE_OUT_ALLOWED`. Serve probe
  `outbox/nfl-tables-serve-probe-20260815T211503Z.log`: `bdb_speed.json` 200 / **1648** rows.
- **Consumer** (client, SW 2026-08-15c, smoke 972/0): `nflTeamTablesInit` 5th fetch →
  `NFL_BDB_SPEED`; `getTeamTopSpeed(abbr)`; a **Top speed** scout row (each team's fastest
  tracked player, mph). smoke A-NFLBDB-1.

## Credential hygiene (matches the Drive OIDC/incident docs)

KAGGLE creds are GitHub encrypted secrets, injected via `env:` only, never echoed, never
`set -x`, never committed. The probe prints only lengths/statuses/CSV headers — never the
key. (The stronger OIDC-broker option from the Drive docs stays available if we ever want
CI-keyless, but plain secrets are correct here since Kaggle offers no federation.)

## STAGED (Rule 74) — the heavier tracking metrics

- **Staged:** separation (WR/DB distance at the catch), route entropy — need per-frame
  pairwise distance / route classification over the full tracking set (much heavier CPU).
- **Unblocked:** creds + dataset access now proven; it's a compute/scope step, not a
  credential one. Build in `build-bdb-data.py` alongside `build_bdb_speed`, same stream
  pattern, populating the kept `bdb_separation.json` allow-list entry.
- **Data-freshness note:** BDB archived tracking is the 2022 season (historical) — the
  speed is a "top recorded" career-ish stat, not current-season. Framed as such.

## P3 status
- Participation layer (formation/pressure, no-Kaggle): shipped earlier today.
- **Real-tracking layer: max speed shipped E2E.** Separation/route-entropy STAGED (compute).
