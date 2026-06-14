# Ambient Panel Scroll Fix — Diagnosis-First Spec

## Bug
The ambient panel (#ambient-panel) on iPad Safari (820-1199px) does not
scroll. Content that extends below the viewport is clipped and inaccessible.
The Game Recap card text cuts off mid-sentence. This has failed three
consecutive fix attempts.

## Impact
Every piece of content below the visible fold in the ambient panel is
unreachable. Users cannot see full Night Owl recaps, arbitrage summaries,
or any content that overflows. This is a broken surface on iPad.

---

## Failed Approaches (do NOT repeat these)

### Attempt 1 (Claude Code, commit 973e959 + 16b2b88)
**What:** Added `-webkit-overflow-scrolling:touch` to #ambient-panel base
rule. Added `min-height:0` to all direct children (`#ambient-panel > *`).
**Result:** No scroll on real iPad Safari. Content still clips.
**Why it failed:** Unknown. These properties are theoretically correct for
flex containers with overflow, but did not engage touch scroll on the
real device.

### Attempt 2 (Chat surface, commit 4873249)
**What:** Changed iPad override from `height:100dvh` to
`height:100vh; height:-webkit-fill-available`. Added
`overscroll-behavior:contain`.
**Result:** No scroll on real iPad Safari. Content still clips.
**Why it failed:** `-webkit-fill-available` may not apply correctly to
`position:fixed` elements. `overscroll-behavior:contain` prevents scroll
chaining but doesn't enable scroll. The fundamental issue with
`position:fixed + overflow-y:auto` on iOS Safari may not be solvable
with CSS properties alone.

### Attempt 3 (Claude Code, commit cda61e0)
**What:** Inner scrollable div — wrapped all ambient panel content in
`.ambient-scroll-inner` with `overflow-y:auto; height:100%;
-webkit-overflow-scrolling:touch`. Panel itself becomes a non-scrolling
fixed shell; inner div owns the scroll.
**Result:** Unknown — not verified on real iPad before Attempt 4 was
applied on top of it. The inner-div wrapper IS still in the codebase.
**Why it may have failed:** Still inside a position:fixed parent on iOS Safari.

### Attempt 4 (Claude Code, commit 9ce7ef2 — REVERTED)
**What:** "Structural escalation" — removed position:fixed entirely.
Body became a 2-column CSS Grid (1fr 380px) at 820-1199px. Ambient panel
placed in column 2 with position:sticky. All body children defaulted to
column 1.
**Result:** Ambient panel DISAPPEARED on real iPad. Layout completely broken.
**Why it failed:** Left `margin-right:390px` on 7+ elements (`.main`,
`nav.controls`, `header.masthead`, etc.) that were designed for the
position:fixed layout. In CSS Grid, these margins compressed column 1
content to ~50px on a 820px viewport. Claude Code's comment said these
margins "become redundant" — they do not. CSS Grid does not zero out
margins on grid children. Reverted in commit fb72cc1.
**Lesson:** Structural layout changes require explicit authorization
(Rule 6 in CLAUDE-CODE-PROMPT-RULES.md). Claude Code must not replace
established layout paradigms to fix a single property-level bug.

---

## Current CSS State (as of latest main)
```css
#ambient-panel {
  display: none;
  flex-direction: column;
  gap: .75rem;
  position: fixed;
  right: 0;
  top: 106px;
  width: 380px;
  height: calc(100dvh - 106px);
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  background: var(--card);
  border-left: 1px solid var(--edge);
  padding: 1rem 1.1rem 2rem;
  z-index: 22;
}
#ambient-panel > * { min-height: 0; }

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

---

## Acceptance Criteria
The ambient panel MUST be independently scrollable on iPad Safari
(iOS 17+) when its content exceeds the viewport height. A user must
be able to touch-swipe the panel and see all content including the
Game Recap card at the bottom, without affecting the main content
scroll on the left.

This is an OBSERVABLE BEHAVIOR requirement, not a CSS property
requirement. The fix is not done when CSS properties are added. The
fix is done when the panel scrolls on a real iPad.

---

## Instructions for Claude Code

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
   validates the panel is scrollable:
   ```js
   // At 820x1180 viewport, #ambient-panel scrollHeight > clientHeight
   // AND panel responds to scroll (scrollTop changes after scroll action)
   ```

6. **Run smoke.** Push diagnosis + fix + test together.
