// tests/viewport-all.spec.js — FIELD viewport tests across all 11 breakpoints
//
// Runs against the LIVE deployed app (fetch-driven PWA needs real data).
// Each viewport verifies layout, visibility, and interaction behaviors
// specified in docs/VIEWPORT-V4-SPEC.md.
//
// IMPORTANT: bottom sheet is currently RESTORED on all viewports (V3 reverted).
// When Path B (ambient panel injection) ships, update T1/T2/D1-D4 tests to
// verify ambient panel injection instead of bottom sheet.
//
// To run locally:
//   npx playwright install webkit chromium
//   npx playwright test tests/viewport-all.spec.js --config=tests/viewport.playwright.config.js

const { test, expect } = require('@playwright/test');

const LIVE_URL = 'https://jubilant-bassoon.jeffunglesbee.workers.dev';

// All 11 spec viewports (VIEWPORT-V4-SPEC.md lines 17-29)
const VIEWPORTS = [
  { id: 'P1', name: 'Phone Compact',        w: 360,  h: 640,  orientation: 'portrait'  },
  { id: 'P2', name: 'Phone Standard',       w: 390,  h: 844,  orientation: 'portrait'  },
  { id: 'P3', name: 'Phone Large',          w: 430,  h: 932,  orientation: 'portrait'  },
  { id: 'L1', name: 'Phone Landscape',      w: 640,  h: 360,  orientation: 'landscape' },
  { id: 'L2', name: 'Landscape Wide',       w: 780,  h: 430,  orientation: 'landscape' },
  { id: 'T1', name: 'iPad Portrait',        w: 820,  h: 1180, orientation: 'portrait'  },
  { id: 'T2', name: 'iPad Landscape',       w: 1180, h: 820,  orientation: 'landscape' },
  { id: 'D1', name: 'Laptop ESSENTIALS',    w: 1280, h: 800,  orientation: 'landscape' },
  { id: 'D2', name: 'Laptop WHOLE FIELD',   w: 1360, h: 800,  orientation: 'landscape' },
  { id: 'D3', name: 'Desktop ESSENTIALS',   w: 1600, h: 900,  orientation: 'landscape' },
  { id: 'D4', name: 'Desktop WHOLE FIELD',  w: 1800, h: 1000, orientation: 'landscape' },
];

async function awaitReady(page, bufferMs = 1500) {
  await page.waitForFunction(() => !!window._fieldDataReady, { timeout: 25000 });
  if (bufferMs > 0) await page.waitForTimeout(bufferMs);
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.id} — ${vp.name} (${vp.w}x${vp.h})`, () => {

    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto(LIVE_URL);
      await awaitReady(page);
    });

    // === UNIVERSAL: filter bar visible at all viewports ===
    test('filter bar visible', async ({ page }) => {
      const filterBar = page.locator('.filter-bar');
      await expect(filterBar).toBeVisible();
    });

    // === UNIVERSAL: at least one game card renders ===
    test('game cards render', async ({ page }) => {
      const cards = page.locator('.game-card');
      expect(await cards.count()).toBeGreaterThan(0);
    });

    // === UNIVERSAL: bottom sheet opens on card tap (V3 reverted) ===
    test('card tap opens bottom sheet', async ({ page }) => {
      const card = page.locator('.game-card').first();
      await card.click();
      await page.waitForTimeout(500);
      const sheet = page.locator('#bottom-sheet');
      await expect(sheet).toHaveClass(/open/);
    });

    // === PHONE ONLY (P1-P3, L1-L2): touch targets ≥44px ===
    if (['P1','P2','P3','L1','L2'].includes(vp.id)) {
      test('touch targets meet 44px floor', async ({ page }) => {
        const filterBtn = page.locator('.filter-btn').first();
        const box = await filterBtn.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44);
      });
    }

    // === PHONE ONLY: filter bar has scroll-snap ===
    if (['P1','P2','P3'].includes(vp.id)) {
      test('filter bar has scroll-snap', async ({ page }) => {
        const snapType = await page.evaluate(() => {
          const el = document.querySelector('.filter-bar');
          return el ? getComputedStyle(el).scrollSnapType : '';
        });
        expect(snapType).toContain('x');
      });
    }

    // === TABLET+: ambient panel visible ===
    if (['T1','T2'].includes(vp.id)) {
      test('ambient panel visible', async ({ page }) => {
        const panel = page.locator('#ambient-panel');
        await expect(panel).toBeVisible();
      });

      test('ambient panel scrollable', async ({ page }) => {
        const overflow = await page.evaluate(() => {
          const el = document.getElementById('ambient-panel');
          return el ? getComputedStyle(el).overflowY : '';
        });
        expect(overflow).toBe('auto');
      });
    }

    // === DESKTOP: ambient panel hidden in ESSENTIALS ===
    if (['D1','D3'].includes(vp.id)) {
      test('ambient panel hidden in ESSENTIALS mode', async ({ page }) => {
        const display = await page.evaluate(() => {
          const el = document.getElementById('ambient-panel');
          return el ? getComputedStyle(el).display : '';
        });
        expect(display).toBe('none');
      });
    }

    // === DESKTOP: WHOLE FIELD toggle visible ===
    if (['D1','D2','D3','D4'].includes(vp.id)) {
      test('WHOLE FIELD toggle visible', async ({ page }) => {
        const toggle = page.locator('#wf-toggle');
        await expect(toggle).toBeVisible();
      });
    }

    // === DESKTOP WHOLE FIELD: ambient panel visible when toggled ===
    if (['D2','D4'].includes(vp.id)) {
      test('ambient panel visible in WHOLE FIELD mode', async ({ page }) => {
        // Click WF toggle to enable WHOLE FIELD
        const toggle = page.locator('#wf-toggle');
        await toggle.click();
        await page.waitForTimeout(500);
        const panel = page.locator('#ambient-panel');
        await expect(panel).toBeVisible();
      });
    }

    // === P3-L2: journalism brief MID tier (2-line) ===
    if (['P3','L1','L2'].includes(vp.id)) {
      test('journalism brief uses 2-line clamp (MID tier)', async ({ page }) => {
        const clamp = await page.evaluate(() => {
          const el = document.querySelector('.card-brief-inline-text');
          return el ? getComputedStyle(el).webkitLineClamp : '';
        });
        // Should be '2' for MID tier viewports
        expect(clamp).toBe('2');
      });
    }

    // === T1+: journalism brief full (no clamp) ===
    if (['T1','T2','D1','D2','D3','D4'].includes(vp.id)) {
      test('journalism brief fully visible (FULL tier)', async ({ page }) => {
        const clamp = await page.evaluate(() => {
          const el = document.querySelector('.card-brief-inline-text');
          return el ? getComputedStyle(el).webkitLineClamp : 'no-element';
        });
        // Should be 'none' or unset for FULL tier viewports
        if (clamp !== 'no-element') {
          expect(clamp).not.toBe('1');
          expect(clamp).not.toBe('2');
        }
      });
    }

    // === TYPOGRAPHY: Chakra Petch loaded ===
    test('Chakra Petch font loaded', async ({ page }) => {
      const fontFamily = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--ff-display').trim();
      });
      expect(fontFamily).toContain('Chakra Petch');
    });

    // === DESKTOP 1440+: 3-col grid ===
    if (['D3','D4'].includes(vp.id)) {
      test('games-list uses 3-column grid', async ({ page }) => {
        const cols = await page.evaluate(() => {
          const el = document.querySelector('.games-list');
          return el ? getComputedStyle(el).gridTemplateColumns : '';
        });
        // Should have 3 column values
        const colCount = cols.split(/\s+/).filter(c => c.length > 0).length;
        expect(colCount).toBeGreaterThanOrEqual(3);
      });
    }

  });
}
