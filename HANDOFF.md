# FIELD HANDOFF — 2026-06-10 (R2 Analytics UI Surfaces)

## HEADS
- jubilant-bassoon HEAD: 9bb98da
- SW_VERSION: 2026-06-10a
- Smoke: 557/0
- field-relay-nba HEAD: e9a282d

## SESSION TYPE
TYPE A (UI feature)

## WHAT SHIPPED (9bb98da)

### Option A: Scout's Pick brief footer
Analytics chips appended below .brief-scout-note brief text.
Only renders when R2 data loaded for the specific game.
Both injection paths updated (cached + polled result).

Chips per sport:
  NHL: series PK% (teal) · PDO if ±0.010 (amber) · GSAX if ≥0.8 (teal/muted)
  NBA: clutch DRTG per team (blue when elite ≤106, muted otherwise)

Design: collapsed by default (only seen after reading the brief).
        No new surface — inside existing .brief-scout-note.
        Chip colors: teal = performance, amber = luck signal, blue = defense.

### Option C: Analytics Edge desk card
New desk card: type-analytics, inserts between Scout's Pick and Anti-Hype.
Trigger: ≥1 SCF/Finals game on slate AND _anyR2Loaded (series/clutch/GSAX).
Per-game sections, chip-based layout (no prose, scannable).
Source label in card header: "NHL series · NBA clutch · GSAX"
Blue left-border (distinct from teal Scout's Pick).
Zero presence on game cards. Zero presence in bottom sheet.

### Shared infrastructure
_buildAnalyticsChips(game): builds chip array from all loaded R2 tables.
_chipsHTML(chips): renders chip array as HTML with title tooltip attributes.
CSS variants: .dac base + .dac-teal/.dac-amber/.dac-blue/.dac-muted.

## FULL SURFACE MAP (final state)

| R2 data | Journalism (AI) | Scout's Pick badge | Brief footer (A) | Desk card (C) |
|---------|----------------|-------------------|-----------------|----------------|
| NHL series PP/PK | [PP/PK] tag ✅ | badge text ✅ | PK% chip ✅ | PK% chip ✅ |
| NHL PDO | [PDO] tag ✅ | — | PDO chip ✅ | PDO chip ✅ |
| NHL GSAX | [GOALIE DUEL] ✅ | — | GSAX chip ✅ | GSAX chip ✅ |
| NBA clutch DRTG | [TEAM CLUTCH] ✅ | — | clutch chip ✅ | clutch chip ✅ |
| Soccer xG | [SOCCER ANALYTICS] ✅ | — | — | — |

## OPEN ITEMS
Wimbledon draw context: ~25 min TYPE A, before July 7
WC bracket render: ~June 18-20
Product spec surfaces 6a-6f
ADR-002: attorney consultation pending

## SMOKE
557/0
