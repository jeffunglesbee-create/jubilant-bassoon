# FIELD Handoff — May 26 2026

HEAD: 7a8c600 (after rebase → check git log)
Smoke: 192/0
SW_VERSION: 2026-05-26a
Current State doc: Drive 1YdRjXSB9uCMHpfQg2nrvYqWSaNJaiBKQbXDUyYCJ2uU (updated May 26)

## COMMITS TODAY (May 26)

9bd8f53  TYPE A: SW_VERSION 2026-05-25b → 2026-05-26a
7a8c600  Fix SCORE-UNIFORM-A: OTW score now matches card (computeGameNarrative)

## SCORE-UNIFORM-A — RESOLVED

Root cause: OTW showed ed.awayScore–ed.homeScore (ESPN away-first, no alignment).
Card showed computeGameNarrative() scoreline (leader-first, team-aligned).
When home team wins: OTW "88–95", card "95–88" — looked like different scores.

Fix: OTW now calls computeGameNarrative(g, ed, null) for scoreStr in both
STATE 1 (FIRE) and STATE 2 (LIVE). Falls back to raw ed scores if unavailable.
Both OTW and card now use identical score-building path.

## CRITICAL DECISIONS (from May 25 — still binding)

**Drama scores — ZERO raw numbers to users**
  All removed. dramaScoreLive() drives labels/sparkline/tiers only.
  preGameScore() drives sorting only. Any new numerical display needs patent review.

**Scout's Pick — isScoutsPick() only**
  Never use preGameScore > 70 as threshold.

**ESPN GOTD architecture**
  espnGOTD:true → stream resolver picks up BEFORE default fallback.
  MLB_ESPNU_GOTD = ["espnapp"] — no RSN. Badge = "ESPN App GOTD" (Rule 34).

**Sport vocabulary — Layer 2b**
  retryWithSportVocab() after retryWithoutCliches() in all journalism paths.

**SW_VERSION Rule 23**
  New day resets to 'a'. Second deploy same day → 'b'. Etc.

**Novel IP frameworks — DO NOT BUILD without counsel + Jeff approval**
  Stakes, Momentum, Regret Risk all specced in Drive. Not implemented.

## NOTE: Current State doc ID changed

Drive MCP cannot edit-in-place (no update tool). New doc created:
  OLD: 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA (stale — May 25 early)
  NEW: 1YdRjXSB9uCMHpfQg2nrvYqWSaNJaiBKQbXDUyYCJ2uU (current — May 26)

## NEXT SESSION

IMMEDIATE:
  May 26 schedule update (NBA ECF, NHL ECF G4, MLB Tue, Peacock GOTD check)
  TYPE A not fully complete — schedule not yet updated for May 26

BACKLOG:
  Journalism depth Items 7-9 (Reddit buzz, ESPN athlete stats, Google Trends)
  Section identity labels [SECTION-IDENTITY-A] ~25 min
  Stakes/Momentum/Regret Risk (after counsel)

## CANONICAL DRIVE IDS

Current State (new):  1YdRjXSB9uCMHpfQg2nrvYqWSaNJaiBKQbXDUyYCJ2uU
CI/Deploy Ref:        18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
ADR-002:              1DZq6I6T4jKiRsnO7DEqVA48WfTX0mIwEiKgYVjCqQs4
Numerical Policy v2:  1BHXT4y34M9MX2QdCwrX24w9mdrWW_YtBVByblux0r-Y
Patent Mitigation:    1Hcc-hvYc8MKbLBCWXFe3S-Nu_gw_hT_7Gcz_M-oa1LI
Stakes Framework:     1yGuV448elULun9q-tLNbCLfnd1Kxt7EoBrtU9XVfMSw
Stakes Addendum:      1Mf3aY3COA0C_8yQAcQuPiWO8c5qFObUewrooHo3ToLo
Momentum Framework:   1Cd5R4csa3FA4ahYfWZYUj5N3jhlHsIkMOgr7BZ12wek
7-Axis Framework:     195lNITk3Y1ZfEZyKMZKlKkuQIDk0t2U9AfLjQbSpC0c
Journalism Quality:   1b7fwDVZMURi2sDbQ-Ur7dpbG4I5-fuCDPWC1ILfucoU
Daily Update Ref:     1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E
