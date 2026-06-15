# Claude Code Command — Desktop Layout Bugs (WC Tab + Journalism Tab + Ambient Panel)

git pull. Read CLAUDE.md.

## CONTEXT

Three interconnected desktop layout bugs reported on desktop (>=1200px viewport).
These bugs do NOT exist on mobile/tablet (<=1199px) — all three features work
correctly on phone and iPad.

### Architecture Reference

Desktop layout uses "Straight or With Chaser" model (May 22 2026 spec):
- ESSENTIALS (default): schedule only, full width. No ambient panel.
- WHOLE FIELD (toggle): schedule + ambient panel sidebar.
- body.wf-mode: set when WHOLE FIELD toggle clicked.
- body.wc-mode: set when WC Groups/Bracket nav link clicked.
- body.journalism-mode: set when journalism nav link clicked.

Breakpoints:
- <820px: Mobile — single column
- 820-1199px: iPad — schedule + ambient panel (always visible)
- 1200-1439px: Laptop — ESSENTIALS/WHOLE FIELD toggle
- 1440px+: Desktop — ESSENTIALS/WHOLE FIELD with 3-column option

Viewport test spec (tests/viewport-all.spec.js) defines expected behavior at:
- D1: Laptop ESSENTIALS (1366x768)
- D2: Laptop WHOLE FIELD (1366x768)
- D3: Desktop ESSENTIALS (1920x1080)
- D4: Desktop WHOLE FIELD (1920x1080)

### Recent CSS changes (today, may have introduced regressions):

1. Commit 210a498: moved wc-mode hide rules from @media(max-width:1199px) to global
2. Commit 4415912: widened #wc-section max-width from 900px to 1300px
3. Commit d431d87: added #wc-nav-link display:inline-flex !important at >=1200px

These changes fixed the bracket width but did NOT fix the groups tab or other issues.
Evaluate whether these changes are correct or should be reverted.

## BUG 1: WC Groups tab doesn't work on desktop

**Expected**: Clicking "Groups" nav link or tab activates body.wc-mode, hides schedule
and journalism, shows WC section in its own viewport.

**Actual**: WC groups content renders underneath the schedule and journalism sections.
Not in its own tab/viewport. The bracket tab (Projections) works on desktop after
the width fix.

**Key code paths**:
- #wc-nav-link (line ~4197): has style="display:none", shown by initWCNav() IIFE
- toggleWCView() (line ~27825): toggles body.wc-mode
- switchWCTab() (line ~27791): toggles between groups and bracket divs
- CSS wc-mode rules (line ~2383): hide .main, #night-owl, etc.
- initWCNav IIFE (line ~28873): clears display:none if wcActive is true

**Investigation needed**: Why does wc-mode work on mobile but not desktop? Is the
nav link visible and clickable? Is body.wc-mode being applied? Are the hide rules
being overridden by WHOLE FIELD mode rules?

## BUG 2: Journalism doesn't have its own tab on desktop

**Expected**: Clicking journalism nav link activates body.journalism-mode, shows
journalism section in its own viewport (like on mobile).

**Actual**: Journalism content renders inline with schedule, not in a dedicated tab.

**Key code paths**:
- .jrn-nav-link: journalism nav link in controls
- toggleJournalismView(): toggles body.journalism-mode
- #field-journalism-section: the journalism section container

## BUG 3: Ambient panel doesn't work when ESSENTIALS clicked

**Expected**: In ESSENTIALS mode, no ambient panel. In WHOLE FIELD mode, ambient
panel visible on the right.

**Actual**: Ambient panel behavior is broken — not responding correctly to
ESSENTIALS/WHOLE FIELD toggle.

**Key code paths**:
- #wf-toggle (line ~4198): ESSENTIALS/WHOLE FIELD toggle button
- body.wf-mode: set when WHOLE FIELD active
- initWholeField() (line ~28877): persists state to localStorage
- CSS @media(min-width:1200px) body.wf-mode rules (line ~2424+)

## INSTRUCTIONS

1. Use WebDriverIO (NOT Playwright) for all browser testing — same pattern as
   tests/ios-safari-viewport.js and tests/android-chrome-viewport.js shipped today.
   Create tests/desktop-chrome-viewport.js and tests/desktop-safari-viewport.js
   using the same assertion structure.

2. Desktop Chrome test: WebDriverIO + chromedriver on ubuntu-latest.
   Test at D1 (1366x768) and D3 (1920x1080) viewports.
   Use browser.setWindowSize(width, height) to set viewport.

3. Desktop Safari test: WebDriverIO + safaridriver on macos-latest.
   Test at D1 (1366x768) and D3 (1920x1080) viewports.
   Run `sudo safaridriver --enable` before starting.

4. For each bug, test these scenarios:
   - Page load in ESSENTIALS mode (default): verify schedule visible, ambient hidden
   - Click WHOLE FIELD toggle: verify body.wf-mode set, ambient panel visible
   - Click ESSENTIALS toggle: verify body.wf-mode removed, ambient panel hidden
   - Click WC Groups nav link: verify body.wc-mode set, schedule hidden, WC section visible
   - Click Groups sub-tab: verify #wc-groups visible, #wc-bracket hidden
   - Click journalism nav link: verify body.journalism-mode set, journalism section visible
   - Mutual exclusion: wc-mode and journalism-mode should not coexist

5. Identify exact CSS or JS causing each failure. Check for specificity conflicts
   between wc-mode, wf-mode, and journalism-mode rules.

6. Fix all three bugs with minimum changes needed.

7. Verify no regressions at T1 (820x1180) and P2 (390x844) using the existing
   iOS Safari and Android Chrome test suites.

8. Run smoke after each fix — baseline 654/0.

9. Add GitHub Actions workflows:
   - .github/workflows/desktop-chrome-audit.yml (ubuntu-latest, chromedriver)
   - .github/workflows/desktop-safari-audit.yml (macos-latest, safaridriver)

10. Write findings to outbox/cc-desktop-layout-2026-06-15.md. Push when complete.
