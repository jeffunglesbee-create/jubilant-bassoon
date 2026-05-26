# FIELD Handoff — May 26 2026 (Final)

HEAD: c666ee1
Smoke: 192/0
SW_VERSION: 2026-05-26a
File: ~1.07MB

## TODAY'S COMMITS (full session)

9bd8f53  TYPE A: SW_VERSION 2026-05-25b → 2026-05-26a
7a8c600  Fix SCORE-UNIFORM-A: OTW score matches card (computeGameNarrative)
8dd939e  SCORE-UNIFORM-A ambient panel: leader-first display
e57d889  fieldVsMarket: named factual signals replace unnamed FIELD opinion
8638778  Surface hidden features — 8 discoverability fixes
c666ee1  Item 7: ESPN athlete stats + BDL recent form

## LATEST COMMIT — c666ee1: ESPN Athlete Stats + BDL Recent Form

ESPN ATHLETE STATS (fetchESPNAthleteStats):
  Two-step: ESPN athlete search → /statistics endpoint (public, no key)
  Sport map: NBA (basketball/nba), MLB (baseball/mlb), NHL (hockey/nhl)
  Parsers: NBA PPG/APG/RPG · MLB ERA/W/K or .AVG/HR/RBI · NHL G/A/PTS
  Pre-fetch: fetchESPNAthleteContextAll(games) runs before compound prompt
  Cache: _espnAthleteContextCache[gameId] → read as [ESPN STATS] in prompt
  Names from: g.homePitcher/awayPitcher (MLB structured) + matchupNote regex

BDL RECENT FORM (fetchBDLRecentForm):
  NBA player last-5-games average via /nba/v1/stats?dates_from
  Output: "Brunson: 34.1 PPG last 5 (6.7 APG / 3.2 RPG)"
  Cache: 4h localStorage. NOT yet wired to compound prompt.
  Building block for Momentum (M) dimension of 7-axis framework.

BDL INTEGRATION DESIGN (3 layers):
  Layer 1 (built): season_averages + milestones + injuries
  Layer 2 (NEW):   recent_form — player momentum signal
  Layer 3 (future): team recent record — team M dimension

## CRITICAL DECISIONS — STILL BINDING

All from previous session, unchanged:
  Drama scores: ZERO raw numbers in live context. POST-GAME: full display OK (L9).
  Scout's Pick: isScoutsPick() only. Never preGameScore > 70.
  ESPN GOTD: espnGOTD enters stream resolver BEFORE default fallback.
  Sport vocab Layer 2b: retryWithSportVocab() after retryWithoutCliches().
  SW_VERSION Rule 23: new day resets to 'a'.
  SCORE-UNIFORM-A: all three surfaces use leader-first (card/OTW/ambient).

## CANONICAL DRIVE IDS

Current State:              1YdRjXSB9uCMHpfQg2nrvYqWSaNJaiBKQbXDUyYCJ2uU
CI/Deploy Ref:              18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Patent Dev Summary:         1lMkW8qp4yy2v_f2Zg5NNnP8oALao9o42LtetPxs85RY
Patent Portfolio:           1mZ3NOcNMteckYUL1V5IP0ae6LYDtOt2iZbC8NIVT2S8
Loophole 9:                 1UJ554dSGgWQg8FP7I6zDCU4Y2DTlbv_AFz0pjxE4ejc
Drama Tiered Architecture:  1oIzWYSZQp6FBKKoMuR4C-0KGyZ5GR3mcXtnakFc9w2Q
Gemini Handoff:             1JGom1HxvYGudll0jrAZKNVuvVNf4pLHNyOt8fAYo4KE
Daily Update Ref:           1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E
Journalism Quality Spec:    1b7fwDVZMURi2sDbQ-Ur7dpbG4I5-fuCDPWC1ILfucoU
