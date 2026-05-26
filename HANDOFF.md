# FIELD Handoff — May 26 2026 (Session End)

HEAD: 8638778
Smoke: 192/0
SW_VERSION: 2026-05-26a
File: ~1.04MB

## COMMITS THIS SESSION (after previous handoff bbbce8e)

e57d889  fieldVsMarket: named factual signals replace unnamed FIELD opinion
8dd939e  SCORE-UNIFORM-A ambient panel: leader-first display
8638778  Surface hidden features — 8 discoverability fixes

## WHAT CHANGED — CODE

SCORE-UNIFORM-A FULLY RESOLVED (7a8c600 + 8dd939e):
  Three score surfaces now uniform — leader always on the left:
  Card: computeGameNarrative() scoreline (leader-first, team-aligned)
  OTW:  computeGameNarrative() via _n.scoreline (same path as card)
  Ambient panel: awayLeading reorder (leader name+score left, trailer right)
  Root cause: OTW used raw ed.awayScore–homeScore (ESPN away-first, no alignment).
  Ambient panel used same pattern but with ESPN own team names, so only ordering wrong.

fieldVsMarket PATENT REWORK (e57d889):
  Replaced generic "FIELD rates this more competitive" with four named factual signals:
  1. Elimination stakes vs heavy favorite (seriesRecord leads 3-0/3-1 + gap > 150)
  2. Historical singularity vs market (matchupNote clinch/first-since/sweep + gap > 100)
  3. Scarcity — only game in sport tonight (single game in sport + gap > 150)
  4. Tight line on low-stakes game (gap < 45 + !isScoutsPick)
  Patent principle: name the specific verifiable fact, not an unnamed opinion on watchability.

HIDDEN FEATURES SURFACING (8638778):
  8 fixes to make built-but-invisible features discoverable:
  1. card-tap-hint "tap for intel ›" — affordance on all game cards
  2. Wiki chips labelled "📈 In the news — [Team] (+N% on Wikipedia)"
  3. ICS button title: "Add to Apple Calendar, Google Calendar, or Outlook (.ics)"
  4. "📰 Desk" jump link added to filter bar → scrolls to FIELD Desk section
  5. Watch Window extended 35→60 min; 35-60 min shows "Up Next" (softer)
  6. showEUPushConsent() wired to push-enable-btn in My Services footer
  7. Pin widget first-use toast: "📌 Pinned — live in the corner as you scroll"
  8. Settings button title reveals Drama Dial and Drama Sensitivity

## WHAT CHANGED — PATENT ANALYSIS (Drive docs, no code changes)

Loophole 9 — Temporal Scope (THE BIG DISCOVERY):
  Post-game drama data is outside RUWT's temporal reach.
  RUWT's notification element ("transmit WHEN value meets threshold")
  cannot be practiced for concluded events — no viewing to direct,
  no in-play bets possible. Three independent structural reasons.
  Drive: 1UJ554dSGgWQg8FP7I6zDCU4Y2DTlbv_AFz0pjxE4ejc

Drama Tiered Architecture (6 tiers):
  T0 Substrate → T1 Pre-game → T2 Live computation → T3 Live display
  → T4 Transition (state==='post') → T5 Post-game historical → T6 FIELD IP
  Drive: 1oIzWYSZQp6FBKKoMuR4C-0KGyZ5GR3mcXtnakFc9w2Q

Patent Development Summary (session overview):
  Drive: 1lMkW8qp4yy2v_f2Zg5NNnP8oALao9o42LtetPxs85RY

Patent Portfolio Opportunities:
  4 provisional patent opportunities identified.
  P1: Regret Risk prediction (most novel — file first)
  P2: Historical drama arc + AI journalism
  P3: Subscription-aware broadcast cost-efficiency
  P4: Per-user client-side architecture (ADR-002 inversion)
  Drive: 1mZ3NOcNMteckYUL1V5IP0ae6LYDtOt2iZbC8NIVT2S8

Pre-game framework clarification:
  Two dimensions: subject matter (structural — no live stats exist)
  AND output framing (narrative — avoid "Drama: N" pre-game).
  Reserve "drama" label for live and post-game. Use "competitive intensity,"
  "drama potential," "stakes" pre-game. Numbers OK if measuring
  stakes/consequence (not excitement prediction).

## CRITICAL DECISIONS — STILL BINDING

Drama scores: ZERO raw numbers visible to users in live context.
  dramaScoreLive() drives labels/sparkline/tiers only.
  preGameScore() drives sorting only. Never displayed.
  POST-GAME: full numerical display permitted (Loophole 9).

Scout's Pick: isScoutsPick() boolean gates only. Never preGameScore > 70.

ESPN GOTD: espnGOTD:true enters stream resolver BEFORE default fallback.
  MLB_ESPNU_GOTD = ["espnapp"] — no RSN.

Sport vocab Layer 2b: retryWithSportVocab() after retryWithoutCliches().

SW_VERSION Rule 23: new day resets to 'a'. Second deploy → 'b'. Etc.

## NEXT SESSION

IMMEDIATE:
  May 26 schedule update (TYPE A still incomplete — schedule not updated)
  NBA ECF, NHL ECF results, MLB Tue slate, Peacock GOTD check

PATENT:
  Engage counsel — Regret Risk provisional filing (30-day window)
  Counsel review: P1-P6 questions in patent development summary

BACKLOG:
  Journalism depth Items 7-9 (Reddit, ESPN athlete stats, Google Trends)
  Section identity labels [SECTION-IDENTITY-A] ~25 min
  MUST WATCH · 69 → convert to "MUST WATCH — Q4 · 1-point game" framing (P4 counsel Q)

## CANONICAL DRIVE IDS

Current State:              1YdRjXSB9uCMHpfQg2nrvYqWSaNJaiBKQbXDUyYCJ2uU
CI/Deploy Ref:              18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
ADR-002:                    1DZq6I6T4jKiRsnO7DEqVA48WfTX0mIwEiKgYVjCqQs4
Numerical Policy v2:        1BHXT4y34M9MX2QdCwrX24w9mdrWW_YtBVByblux0r-Y
Patent Mitigation M1+M2:    1Hcc-hvYc8MKbLBCWXFe3S-Nu_gw_hT_7Gcz_M-oa1LI
Patent Dev Summary (new):   1lMkW8qp4yy2v_f2Zg5NNnP8oALao9o42LtetPxs85RY
Patent Portfolio (new):     1mZ3NOcNMteckYUL1V5IP0ae6LYDtOt2iZbC8NIVT2S8
Loophole 9:                 1UJ554dSGgWQg8FP7I6zDCU4Y2DTlbv_AFz0pjxE4ejc
Drama Tiered Architecture:  1oIzWYSZQp6FBKKoMuR4C-0KGyZ5GR3mcXtnakFc9w2Q
Daily Update Ref:           1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E
Journalism Quality Spec:    1b7fwDVZMURi2sDbQ-Ur7dpbG4I5-fuCDPWC1ILfucoU
Stakes Framework:           1yGuV448elULun9q-tLNbCLfnd1Kxt7EoBrtU9XVfMSw
Momentum Framework:         1Cd5R4csa3FA4ahYfWZYUj5N3jhlHsIkMOgr7BZ12wek
7-Axis Framework:           195lNITk3Y1ZfEZyKMZKlKkuQIDk0t2U9AfLjQbSpC0c
