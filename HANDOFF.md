# FIELD Handoff — May 27 2026 (Multiple Sessions Complete)

HEAD: 37de3ee · Smoke: 199/0 · SW_VERSION: 2026-05-27b · File: ~1.11MB
Deploy gate: success ✅

## CANONICAL DOCS — ALL CURRENT

Current State: 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20

## NFL INTELLIGENCE LAYER DOCS (written today — START HERE for NFL work)

Master Architecture:    1fGMU1r7y_EJnYpKPqgikUbtZiYZAapuRDViDFuxFCes
EPA Technical Ref:      1-pm-6D_jdNwQIW1suVb1lkAMHUybVfbsTbXyLTZbxyE
Pre-NFL Checklist:      1d35qfaaT8Mr4MMCKDiDIO4fiDTsyOKH4imDaQ4E6rgg
Data Source Eval Log:   1tlm7AnLm0-PfwrBnmActGg9IQJyKBIB5tJ05_SV7ISs
Big Data Bowl Spec:     1iLXV3ZpjmEhi58TIWhylUTzifwMLoFnlGaaZCtdAwPc
nflverse Route Design:  13eDXld6Mb1fcyRWtnoahaKEEfm0MbpST5ChU8cNBdCE

## TIER 0 — DO FIRST

1. BNI patent fix (~15 min) — preGameScore → !isScoutsPick
2. EMBER patent fix (~30 min) — isLateCloseGame() replaces threshold
3. NBA Finals G1 shell (~35 min) — JUNE 3 DEADLINE. NYK confirmed East.
   WCF G6 Thu May 28 (SAS @ OKC, 8:30pm NBC) — update result + wire Finals
4. World Cup 2026 build (~90 min) — JUNE 11 DEADLINE
5. NHL SCF entries — add after ECF concludes (VGK in, CAR leads MTL 2-1)
6. File Regret Risk USPTO provisional ($320 pro se) — 30-day window from May 26

## TODAY'S SESSIONS SUMMARY

### TYPE A: Daily Update (complete)
- WCF G5: OKC 127, SAS 114 (leads 3-2). G6 card added.
- NHL WCF: VGK sweeps COL 4-0. G4 result wired.
- NHL ECF G4 tonight (CAR leads 2-1). Already in HTML.
- UECL Final today already in HTML.
- MLB May 27 slate added (15 games).

### TYPE C: NFL Data Research (complete — 4 Drive docs written)
- ClearSports: ELIMINATED (box score only)
- RealtimeSports: ELIMINATED (ESPN proxy, stripped schema)
- SportRadar UFL: 30-DAY TRIAL ONLY (expires ~Jun 26) — for validation
- ESPN: PRIMARY NFL source — 11/13 EPA fields confirmed
- nflverse: WEEKLY PIPELINE — designed, not built
- Big Data Bowl: ANNUAL PIPELINE — designed, not built

### TYPE B: EPA Module + UFL Relay (complete)
- epa.js module built (src/js/epa.js, 14/14 tests)
- EPA lookup table built (outbox/nfl/epa_table.json, 16.2KB)
- /nflverse/* relay route deployed (serves epa_table.json + future tables)
- /sportradar-ufl/* relay route deployed (SR trial key via CF secret)
- /realtimesports/* relay route deployed (eliminated source, route kept)
- UFL EPA wired into index.html (A196-A199 passing, SW 2026-05-27b)
- Auto probes scheduled for all UFL Week 10 + playoff games

## CRITICAL: SR UFL TRIAL KEY

Key: MV2msUIFXVO7gnkC98qT99sM2PUxyChVeNxN9YcS
Expires: ~June 26 2026 (30-day trial from May 27)
Stored: SPORTRADAR_UFL_KEY in field-relay-nba CF Worker + GitHub secrets
Impact on expiry: uflEpaInit() silently fails, EPA chips stop. No crash.
NFL production path: ESPN (free, not SR). SR trial was validation only.

## SPORT STATE SNAPSHOT

NBA WCF: OKC leads SAS 3-2. G6 Thu May 28 @ Frost Bank Center, 8:30pm NBC.
NBA Finals: NYK vs WCF winner. G1 June 3, ABC.
NHL WCF: FINAL — VGK sweeps COL 4-0. VGK in SCF.
NHL ECF: CAR leads MTL 2-1. G4 TONIGHT Wed 8pm ET TNT.
NHL SCF: VGK vs TBD. ~June 2-3 start. Add entries after ECF.
MLB: Regular season. 15 games today.
UFL: Week 10 May 29-31 (final regular season). Playoffs June 7-13.
UECL Final: Crystal Palace vs Rayo Vallecano TODAY 3pm ET, Leipzig.

## EPA MODULE — NEXT STEPS (see Pre-NFL Checklist doc)

P0 (now): Verify EPA live on UFL card Fri May 29 8pm ET
P1 (June): Add fromESPNPlay(), extend to NFL cards, score differential
P2 (July): Build nflverse weekly pipeline
Aug 1: EPA table auto-rebuilds from nflverse PBP (scheduled)
P4 (Aug): Build Big Data Bowl pipeline (Kaggle key needed)
P5 (Sep 1-8): Wire NFL PBP polling, add 2026 NFL schedule
Sep 9: NFL Week 1 🏈

## KEY FILES ADDED TODAY

jubilant-bassoon:
  src/js/epa.js                          EPA module (standalone)
  src/js/test-epa.js                     14/14 tests
  scripts/build-epa-table.py            EP table builder
  scripts/sportradar-ufl-probe.py       SR UFL probe
  scripts/espn-nfl-probe.py             ESPN NFL PBP probe
  scripts/espn-ufl-probe.py            ESPN UFL probe
  scripts/espn-ufl-live-probe.py       Live UFL probe (auto-scheduled)
  scripts/rts-probe.py                  RTS probe (archived)
  outbox/nfl/epa_table.json            1,120-entry EP table (16.2KB)
  .github/workflows/build-epa-table.yml Annual EP rebuild (Aug 1, Jan 1)
  .github/workflows/espn-ufl-live-probe.yml Auto-fires during UFL games

field-relay-nba:
  /nflverse/* route added
  /sportradar-ufl/* route added
  /realtimesports/* route added (corrected path)
  deploy.yml: auto-inject SPORTRADAR_UFL_KEY + REALTIMESPORTS_KEY

## ANALYTICS SPECS FROM PRIOR SESSION (no code yet)

See May 27 TYPE C session for full spec IDs.
Key decisions carried forward:
  "Never perform the final combination" = ANY math op
  Team Fit Index = 4 independent dimensions
  xFoul/xCard = Game Character Predictors
