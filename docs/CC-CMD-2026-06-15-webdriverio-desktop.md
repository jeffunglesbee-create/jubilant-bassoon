# Claude Code Command — WebDriverIO Desktop Test Infrastructure

git pull. Read CLAUDE.md and docs/CLAUDE-CODE-PROMPT-RULES.md.

## CONTEXT

Cross-engine viewport testing exists for MOBILE:
- `tests/ios-safari-viewport.js` — iOS Safari via Appium, 5-device matrix
- `tests/android-chrome-viewport.js` — Android Chrome via Appium, 4-device matrix
- `.github/workflows/ios-safari-audit.yml` + `android-chrome-audit.yml`

Desktop browser testing does NOT exist yet. The CC-CMD-2026-06-15-desktop-layout
task fixed three CSS/JS bugs at >=1200px (A612) but could not create test files
because Playwright binaries were not downloadable in the sandbox. The "What remains"
section of `outbox/cc-desktop-layout-2026-06-15.md` explicitly flags this gap.

### Just shipped (same day, commit 7826c38)

Cape Verde team name normalization. API-Sports D1 returns "Cape Verde Islands"
but FIELD uses "Cape Verde". Fix: promoted local `_d1NameFix` to module-level
`_WC_NAME_FIX` + `_wcFixTeamName()` near line 27472 in index.html. Applied
normalization in BOTH the standings merge AND `_wcBuildGroupInput` results
mapping (previously only standings were normalized — results flowed raw,
breaking Monte Carlo H2H tiebreakers). Map has 8 entries. Assertions: A560
(updated — checks `_WC_NAME_FIX` not old `_d1NameFix`), A613 (new — verifies
Cape Verde mapping + `_wcFixTeamName` function + results normalization wiring).

### Known issue

Fix #3: `#sport-filters` selector is wrong in 3 test suites. Fix if encountered.

## ARCHITECTURE REFERENCE

Desktop breakpoints (from docs/VIEWPORT-V4-SPEC.md):
- D1: Laptop ESSENTIALS (1366x768)
- D2: Laptop WHOLE FIELD (1366x768)
- D3: Desktop ESSENTIALS (1920x1080)
- D4: Desktop WHOLE FIELD (1920x1080)

Body class modes: `wf-mode` (WHOLE FIELD), `wc-mode` (World Cup), `journalism-mode`.
These are mutually exclusive full-viewport modes at >=1200px (A612 fix).

Deployed PWA: https://jeffunglesbee-create.github.io/jubilant-bassoon/

## TASKS

### Task 1: Desktop Chrome test suite

Create `tests/desktop-chrome-viewport.js` using the same WebDriverIO assertion
structure as `tests/ios-safari-viewport.js`.

Test at D1 (1366x768) and D3 (1920x1080) viewports using `browser.setWindowSize()`.

Assertions for each viewport:
1. Page loads without JS errors (check browser console logs)
2. Sport filter tabs render and are visible
3. WC section renders when wc-mode toggled (click #wc-nav-link, verify #wc-section visible)
4. ESSENTIALS/WHOLE FIELD toggle works: click #wf-toggle, verify body.wf-mode set,
   ambient panel visible. Click again, verify body.wf-mode removed, ambient panel hidden.
5. Journalism tab enters own viewport: click journalism nav, verify
   body.journalism-mode set, #field-journalism-section visible, .main hidden
6. Mode mutual exclusion: activating wc-mode while journalism-mode active should
   deactivate journalism-mode
7. No CLS violations above 0.1 threshold (use Performance Observer if available,
   or skip with a note)

### Task 2: Desktop Safari test suite

Create `tests/desktop-safari-viewport.js` with the same assertions as Task 1.
Safari-specific: `safaridriver` is built-in on macOS — no binary download needed.

### Task 3: GitHub Actions workflows

Create `.github/workflows/desktop-chrome-audit.yml`:
- runs-on: ubuntu-latest
- Install chromedriver via `@wdio/chromedriver-service` or apt
- Run `tests/desktop-chrome-viewport.js`
- paths-ignore: HANDOFF.md, outbox/**, docs/**
- Trigger: push to main (with paths filter) + workflow_dispatch

Create `.github/workflows/desktop-safari-audit.yml`:
- runs-on: macos-latest
- `sudo safaridriver --enable` before starting
- Run `tests/desktop-safari-viewport.js`
- Same paths-ignore and trigger pattern

### Task 4: WebDriverIO config

Create `wdio.desktop-chrome.conf.js` and `wdio.desktop-safari.conf.js` (or a
shared config with capability overrides). Pattern should match existing mobile
configs if they exist, or create minimal standalone configs.

### Task 5: Fix #sport-filters selector

If `#sport-filters` selector is wrong in any of the 3 existing test suites
(`ios-safari-viewport.js`, `android-chrome-viewport.js`, `viewport-all.spec.js`),
fix it. Check the actual DOM: grep index.html for the filter container's real
ID or class.

## RULES

- DO NOT ASSUME / DO NOT INVENT. Read existing test files first.
- Single-concern commits (Rule 7). One commit per task.
- Smoke gate: `node smoke.js` must stay 656/0 or higher after every commit.
- SW_VERSION: do NOT bump — no index.html changes expected.
- paths-ignore in workflows: HANDOFF.md, outbox/**, docs/**, *.md

## OUTPUT

Write all findings to `outbox/cc-webdriverio-desktop-2026-06-15.md`:
- Pre-work smoke count
- Each task: what was created, any issues encountered
- Post-work smoke count
- Files created/modified list
- How to trigger each workflow

Run smoke. Push all commits + output file when complete.
