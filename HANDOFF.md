# FIELD HANDOFF — 2026-06-10 SESSION END

## HEADS
- jubilant-bassoon HEAD: d2afd1f (last code: 6451f89)
- SW_VERSION: 2026-06-10a
- Smoke: 564/0
- field-relay-nba HEAD: 73c5e6a

## SESSION TYPE
A/B (code) + D (design exploration)
Session doc: Drive 1LTssdCMd4I3sIOBLi_vewnk_TpdhOlDrU86g-OkgpzU

## CODE SHIPPED

### 65a234b — NBA player clutch live data
nbaPlayerCluichInit() at T+4750ms.
Verified: /nba-stats/leaguedashplayerclutch HTTP 200.
Patches all 7 [VERIFY playoffs 2026] entries in NBA_CLUTCH_PLAYERS.
Match: lastName + TEAM_ABBREVIATION (collision-safe).
Filter: GP >= 3.

### relay 73c5e6a — /schedule whitelisted for MLB probable pitchers

### 6d278b3 — MLB probable pitcher signals (pitching-edge hook)
Two-phase: mlbProbablePitcherInit (T+4100ms) + mlbPitcherStatsInit (T+4300ms).
Three getStatOfDay signals: Ace ERA, ERA differential, K/9.
Completes MLB three-pillar: VENUE + OFFICIATING + PITCHING.

### 6451f89 — Wikipedia listings fixes
injectWikiChips: .catch() on setTimeout, selector bug (.game-card[data-home][data-away]),
API lag documented.

## DESIGN WORK (mockups only — NOT in jubilant-bassoon)

All design decisions are spec-level. No CSS/JS committed.
Mockup artifacts: 7 React JSX files (not in repo).

### Design system final decisions

TYPOGRAPHY:
  Chakra Petch — all chrome/data/intelligence (replaces Playfair + Barlow + Mono)
  DM Sans 400  — team names, brief/editorial text (confirmed working class ethos)
  [Rule 33 + Working Class Spec + Grand Synthesis "proportional for editorial" = DM Sans, not Caslon]

FOUNDATION:
  --obsidian: #070616  (was #070710)
  --card:     #0d0b2a  (was #121224)
  --card-hl:  #13103a  (was #181830)
  Semantic tokens: identical to COLOUR-SYS-A.

CARD STRUCTURE:
  .ga gutter: 3px DOM element, gradient fills per drama state
    CRUNCH = amber→orange, WATCH = blue, SCOUT = teal, STAKES = violet
  Inset glow: drama>=80 gold, drama>=60 blue, else none
  .brief-stat: inline Chakra Petch + gold for stats within DM Sans prose
  .ganalytics: always-visible on CRUNCH TIME (no tap required)
  .gpost: green strip for Night Owl entry on final-state cards
  JUST CHANGED chip on OTW banner

DRAMA TO USERS (never the integer):
  Card glow → Named badge tier → Drama bar → OTW fire state → Brief copy

WORKING CLASS ETHOS:
  Bar, not studio. (Native Editorial Format doc)
  DM Sans proportional ✓ (Grand Synthesis "monospace for numbers, proportional for editorial")
  Brief copy: dispatch register, not magazine ✓

11 VIEWPORTS:
  P1(<375px) P2(375-413) P3(414-430) — portrait phone, 1-col
  L1(<700px) L2(700-819px) — landscape phone, L2 = 2-col grid
  T1/T2(820-1199px) — iPad, ambient panel, no OTW banner
  D1/D2(1200-1439px) — laptop, LEFT+RIGHT (CENTRE not at laptop)
  D3/D4(1440-1919px) — desktop, D4 = LEFT+CENTRE+RIGHT
  Drama line: TIGHT 38ch / MID 52ch / FULL 72ch by viewport

## IMPLEMENTATION NEEDED (design not built)
~90 min TYPE C session:
  1. CSS token update (3 hex values)
  2. Font swap: Chakra Petch + DM Sans (remove Playfair + Barlow)
  3. .ga gutter in renderGameCard() (grid-template-columns: 3px 1fr)
  4. .ganalytics always-visible on .crunch-card
  5. .brief-stat wrapper, .gpost strip, JUST CHANGED chip
  6. Vibe vocabulary: MUST-HOLD, 🔇 PASS

## UPDATED PRIORITY LIST

1. WC bracket render        (before June 27) ← HARD DEADLINE
2. Series dots 6a
3. Arc sparkline SVG 6b
4. WHOLE FIELD toggle 6c
5. Night Owl amnesty arc 6d
6. Drama spectrum 6f
7. State transition 6e
8. M5 score ticker fade     (bug)
9. Wimbledon draw context   (before July 7)
10. Design system impl.     (~90 min TYPE C)
11. ADR-002 attorney consult
12. nflverse wiring         (September)

## SMOKE
564/0
