# CC-CMD — AVV Live Run: MLB Adapter Proof Against Production

**Date:** 2026-06-29
**Scope:** Run AVV-PW-001–005 against live deployed app. Report actual results.
**Target time:** 30 min
**Rule 87:** Probe block → done condition → outbox manifest.

---

## RETRO RULES (apply before anything else)

- ❌ NO localhost. Live URL only: `https://jubilant-bassoon.jeffunglesbee.workers.dev`
- ❌ NO branch switching. Work on main only.
- ✅ Run `npx eslint index.html` BEFORE writing any code (baseline only — do not fix pre-existing violations)
- ✅ Declare any push failure after 2 attempts and move on
- ✅ If pageerror fires, check server request logs FIRST

---

## PROBE BLOCK

```bash
# Confirm HEAD
git log -1 --oneline

# Confirm test files exist
ls tests/adapter-visible-value.spec.js tests/adapter-proof.playwright.config.js

# Confirm live URL is reachable and proof mode responds
curl -s "https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt=1&proofAdapter=mlb-stats-api&fixture=ok" \
  | grep -o '_proofMode\|__FIELD_PROOF__\|mlb-stats-api' | head -5

# Confirm baseURL in playwright config points to live URL (NOT localhost)
grep -n "baseURL\|localhost\|FIELD_TEST_URL" tests/adapter-proof.playwright.config.js

# Confirm Playwright + chromium installed
npx playwright --version
npx playwright install --dry-run chromium 2>&1 | head -3
```

**Expected:**
- HEAD matches `0079fff8` or later
- Both test files exist
- Live URL returns HTML containing `_proofMode`
- Config baseURL = `https://jubilant-bassoon.jeffunglesbee.workers.dev` (no localhost)
- Playwright installed

**If config has localhost in baseURL: fix it to the live URL before running tests.**

---

## DONE CONDITION

```
npx playwright test tests/adapter-visible-value.spec.js \
  --config=tests/adapter-proof.playwright.config.js \
  --reporter=list 2>&1
```

Must produce:
```
✓ AVV-PW-001 — ok fixture: score line renders on MLB game card
✓ AVV-PW-002 — ok fixture: broadcast chips visible on MLB cards  
✓ AVV-PW-003 — ok fixture: window.__FIELD_PROOF__ populated
✓ AVV-PW-004 — empty fixture: renders without crash
✓ AVV-PW-005 — malformed fixture: no window._fieldErrors
5 passed
```

---

## STEP 1: Patch tests to capture and report actual values

In `tests/adapter-visible-value.spec.js`, add `console.log` reporting inside each test so results are visible in the terminal output. These are additions only — do not change assertion logic.

**In AVV-PW-001**, after the `await expect(proofCard.first()...)` assertion:
```javascript
// Report actual values
const cardText = await page.locator('.game-card').first().textContent();
console.log('[AVV-PW-001] First card text:', cardText?.trim().slice(0, 120));
console.log('[AVV-PW-001] __FIELD_PROOF__:', JSON.stringify(proof, null, 2));
```

**In AVV-PW-002**, after chip count assertion:
```javascript
const chipTexts = await chips.allTextContents();
console.log('[AVV-PW-002] Broadcast chips found:', chipTexts);
```

**In AVV-PW-003**, after the loop:
```javascript
console.log('[AVV-PW-003] normalizedObjects:', JSON.stringify(proof.normalizedObjects, null, 2));
```

**In AVV-PW-004**:
```javascript
console.log('[AVV-PW-004] proof.normalizedObjects.length:', proof?.normalizedObjects?.length);
```

**In AVV-PW-005**:
```javascript
console.log('[AVV-PW-005] title:', title, '| crashes:', crashes.length);
```

---

## STEP 2: Run live

```bash
npx playwright test tests/adapter-visible-value.spec.js \
  --config=tests/adapter-proof.playwright.config.js \
  --reporter=list 2>&1 | tee /tmp/avv-live-results.txt

cat /tmp/avv-live-results.txt
```

---

## STEP 3: Report findings verbatim

After the run, output the complete contents of `/tmp/avv-live-results.txt` — every line, including:
- Pass/fail per test
- All `console.log` output (card text, chip names, normalizedObjects JSON)
- Any error messages
- Screenshot file paths if captured

If any test fails, report the full failure message before attempting any fix.

---

## STEP 4: Commit reporting additions + trigger CI workflow

```bash
git add tests/adapter-visible-value.spec.js
git commit -m "test(avv): add result reporting to AVV-PW-001-005 [skip ci]"
git push origin main
```

Then trigger the CI workflow:
```bash
curl -X POST \
  "https://api.github.com/repos/jeffunglesbee-create/jubilant-bassoon/actions/workflows/adapter-visible-value.yml/dispatches" \
  -H "Authorization: token FIELD_PAT_FROM_MEMORY" \
  -H "Content-Type: application/json" \
  -d '{"ref":"main"}'
```

---

## OUTBOX MANIFEST

| Item | Status | Owner |
|------|--------|-------|
| Probe live URL reachable | ⏳ | CC Step 0 |
| Patch tests with console.log reporting | ⏳ | CC Step 1 |
| Run against live URL | ⏳ | CC Step 2 |
| Report ALL output verbatim | ⏳ | CC Step 3 |
| Commit + trigger CI workflow | ⏳ | CC Step 4 |

---

## WHAT SUCCESS LOOKS LIKE

The terminal output must contain actual MLB game data, e.g.:
```
[AVV-PW-001] First card text: NYY 3 · BAL 2 · Top 5 · 1 out
[AVV-PW-002] Broadcast chips found: [ 'ESPN' ]
[AVV-PW-003] normalizedObjects: [{ "home": "NYY", "away": "BAL", "homeScore": 3, ... }]
```

If it shows empty strings, null, or fixture data not matching the ok fixture, that is a failure — report it, do not paper over it.

---

**Session: 2026-06-29 · AVV Live Run · Target 30 min**
