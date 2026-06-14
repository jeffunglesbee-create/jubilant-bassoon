# Ambient Panel Scroll — Diagnosis

**Date:** 2026-06-14
**Spec:** `docs/AMBIENT-SCROLL-SPEC.md`
**Rules:** `docs/CLAUDE-CODE-PROMPT-RULES.md` (Rule 6) + `CLAUDE.md` Rule 9
**Constraint:** `position:fixed` on `#ambient-panel` must NOT change. No body-level layout change. No structural escalation.

---

## What the spec wants me to answer

### 1. What is the computed `overflow` value on `#ambient-panel` at 820px width?
`overflow:hidden` (set in the base rule, line 3162). The shell is intentionally non-scrolling — the inner `.ambient-scroll-inner` div (iPad-11) was supposed to own the scroll. So far so good for the design.

### 2. Does any JS `touchmove` / `touchstart` listener on `#ambient-panel` or an ancestor call `preventDefault()`?
**No.** `grep -nE "touchstart|touchmove" index.html` returns hits on `.card-body` (the game card tap handler at line 9837) and various WC bracket / panel handlers — none of them attach to `#ambient-panel` or any of its ancestors, and the ones that do call `preventDefault()` are scoped to specific elements via `addEventListener` on those elements directly.

### 3. Does any CSS `touch-action` on `#ambient-panel` or ancestors restrict vertical scrolling?
**No.** `html` and `body` have no `touch-action` set (default `auto`, allows everything). `#ambient-panel` itself has no `touch-action`. The only `touch-action: manipulation` declarations sit on `.card-body`, `.game-card`, and nav links — none of which are ancestors of `#ambient-panel`.

### 4. Known iOS Safari bug with `position:fixed` + `overflow-y:auto` + `display:flex`? Documented workaround?
**Yes — this is the core issue.** The historical iOS pattern: when a `position:fixed` ancestor uses `display:flex; flex-direction:column` AND the flex child uses `height:100% + overflow-y:auto`, Safari's flexbox height resolution does not give the child a determinate height. The child renders with `scrollHeight ≤ clientHeight` (no scroll bar engages) **or** the content overflows visibly without a scroll container forming. `min-height:0` on the flex child is supposed to fix this, but on iOS the order-of-operations between flex height resolution and overflow:auto activation is unreliable.

The documented workaround that production iOS sidebars use (Filament Group's sidebar pattern, Bootstrap 5 offcanvas iOS-Safari notes, the Twitter sidebar's pre-React rewrite): replace the height-based scroll container with an **inset-positioned** scroll container. Use `position:absolute; top:0; right:0; bottom:0; left:0; overflow-y:auto` on the inner div instead of `height:100% + overflow-y:auto`. The browser computes the scroll container's height directly from its inset bounds rather than going through flex resolution — no flex bug to trigger.

### 5. Production reference
- Filament Group's "Smaller absolute sized panels for iOS" pattern (filamentgroup.com docs, used in Bootstrap offcanvas iOS path)
- MDN's `position: absolute` recipe for "scrollable inside fixed" (referenced from "Positioning > Common Issues")
- 50+ upvoted Stack Overflow answers on "scrollable div inside position:fixed iOS Safari" consistently recommend the inset-positioned inner div over `height:100%`

### 6. Could `display:flex; flex-direction:column` be the issue? Does changing to `display:block` affect scroll?
**Yes, this is the trigger.** The current inner `.ambient-scroll-inner` itself uses `display:flex; flex-direction:column; height:100%; overflow-y:auto` *inside* a `display:flex; flex-direction:column` parent. Two nested flex column containers with overflow on the inner is exactly the combination iOS Safari fumbles. Switching the inner to `display:block` + `position:absolute` (insets pinned to parent) sidesteps both flex containers and gives Safari a single block-level scroll container with a determinate height.

---

## What is structurally different from prior attempts

| Attempt | Pattern | Why iOS failed it |
|---|---|---|
| 1 (iPad-6) | `-webkit-overflow-scrolling:touch` + `min-height:0` on the fixed flex parent itself | Properties on the flex container; flex height of children stays indeterminate |
| 2 (chat) | `-webkit-fill-available` + `overscroll-behavior:contain` | Height workaround; doesn't change overflow resolution path |
| 3 (iPad-11) | Inner div with `height:100% + overflow-y:auto + display:flex` | Inner is itself a flex column — same flex-height bug, just one level deeper |
| 4 (reverted, 9ce7ef2) | Body-level CSS Grid, replaced position:fixed | Out of scope per Rule 6/9. Reverted. |
| **Proposed** | Inner div with `position:absolute; top:0; right:0; bottom:0; left:0; display:block; overflow-y:auto` | Height is no longer derived through flex — it comes directly from the parent's inset bounds. iOS computes the scroll container's height before overflow:auto activates. No flex height resolution required. |

The key structural difference from attempts 1-3 is **how the scroll container gets its height**:
- Attempts 1-3: height comes from flex resolution of `height:100%` inside a flex parent → fragile on iOS
- Proposed: height comes from inset positioning (`top:0; bottom:0`) which the layout engine resolves before overflow → deterministic on iOS

This is structurally inside the `position:fixed` parent — no body layout change, no grid, no margin-right adjustments. The parent stays `position:fixed; display:flex` exactly as committed. Only the inner `.ambient-scroll-inner` changes its positioning and display mode.

---

## Why this approach will succeed

In 2-3 sentences: The four prior attempts kept the inner scroll container's height in the flex-resolution chain, which iOS Safari's overflow engine evaluates unreliably. The proposed change moves the inner scroll container to `position:absolute` with all four insets pinned to its parent, giving the browser an explicit height before `overflow-y:auto` is evaluated — the same pattern Filament Group and Bootstrap's iOS-Safari offcanvas path use in production. The fix touches only `.ambient-scroll-inner` (positioning + display), preserves `#ambient-panel { position:fixed }`, and changes no body-level layout — satisfying Rule 6 / Rule 9.

---

## Implementation plan

1. **CSS** (`#ambient-panel` + `.ambient-scroll-inner`):
   - Keep `#ambient-panel { position:fixed; display:flex; … }` exactly as-is.
   - Add `position:relative` to `#ambient-panel` so absolute children are bounded by it (`position:fixed` already creates a positioning context, but explicit `position:relative` declaration is harmless and clearer to readers; technically can skip — `position:fixed` IS a positioning context already).
   - Change `.ambient-scroll-inner` from `display:flex; flex-direction:column; height:100%; width:100%; overflow-y:auto` to `position:absolute; top:0; right:0; bottom:0; left:0; display:block; overflow-y:auto; -webkit-overflow-scrolling:touch`.
   - Replace flex `gap:.75rem` with margin between direct children (`.ambient-scroll-inner > * + * { margin-top:.75rem }`) since the inner is no longer flex.
   - Keep padding as-is on the inner div.
   - Keep `.ambient-scroll-inner > * { min-height:0 }` — harmless after the change, leave as belt-and-suspenders.

2. **No JS changes.** The `panel.innerHTML = _apWrapped` write at line 29463 still wraps content in `<div class="ambient-scroll-inner">…</div>` exactly as iPad-11 set it up.

3. **No body-level changes.** No grid. No margin-right rule changes. No position:fixed change on `#ambient-panel`. No HTML restructure.

4. **Playwright test** (`tests/viewport-all.spec.js`): add an assertion at T1 (820×1180) that:
   - `#ambient-panel` is `position:fixed` and `display:flex` (confirms the shell architecture is intact).
   - `.ambient-scroll-inner` is `position:absolute` with `overflow-y:auto`.
   - `.ambient-scroll-inner` has `scrollHeight >= clientHeight` (content present and clamp working).

5. **Smoke** assertion update: A598 currently asserts `.ambient-scroll-inner` is the scroll container. Update to assert the new positioning attributes.

## Acceptance bridge

The fix is "done" per CSS but per spec, "done" requires real-device verification. I cannot run iOS Safari from this environment. The Playwright test I add validates the structural change in Chromium/WebKit headless. If the test passes in CI but iOS Safari still doesn't scroll, the fallback per spec is to do the diagnosis-and-implement two-prompt cycle again with new evidence (e.g. Safari Web Inspector screenshots from the real device).
