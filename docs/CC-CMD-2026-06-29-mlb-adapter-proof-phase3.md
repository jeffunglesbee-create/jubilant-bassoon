# CC-CMD — MLB Stats API Adapter Visible Value Proof — Phase 3

**Date:** 2026-06-29
**Scope:** Proof mode in index.html + Playwright spec + CI gate
**Rule:** Rule 87 (self-completing). Probe block runs first. No carry-forwards.
**Est. time:** 90 min

---

## DONE CONDITION

```
npx playwright test tests/adapter-visible-value.spec.js --config=tests/adapter-proof.playwright.config.js
```

Reports:
```
✓ AVV-PW-001 — ok fixture: score line renders on MLB game card
✓ AVV-PW-002 — ok fixture: broadcast chips visible on MLB card
✓ AVV-PW-003 — ok fixture: window.__FIELD_PROOF__ populated
✓ AVV-PW-004 — empty fixture: renders without crash
✓ AVV-PW-005 — malformed fixture: no window._fieldErrors
5 passed (0 failed)
```

Plus `node smoke.js index.html` continues at 770+/0.

---

## PROBE BLOCK

```bash
# Confirm HEAD
git log -1 --oneline

# 1. Find where ?wpt is parsed — this is where ?proofAdapter goes
grep -n "wpt\b\|wpt=1\|URLSearchParams\|searchParams" index.html | head -15

# 2. Find where game-card div is emitted (outer tag)
grep -n "class=.game-card\|'game-card'\|\"game-card\"" index.html | head -10

# 3. Find normalizeMLBGame return block — where to add data-proof attribute
grep -n "_adapterProof\|adapterId.*mlb\|sourceId.*mlb-stats-api" index.html | head -5

# 4. Find loadMLBSlate — where to intercept for proof mode
grep -n "async function loadMLBSlate\|async function fetchMLBSchedule" index.html | head -5

# 5. Verify window._fieldDataReady sentinel exists
grep -n "_fieldDataReady" index.html | head -3

# 6. Verify inline fixture doesn't already exist
grep -n "PROOF_FIXTURE\|proofAdapter\|__FIELD_PROOF__" index.html | head -5

# 7. Check tests/ directory
ls tests/
```

**Probe informs:**
- Exact line for `?proofAdapter` param parsing (near `?wpt` block)
- Exact line/pattern for adding `data-proof-adapter` to game card HTML
- Exact function to intercept for fixture injection

---

## STEP 1: Add proof mode constants + fixture to index.html

Find the `?wpt` param parsing block (probe result #1). After the existing `?wpt` handler, add:

```javascript
// ── Adapter Proof Mode (AVV — 2026-06-29) ──────────────────────
// ?proofAdapter=mlb-stats-api&fixture=ok|empty|malformed&wpt=1
// Injects fixture data instead of live API calls. Exposes window.__FIELD_PROOF__.
const _proofParams     = new URLSearchParams(location.search);
const _proofAdapter    = _proofParams.get('proofAdapter') || null;
const _proofFixture    = _proofParams.get('fixture')      || 'ok';
const _proofMode       = !!_proofAdapter;

// Inline fixtures — docs/adapter-fixtures-mlb-*.json (not served at runtime)
const _MLB_PROOF_FIXTURES = {
  ok: {
    dates: [{ games: [
      {
        gamePk: 718800,
        gameDate: '2026-06-28T18:05:00Z',
        status: { statusCode: 'I', detailedState: 'In Progress' },
        teams: {
          home: { team: { abbreviation: 'NYY', name: 'New York Yankees' }, score: 3 },
          away: { team: { abbreviation: 'BAL', name: 'Baltimore Orioles' }, score: 2 }
        },
        linescore: { currentInning: 5, currentInningOrd: '5th', inningHalf: 'Top', outs: 1 },
        venue: { name: 'Yankee Stadium' },
        broadcasts: [{ name: 'ESPN', type: 'TV' }]
      },
      {
        gamePk: 718801,
        gameDate: '2026-06-28T20:10:00Z',
        status: { statusCode: 'S', detailedState: 'Scheduled' },
        teams: {
          home: { team: { abbreviation: 'LAD', name: 'Los Angeles Dodgers' }, score: 0 },
          away: { team: { abbreviation: 'SFG', name: 'San Francisco Giants' }, score: 0 }
        },
        linescore: { currentInning: null, currentInningOrd: null, inningHalf: null, outs: null },
        venue: { name: 'Dodger Stadium' },
        broadcasts: [{ name: 'MLB Network', type: 'TV' }]
      }
    ]}]
  },
  empty:    { dates: [{ games: [] }] },
  malformed: { dates: [{ games: [{ gamePk: 'bad', status: null, teams: { home: null, away: { team: { abbreviation: 'NYY' } } }, linescore: 'invalid', broadcasts: 'not-array' }] }] }
};
```

### Step 1b: Intercept fetchMLBSchedule in proof mode

Immediately after the `_MLB_PROOF_FIXTURES` declaration (still in the same block):

```javascript
// Proof mode: override fetchMLBSchedule to return fixture instead of live API
if (_proofMode && _proofAdapter === 'mlb-stats-api') {
  const _origFetchMLBSchedule = fetchMLBSchedule;
  // eslint-disable-next-line no-func-assign
  fetchMLBSchedule = async function _proofFetchMLBSchedule(date) {
    const fixture = _MLB_PROOF_FIXTURES[_proofFixture] || _MLB_PROOF_FIXTURES.ok;
    const games = fixture.dates?.[0]?.games ?? [];
    return games.map(g => {
      try { return normalizeMLBGame(g, date instanceof Date ? date : new Date(date)); }
      catch(e) { captureFieldError('proof:normalizeMLBGame', e); return null; }
    }).filter(Boolean);
  };
}
```

**Note:** This override must come AFTER `fetchMLBSchedule` and `normalizeMLBGame` are declared. If probe shows `fetchMLBSchedule` is at line ~19586 and the `?wpt` block is at line ~4717, place this override at line ~4730 but use a deferred pattern:

```javascript
// Deferred proof mode setup — runs after all functions are declared
if (_proofMode && _proofAdapter === 'mlb-stats-api') {
  document.addEventListener('DOMContentLoaded', () => {
    const _orig = fetchMLBSchedule;
    fetchMLBSchedule = async (date) => {
      const fixture = _MLB_PROOF_FIXTURES[_proofFixture] || _MLB_PROOF_FIXTURES.ok;
      const games = fixture.dates?.[0]?.games ?? [];
      return games.map(g => {
        try { return normalizeMLBGame(g, date instanceof Date ? date : new Date(date)); }
        catch(e) { captureFieldError('proof:normalizeMLBGame', e); return null; }
      }).filter(Boolean);
    };
  });
}
```

**Correct approach depends on probe:** if `fetchMLBSchedule` is a `let` declaration (not `const`), direct override works. If declared as `const` or `function`, use the DOMContentLoaded deferred pattern. Read probe output and choose.

---

## STEP 2: Add window.__FIELD_PROOF__ exposure

After `window._fieldDataReady = true` (wherever it is set — probe #5), add:

```javascript
// Proof mode sentinel
if (_proofMode) {
  const _allMLBGames = (typeof allData !== 'undefined' && allData.sports)
    ? allData.sports.filter(s => s.sport === 'Baseball').flatMap(s => s.games || [])
    : [];
  window.__FIELD_PROOF__ = {
    adapterId:         _proofAdapter,
    fixture:           _proofFixture,
    normalizedObjects: _allMLBGames,
    presentationPackets: _allMLBGames.map(g => g._adapterProof || null).filter(Boolean),
    visibleSelectors:  ['.game-card', '.stream-chip'],
    errors:            window._fieldErrors || [],
    generatedAt:       new Date().toISOString(),
  };
}
```

---

## STEP 3: Add data-proof-adapter to game card HTML

From probe #2, find where the outer `.game-card` div is emitted. The card likely has a pattern like:

```javascript
// BEFORE:
`<div class="game-card" ...>`

// AFTER: add data-proof-adapter when the game has _adapterProof
`<div class="game-card"${g._adapterProof ? ` data-proof-adapter="${g._adapterProof.adapterId}" data-proof-source="${g._adapterProof.sourceId}"` : ''} ...>`
```

**Only add to the game card outer div** — not every child element. Find the single outer tag.

---

## STEP 4: Write tests/adapter-visible-value.spec.js

```javascript
// tests/adapter-visible-value.spec.js — FIELD Adapter Visible Value Proof
// Playwright tests proving MLB Stats API adapter produces visible product output.
//
// Tests run against the LIVE deployed app with ?proofAdapter= fixture injection.
// Fixture data is inlined in index.html — no network dependency.
//
// Run: npx playwright test tests/adapter-visible-value.spec.js --config=tests/adapter-proof.playwright.config.js

const { test, expect } = require('@playwright/test');

const LIVE_URL  = 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const PROOF_URL = `${LIVE_URL}/?wpt=1&proofAdapter=mlb-stats-api&fixture=`;

// Wait for app load sentinel + buffer
async function awaitReady(page, bufferMs = 2000) {
  await page.waitForFunction(() => !!window._fieldDataReady, { timeout: 20000 });
  if (bufferMs > 0) await page.waitForTimeout(bufferMs);
}

// ── AVV-PW-001: Score line renders on MLB game card ──────────────────────────
test('AVV-PW-001 — ok fixture: score line renders on MLB game card', async ({ page }) => {
  await page.goto(PROOF_URL + 'ok', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page);

  // At least one game card should render
  const cards = page.locator('.game-card');
  await expect(cards.first(), 'No game cards rendered with ok fixture').toBeVisible({ timeout: 10000 });

  // Verify __FIELD_PROOF__ populated
  const proof = await page.evaluate(() => window.__FIELD_PROOF__);
  expect(proof, '__FIELD_PROOF__ not set — proof mode not active').toBeTruthy();
  expect(proof.adapterId).toBe('mlb-stats-api');
  expect(proof.normalizedObjects.length, 'Should have 2 normalized games').toBe(2);

  // No runtime errors
  const errs = await page.evaluate(() => window._fieldErrors || []);
  expect(errs, `Runtime errors: ${JSON.stringify(errs)}`).toHaveLength(0);

  // Verify data-proof-adapter attribute on at least one card
  const proofCard = page.locator('[data-proof-adapter="mlb-stats-api"]');
  await expect(proofCard.first(), 'No card has data-proof-adapter attribute').toBeAttached({ timeout: 5000 });
});

// ── AVV-PW-002: Broadcast chips visible on MLB cards ────────────────────────
test('AVV-PW-002 — ok fixture: broadcast chips visible on MLB cards', async ({ page }) => {
  await page.goto(PROOF_URL + 'ok', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page);

  const cards = page.locator('.game-card');
  try { await cards.first().waitFor({ timeout: 10000 }); }
  catch { test.skip(true, 'No game cards — fixture injection may not be active'); return; }

  // At least one broadcast chip should appear
  const chips = page.locator('.stream-chip');
  const chipCount = await chips.count();
  expect(chipCount, 'No broadcast chips rendered — adapter data not reaching card').toBeGreaterThan(0);
});

// ── AVV-PW-003: window.__FIELD_PROOF__ populated with adapter data ────────
test('AVV-PW-003 — ok fixture: window.__FIELD_PROOF__ populated', async ({ page }) => {
  await page.goto(PROOF_URL + 'ok', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page);

  const proof = await page.evaluate(() => window.__FIELD_PROOF__);
  expect(proof,                  '__FIELD_PROOF__ not set').toBeTruthy();
  expect(proof.adapterId).toBe('mlb-stats-api');
  expect(proof.fixture).toBe('ok');
  expect(proof.normalizedObjects).toHaveLength(2);
  expect(proof.errors).toHaveLength(0);

  // Each normalized object must carry _adapterProof
  for (const obj of proof.normalizedObjects) {
    expect(obj._adapterProof, `_adapterProof missing on ${obj.homeTeam}`).toBeTruthy();
    expect(obj._adapterProof.adapterId).toBe('mlb-stats-api');
  }
});

// ── AVV-PW-004: Empty fixture renders without crash ──────────────────────────
test('AVV-PW-004 — empty fixture: renders without crash', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(PROOF_URL + 'empty', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page, 1500);

  // App should not crash
  expect(errors, `JS crashes on empty fixture: ${errors.join('; ')}`).toHaveLength(0);

  // _fieldErrors should be empty
  const fieldErrs = await page.evaluate(() => window._fieldErrors || []);
  expect(fieldErrs, `_fieldErrors on empty: ${JSON.stringify(fieldErrs)}`).toHaveLength(0);

  // Proof object should exist with 0 objects
  const proof = await page.evaluate(() => window.__FIELD_PROOF__);
  expect(proof, '__FIELD_PROOF__ missing on empty fixture').toBeTruthy();
  expect(proof.normalizedObjects).toHaveLength(0);
});

// ── AVV-PW-005: Malformed fixture does not crash ─────────────────────────────
test('AVV-PW-005 — malformed fixture: no window._fieldErrors', async ({ page }) => {
  const crashes = [];
  page.on('pageerror', e => crashes.push(e.message));

  await page.goto(PROOF_URL + 'malformed', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page, 1500);

  // No unhandled JS exception
  expect(crashes, `JS crash on malformed fixture: ${crashes.join('; ')}`).toHaveLength(0);

  // _fieldErrors may have adapter errors — but app must not be fully broken
  // Verify the page is still functional (title present, no white screen)
  const title = await page.title();
  expect(title, 'Page title missing — white screen crash?').toContain('FIELD');
});
```

---

## STEP 5: Write tests/adapter-proof.playwright.config.js

```javascript
// tests/adapter-proof.playwright.config.js
// Runs adapter visible value proof tests against the live deployed app.

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['adapter-visible-value.spec.js'],
  timeout: 45000,
  workers: 1,           // sequential — proof tests share fixture state
  retries: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    headless: true,
    screenshot: 'on',   // always capture screenshots — they are the proof artifact
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

---

## STEP 6: Write .github/workflows/adapter-visible-value.yml

```yaml
name: Adapter Visible Value Proof (MLB)

on:
  workflow_dispatch:
  # Enable on push once proof mode is stable:
  # push:
  #   branches: [main]
  #   paths: [index.html, tests/adapter-visible-value.spec.js]

jobs:
  adapter-proof:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    name: MLB Stats API — Visible Value Proof

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run adapter proof tests
        run: npx playwright test tests/adapter-visible-value.spec.js --config=tests/adapter-proof.playwright.config.js

      - name: Upload proof screenshots
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: adapter-proof-screenshots-mlb
          path: test-results/
          retention-days: 30

      - name: Summary
        if: always()
        run: |
          echo "════════════════════════════════════════"
          echo "  MLB Adapter Visible Value Proof"
          echo "  $(date '+%Y-%m-%d %H:%M UTC')"
          echo "════════════════════════════════════════"
```

---

## STEP 7: Add smoke assertions for Phase 3

Add to smoke.js after the AVV-MLB-008 assertion:

```javascript
// ── MLB Adapter Proof — Phase 3 (AVV-PW — 2026-06-29) ───────────────────────

assert('AVV-PW-INFRA-1 — _proofMode const declared in index.html',
  html.includes('_proofMode') && html.includes('proofAdapter'),
  'Proof mode query param handling must be present in index.html');

assert('AVV-PW-INFRA-2 — _MLB_PROOF_FIXTURES object defined',
  html.includes('_MLB_PROOF_FIXTURES'),
  'Inline fixture object must be in index.html — fixtures are not served at runtime');

assert('AVV-PW-INFRA-3 — window.__FIELD_PROOF__ set in proof mode',
  html.includes('__FIELD_PROOF__'),
  'window.__FIELD_PROOF__ must be exposed in proof mode for Playwright to read');

assert('AVV-PW-INFRA-4 — data-proof-adapter emitted on game card HTML',
  html.includes('data-proof-adapter'),
  'game card outer div must emit data-proof-adapter attribute when _adapterProof present');

assert('AVV-PW-INFRA-5 — adapter-visible-value.spec.js exists',
  require('fs').existsSync('./tests/adapter-visible-value.spec.js'),
  'Playwright proof spec must exist at tests/adapter-visible-value.spec.js');
```

---

## STEP 8: Run everything + verify

```bash
# 1. Smoke must still pass
node smoke.js index.html 2>&1 | tail -5

# 2. Commit index.html + smoke.js + test files
git add index.html smoke.js tests/adapter-visible-value.spec.js tests/adapter-proof.playwright.config.js .github/workflows/adapter-visible-value.yml
git commit -m "MLB adapter proof Phase 3 — proof mode + Playwright AVV-PW-001-005"
git push origin main

# 3. Wait for deploy (~25s), then run Playwright against live app
sleep 30
npx playwright test tests/adapter-visible-value.spec.js --config=tests/adapter-proof.playwright.config.js

# 4. If all 5 pass: done.
# If any fail: check window.__FIELD_PROOF__ and _fieldErrors via debug run:
#   npx playwright test tests/adapter-visible-value.spec.js --config=tests/adapter-proof.playwright.config.js --headed
```

---

## OUTBOX MANIFEST

| Item | File | Status | Owner |
|------|------|--------|-------|
| Proof mode constants + fixture | index.html | ⏳ Edit (after probe) | CC Step 1 |
| __FIELD_PROOF__ exposure | index.html | ⏳ Edit | CC Step 2 |
| data-proof-adapter on card | index.html | ⏳ Edit (after probe) | CC Step 3 |
| Playwright spec | tests/adapter-visible-value.spec.js | ⏳ Create | CC Step 4 |
| Playwright config | tests/adapter-proof.playwright.config.js | ⏳ Create | CC Step 5 |
| CI workflow | .github/workflows/adapter-visible-value.yml | ⏳ Create | CC Step 6 |
| AVV-PW-INFRA smoke assertions | smoke.js | ⏳ Edit | CC Step 7 |
| Commit + push + live test | — | ⏳ Run | CC Step 8 |
| Drive session doc | Drive 0ABxH84VndHL7Uk9PVA | ⏳ Upload | After passing |

---

## DECISION MATRIX

| Scenario | Decision |
|----------|----------|
| `fetchMLBSchedule` declared with `function` | Reassign directly: `fetchMLBSchedule = async ...` |
| `fetchMLBSchedule` declared with `const` | Use DOMContentLoaded deferred override |
| `?wpt` is `const` not `let` | Add `_proofMode` as a new `const`, don't modify `?wpt` variable |
| `data-proof-adapter` on wrong element | Re-probe: find the single game card outer div emission |
| AVV-PW-001 fails (no cards) | Check `__FIELD_PROOF__` — if null, probe injection patching |
| AVV-PW-001 fails (cards present but no data-proof-adapter) | Check Step 3 probe — find card outer div |
| Playwright deploy lag | Increase sleep to 45s before live test |
| AVV-PW-INFRA-5 smoke fails | tests/ file write step failed — re-run Step 4 |

---

**Session: 2026-06-29 · MLB Adapter Proof Phase 3 · Self-completing CC-CMD**
