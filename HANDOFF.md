# FIELD Handoff — May 25 2026 Session 7

HEAD: 0e7d844 (last code commit: 0e7d844)
Smoke: 144/0
File size: 999,993 bytes (under 1MB after dead code audit)
Deploy: SUCCESS

## IMMEDIATE WORK FOR NEXT SESSION

1. DEEP DIVE: Is Rule 19's 1MB build step plan still appropriate?
   - Shell-script concatenation (cat src/*.html > index.html) was written May 20
   - Since then: Odds API rewire, GOTD system, HANDOFF.md to repo, AFL built,
     journalism rules, Spygate EFL entries, and daily schedule data growth
   - The file will cross 1MB again within 1-2 weeks of active development
   - Novel thinking needed: is concatenation the right answer, or is there
     a better architecture given what FIELD has become?
   - Consider: what % is code vs data? Can data be externalized?

2. TYPE A DAILY UPDATE (if tomorrow May 26):
   - NBA ECF: Check G4 result (NYK can sweep CLE tonight)
   - NBA WCF G5: Tue May 26 at OKC, 8:30pm ET, NBC — entry already added
   - NHL ECF G4: Wed May 27 at MTL — add entry
   - NHL WCF G4: Tue May 26 at VGK, 9pm ET, ESPN — entry already added
   - EFL L2 Final: Check result (Salford vs Notts County, today May 25)
   - MLB: Add Tue May 26 slate (15 games). Tag ESPN GOTD: SEA @ ATH 9:40pm ET
   - Peacock GOTD: Check peacocktv.com blog for new weekly schedule

3. BUILD PRIORITY (unchanged):
   Drama Dial (~60 min), handleCron refactor (~2.5 hr), Wikimedia Pageviews (~45 min)

## WHAT THIS SESSION ACCOMPLISHED

Sessions 6-7 (May 25 2026):

DEPLOYED (1 code commit + 1 audit commit):
  da1724e — daily update: NBA/NHL/MLB/EFL fixes + ESPN GOTD tag
  0e7d844 — dead code audit: 29KB recovered, back under 1MB

STRUCTURAL:
  - HANDOFF.md moved from Drive to repo (THIS FILE)
  - GOTD retrieval protocols documented in Daily Update Reference
  - Current State doc updated (1MB milestone, new Drive ID)
  - Dead code audit: buildDateSchedule emptied (May 8-14 unreachable),
    old mlbRaw/EFL entries removed, stale comments cleaned

## KEY CONTEXT

- Betfair is GONE. findOddsForGame() + The Odds API is the odds source.
- AFL Intelligence Layer fully built (Sessions 1-5). Do not rebuild.
- HANDOFF.md is in repo root — NOT Drive. No ID tracking needed.
- Daily Update Reference: Drive 1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E
- Current State: Drive 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
- CI/Deploy Ref: Drive 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
- Date nav limit: 7 days back. buildDateSchedule entries older than 7 days are dead code.
- Rule 19 threshold: file at 999,993 bytes. One active week puts it back over 1MB.
- ESPN GOTD schedule through May 31 in Daily Update Ref doc.

## SERIES STATE

NBA ECF: NYK leads CLE 3-0 (G4 tonight at CLE)
NBA WCF: Series tied 2-2 (SAS won G4 103-82, Wembanyama 33pts)
NHL ECF: CAR-MTL tied 1-1 (G3 tonight at MTL)
NHL WCF: VGK leads COL 3-0 (G4 Tue at VGK, can sweep)
