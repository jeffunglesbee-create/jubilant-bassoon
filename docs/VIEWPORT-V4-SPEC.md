# Viewport v4 Spec — Claude Code Audit Reference

## Purpose
This document contains the complete viewport/UI specification for FIELD.
Claude Code should audit current CSS/HTML against this spec and report gaps.
The visual artifact (React) is built in the chat, not here.

## Source Documents
- v4 Build Brief: Drive 1OZItVH-7beD7wEpizwSie3mb80UtiepHIInGEZh3ALU
- Journalism Addendum: Drive 1ibAZ1n52akTtBEvmzgQHSkUPDEEllKwug44Gx6zggYE
- Design System v2: Drive 1Bv2qvn_Gz0qLZatJW9jVsQfMAwE-DyflZNplQyHmCvk
- Items Catalog: Drive 1lWX2KtRPMNN1e8YfxrCd3aBPNzxOc8k0JAHOzUxprd0

---

## 11 Viewport Breakpoints

| ID | Name | Width | Key Features |
|----|------|-------|-------------|
| P1 | Phone Compact | <375px | Single col, 44px touch targets |
| P2 | Phone Standard | 375–413px | Single col, card padding .75rem |
| P3 | Phone Large | 414–430px | Single col |
| L1 | Phone Landscape | <700px | Landscape, still single col |
| L2 | Landscape Wide | 700–819px | 2-col grid |
| T1 | iPad Portrait | 820–1199px portrait | Ambient panel visible |
| T2 | iPad Landscape | 820–1199px landscape | Ambient panel + bracket tree |
| D1 | Laptop ESSENTIALS | 1200–1439px | LEFT + RIGHT columns |
| D2 | Laptop WHOLE FIELD | 1200–1439px + WF | LEFT + RIGHT + editorial |
| D3 | Desktop ESSENTIALS | 1440–1919px | LEFT + CENTRE + RIGHT |
| D4 | Desktop WHOLE FIELD | 1440+ + WF | 3-col, full editorial |

Plus W1: WC Group-Stage Card Variant (any viewport)

## 5 Surfaces (per applicable viewport)

1. **Desk** — game cards, OTW, sport stripes, filter bar, score ticker
2. **Journal** — Night Owl verdicts, FIELD Brief, The Scorecard
3. **Groups** — WC group tables, advancement badges, position bars
4. **Projections** — bracket tree (T2+), BracketMini (phone), movers
5. **Streaming Discovery** — service cards, Watch Free, pricing

## Semantic System

- **Color tokens**: COLOUR-SYS-A (Drive 1NWToUpUMPnn)
- **Typography**: Chakra Petch (identity) + DM Sans (body). NO others.
- **Motion**: instant / urgent / deliberate / ambient
- **Vocabulary**: MUST · WATCH · DISCOVERY · CAUTION · QUIET
- **Card tiering**: featured / standard / compact grid

## 9 Named States (VIBE-A)

1. CRUNCH TIME — final period, close game
2. ELIMINATION — season/series ending
3. BLOOD GAME — rivalry with history
4. ALONE ON SCREEN — only game on
5. VOLATILE — lead changes, momentum swings
6. MISSION — team needs specific result
7. GRINDING — low-scoring, defensive
8. MUTED — blowout, low stakes
9. AMNESTY — post-game, constraints lifted

## Interaction Architecture (Two-Target)

Every game card has TWO distinct tap zones:
- **Drama badge tap** → story portal (bottom sheet on phone, ambient panel on tablet, inline expand on desktop)
- **Card body tap** → F16 inline expand (streams, time, matchup info)

Destination surface by viewport:
- P1-P3, L1-L2: bottom sheet
- T1/T2: ambient panel injection
- D1/D3: inline LEFT expansion
- D2: RIGHT column enrichment
- D4: CENTRE column editorial

## Journalism Surfacing (7 surfaces)

1. **Per-game brief inline**: featured=full, standard=1 line, compact=none
   - P1-P2: 1 line (TIGHT), P3-L2: 2 lines (MID), T1-D4: full (FULL)
2. **Scout's Pick**: teal DISCOVERY badge, expanded view at each viewport
3. **Series Brief**: inline on featured playoff cards, full card width
4. **Tournament Brief**: standalone gold-border card, all viewports
5. **Night Owl**: game-to-verdict visual link, featured + compact variants
   - P1-P3: single col, T1/T2: ambient panel, D1-D4: LEFT + RIGHT
6. **FIELD Brief**: daily editorial
   - P1-P3: Journal tab, T1/T2: ambient panel, D1-D3: RIGHT col, D4: CENTRE
7. **JQ Gate quality signal**: confidence glyph or source count chip

## Key Principle
FIELD is an editorial product that happens to show scores.
Not a scoreboard that happens to have editorial.

## CSS Audit Checklist (for Claude Code)

Audit `index.html` CSS for:
- [ ] All 11 breakpoint media queries present and non-overlapping
- [ ] Card tiering CSS (featured vs standard vs compact)
- [ ] CompactGrid implementation (2-col phone, 3-col laptop)
- [ ] Ambient panel visibility rules by viewport
- [ ] WHOLE FIELD toggle (ESSENTIALS vs WHOLE FIELD)
- [ ] Filter bar scroll-snap on mobile
- [ ] Touch targets ≥44px on mobile
- [ ] iOS safe-area (env(safe-area-inset-*))
- [ ] Sport stripe colors per league
- [ ] Typography: Chakra Petch and DM Sans only
- [ ] Night Owl / Journal tab CSS
- [ ] Bottom sheet CSS (phone only)
- [ ] WC-specific styles (group tables, bracket, advancement)
- [ ] Journalism inline brief CSS by card tier
- [ ] Live WP bar + attention bar (new, shipped today)

Report: what exists, what's missing, what's broken.
Write findings to outbox/viewport-audit.md and push.
