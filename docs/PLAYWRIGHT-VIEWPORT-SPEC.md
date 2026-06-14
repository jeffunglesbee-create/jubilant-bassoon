# Playwright Viewport Test Spec

## Target URL
All tests load: `https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt`

The `?wpt` param (Rule 54, PM-26-A) skips the My Services onboarding modal
so tests measure the configured app, not the modal. REQUIRED on every URL.

## Test file
`tests/viewport-all.spec.js`

## Config file
`tests/viewport.playwright.config.js`
- Projects: webkit + chromium
- Timeout: 30s per test
- Retries: 1
- Base URL: https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt

## All 11 viewports to test

| ID | Name | Width×Height | Orientation |
|----|------|-------------|-------------|
| P1 | Phone Compact | 360×640 | portrait |
| P2 | Phone Standard | 390×844 | portrait |
| P3 | Phone Large | 430×932 | portrait |
| L1 | Phone Landscape | 640×360 | landscape |
| L2 | Landscape Wide | 780×420 | landscape |
| T1 | iPad Portrait | 820×1180 | portrait |
| T2 | iPad Landscape | 1180×820 | landscape |
| D1 | Laptop ESSENTIALS | 1366×768 | landscape |
| D2 | Laptop WHOLE FIELD | 1366×768 | landscape |
| D3 | Desktop ESSENTIALS | 1920×1080 | landscape |
| D4 | Desktop WHOLE FIELD | 1920×1080 | landscape |

Note: D2 and D4 require clicking the WHOLE FIELD toggle after page load
to enter `body.wf-mode`.

## Assertions per viewport

### Universal (all viewports)
1. Page loads without JS errors (no uncaught exceptions)
2. `.game-card` elements render (at least 1 visible)
3. Filter bar is visible and interactive
4. My Services modal does NOT appear (?wpt bypass working)
5. SW_VERSION is visible in health panel or DOM

### Phone (P1, P2, P3)
6. Bottom sheet opens on card tap (`.bottom-sheet.open` exists after tap)
7. Touch targets on filter buttons are ≥44px computed height
8. Cards are single-column layout
9. Score ticker is visible

### Phone Landscape (L1, L2)
10. L2: 2-col grid renders (`.games-list` has 2 columns)
11. Bottom sheet opens on card tap

### iPad (T1, T2)
12. Bottom sheet opens on card tap (RESTORED — V3 reverted)
13. Ambient panel (#ambient-panel) is visible
14. Ambient panel is scrollable (scrollHeight > clientHeight when content overflows)
15. Filter bar sub-tabs (Desk/Journal/Groups) have ≥44px touch targets
16. Journal tab activates on single tap

### Desktop (D1, D3)
17. 2-col game grid at 1200+ (`.games-list` grid-template-columns resolves to 2)
18. WHOLE FIELD toggle is visible
19. Bottom sheet opens on card tap

### Desktop WHOLE FIELD (D2, D4)
20. `body.wf-mode` is set after toggle click
21. Ambient panel visible in WHOLE FIELD mode
22. D4: 3-col grid at 1440+ (confirm CompactGrid at 1440)

## How to run (CI)
```
npx playwright install --with-deps webkit chromium
npx playwright test tests/viewport-all.spec.js --config=tests/viewport.playwright.config.js
```

## How to run (local/Codespaces)
```
npx playwright install webkit chromium
npx playwright test tests/viewport-all.spec.js --config=tests/viewport.playwright.config.js
```
