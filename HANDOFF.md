# FIELD Handoff — May 25 2026 (Screenshot Audit Fix Session)

HEAD: d2d52c2
Smoke: 184/0
Deploy: SUCCESS
SW_VERSION: 2026-05-25a

## WHAT WAS FIXED (all from 10-screenshot audit)

**P0 — 4 critical bugs:**

BUG-01: Skim said "New York Knicks facing elimination" (wrong team)
  - _teamAbbr extended with NBA + NHL teams (was MLB-only)
  - awayLeads logic hardened: parse leadToken from "NYK leads 3-0" front
  - Empty awayAbbr no longer matches srL.includes(' leads') universally

BUG-02: "undefined $24.99/mo" chip on Rays @ Orioles card
  - chipHTML now returns '' early if s.name is falsy or string 'undefined'

BUG-03: "OT" / "20T" for extra innings baseball
  - espnPeriodLabel() was called everywhere but NEVER defined (TypeError)
  - Now defined: baseball → "Inn N", basketball → Q1-Q4/OT, hockey → P1-P3/OT
  - Also restored renderESPNScores() function declaration (accidentally removed)

BUG-04: Night Owl used basketball vocabulary for Brewers 5-1 recap
  - _terms now includes explicit NEVER USE lists per sport
  - Baseball: "NEVER use: points, possession, one-possession, offensive sets"

**P1 — 5 factual/logic errors:**

BUG-05/06: "Eastern Conference Finals appearance since 1999" (should be NBA Finals)
  - Compound prompt series rules: extract stats, use correct round name

BUG-07/08: FIELD Brief called Notts County @ Salford "top game" over Conference Finals
  - preGameScore tierBoost: Conference Finals +40, NBA Finals/Stanley Cup +60
  - Compound brief: Conference Finals must be lead regardless of start time

BUG-09: Betting Intelligence showed "1 playoff game" (missed NYK @ CLE)
  - isPlayoffGame() now uses league string, not only _gameImportance

BUG-10: espnGOTD flag missing for Phillies @ Padres (confirmed from ESPN Press Room)
  - espnGOTD:true added, streams updated to MLB_ESPN

**Journalism:**
- 10 new banned phrases added from screenshots
- Series Brief rules: must extract stats from Context, correct historical facts

## NEXT SESSION

Items 7-9 journalism depth (Reddit buzz, ESPN athlete stats, Google Trends)
SCORE-UNIFORM-A active bug (~45 min TYPE B)
TYPE A daily update when ready for May 26
