# Ambient Panel Scroll Fix — Diagnosis-First Spec

**Status: RESOLVED — confirmed on real device June 14 2026.**
**Resolution commits:** iPad-18 (`59c78fd`, CSS) + iPad-19 (`41bb8df`, JS).
**Verified:** iPad portrait (820×1180) AND landscape (1180×820) on iOS Safari.

## Bug (historical)
The ambient panel (#ambient-panel) on iPad Safari (820-1199px) did not
scroll. Content that extended below the viewport was clipped and inaccessible.
The Game Recap card text cut off mid-sentence. Failed four consecutive fix
attempts before the two-layer fix below.

## Impact (historical)
Every piece of content below the visible fold in the ambient panel was
unreachable. Users could not see full Night Owl recaps, arbitrage summaries,
or any content that overflowed.

---

## What Worked — The Two-Layer Fix

The end-to-end fix required BOTH a CSS change and a JS change. Either one
alone would have left a partial failure. They are documented as separate
commits because they address two independent root causes:

### Layer 1 — CSS: inset-positioned inner div (iPad-18, commit `59c78fd`)

**Change:** `.ambient-scroll-inner` switched from
`display:flex; height:100%; overflow-y:auto` to
`position:absolute; top:0; right:0; bottom:0; left:0; display:block; overflow-y:auto`.

**Why it worked where four prior attempts failed:** the inner div's height
no longer comes from flex resolution. It comes from inset bounds. iOS
Safari's overflow engine evaluates the scroll container's height before
`overflow-y:auto` activates, and inset positioning resolves cleanly — flex
+ `height:100%` does not. This is the production pattern Filament Group's
sidebar and Bootstrap 5's offcanvas iOS-Safari path both use.

The fix preserved `position:fixed` on `#ambient-panel` (Rule 9 honored) and
made no body-level layout change.

### Layer 2 — JS: scrollTop preservation across re-renders (iPad-19, commit `41bb8df`)

**Change:** `renderAmbientPanel()` now reads `scrollTop` off the existing
`.ambient-scroll-inner` BEFORE writing `panel.innerHTML`, then reapplies it
on the new `.ambient-scroll-inner` AFTER the write.

```js
const _apPrevScroll = panel.querySelector('.ambient-scroll-inner')?.scrollTop || 0;
panel.dataset.lastAp = _apHTML;
panel.innerHTML = _apWrapped;
if (_apPrevScroll > 0) {
  const _apNewInner = panel.querySelector('.ambient-scroll-inner');
  if (_apNewInner) _apNewInner.scrollTop = _apPrevScroll;
}
```

**Why it was needed:** `renderAmbientPanel()` fires every 15-30s on the
ESPN poll cycle. Each poll replaces `panel.innerHTML` wholesale — including
the `.ambient-scroll-inner` element. The new element starts at `scrollTop = 0`,
which yanks the reader back to the top mid-read. Layer 1 alone made the
panel scrollable; Layer 2 alone would have preserved a scroll position that
the user could not reach. Together they make the panel both scrollable AND
stable across the poll cycle.

This was the **STANDARDS.md Rule 24 / CLAUDE.md Rule 14 case study** —
re-render frequency is part of the system; ignoring it makes any layout
fix a partial fix.

---

## Why this approach succeeded where four prior attempts failed

| Attempt | What changed | Why it failed |
|---|---|---|
| 1 (iPad-6) | `-webkit-overflow-scrolling:touch` + `min-height:0` on the fixed flex parent | Properties on the wrong layer; flex children stayed indeterminate-height |
| 2 (chat 4873249) | `-webkit-fill-available` + `overscroll-behavior:contain` | Height-token swap; didn't change overflow resolution path |
| 3 (iPad-11) | Inner div with `display:flex; height:100%; overflow-y:auto` | Inner is itself a flex column inside a flex parent — same iOS bug, one level deeper |
| 4 (iPad-17, REVERTED `9ce7ef2`) | Body-level CSS Grid, removed `position:fixed` | Broke `margin-right:390px` on 7+ elements; panel disappeared |
| **iPad-18 + iPad-19** | **(L1) inset positioning replaces flex height resolution; (L2) scrollTop save/restore around innerHTML write** | Both root causes addressed simultaneously |

The novel insight that made iPad-18 work: the bug wasn't "iOS Safari can't
scroll inside `position:fixed`." The bug was "iOS Safari evaluates
`overflow-y:auto` BEFORE flex height resolution settles." Inset positioning
gives the browser a definite height to work with before overflow activates.

The novel insight that made iPad-19 necessary: even with the panel
scrollable, the 15-30s ESPN poll cycle's innerHTML replacement was
silently destroying scroll position. This is Rule 24's case study — the
re-render frequency is part of the system, not external to it.

---

## Final CSS / JS state (as of `41bb8df`)

```css
#ambient-panel {
  display: none;
  flex-direction: column;
  position: fixed;
  right: 0; top: 106px;
  width: 380px;
  height: calc(100dvh - 106px);
  overflow: hidden;          /* shell does NOT scroll */
  background: var(--card);
  border-left: 1px solid var(--edge);
  z-index: 22;
}
.ambient-scroll-inner {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  display: block;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 1rem 1.1rem 2rem;
  box-sizing: border-box;
}
.ambient-scroll-inner > * + * { margin-top: .75rem; }
.ambient-scroll-inner > * { min-height: 0; }

@media(min-width:820px) and (max-width:1199px) {
  #ambient-panel {
    display: flex;
    top: 0;
    height: 100vh;
    height: -webkit-fill-available;
    padding-top: 1rem;
    overscroll-behavior: contain;
    background: #0c1118;
    border-left: 1px solid rgba(255,255,255,.09);
  }
}
```

JS in `renderAmbientPanel()` (around line 29469-29483):
```js
const _apPrevScroll = panel.querySelector('.ambient-scroll-inner')?.scrollTop || 0;
panel.dataset.lastAp = _apHTML;
panel.innerHTML = _apWrapped;
if (_apPrevScroll > 0) {
  const _apNewInner = panel.querySelector('.ambient-scroll-inner');
  if (_apNewInner) _apNewInner.scrollTop = _apPrevScroll;
}
```

Smoke gates: A598 (iPad-18 CSS architecture) + A602 (iPad-19 JS save/restore).
Playwright #14 in `tests/viewport-all.spec.js` validates the inset-positioned
inner div on T1/T2 viewports.

---

## Failed Approaches (historical record — do NOT repeat these)

### Attempt 1 (Claude Code, commit 973e959 + 16b2b88)
**What:** Added `-webkit-overflow-scrolling:touch` to #ambient-panel base
rule. Added `min-height:0` to all direct children (`#ambient-panel > *`).
**Result:** No scroll on real iPad Safari. Content still clips.
**Why it failed:** These properties are theoretically correct for
flex containers with overflow, but did not engage touch scroll on the
real device — the issue was in the inner-vs-outer scroll responsibility,
not the property set.

### Attempt 2 (Chat surface, commit 4873249)
**What:** Changed iPad override from `height:100dvh` to
`height:100vh; height:-webkit-fill-available`. Added
`overscroll-behavior:contain`.
**Result:** No scroll on real iPad Safari. Content still clips.
**Why it failed:** `-webkit-fill-available` may not apply correctly to
`position:fixed` elements. `overscroll-behavior:contain` prevents scroll
chaining but doesn't enable scroll. The fundamental issue with
`position:fixed + overflow-y:auto` on iOS Safari is not solvable with
property tweaks on the parent.

### Attempt 3 (Claude Code, commit cda61e0)
**What:** Inner scrollable div — wrapped all ambient panel content in
`.ambient-scroll-inner` with `overflow-y:auto; height:100%;
-webkit-overflow-scrolling:touch`. Panel itself becomes a non-scrolling
fixed shell; inner div owns the scroll.
**Result:** Still no scroll on real iPad.
**Why it failed:** Inner was `display:flex; flex-direction:column` inside
a flex parent. iOS Safari's flex height resolution for the inner's
`height:100%` was unreliable. Same root cause as attempts 1-2, one level
deeper. iPad-18's inset positioning was the fix.

### Attempt 4 (Claude Code, commit 9ce7ef2 — REVERTED)
**What:** "Structural escalation" — removed position:fixed entirely.
Body became a 2-column CSS Grid (1fr 380px) at 820-1199px. Ambient panel
placed in column 2 with position:sticky.
**Result:** Ambient panel DISAPPEARED on real iPad. Layout completely broken.
**Why it failed:** Left `margin-right:390px` on 7+ elements (`.main`,
`nav.controls`, `header.masthead`, etc.) that were designed for the
position:fixed layout. In CSS Grid, these margins compressed column 1
content to ~50px on a 820px viewport. The commenting Claude Code wrote
("become redundant") was a Rule 48 Class D assumption violation — they
do not. CSS Grid does not zero out margins on grid children. Reverted in
commit fb72cc1.
**Lesson:** Structural layout changes require explicit authorization
(Rule 6 in CLAUDE-CODE-PROMPT-RULES.md, Rule 9 in CLAUDE.md). Claude Code
must not replace established layout paradigms to fix a single
property-level bug.

---

## Acceptance Criteria (historical)
The ambient panel MUST be independently scrollable on iPad Safari
(iOS 17+) when its content exceeds the viewport height. A user must
be able to touch-swipe the panel and see all content including the
Game Recap card at the bottom, without affecting the main content
scroll on the left.

This is an OBSERVABLE BEHAVIOR requirement, not a CSS property
requirement.

**Acceptance status: MET. Verified on real iPad portrait and landscape, June 14 2026.**

---

## Original Instructions for Claude Code (historical reference)

1. **Read** `docs/CLAUDE-CODE-PROMPT-RULES.md` first.

2. **Diagnose** before implementing. Answer these questions and write
   your answers to `outbox/ambient-scroll-diagnosis.md`:
   - What is the computed `overflow` value on #ambient-panel at 820px width?
   - Does any JavaScript `touchmove` or `touchstart` listener exist on
     #ambient-panel or any ancestor that calls `preventDefault()`?
   - Does any CSS `touch-action` property on #ambient-panel or ancestors
     restrict vertical scrolling?
   - Is there a known, documented iOS Safari bug with `position:fixed`
     + `overflow-y:auto` + `display:flex`? If so, what is the documented
     workaround?
   - Find a production website, open-source UI library, or StackOverflow
     answer with 50+ upvotes that demonstrates a WORKING fixed sidebar
     with touch scroll on iOS Safari. What structural pattern do they use?
   - Could the `display:flex` + `flex-direction:column` be the issue?
     Does changing to `display:block` affect scroll behavior?

3. **Explain** in 2-3 sentences why your proposed approach will succeed
   where the three failed attempts did not. Include this explanation in
   the diagnosis file. If you cannot articulate the difference, do more
   research before implementing.

4. **Implement** the fix based on your diagnosis.

5. **Write a Playwright test** in `tests/viewport-all.spec.js` that
   validates the panel is scrollable.

6. **Run smoke.** Push diagnosis + fix + test together.

The diagnosis was written at `outbox/ambient-scroll-diagnosis.md`. Both
the diagnostic process and the two-layer fix it produced are the
template for future hardware-dependent debugging.
