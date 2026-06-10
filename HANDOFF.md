# FIELD HANDOFF — 2026-06-10 (MLB Pitching Edge)

## HEADS
- jubilant-bassoon HEAD: 6d278b3
- SW_VERSION: 2026-06-10a
- Smoke: 564/0
- field-relay-nba HEAD: 73c5e6a

## WHAT SHIPPED

### MLB probable pitcher signals (jubilant-bassoon 62b5e26, relay 73c5e6a)

Novel hook: the starting pitcher is baseball's highest-leverage individual.
FIELD's MLB signals were all venue/officiating level. This adds the missing
third pillar: PITCHING.

Verification:
  statsapi.mlb.com/api/v1/schedule HTTP 200 from CF Workers.
  /mlb-stats/people/{id}/stats HTTP 200 through relay.
  /schedule added to MLB_STATS_API_ALLOWED_PREFIXES (relay 73c5e6a).
  Rodón's actual 2026 stats retrieved: ERA 2.88, K/9 9.72, WHIP 1.20.

Architecture:
  Two-phase: mlbProbablePitcherInit (T+4100ms) + mlbPitcherStatsInit (T+4300ms).
  Phase 1: schedule call → pitcher IDs keyed by home team name.
  Phase 2: parallel stats calls for all tonight's unique pitcher IDs.
  getStatOfDay() reads synchronously from completed cache.

Three new signals:
  Ace signal: ERA <= 3.00 AND gamesStarted >= 4
    Badge: "Rodón 2.88 ERA"
  ERA differential: gap >= 1.20 between starters
    Badge: "ERA edge 2.88 vs 4.51"
  Strikeout artist: K/9 >= 10.0
    Badge: "Cole 10.8 K/9"

MLB three-pillar signal architecture now complete:
  VENUE:       park factor
  OFFICIATING: umpire ABS + K-rate bias
  PITCHING:    probable starter edge [NEW]

## UPDATED PRIORITY LIST

1. WC bracket render        (before June 27)
2. Series dots 6a           (~40 lines, SCF live)
3. Arc sparkline SVG 6b     (~25 lines)
4. WHOLE FIELD toggle 6c    (~30 lines)
5. Night Owl amnesty arc 6d (~20 lines)
6. Drama spectrum 6f        (~60 lines)
7. State transition 6e      (~30 lines)
8. M5 score ticker fade     (bug)
9. Wimbledon draw context   (before July 7)
10. ADR-002 attorney consult
11. nflverse client wiring  (September)

Bottom sheet polish: ✅
NBA player clutch live:  ✅
MLB pitching edge hook:  ✅

## SMOKE
564/0
