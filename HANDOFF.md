# FIELD HANDOFF — 2026-06-10 (Wikipedia Listings Fixes)

## HEADS
- jubilant-bassoon HEAD: 6451f89
- SW_VERSION: 2026-06-10a
- Smoke: 564/0
- field-relay-nba HEAD: 73c5e6a

## WHAT SHIPPED (4833e83)

### injectWikiChips — three structural fixes

1. Unhandled promise rejection (crash risk):
   bare setTimeout(injectWikiChips) → unhandled rejection if async throws.
   Fix: setTimeout(() => injectWikiChips().catch(() => {}), 1500)

2. CSS selector bug:
   '.game-card[data-home],[data-away]' selected ANY [data-away] element.
   Fix: '.game-card[data-home][data-away]' (requires both attributes on .game-card)

3. Wikimedia API lag (documentation):
   1-day lag documented — items[-1] is yesterday, not today.
   Not a bug, but explains why the chip signal is always one day behind.

API status confirmed (June 10): HTTP 200, clean JSON, Finals effect visible
  (NYK: 105K views June 6, 92K June 9 — clearly Finals-driven).

## UPDATED PRIORITY LIST

1. WC bracket render        (before June 27)
2. Series dots 6a
3. Arc sparkline SVG 6b
4. WHOLE FIELD toggle 6c
5. Night Owl amnesty arc 6d
6. Drama spectrum 6f
7. State transition 6e
8. M5 score ticker fade
9. Wimbledon draw context   (before July 7)
10. ADR-002 attorney consult
11. nflverse client wiring  (September)

## SMOKE
564/0
