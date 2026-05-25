# FIELD Handoff — May 25 2026 (Final)

HEAD: 9584ca1
Smoke: 192/0
SW_VERSION: 2026-05-25b
Session doc (complete): Drive 1iUnBoHtXz3V0PyKEiVbDSHWLsNdQUD0WnJvdehfpmxo

## ALL COMMITS TODAY

d2d52c2  Screenshot audit — 10 bugs (BUG-01 through BUG-10)
25f8571  Patent mitigations M1+M2 (drama display + Scout's Pick)
e28da8b  ESPN GOTD root cause fix (exclusive stream architecture)
f67b393  Sport vocab Layer 2b + SW_VERSION bump
9584ca1  Drama score removal from all card locations

## CRITICAL DECISIONS — READ BEFORE TOUCHING THESE AREAS

**Drama scores — ZERO raw numbers visible to users**
  All "drama N" / "Drama N" displays removed from:
    Betting Intelligence "Tonight" card (M1, commit 25f8571)
    fieldVsMarket() expanded card (9584ca1)
    Mobile live bar chips (9584ca1)
    Bottom sheet "Live Intelligence" section (9584ca1)
    Post-game card "Peak drama N" (9584ca1)
  dramaScoreLive() still drives labels + sparkline internally — just not as raw numbers.
  preGameScore() still drives sorting — just not displayed.
  Any future feature showing a numerical drama score needs patent review first.

**Sparkline (drama arc) IS patent-safe** — but NOT because it's a graph.
  Safe for same reasons as Case C: single dimension, client-side, no threshold.
  The graph format adds marginal distance (trajectory ≠ point value), not primary defense.
  Doc: Drive 12j-kCDF-q_dQQ9EQ7HvIJiNEU5XEE1WOFcAsFLKNUiw

**Scout's Pick — isScoutsPick() only**
  NEVER use preGameScore > 70 as a threshold. isScoutsPick() boolean gates only.
  5 call sites were replaced. If adding new logic, use isScoutsPick().

**ESPN GOTD architecture**
  espnGOTD:true on game entry → stream resolver picks up BEFORE default fallback.
  MLB_ESPNU_GOTD = ["espnapp"] — no RSN (blacked out per ESPN Press Room).
  Badge = "ESPN App GOTD" (not "Free" — requires ESPN Unlimited, Rule 34).

**Sport vocabulary enforcement**
  retryWithSportVocab() must be called after retryWithoutCliches() in any new
  journalism generation path. checkSportVocab(text, sport) for detection.
  Baseball: "one-possession", "transition", "quarter" etc. are generation failures.

**SW_VERSION Rule 23**
  Suffix increments per deploy within a day (a→b→c), not just per date.
  Today ended at 'b'. Next session → '2026-05-26a'.

## NOVEL IP FRAMEWORKS — SPECCED, NOT BUILT

All require counsel review + Jeff approval before any user-visible display:

Stakes:     Drive 1yGuV448elULun9q-tLNbCLfnd1Kxt7EoBrtU9XVfMSw
            + Addendum 1Mf3aY3COA0C_8yQAcQuPiWO8c5qFObUewrooHo3ToLo
Momentum:   Drive 1Cd5R4csa3FA4ahYfWZYUj5N3jhlHsIkMOgr7BZ12wek
7-Axis:     Drive 195lNITk3Y1ZfEZyKMZKlKkuQIDk0t2U9AfLjQbSpC0c

Regret Risk (R dimension) is the most commercially novel.
Consider provisional patent filing before building.

## NEXT SESSION

IMMEDIATE:
  TYPE A: SW_VERSION → 2026-05-26a, May 26 schedule, Current State doc update

ACTIVE BUG:
  SCORE-UNIFORM-A: OTW and card show different scores (~45 min TYPE B)

BACKLOG:
  Journalism depth Items 7-9 (Reddit, ESPN athlete stats, Google Trends)
  Stakes/Momentum/Regret Risk implementation (after counsel)

## CANONICAL DRIVE IDS

Current State:       1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA  ← STALE, update
CI/Deploy Ref:       18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
ADR-002:             1DZq6I6T4jKiRsnO7DEqVA48WfTX0mIwEiKgYVjCqQs4
Numerical Policy v2: 1BHXT4y34M9MX2QdCwrX24w9mdrWW_YtBVByblux0r-Y
Patent Mitigation:   1Hcc-hvYc8MKbLBCWXFe3S-Nu_gw_hT_7Gcz_M-oa1LI
Stakes Framework:    1yGuV448elULun9q-tLNbCLfnd1Kxt7EoBrtU9XVfMSw
Stakes Addendum:     1Mf3aY3COA0C_8yQAcQuPiWO8c5qFObUewrooHo3ToLo
Momentum Framework:  1Cd5R4csa3FA4ahYfWZYUj5N3jhlHsIkMOgr7BZ12wek
7-Axis Framework:    195lNITk3Y1ZfEZyKMZKlKkuQIDk0t2U9AfLjQbSpC0c
Journalism Quality:  1b7fwDVZMURi2sDbQ-Ur7dpbG4I5-fuCDPWC1ILfucoU
Drama Score Removal: 12j-kCDF-q_dQQ9EQ7HvIJiNEU5XEE1WOFcAsFLKNUiw
Session Doc (final): 1iUnBoHtXz3V0PyKEiVbDSHWLsNdQUD0WnJvdehfpmxo
