// tests/ipad-viewport.spec.js — iPad regression behavioral verification
//
// Verifies the IPAD-REGRESSION-FIXES.md sweep (commits 18c0775 .. 2f075d6).
// Runs against the LIVE deployed app so the test exercises the real CSS +
// JS pipeline, including data loading, render, tap handlers.
//
// Why deployed (not file://): index.html is a fetch-driven PWA. Without
// the relay + ESPN + V2 data sources reachable, no .game-card renders and
// the tap behaviours we want to verify have no target.
//
// To run locally (once Playwright browsers are installed):
//   npx playwright install webkit chromium
//   npx playwright test tests/ipad-viewport.spec.js --config=tests/ipad.playwright.config.js
//
// In CI: this file is OFF the default smoke path. Wire into a separate
// browser-test workflow once browser binaries are guaranteed available.

const { test, expect, devices } = require('@playwright/test');

const LIVE_URL = 'https://jubilant-bassoon.jeffunglesbee.workers.dev';

const IPAD_PORTRAIT  = { width: 820,  height: 1180 };
const IPAD_LANDSCAPE = { width: 1180, height: 820  };

// Both viewports are in the spec's T1 (820-1199 portrait) and T2 (820-1199
// landscape) range, so .bottom-sheet should be hidden by V3 + iPad-4 CSS.
const VIEWPORTS = [
  { name: 'iPad portrait (T1, 820x1180)',  size: IPAD_PORTRAIT  },
  { name: 'iPad landscape (T2, 1180x820)', size: IPAD_LANDSCAPE },
];

// awaitReady mirrors field_browser.test.js — gates on window._fieldDataReady
// (set after first renderAll()) so we don't race the data fetches.
async function awaitReady(page, bufferMs = 1500) {
  await page.waitForFunction(() => !!window._fieldDataReady, { timeout: 25000 });
  if (bufferMs > 0) await page.waitForTimeout(bufferMs);
}

for (const { name, size } of VIEWPORTS) {
  test.describe(name, () => {

    test('bottom sheet element is display:none on iPad', async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(LIVE_URL);
      await awaitReady(page);

      // V3 + iPad-4: @media(min-width:820px){ .bottom-sheet, .bottom-sheet-overlay
      // { display:none !important } }. Both elements exist in the DOM but
      // computed style must be "none" — taps must NOT reach the sheet path.
      const sheetDisplay = await page.evaluate(() => {
        const el = document.getElementById('bottom-sheet');
        return el ? getComputedStyle(el).display : 'no-element';
      });
      expect(sheetDisplay).toBe('none');

      const overlayDisplay = await page.evaluate(() => {
        const el = document.getElementById('bs-overlay');
        return el ? getComputedStyle(el).display : 'no-element';
      });
      expect(overlayDisplay).toBe('none');
    });

    test('tapping a game card triggers inline expand (data-expanded="1")', async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(LIVE_URL);
      await awaitReady(page);

      // Find the first interactive .game-card[data-gameid]. If no games are
      // on the slate (e.g. off-season for every league), skip — there's
      // nothing to tap. iPad-1's fix is irrelevant without a card.
      const cardCount = await page.locator('.game-card[data-gameid]').count();
      test.skip(cardCount === 0, 'No game cards rendered — empty slate, nothing to verify.');

      const card     = page.locator('.game-card[data-gameid]').first();
      const cardBody = card.locator('.card-body[data-open]').first();
      const gameId   = await card.getAttribute('data-gameid');

      // Before tap: card must not be expanded.
      await expect(card).not.toHaveAttribute('data-expanded', '1');

      // Tap the card body. iPad-1: openBottomSheet → _openGameSheetTablet
      // → sets data-expanded="1" + adds to _expandedCards Set.
      await cardBody.tap();

      // After tap: data-expanded should be "1" within the click → setter cycle.
      await expect(card).toHaveAttribute('data-expanded', '1', { timeout: 2000 });

      // iPad-2 persistence sanity: trigger a re-render and confirm the
      // expanded state survives (renderAll wipes card HTML; _restoreCardExpandState
      // re-applies from the Set).
      const persisted = await page.evaluate(async (gid) => {
        if (typeof renderAll !== 'function') return 'renderAll-missing';
        renderAll();
        await new Promise(r => setTimeout(r, 200));
        const c = document.querySelector(`.game-card[data-gameid="${gid}"]`);
        return c ? c.dataset.expanded : 'card-missing-after-render';
      }, gameId);
      expect(persisted).toBe('1');
    });

    test('tapping Desk filter tab navigates on first tap', async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(LIVE_URL);
      await awaitReady(page);

      const desk = page.locator('#desk-jump-link');
      await expect(desk).toBeVisible();

      // iPad-4: tap target must be ≥44px on touch surfaces.
      const tapHeight = await desk.evaluate(el => el.getBoundingClientRect().height);
      expect(tapHeight).toBeGreaterThanOrEqual(44);

      // iPad-5: first tap must navigate; on broken (sticky-hover) builds the
      // first tap only set :hover state. Record scroll position, tap once,
      // confirm scroll moved within a reasonable timeout.
      const before = await page.evaluate(() => window.scrollY);
      await desk.tap();
      // Smooth scrollIntoView typically completes in <500ms; allow 2s slack.
      await page.waitForFunction(
        (y0) => Math.abs(window.scrollY - y0) > 50,
        before,
        { timeout: 2000 }
      );

      // Target section should now be in or near the viewport.
      const sectionInView = await page.evaluate(() => {
        const sec = document.getElementById('field-desk-section');
        if (!sec) return false;
        const rect = sec.getBoundingClientRect();
        return rect.top >= -10 && rect.top < window.innerHeight;
      });
      expect(sectionInView).toBe(true);
    });

    test('tapping Journal filter tab activates on first tap', async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(LIVE_URL);
      await awaitReady(page);

      const jrn = page.locator('#jrn-nav-link');
      await expect(jrn).toBeVisible();

      const tapHeight = await jrn.evaluate(el => el.getBoundingClientRect().height);
      expect(tapHeight).toBeGreaterThanOrEqual(44);

      // First tap toggles journalism-mode → body.classList contains it.
      const beforeMode = await page.evaluate(() => document.body.classList.contains('journalism-mode'));
      expect(beforeMode).toBe(false);

      await jrn.tap();

      // iPad-5: hover gated behind (hover: hover) → the tap fires onclick
      // directly, no double-tap required.
      await page.waitForFunction(
        () => document.body.classList.contains('journalism-mode'),
        null,
        { timeout: 1500 }
      );

      const afterMode = await page.evaluate(() => document.body.classList.contains('journalism-mode'));
      expect(afterMode).toBe(true);
    });
  });
}
