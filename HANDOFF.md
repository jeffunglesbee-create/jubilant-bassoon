# FIELD Handoff — May 25 2026 Session 8

HEAD: 8b58406 (last code commit: 0e7d844)
Smoke: 144/0
File size: 999,993 bytes
Deploy: SUCCESS (0e7d844 is live)

## IMMEDIATE WORK FOR NEXT SESSION

1. TYPE C BUILD: Schedule Automation (Jeff approved May 25)
   Spec: Drive 1d6HZ7gHJ0omabekHfVuGzKNoOGgUbwJwlwvcUaUAr10 (CORRECTED — no runtime fetch)
   Phase 1: Expand field-data.yml to cover MLB + soccer + broadcast rules (~2-3 hr)
   Phase 2: index.html fetches JSON instead of hardcoded entries (~1-2 hr)
   Phase 3: Update TYPE A protocol (~30 min)
   Existing: field-data.yml already fetches NBA/NHL/MLS. Gap is MLB + broadcast logic.

2. TYPE A DAILY UPDATE (if needed before TYPE C):
   - NBA ECF: Check G4 result (NYK could sweep CLE, played May 25)
   - NBA WCF G5: Tue May 26 at OKC, 8:30pm ET, NBC — entry exists
   - NHL WCF G4: Tue May 26 at VGK, 9pm ET, ESPN — entry exists
   - NHL ECF G3: Check result (CAR @ MTL, played May 25)
   - EFL L2 Final: Check result (Salford vs Notts County, played May 25)
   - MLB: Add Tue May 26 slate. ESPN GOTD: SEA @ ATH 9:40pm ET
   - Run: node scripts/rotate-schedule.js (automated 7-day cleanup)

## WHAT SESSIONS 6-8 ACCOMPLISHED (May 25 2026)

DEPLOYED:
  da1724e — daily update: NBA/NHL/MLB/EFL fixes + ESPN GOTD tag
  0e7d844 — dead code audit: 29KB recovered, back under 1MB

STRUCTURAL:
  - HANDOFF.md moved from Drive to repo (eliminates ID churn)
  - GOTD retrieval protocols documented (Daily Update Ref)
  - Current State doc updated (Drive 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA)
  - rotate-schedule.js: automated 7-day data rotation (scripts/)
  - Schedule Automation spec written and approved

DECISIONS:
  - Rule 19 resolved: rotation keeps file under 1MB permanently. No build step needed.
  - Schedule automation approved: eliminate manual hardcoding, TYPE A drops to verification only.
  - Path: rotation (done) + automation (specced, ready to build)

## KEY CONTEXT

- Betfair GONE. The Odds API is the odds source. findOddsForGame().
- AFL fully built (Sessions 1-5). Do not rebuild.
- HANDOFF.md is in repo root — NOT Drive.
- Date nav limit: 7 days. rotate-schedule.js cleans older entries.
- ESPN GOTD schedule through May 31 in Daily Update Ref.
- field-data.yml already runs daily 7:30 AM UTC (NBA/NHL/MLS).
- Drama Dial, handleCron refactor, Wikimedia still on build priority after automation.

## SERIES STATE

NBA ECF: NYK leads CLE 3-0 (G4 was tonight May 25)
NBA WCF: Series tied 2-2 (G5 Tue at OKC)
NHL ECF: CAR-MTL tied 1-1 (G3 was tonight May 25)
NHL WCF: VGK leads COL 3-0 (G4 Tue at VGK, can sweep)
