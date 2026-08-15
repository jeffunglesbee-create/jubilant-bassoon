# CC Session — 2026-08-15 — P3 BDB pass-rush + tendency + automation

## Scope
Build the final two STAGED BDB allow-list entries and automate the monthly
follow-up verification so the pipeline is self-completing.

## Metrics built (build-bdb-data.py)
- `build_bdb_pass_rush(players, min_snaps=30)` — per-rusher pressure GENERATED:
  pressureRate (causedPressure/rush snaps), qbHitRate, avgTimeToPressure, gated by
  wasInitialPassRusher==1. player_play.csv only. → bdb_xblock_pass_rush.json, 321
  players. Top: blitzing DBs/LBs (Sneed .281, Lloyd .263) — correct (designed
  blitzers get home at higher rate than every-down linemen). Distinct from
  team-participation "Pass pro" which is pressure FACED.
- `build_bdb_tendency(min_plays=100)` — per-team offensive fingerprint: playActionRate,
  dropbackRate, topFormation from plays.csv possessionTeam. → bdb_tendency_fingerprint.json,
  32 teams. Validation: ATL 26.6% PA out of PISTOL (Arthur Smith 2022 identity — correct).

## Columns used (all probe-confirmed 2026-08-15, no new probe)
- player_play.csv: wasInitialPassRusher, causedPressure, quarterbackHit, timeToPressureAsPassRusher
- plays.csv: possessionTeam, isDropback, playAction, offenseFormation

## Client wiring (field.js nflTeamTablesInit / buildScoutingReport)
- Stores NFL_BDB_RUSH (team→[{name,prs,pos}] desc), NFL_BDB_TEND (team→{pa,db,form})
- Accessors getTeamTopRusher / getTeamTendency
- Scout rows "Pass rush" (X% prs) and "Tendencies" (X% PA · FORMATION)
- Smoke A-NFLRUSH2-1, A-NFLTEND-1. Smoke 976/0. SW 2026-08-15e.

## Bug caught (Rule 77)
hRush/aRush collided with an existing rushing var in buildScoutingReport (dup
declaration → "JavaScript syntax valid" + A347 smoke fail). Renamed to hPrsh/aPrsh.

## Automation (this session's second ask — "automate follow-ups")
bdb-update.yml (monthly cron 0 8 1 * *) now:
1. Builds ALL 5 metrics, git-adds all 5 outbox outputs (was: speed only).
2. Self-verify step: runs scripts/bdb-serve-probe.mjs (expanded to all 5 files)
   against the LIVE relay and commits outbox/bdb-serve-probe.log. FATAL on any
   file failing → a serving regression shows as a red monthly run. No manual
   probe trigger ever needed again.

## Integration status: VERIFIED (E2E, automated)
ARTIFACT (Rule 90): outbox/bdb-serve-probe.log committed BY the build workflow →
  `5/5 serve non-empty` (speed 1648, sep 250, route 354, rush 321, tendency 32).
RELAY CONTRACT: GET /nflverse/{bdb_xblock_pass_rush,bdb_tendency_fingerprint}.json
  → R2 nfl/{year}/, X-Source:r2, 24h cache. In both NFL_R2_FILES + NFLVERSE_OUT_ALLOWED.
  rush {data:{nflId:{name,team,pos,rushSnaps,pressureRate,qbHitRate,avgTimeToPressure}}}
  tend {data:{team:{team,plays,dropbackRate,playActionRate,topFormation}}}

## Compliance (Rule 47 / ADR-002)
Both commodity (PFF publishes pressure rate; ESPN publishes PA/personnel rates).
Pull-only, no autonomous push, no composite. Relay-permitted.

## Status: ALL BDB metrics complete
5/5 BDB allow-list entries now have builders + client consumers + serve proof.
No STAGED BDB entries remain. No carry-forwards.
