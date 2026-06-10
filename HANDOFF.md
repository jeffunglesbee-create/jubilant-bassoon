# FIELD HANDOFF — 2026-06-10 (Bottom Sheet Polish)

## HEADS
- jubilant-bassoon HEAD: af1d1f3
- SW_VERSION: 2026-06-10a
- Smoke: 560/0
- field-relay-nba HEAD: e9a282d

## WHAT SHIPPED (af1d1f3)

### Bottom sheet native polish
Three items shipped together (swipe-dismiss, drag handle, focus trap):

Swipe-to-dismiss:
  initBottomSheetSwipe() called at DOMContentLoaded.
  Engages when touch starts on handle OR content scrollTop <= 0 + downward swipe.
  Overlay dims proportionally during drag.
  Dismiss: delta > 90px OR velocity > 0.6px/ms.
  Snap-back when threshold not met.

Drag handle:
  .bs-handle-row sticky at sheet top with 38×4px pill affordance.
  aria-hidden (decorative). touch-action:none prevents system interference.
  Brightens on press (rgba .22 → .45).

Focus trap:
  aria-modal="true" + aria-label="Game details" on sheet.
  Escape closes. Tab cycles and wraps at boundaries.
  First focusable element receives focus after sheet open animation (290ms).

smoke: 560/0

## UPDATED PRIORITY LIST

1. WC bracket render        (before June 27, ~17 days)
2. Series dots 6a           (~40 lines, SCF is live)
3. Arc sparkline SVG 6b     (~25 lines)
4. WHOLE FIELD toggle 6c    (~30 lines)
5. Night Owl amnesty arc 6d (~20 lines)
6. Drama spectrum 6f        (~60 lines)
7. State transition 6e      (~30 lines)
8. M5 score ticker fade     (bug)
9. Wimbledon draw context   (before July 7)
10. ADR-002 attorney consult
11. nflverse client wiring  (September)

Bottom sheet polish (swipe, handle, focus trap): COMPLETE ✅

## SMOKE
560/0
