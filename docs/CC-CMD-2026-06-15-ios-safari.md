# Claude Code Command — iOS Simulator Safari Viewport Audit

git pull. Read CLAUDE.md. Read tests/viewport-all.spec.js (the existing Playwright suite). Read docs/PLAYWRIGHT-VIEWPORT-SPEC.md.

Write all findings to outbox/cc-ios-safari-audit-2026-06-15.md.

## CONTEXT

We're building a FREE alternative to BrowserStack ($129/mo) using GitHub Actions macOS runners + iOS Simulator + Appium. The iOS Simulator runs Apple's actual WebKit framework — same rendering engine as real iPhones — catching CSS bugs that Playwright's built-in WebKit misses (e.g., the position:fixed flex height bug that took 5 attempts to fix).

## DELIVERABLES

### 1. Test runner: `tests/ios-safari-viewport.js`

Node.js script using `webdriverio` to connect to Appium, open Safari on iOS Simulator, navigate to FIELD, and run assertions.

ARCHITECTURE:
- Appium with Safari driver connects to the booted iOS Simulator's Safari
- Each assertion from viewport-all.spec.js maps to a `browser.execute()` call
- Screenshots captured at each device viewport
- Results written to stdout as JSON for the workflow to parse

DEVICE → VIEWPORT MAPPING (iOS Simulator uses fixed device models, not arbitrary sizes):

| Playwright ID | Playwright Size | Simulator Device | Actual Size | Notes |
|---|---|---|---|---|
| P1 | 360×640 | iPhone SE (3rd generation) | 375×667 | Closest small phone |
| P2 | 390×844 | iPhone 15 Pro | 393×852 | Standard phone |
| P3 | 430×932 | iPhone 15 Pro Max | 430×932 | Large phone |
| T1 | 820×1180 | iPad Air (5th generation) | 820×1180 | iPad portrait |
| T2 | 1180×820 | iPad Air (5th generation) | 1180×820 | iPad landscape (rotate) |

Skip D1-D4 (desktop viewports don't exist on iOS). Skip L1/L2 (phone landscape — can test via rotation).

ASSERTION MAPPING — port these from viewport-all.spec.js:

For ALL devices:
- #1: No uncaught JS errors (check console)
- #2: At least one .game-card visible
- #3: Filter bar visible
- #4: My Services modal suppressed by ?wpt
- #5: SW_VERSION on window

For PHONE devices (P1/P2/P3):
- #6: Bottom sheet opens on card tap
- #7: Filter button tap height ≥44px
- #8: Single column layout
- #9: Score ticker visible

For IPAD devices (T1/T2):
- #12: Bottom sheet opens on card tap
- #13: Ambient panel visible
- #14: Ambient scroll inner div is inset-positioned and scrollable (THE KEY TEST — this is the iOS Safari bug class)
- #15: Nav link tap height ≥44px
- #16: Journal tab activates journalism-mode

Each assertion uses `browser.execute()` to run the same JavaScript logic as the Playwright `page.evaluate()` calls. The JS is identical — only the wrapper changes.

TEMPLATE for each assertion:
```javascript
async function assert_2_gameCards(browser) {
  const count = await browser.execute(() => document.querySelectorAll('.game-card').length);
  return { id: '#2', name: 'game-card visible', pass: count > 0, actual: count };
}
```

### 2. Appium config: `tests/ios-safari-appium.conf.js`

WebDriverIO configuration for Appium + Safari:
```javascript
exports.config = {
  runner: 'local',
  port: 4723,
  capabilities: [{
    platformName: 'iOS',
    'appium:automationName': 'Safari',
    'appium:browserName': 'Safari',
    'appium:deviceName': process.env.IOS_DEVICE || 'iPhone 15 Pro',
    'appium:platformVersion': process.env.IOS_VERSION || '18.1',
  }],
  baseUrl: 'https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt',
};
```

### 3. Workflow: `.github/workflows/ios-safari-audit.yml`

```yaml
name: iOS Safari Viewport Audit
on: workflow_dispatch

jobs:
  ios-safari:
    runs-on: macos-latest
    timeout-minutes: 20
    strategy:
      matrix:
        device:
          - name: "iPhone SE (3rd generation)"
            id: P1
            orientation: portrait
          - name: "iPhone 15 Pro"
            id: P2
            orientation: portrait
          - name: "iPhone 15 Pro Max"
            id: P3
            orientation: portrait
          - name: "iPad Air (5th generation)"
            id: T1
            orientation: portrait
          - name: "iPad Air (5th generation)"
            id: T2
            orientation: landscape
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Appium + Safari driver
        run: |
          npm install -g appium
          appium driver install safari
          npm install webdriverio

      - name: List available simulators
        run: xcrun simctl list devices available | grep -E "iPhone|iPad"

      - name: Boot simulator
        run: |
          DEVICE="${{ matrix.device.name }}"
          UDID=$(xcrun simctl list devices available -j | \
            node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
            for(const[v,devs] of Object.entries(d.devices)){
              for(const dev of devs){
                if(dev.name==='$DEVICE' && dev.isAvailable){
                  console.log(dev.udid); process.exit(0);
                }
              }
            }")
          echo "Booting $DEVICE ($UDID)"
          xcrun simctl boot "$UDID"
          echo "DEVICE_UDID=$UDID" >> "$GITHUB_ENV"
          sleep 15

      - name: Set orientation
        if: matrix.device.orientation == 'landscape'
        run: |
          # Rotate to landscape via simctl
          xcrun simctl spawn "$DEVICE_UDID" notifyutil -s \
            com.apple.springboard.orientation 3
          sleep 5

      - name: Start Appium
        run: |
          appium --relaxed-security &
          sleep 5

      - name: Run viewport assertions
        env:
          IOS_DEVICE: ${{ matrix.device.name }}
          DEVICE_ID: ${{ matrix.device.id }}
        run: |
          node tests/ios-safari-viewport.js | tee "outbox/ios-${{ matrix.device.id }}-results.json"

      - name: Screenshot
        run: |
          xcrun simctl io "$DEVICE_UDID" screenshot \
            "outbox/ios-${{ matrix.device.id }}-screenshot.png"

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ios-safari-${{ matrix.device.id }}
          path: outbox/ios-${{ matrix.device.id }}-*
```

### 4. package.json additions

Add to devDependencies:
```json
"webdriverio": "^9.0.0",
"@wdio/appium-service": "^9.0.0"
```

## INSTRUCTIONS

1. Create `tests/ios-safari-viewport.js` with ALL mapped assertions from viewport-all.spec.js. Each assertion must use the SAME JavaScript logic — only the Playwright→WebDriverIO wrapper changes.

2. Create `tests/ios-safari-appium.conf.js` with the WebDriverIO config.

3. Create `.github/workflows/ios-safari-audit.yml` with the matrix strategy.

4. Update `package.json` with the new devDependencies.

5. CRITICAL: Every URL must include `?wpt` (Rule 54). Without it you test the onboarding modal.

6. DO NOT trigger the workflow yet (it's workflow_dispatch only). Just create the files.

7. Add smoke assertion A609: "iOS Safari viewport test infrastructure present" — verify ios-safari-viewport.js exists and contains the key assertions (#14 ambient scroll being the most important).

8. Run smoke. Push all files + outbox output.

## KNOWN LIMITATIONS (document in output file)

- iOS Simulator != real hardware (no real touch, no memory pressure)
- Device names depend on Xcode version installed on macos-latest runner
- Landscape rotation via simctl is unreliable — may need alternative approach
- Appium Safari driver capabilities may differ between Appium versions
- First run may need iteration — device names, iOS versions, capability names

## WHY THIS MATTERS

The ambient scroll bug (5 failed CSS fixes before the inset-positioned solution) would have been caught by this pipeline. Playwright WebKit passed all 5 broken fixes. The iOS Simulator running Apple's actual WebKit would have failed them, matching real iPad behavior. This pipeline closes that gap at $0/mo instead of $129/mo.
