# FIELD HANDOFF — 2026-06-10 (Stale-Final Guard)

## HEADS
- jubilant-bassoon HEAD: b4c6f94
- SW_VERSION: 2026-06-10a
- Smoke: 565/0
- field-relay-nba HEAD: 73c5e6a

## WHAT SHIPPED (b4c6f94)

### fix: stale-final guard in findESPNScore

SYMPTOM: iPad screenshot at 4:36pm ET Jun 10 showed previous day's FINAL
scores (ATL 5-4 CWS, CHC 3-7 COL, MIL 5-7 ATH) on tonight's scheduled
game cards.

ROOT CAUSE:
  - MLB V2 poller uses UTC date: todayISO = new Date().toISOString().slice(0,10)
  - At 4:36pm ET (8:36pm UTC) on June 10, todayISO = '2026-06-10'
  - Late June 9 games (COL/CHC 00:40 UTC, ATH/MIL 02:05 UTC) have UTC
    start timestamps on June 10. api-sports.io returns them as FINAL.
  - findScore() matches _scoresBySource by team name only — no time guard.
  - Yesterday's FINAL appears on tonight's scheduled card, same matchup.

FIX: _staleFinalGuard helper in findESPNScore.
  Invariant: state === 'post' AND game.start_time > Date.now() → return null.
  Applied to PM-20 source-tagged path AND legacy espnScores fallback.
  Zero side effects: live games, completed games, pre-game cards unaffected.

Smoke: A445 (565/0)

## PRIORITY LIST

1. WC bracket render        (before June 27) ← HARD DEADLINE
2. Series dots 6a
3. Arc sparkline SVG 6b
4. WHOLE FIELD toggle 6c
5. Night Owl amnesty arc 6d
6. Drama spectrum 6f
7. State transition 6e
8. M5 score ticker fade
9. Wimbledon draw context   (before July 7)
10. Design system impl.     (~90 min TYPE C)
11. ADR-002 attorney consult
12. nflverse wiring         (September)

## SMOKE
565/0
