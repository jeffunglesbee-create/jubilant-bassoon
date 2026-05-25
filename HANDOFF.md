# FIELD Handoff — May 25 2026 (End of Day)

HEAD: f67b393
Smoke: 192/0
SW_VERSION: 2026-05-25b
Session doc: Drive 1iB_cPUrX3v-5LTG7ciCe-7skMfne9lkbve_4lNNpGEM

## FOUR COMMITS SHIPPED TODAY

d2d52c2 — Screenshot audit: 10 bugs fixed (BUG-01 through BUG-10)
25f8571 — Patent mitigations M1+M2 (drama display + Scout's Pick)
e28da8b — ESPN GOTD root cause fix (exclusive stream architecture)
f67b393 — Sport vocab Layer 2b + SW_VERSION bump

## KEY DECISIONS / THINGS TO KNOW

**ESPN GOTD architecture**: GOTD is an exclusive stream substitution (same class
as Apple/Peacock). espnGOTD:true on game entry → stream resolver picks it up
BEFORE falling to mlbStreams(). MLB_ESPNU_GOTD = ["espnapp"] (no RSN — blacked out).
Badge: "ESPN App GOTD" (not "Free" — requires ESPN Unlimited $29.99/mo, Rule 34).

**Scout's Pick**: isScoutsPick() replaces all preGameScore>70 thresholds.
Boolean gates: not national + (has series context OR odds competitive OR milestone).
Never use preGameScore as a threshold again — patent risk per Numerical Usage Policy.

**Sport vocabulary**: retryWithSportVocab() runs after retryWithoutCliches() in
Night Owl and any new journalism paths. checkSportVocab(text, sport) detects
cross-sport contamination. SPORT_VOCAB_VIOLATIONS has per-sport forbidden lists.

**SW_VERSION Rule 23 clarification**: suffix increments per deploy within a day
(a→b→c), not just per date. Four deploys today → suffix is now 'b'. Next day → 'a'.

**Stakes/Momentum/7-axis frameworks**: SPECCED ONLY. Drive docs exist. Do NOT
implement any user-visible numerical display without counsel review + Jeff approval.

**Regret Risk**: most novel IP of the session. Pre-game prediction of post-game
viewer sentiment. Consider provisional patent filing before building.

## NEXT SESSION

IMMEDIATE:
- TYPE A daily update: SW_VERSION → 2026-05-26a, May 26 schedule
- Update Current State doc (stale since early May 25)

ACTIVE BUG:
- SCORE-UNIFORM-A: OTW and card show different scores (~45 min TYPE B)

BACKLOG:
- Journalism depth Items 7-9 (Reddit buzz, ESPN athlete stats, Google Trends)
- Stakes/Momentum implementation (after counsel review)
- Regret Risk provisional patent consideration

## CANONICAL DRIVE IDS (unchanged)

Current State:       1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
CI/Deploy Ref:       18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
ADR-002:             1DZq6I6T4jKiRsnO7DEqVA48WfTX0mIwEiKgYVjCqQs4
Numerical Policy v2: 1BHXT4y34M9MX2QdCwrX24w9mdrWW_YtBVByblux0r-Y
Patent Mitigation:   1Hcc-hvYc8MKbLBCWXFe3S-Nu_gw_hT_7Gcz_M-oa1LI
Stakes Framework:    1yGuV448elULun9q-tLNbCLfnd1Kxt7EoBrtU9XVfMSw
Stakes Addendum:     1Mf3aY3COA0C_8yQAcQuPiWO8c5qFObUewrooHo3ToLo
Momentum Framework:  1Cd5R4csa3FA4ahYfWZYUj5N3jhlHsIkMOgr7BZ12wek
7-Axis Framework:    195lNITk3Y1ZfEZyKMZKlKkuQIDk0t2U9AfLjQbSpC0c
Journalism Quality:  1b7fwDVZMURi2sDbQ-Ur7dpbG4I5-fuCDPWC1ILfucoU
Session Doc Today:   1iB_cPUrX3v-5LTG7ciCe-7skMfne9lkbve_4lNNpGEM
