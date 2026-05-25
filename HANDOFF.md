# FIELD Handoff — May 25 2026 Session 13

HEAD: 278a386
Smoke: 144/0
Deploy: SUCCESS
SW_VERSION: 2026-05-25a (bumped from 2026-05-23q)

## ALL TODAY'S FEATURES NOW VISIBLE TO USERS

SW_VERSION bump (278a386) cache-busts returning users. Features live:
- Drama Dial (Patent Layer 2), SW push eval (Layer 3), Wikimedia (Layer 5+)
- GOTD auto-tagging (ESPN_GOTD_SCHEDULE tables)
- teamNick() multi-word nickname safety
- Elimination headline fix (abbreviation matching)
- GOTD badge was correct all along — SW cache was the blocker

## NEXT SESSION

1. TYPE A DAILY UPDATE (May 26):
   - Check results: NBA ECF G4, NHL ECF G3, EFL L2 Final
   - Add Tue May 26 MLB slate (GOTD auto-tags)
   - Peacock GOTD: check blog for weekly schedule
   - Bump SW_VERSION to 2026-05-26a (Rule 23!)
   - Run: node scripts/rotate-schedule.js

2. TYPE C: Schedule Automation (spec: Drive 1d6HZ7gHJ0omabekHfVuGzKNoOGgUbwJwlwvcUaUAr10)

## KEY CONTEXT

- Patent defense COMPLETE. GOTD auto-tagging COMPLETE. teamNick COMPLETE.
- HANDOFF.md in repo. rotate-schedule.js handles cleanup.
- _teamAbbr + _multiWordNicks + teamNick() all in place
- SW_VERSION MUST be bumped every deploy day (Rule 23)
