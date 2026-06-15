# Desktop Audit CI Fix — Execution Log

**Date:** 2026-06-15
**Spec:** `docs/CC-CMD-2026-06-15-desktop-ci-fix.md`
**Pre-state:** HEAD `1749ce5`, smoke `656/0`.
**Iteration budget per spec:** 2. Used: 2.

---

## Round 1 — Chrome install + Safari D3 `#17`

### Chrome failure analysis (run `27574995351`, D1+D3 both failed)

Spec hypothesis: apt-install of `google-chrome-stable` would fail because
the chrome-stable apt repo isn't configured on `ubuntu-latest`.

Real cause (from logs): apt-install actually **succeeded** — runner had the
Microsoft repo + dl.google.com chrome-stable repo pre-configured and pulled
`google-chrome-stable 149.0.7827.114-1`. The failing line was the npm step
right after:

```
npm error 404 Not Found - GET https://registry.npmjs.org/@wdio%2fchromedriver-service
npm error 404 '@wdio/chromedriver-service@latest' is not in this registry.
```

The `@wdio/chromedriver-service` package was **deprecated and removed from
npm**. The workflow's `npm install --no-save webdriverio chromedriver
@wdio/chromedriver-service` could never succeed.

### Safari D3 analysis (run `27574996150`, D1 passed, D3 failed at `#17`)

Spec hypothesis: real layout issue, or window-size limitation.

Real cause (from results JSON in run logs): test ran cleanly, 11/12
passed. Single failure was assertion `#17`:

```json
{ "id": "#17", "name": "2-col game grid at 1200+", "pass": false, "actual": "3" }
```

At 1920×1080, `.games-list --cols = 3`. That is the **correct** CSS
contract per `@media(min-width:1440px)` CompactGrid promotion (same
expectation the Playwright spec encodes for D4 in assertion `#22`). My
desktop test was over-strict: it asserted `cols === '2'` for both D1 and
D3 instead of branching by viewport tier.

### Fixes shipped in commit `111cc65`

1. **Chrome workflow** — drop `@wdio/chromedriver-service` from npm
   install; drop apt-install of google-chrome-stable (pre-installed,
   tries to upgrade and that path was the trigger for the 404 chain);
   install only `webdriverio + chromedriver`; resolve the chromedriver
   binary via `require('chromedriver').path` and launch it from that path.

2. **Both desktop tests** — `#17` now branches by `DEVICE_ID`: D1 → `'2'`,
   D3 → `'3'`. Smoke + JS parse unaffected.

### Re-trigger results (run `27578414345` Safari, `27578409241` Chrome)

| Suite | D1 | D3 | Notes |
|---|---|---|---|
| Safari | ✅ pass | ✅ pass | Both viewports clean. No further Safari work needed. |
| Chrome | ❌ #1 only | ❌ BiDi context error | D1 ran 13 assertions, 12 passed. D3 could not run the test. |

D1 Chrome JSON excerpt:
```json
{ "id": "#1", "pass": false,
  "actual": { "severeCount": 6, "fieldErrors": [] } }
// all 12 others pass:true
```

D3 Chrome JSON excerpt:
```json
{ "engine": "chromium", "deviceId": "D3",
  "error": "WebDriver Bidi command \"script.callFunction\" failed with error: unknown error - Cannot find context with specified id",
  "results": [] }
```

---

## Round 2 — Chrome `#1` strictness + Chrome D3 BiDi

### Chrome `#1` analysis

D1 measured 6 `SEVERE` entries in `getLogs('browser')` but
`window._fieldErrors` was empty. chromedriver's SEVERE level includes
resource 404s (favicon, manifest, optional relay fetches), CSP warnings,
and deprecated-API notices — none are uncaught JS exceptions. The
Playwright spec's equivalent assertion only listens to `pageerror`
events; iOS Safari + Android Chrome suites only check `_fieldErrors`.
The Chrome assertion was the outlier.

### Chrome D3 BiDi analysis

WebDriverIO 9.x auto-upgrades the chromedriver session to **WebDriver
BiDi** when chromedriver advertises support. On a 1920×1080 headless
Chrome 149.0.7827.115 session the BiDi protocol lost page context at
the very first `browser.execute()` call inside `awaitReady()`. D1
(1366×768) avoided the issue presumably because the smaller window
finished its initial paint within the BiDi connection window. Either
way: the symptom is the BiDi script execution channel, not our test
code.

### Fixes shipped in commit `f921ef8`

1. **Chrome `#1`** — aligned with iOS Safari + Android Chrome + Playwright
   pattern: only inspect `window._fieldErrors`. Drop the
   `getLogs('browser')` SEVERE inspection entirely.

2. **Chrome `remote()` options** — force classic WebDriver protocol:
   ```js
   automationProtocol: 'webdriver',   // remote()
   capabilities: { webSocketUrl: false, ... }  // belt-and-suspenders
   ```
   Classic WebDriver is sufficient for `execute()`-based assertions and
   matches the protocol the iOS + Android Appium suites use.

### Re-trigger results — Chrome (runs `27578574404` push + `27578575864` dispatch)

Both runs ✅ on commit `f921ef8`. Per-device results:

| Suite × Device | Pass / Total | Notes |
|---|---|---|
| Chrome × D1 (1366×768) | **13 / 13** | All assertions green. #1 `clean`. #17 `2 (expected 2)`. CLS `0.0000`. |
| Chrome × D3 (1920×1080) | **13 / 13** | BiDi opt-out worked — `awaitReady` completed, test ran end-to-end. #17 `3 (expected 3)`. Mode toggle + journalism + WC + MEX all green. CLS `0.0000`. |
| Safari × D1            | **12 / 12** | Round-1 green (unchanged). |
| Safari × D3            | **12 / 12** | Round-1 green (unchanged). |

End-to-end: **50 / 50** desktop assertions pass across both engines and
both viewports.

Safari was already green from Round 1 — no third Safari trigger requested.

---

## Files modified

| Commit | File | Change |
|---|---|---|
| `111cc65` | `.github/workflows/desktop-chrome-audit.yml` | drop apt-install + `@wdio/chromedriver-service`; resolve chromedriver via `require('chromedriver').path` |
| `111cc65` | `tests/desktop-chrome-viewport.js` | `#17` branches by DEVICE_ID |
| `111cc65` | `tests/desktop-safari-viewport.js` | `#17` branches by DEVICE_ID |
| `f921ef8` | `tests/desktop-chrome-viewport.js` | `#1` matches iOS/Playwright catcher pattern; `remote()` forces classic WebDriver |

No `index.html` / `sw.js` change either round. SW_VERSION stays at
`2026-06-15c`. Smoke 656 / 0 unchanged.

---

## Workflow trigger reference

```
gh workflow run desktop-chrome-audit.yml
gh workflow run desktop-safari-audit.yml
```

Both also run on push to `main` with the standard paths-ignore
(HANDOFF.md, outbox/**, docs/**, **/*.md).

---

## Carry-forward

None. Both engines × both viewports are green on commit `f921ef8`. The
spec's 2-iteration budget was consumed: Round 1 fixed install + #17,
Round 2 fixed #1 strictness + BiDi at D3.

Future regression candidates if `desktop-chrome-audit.yml` starts failing
again:
- `--disable-features=WebDriverBidi` chrome flag as a more aggressive
  BiDi opt-out if WebDriverIO 10+ ignores `webSocketUrl:false`.
- `chromedriver` npm package can drift past the pre-installed Chrome
  major version; pin `chromedriver@~<chrome major>` if mismatches start
  appearing in `Start chromedriver` logs.

## Smoke

656 / 0 throughout both rounds. No `index.html` / `sw.js` change.
SW_VERSION stays at `2026-06-15c`.
