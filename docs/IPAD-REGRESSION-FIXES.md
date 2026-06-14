# iPad Regression Fix Spec — Post-Viewport Build

## Context
After the viewport v4 build (V1-V12 commits), five iPad-specific bugs were reported.
These are REGRESSIONS introduced by the viewport build, not pre-existing issues.
All fixes must be verified for BOTH portrait (820px) AND landscape (~1180px) on iPad.

## Pre-fix
1. `git pull`
2. Run `node smoke.js index.html` — record baseline (should be 635/0)
3. Read this file completely before starting

---

## Bug 1: Bottom sheet doesn't populate on tap (some game cards)

**Root cause:** V3 commit `1d42e49` added CSS `@media(min-width:820px){ .bottom-sheet{ display:none !important; } }` but the JS tap handler (`openGameSheet` reference at line ~4857, and the sheet open logic at line ~34291) still tries to open the bottom sheet regardless of viewport width. On iPad (≥820px), the sheet gets `classList.add('open')` but CSS hides it with `display:none !important`. Result: tap does nothing visible.

**Fix:** The JS that opens the bottom sheet (around line 34291) must check viewport width. If `window.innerWidth >= 820`, route the tap to the ambient panel injection or inline card expand instead of the bottom sheet. The spec (VIEWPORT-V4-SPEC.md lines 68-73) defines the routing:
- P1-P3, L1-L2 (< 820px): bottom sheet
- T1/T2 (820-1199px): ambient panel injection
- D1-D4 (≥1200px): inline LEFT/RIGHT/CENTRE expansion

If ambient panel injection isn't fully wired yet, at minimum scroll the tapped card into view and expand its inline brief (F16 behavior) as a fallback for ≥820px.

**Verify:** Tap a game card on iPad portrait AND landscape. Something visible must happen.

**Commit:** `fix(iPad-1): viewport-aware tap routing — bottom sheet on phone, ambient/inline on tablet+`

---

## Bug 2: Brief cards revert to untapped position after 5-10 seconds

**Root cause:** The ESPN poll cycle (every 20-45s via `computeLiveInterval`) re-renders card HTML, destroying DOM state. `_deskCardToggle` sets `data-expanded="1"` on the element, but when the poll fires and rebuilds cards, the element is replaced with fresh HTML that has no `data-expanded` attribute. The expanded state is lost.

**Fix:** Persist expand state outside the DOM. When `_deskCardToggle` is called, store the expanded gameId in a Set (e.g., `_expandedCards`). When cards are re-rendered, check the Set and re-apply `data-expanded="1"` to matching cards. Clear entries from the Set when the user explicitly collapses.

**Verify:** Tap a brief card to expand it. Wait 30+ seconds. The card should remain expanded through a poll cycle.

**Commit:** `fix(iPad-2): persist brief expand state across re-renders`

---

## Bug 3: Scrolling behavior randomly jumps

**Root cause:** Likely layout shifts from:
- V2 (`b3b3377`): new P1/P2/P3 media queries may fire on iPad during orientation changes or resize, causing layout recalculation
- V8 (`8bffeeb`): CompactGrid 3-col at 1440 changes grid column count, which can cause scroll position jumps when the grid reflows
- V4 (`804c388`): card tiering classes changing card sizes mid-render

**Fix:** 
1. Audit the new media queries from V2 — ensure none fire on iPad widths (820-1199) with unintended rules that change card/grid sizing.
2. Add `contain: layout style` to `.games-list` and `.game-card` to prevent layout shifts from propagating upward.
3. If grid column count changes trigger scroll jumps, add `overflow-anchor: auto` to the scroll container.

**Verify:** Scroll through the game list on iPad portrait and landscape. No unexpected jumps.

**Commit:** `fix(iPad-3): contain layout shifts in game list + card grid`

---

## Bug 4: Tapping "Desk" doesn't navigate to desk location

**Root cause:** The filter bar tab switching mechanism may have been affected by V7 (touch target changes) or V4 (card tiering). Check if the Desk filter button's click handler still fires and scrolls to the correct anchor. Also check if the `desk-jump-link` click handler at line ~9910 is still wired.

**Fix:** Verify the filter-btn click → tab switch → scroll-to-section pipeline. The Desk button should:
1. Set active tab state
2. Scroll to the desk section
3. Show desk content

If the 44px touch target change (V7) added padding that broke the click target, fix the padding/sizing.

**Verify:** Tap "Desk" in the filter bar on iPad portrait AND landscape. App should scroll to the desk section.

**Commit:** `fix(iPad-4): restore desk tab navigation`

---

## Bug 5: Journal tab takes multiple taps

**Root cause:** Similar to Bug 4 — the filter bar button may have touch target or z-index issues. The journalism-mode toggle (line ~2097) requires `body.journalism-mode` class. If the button's tap handler has a race condition with the touch target changes, it may require multiple taps.

Also check: if the bottom sheet is still trying to open (Bug 1) and intercepting the first tap, that could consume the touch event before the filter button processes it.

**Fix:**
1. Check if the Journal filter button's click handler fires on first tap
2. Ensure no overlapping touch targets (bottom sheet overlay, attention bar) intercept the tap
3. If the `bs-overlay` (line 4221) is still receiving clicks on iPad (even though the sheet is hidden), its click handler may be consuming events. Add `pointer-events: none` to the overlay when the sheet is hidden.

**Verify:** Tap Journal in the filter bar once on iPad portrait AND landscape. Journalism tab should appear immediately.

**Commit:** `fix(iPad-5): journal tab single-tap activation`

---

## Post-fix
1. Run `node smoke.js index.html` — confirm 0 failures
2. Run `node field_unit.js` — confirm 0 failures  
3. Bump SW_VERSION
4. Update HANDOFF.md
5. Push and report commit ledger

## Rules
- One commit per bug fix
- Smoke must pass after each commit
- Test BOTH portrait and landscape on iPad (820px and ~1180px)
- Do NOT revert any V1-V12 changes — fix forward
- The bottom sheet CSS gate (V3) is CORRECT — the JS routing must adapt to it
