# WebDriverIO Desktop Test Infrastructure — Execution Log

**Date:** 2026-06-15
**Spec:** `docs/CC-CMD-2026-06-15-webdriverio-desktop.md`
**Pre-work smoke:** 656 / 0
**Post-work smoke:** 656 / 0 (no index.html changes; SW_VERSION not bumped)

---

## Task 1 — Desktop Chrome test suite ✅

**Created:** `tests/desktop-chrome-viewport.js` (346 lines)

Pattern mirrors `tests/ios-safari-viewport.js` — standalone WebDriverIO
`remote()` API, JSON to stdout, status logs to stderr, exit code = failure
count. `DEVICE_ID` env (D1 or D3) selects viewport via
`browser.setWindowSize(w, h)`.

**12 assertions:**

| ID | Class | What it pins |
|---|---|---|
| #1 | Universal | No JS errors (chromedriver `getLogs('browser')` SEVERE + `window._fieldErrors`) |
| #2 | Universal | At least one `.game-card` rendered |
| #3 | Universal | `#sport-filters` visible + `.filter-btn` count > 0 |
| #4 | Universal | `?wpt` query suppresses the My Services modal |
| #5 | Universal | `window.SW_VERSION` matches `YYYY-MM-DD[a-z]?` |
| #17 | Desktop | `.games-list --cols` = 2 at ≥1200px |
| #18 | Desktop | `#wf-toggle` visible |
| #WF1 | A612 | ESSENTIALS → WHOLE FIELD adds `wf-mode` + shows `#ambient-panel` |
| #WF2 | A612 | Reverse: removes `wf-mode` + hides `#ambient-panel` |
| #WC1 | A612 | `wc-mode` makes `#wc-section` visible + hides `.main` |
| #JRN1 | A612 | `journalism-mode` makes `#field-journalism-section` visible + hides `.main` |
| #MEX | A612 | Opening `wc-mode` while in `journalism-mode` dismisses journalism |
| #CLS | Perf | `PerformanceObserver` layout-shift sum < 0.1 (skipped if unsupported) |

**Issues encountered:** None. Chromedriver `getLogs('browser')` is the
standard way to surface SEVERE console messages in headless Chrome —
WebKit/safaridriver does not support this, hence the divergence with the
Safari suite (Task 2).

Commit: `78308af`.

---

## Task 2 — Desktop Safari test suite ✅

**Created:** `tests/desktop-safari-viewport.js` (309 lines)

Same 12 assertions as the Chrome suite. Differences:

- `capabilities`: `{ browserName: 'safari', platformName: 'mac' }` against
  port 4444 (safaridriver default).
- Assertion #1 cannot use `getLogs('browser')` (safaridriver doesn't
  implement it) — only inspects `window._fieldErrors`. Comment in source
  flags the gap.
- No headless mode (Safari does not support headless).

Commit: `e3b8b30`.

---

## Task 3 — GitHub Actions workflows ✅

**Created:**

- `.github/workflows/desktop-chrome-audit.yml` — `runs-on: ubuntu-latest`.
  Installs `google-chrome-stable` via apt and `chromedriver` via npm,
  starts chromedriver on port 9515, runs the test for D1 + D3 in matrix
  with `fail-fast: false`. Uploads per-device JSON results + stderr logs.
  Summary job aggregates pass/fail counts.

- `.github/workflows/desktop-safari-audit.yml` — `runs-on: macos-latest`.
  `sudo safaridriver --enable`, `npm install webdriverio`, starts
  safaridriver on port 4444, runs the test for D1 + D3 in matrix. Same
  artifact + summary pattern.

**Triggers:** push to `main` with `paths-ignore` (HANDOFF.md, outbox/**,
docs/**, **/*.md) + `workflow_dispatch`. So this very commit (paths
including outbox/**) will NOT trigger the workflow — the user can run it
from the Actions tab.

Commit: `a386f1d` (Bash log shows the commit landed; hash from local log).

---

## Task 4 — WebDriverIO configs ✅

**Created:**

- `wdio.desktop-chrome.conf.js` — @wdio/cli-compatible config (port 9515,
  headless Chrome, 1366×768 default window).
- `wdio.desktop-safari.conf.js` — @wdio/cli-compatible config (port 4444,
  Safari/macOS).

The audit runtime path (`tests/desktop-*-viewport.js`) uses the
`webdriverio` standalone `remote()` API directly — the configs are not
required for the workflows. They exist for parity with mobile audit
conventions and so a developer can run
`npx wdio run wdio.desktop-chrome.conf.js` against a local
chromedriver/safaridriver if they prefer the `@wdio/cli` runner.

Commit: `c4cf12d` (hash from local log).

---

## Task 5 — Fix `#sport-filters` selector ✅

**Diagnosed:** The actual filter-container ID in `index.html` is
`#sport-filters` (`<div id="sport-filters">` at line 4181). The three
existing audit suites all queried `.filter-bar` — a class that does NOT
exist on that element. Effect: assertion #3 returned `bar = null`
everywhere; #7 (filter button tap height) computed against a missing
element so the `box.height` measurement was meaningless. Per the
project's known-issues note, this had been on the carry-forward list
since the cross-engine suites shipped.

The `.filter-btn` class IS correct — only the parent container selector
was wrong. Updates limited to the parent selector.

**Patched:**

| File | Lines touched |
|---|---|
| `tests/ios-safari-viewport.js` | #3 (line 49) + #7 (line 102) |
| `tests/android-chrome-viewport.js` | #3 (line 42) + #7 (line 96) |
| `tests/viewport-all.spec.js` | #3 (line 86, 88) + #7 (line 123) |

Verified via `grep -nE 'filter-bar' tests/*.js`: only comments remain
(deliberately keeping the historical context). No remaining live
selectors reference `.filter-bar`.

Commit: `544d558`.

---

## Files created / modified

**Created (6):**
- `tests/desktop-chrome-viewport.js`
- `tests/desktop-safari-viewport.js`
- `.github/workflows/desktop-chrome-audit.yml`
- `.github/workflows/desktop-safari-audit.yml`
- `wdio.desktop-chrome.conf.js`
- `wdio.desktop-safari.conf.js`

**Modified (3):**
- `tests/ios-safari-viewport.js`
- `tests/android-chrome-viewport.js`
- `tests/viewport-all.spec.js`

**Findings:** this file.

---

## How to trigger each workflow

### Desktop Chrome

```
gh workflow run desktop-chrome-audit.yml
```

Or via the Actions tab → "Desktop Chrome Viewport Audit" → Run workflow.
Will also run automatically on the next push to `main` that touches any
non-ignored path (i.e. `index.html`, `sw.js`, `tests/**`,
`.github/workflows/**`, but NOT `HANDOFF.md` / `outbox/**` / `docs/**` /
`**/*.md`).

Outputs per device (D1, D3):
- `outbox/desktop-chrome-{D1,D3}-results.json` (JSON results)
- `outbox/desktop-chrome-{D1,D3}-stderr.log` (status logs)

### Desktop Safari

```
gh workflow run desktop-safari-audit.yml
```

Same trigger profile. Outputs per device:
- `outbox/desktop-safari-{D1,D3}-results.json`
- `outbox/desktop-safari-{D1,D3}-stderr.log`

### Local invocation

```bash
# Local Chrome (requires chromedriver on :9515)
DEVICE_ID=D1 node tests/desktop-chrome-viewport.js

# Local Safari (macOS only — sudo safaridriver --enable first)
DEVICE_ID=D3 node tests/desktop-safari-viewport.js
```

---

## Smoke + git summary

| Step | Smoke | Commit |
|---|---|---|
| Pre-work | 656 / 0 | (HEAD f72fe68→eb9fa8e desktop-layout) |
| Task 1 commit | 656 / 0 | `78308af` test(desktop-chrome) |
| Task 2 commit | 656 / 0 | `e3b8b30` test(desktop-safari) |
| Task 3 commit | 656 / 0 | (Chrome+Safari workflows) |
| Task 4 commit | 656 / 0 | (WDIO configs) |
| Task 5 commit | 656 / 0 | `544d558` test(viewport): #sport-filters |

No index.html changes anywhere. SW_VERSION unchanged
(stays at 2026-06-15c). Pre-commit hook bypassed per spec note (`--no-verify`).

---

## ADR-002 status

CLEAN. The new test suites are observational — they assert structural
invariants on the live deployed page. No data is invented; no
classification or interest-level scoring; the suites read computed
styles, body classes, and DOM properties only.
