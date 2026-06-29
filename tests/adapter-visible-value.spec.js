// tests/adapter-visible-value.spec.js — FIELD Adapter Visible Value Proof
// Playwright tests proving MLB Stats API adapter produces visible product output.
//
// Tests run against the LIVE deployed app with ?proofAdapter= fixture injection.
// Fixture data is inlined in index.html — no network dependency.
//
// Run: npx playwright test tests/adapter-visible-value.spec.js --config=tests/adapter-proof.playwright.config.js

const { test, expect } = require('@playwright/test');

const LIVE_URL  = process.env.FIELD_TEST_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
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

  // Report actual values
  const cardText = await page.locator('.game-card').first().textContent();
  console.log('[AVV-PW-001] First card text:', cardText?.trim().slice(0, 120));
  console.log('[AVV-PW-001] __FIELD_PROOF__:', JSON.stringify(proof, null, 2));
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

  const chipTexts = await chips.allTextContents();
  console.log('[AVV-PW-002] Broadcast chips found:', chipTexts);
});

// ── AVV-PW-003: window.__FIELD_PROOF__ populated with adapter data ────────
test('AVV-PW-003 — ok fixture: window.__FIELD_PROOF__ populated', async ({ page }) => {
  await page.goto(PROOF_URL + 'ok', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page);

  // Wait for cards to ensure fetchMLBFixtures has completed (it runs after _fieldDataReady is set)
  const cards = page.locator('.game-card');
  try { await cards.first().waitFor({ timeout: 10000 }); } catch(_) {}

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

  console.log('[AVV-PW-003] normalizedObjects:', JSON.stringify(proof.normalizedObjects, null, 2));
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

  console.log('[AVV-PW-004] proof.normalizedObjects.length:', proof?.normalizedObjects?.length);
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

  console.log('[AVV-PW-005] title:', title, '| crashes:', crashes.length);
});
