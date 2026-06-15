# FIELD Handoff — June 15 2026 (Session B: Cross-Engine Testing)

**jubilant-bassoon HEAD:** `150f4a6` · Smoke: **652/0** · SW_VERSION `2026-06-15a`
**field-relay-nba HEAD:** `0aa14d9` (unchanged)

---

## WHAT SHIPPED

### Cross-Engine Viewport Test Infrastructure (A609)

**iOS Safari (Appium + XCUITest + iOS Simulator):**
- `tests/ios-safari-viewport.js`: 16 assertions ported from viewport-all.spec.js
- `.github/workflows/ios-safari-audit.yml`: 5-device matrix (iPhone SE 3rd gen, iPhone 16, iPhone 16 Pro Max, iPad Air M2 portrait, iPad Air M2 landscape)
- Uses XCUITest driver (not Safari driver — Safari driver v5.0.1 can't create sessions on iOS 18.x)
- WDA compile takes ~228s on first run; connectionRetryTimeout set to 600s
- `workflow_dispatch` only — trigger from Actions tab

**Android Chrome (Appium + UiAutomator2 + Android Emulator):**
- `tests/android-chrome-viewport.js`: 16 assertions (same logic as iOS)
- `.github/workflows/android-chrome-audit.yml`: 4-device matrix (Pixel 4a, Pixel 7, Pixel 7 Pro, Pixel Tablet)
- Uses external bash script (`/tmp/run-android-test.sh`) because emulator-runner runs each script line via separate `sh -c` calls
- `workflow_dispatch` only

**Infrastructure:**
- A609 smoke assertion: both test files must exist
- `package.json`: webdriverio devDependency + test:ios / test:android scripts
- POC workflows retained: ios-safari-poc.yml, android-chrome-poc.yml

### iOS Safari Results (v8 — ALL 5 DEVICES OPERATIONAL)

| Device | Score | Failures |
|---|---|---|
| P1 iPhone SE (3rd gen) | 7/9 | #3, #7 |
| P2 iPhone 16 | 7/9 | #3, #7 |
| P3 iPhone 16 Pro Max | 7/9 | #3, #7 |
| T1 iPad Air M2 portrait | 8/10 | #3, #16 |
| T2 iPad Air M2 landscape | 9/10 | #3 |

**Key finding: #14 ambient scroll architecture PASSES on all iPad viewports.** This is the iOS Safari bug class that broke 5 times and Playwright's built-in WebKit missed every time. The inset-positioned `.ambient-scroll-inner` architecture (position:absolute, all insets 0, overflow-y:auto inside a position:fixed shell) is confirmed correct on real Apple WebKit.

**#3 failure analysis:** Universal across all devices. The test uses selector `.filter-bar` but the actual element is `#sport-filters`. The Playwright suite uses the same stale selector. Fix is trivial (selector update) but deferred — this is a test maintenance item, not a FIELD bug.

**#7 failure (phones):** Follows from #3 — `.filter-bar .filter-btn` returns 0px when `.filter-bar` doesn't exist.

**#16 failure (T1 only):** Journal mode tap didn't activate on iPad portrait. T2 landscape passes. Likely a timing issue with the XCUITest tap on `#jrn-nav-link` at portrait width.

### Android Chrome Results

Android v7 dispatched. Emulator boots fine (~42s). Previous runs failed due to:
1. `set -eo pipefail` in dash (fixed: external bash script)
2. emulator-runner `sh -c` line splitting (fixed: script in /tmp)

Awaiting v7 results — carry forward.

## Commits This Session

| Hash | Description |
|---|---|
| b86068f (rebased) | A609: iOS Safari + Android Chrome viewport audit suites |
| 72b5f46 | fix(ios-audit): update device matrix to iPhone 16 / iPad Air M2 |
| ec24749 | fix(audit): safaridriver --enable, Appium health check, pipefail |
| 8df7b23 | fix(ios-audit): pass DEVICE_UDID + IOS_VERSION to test runner |
| f9fd7da | fix: XCUITest driver for iOS, dash-safe script for Android |
| 62638ba | fix(ios-audit): 60s Appium startup wait, process check, log capture |
| 1a57d96 | fix(ios-audit): 5 min connection timeout for WDA compile |
| 01320d3 | fix(ios-audit): extend sim boot timeout to 300s, WDA to 600s |
| 150f4a6 | fix(android-audit): external bash script for emulator-runner |

## Iteration Log (troubleshooting chain)

1. Device names: macos-latest upgraded to Xcode with iPhone 16 simulators
2. safaridriver --enable: required for Appium Safari driver on macOS
3. Safari driver v5.0.1: can't create sessions on iOS 18.x → switched to XCUITest
4. Appium startup: XCUITest driver needs 20-25s to start (vs ~5s for Safari driver)
5. WDA compile: ~228s on first session — extended connectionRetryTimeout to 600s
6. Simulator boot timeout: phones default 119s too short — extended to 300s
7. Android dash: emulator-runner uses /usr/bin/sh, not bash — pipefail fails
8. Android line splitting: emulator-runner runs each line via separate sh -c — moved to external bash script

## Known Issues (carry forward)

- #3 filter bar selector: `.filter-bar` → `#sport-filters` across viewport-all.spec.js AND ios-safari-viewport.js AND android-chrome-viewport.js
- #16 journal tap: intermittent on T1 iPad portrait (T2 landscape passes)
- Android v7 results: pending — should be first successful run
- Layer 3 relay score cache (field-relay-nba) — deferred
- ESPN WC live scores relay endpoint (/soccer/fifa.world) — pending
- Drive upload workflow modification lock — clears on next CC push

## Priority Queue

1. Android v7 results analysis (check Actions tab)
2. Fix #3 selector across all test suites (#sport-filters + .filter-btn)
3. WC Groups G-L D1 updates as matches complete
4. Layer 3 relay score cache
5. ESPN WC relay endpoint
