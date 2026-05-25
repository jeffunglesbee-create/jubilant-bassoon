# FIELD Handoff — May 25 2026 Session 10

HEAD: 76f9d11
Smoke: 144/0
Deploy: SUCCESS

## PATENT DEFENSE: COMPLETE (all layers deployed)

Layer 2: Drama Dial (ddf73e1), Layer 3: SW push eval (0a7dc8c), Layer 5+: Wikimedia (e5bf19e)
Remaining: field-relay-nba handleCron server strip (separate repo, not urgent)

## GOTD PROTOCOL: AUTOMATED

ESPN_GOTD_SCHEDULE + PEACOCK_GOTD_SCHEDULE lookup tables in index.html.
Auto-tags mlbRaw entries — no manual per-game tagging needed.
ESPN: paste full block when announced (~4x/year). Current block through May 31.
Peacock: paste weekly (Mon/Tue). Current week empty — paste when announced.
When ESPN announces June-August block (expected late May): paste into ESPN_GOTD_SCHEDULE.

## IMMEDIATE WORK FOR NEXT SESSION

1. TYPE A DAILY UPDATE (if May 26):
   - Check results: NBA ECF G4, NHL ECF G3, EFL L2 Final
   - Add Tue May 26 MLB slate (GOTD auto-tags from table)
   - Check Peacock blog for this week's GOTD schedule → paste into PEACOCK_GOTD_SCHEDULE
   - Run: node scripts/rotate-schedule.js

2. TYPE C: Schedule Automation (Jeff approved, spec corrected)
   Drive: 1d6HZ7gHJ0omabekHfVuGzKNoOGgUbwJwlwvcUaUAr10

3. BUILD PRIORITY: field-relay-nba handleCron strip, Drama Dial refinements,
   YouTube, Podcast Index, SeatGeek, Polymarket, Preference Sync

## KEY CONTEXT

- Patent defense COMPLETE. GOTD auto-tagging COMPLETE.
- HANDOFF.md is in repo root. rotate-schedule.js handles data cleanup.
- Schedule Automation spec CORRECTED: pipeline hardcodes, no runtime fetch.
- JustWatch evaluated and rejected (partner-locked, FIELD stays independent).
- _teamAbbr mapping + _gotdKey() helper handle team→abbreviation matching.
- WIKI_TITLES has 28 teams (expandable). Wikimedia chips render after 1500ms.
- Drama Dial: getDramaDial() used everywhere. SW synced via postMessage + IndexedDB.

## SERIES STATE

NBA ECF: NYK leads CLE 3-0 (G4 was May 25)
NBA WCF: Series tied 2-2 (G5 Tue at OKC)
NHL ECF: CAR-MTL tied 1-1 (G3 was May 25)
NHL WCF: VGK leads COL 3-0 (G4 Tue at VGK)
