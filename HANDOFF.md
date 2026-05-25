# FIELD Handoff — May 25 2026 Session 9

HEAD: e5bf19e
Smoke: 144/0
File size: 1,008,180 bytes
Deploy: SUCCESS

## PATENT DEFENSE: COMPLETE

All layers deployed. No specs-only gaps remaining.
- Layer 1: Client-side computation (existing)
- Layer 2: Drama Dial (ddf73e1) — slider in My Services, getDramaDial()
- Layer 3: SW push evaluation (0a7dc8c) — computePushDrama(), _swDramaDial
- Layer 5: Market Intelligence (existing) + Wikimedia Pageviews (e5bf19e)
- Remaining: field-relay-nba server handleCron strip (separate repo, not urgent)

## IMMEDIATE WORK FOR NEXT SESSION

1. TYPE A DAILY UPDATE (if next session is May 26):
   - Check results: NBA ECF G4, NHL ECF G3, EFL L2 Final (all played May 25)
   - NBA WCF G5: Tue May 26 at OKC, 8:30pm ET, NBC — entry exists
   - NHL WCF G4: Tue May 26 at VGK, 9pm ET, ESPN — entry exists
   - MLB: Add Tue May 26 slate. ESPN GOTD: SEA @ ATH 9:40pm ET
   - Run: node scripts/rotate-schedule.js

2. TYPE C: Schedule Automation (Jeff approved)
   Spec: Drive 1d6HZ7gHJ0omabekHfVuGzKNoOGgUbwJwlwvcUaUAr10 (CORRECTED)
   Pipeline hardcodes entries automatically. No runtime fetch.
   Phase 1: Expand field-data.yml (MLB + soccer + broadcast rules)
   Phase 2: buildTodaySchedule() merges pipeline + manual overrides
   Phase 3: Update TYPE A protocol

3. BUILD PRIORITY (post-automation):
   - field-relay-nba handleCron server strip (completes Layer 3 fully)
   - Drama Dial downstream refinements (OTW gate, Stay Up Signal, card pulse)
   - YouTube highlights, Podcast Index, SeatGeek, Polymarket, Preference Sync

## KEY CONTEXT

- Patent defense COMPLETE — all layers have deployed code
- Betfair GONE. The Odds API is the odds source.
- AFL fully built (Sessions 1-5). Do not rebuild.
- HANDOFF.md is in repo root — NOT Drive.
- rotate-schedule.js keeps data under control (7-day rotation)
- Schedule Automation spec CORRECTED: pipeline hardcodes, no runtime fetch
- FIELD principle: hardcoded data = baseline, API data = overlay
- Drama Dial: getDramaDial() replaces all hardcoded 65/85 thresholds
- Wikimedia: WIKI_TITLES has 28 teams, expandable incrementally
- SW: handles SCORE_CHANGE (new factual) + DRAMA_THRESHOLD (legacy, now filtered)

## SERIES STATE

NBA ECF: NYK leads CLE 3-0 (G4 was tonight May 25)
NBA WCF: Series tied 2-2 (G5 Tue at OKC)
NHL ECF: CAR-MTL tied 1-1 (G3 was tonight May 25)
NHL WCF: VGK leads COL 3-0 (G4 Tue at VGK, can sweep)
