// tests/viewport-all.spec.js — FIELD Playwright Viewport Test Suite
//
// Implements docs/PLAYWRIGHT-VIEWPORT-SPEC.md — 22 named assertions across
// all 11 spec viewports (VIEWPORT-V4-SPEC.md lines 17-32).
//
// Every URL includes ?wpt (Rule 54, PM-26-A) so the My Services
// onboarding modal is skipped and tests measure the configured app.
//
// Status note: V3 / iPad-1 routing was reverted (commit 4e60b6e); the
// bottom sheet is the canonical game-detail surface on every viewport
// until Path B (ambient panel injection) ships.

const { test, expect } = require('@playwright/test');

const LIVE_URL = 'https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt';

// All 11 spec viewports + their dimensions per
// docs/PLAYWRIGHT-VIEWPORT-SPEC.md §"All 11 viewports to test".
const VIEWPORTS = [
  { id: 'P1', name: 'Phone Compact',       w: 360,  h: 640,  orientation: 'portrait',  tier: 'phone'        },
  { id: 'P2', name: 'Phone Standard',      w: 390,  h: 844,  orientation: 'portrait',  tier: 'phone'        },
  { id: 'P3', name: 'Phone Large',         w: 430,  h: 932,  orientation: 'portrait',  tier: 'phone'        },
  { id: 'L1', name: 'Phone Landscape',     w: 640,  h: 360,  orientation: 'landscape', tier: 'phone-land'   },
  { id: 'L2', name: 'Landscape Wide',      w: 780,  h: 420,  orientation: 'landscape', tier: 'phone-land'   },
  { id: 'T1', name: 'iPad Portrait',       w: 820,  h: 1180, orientation: 'portrait',  tier: 'ipad'         },
  { id: 'T2', name: 'iPad Landscape',      w: 1180, h: 820,  orientation: 'landscape', tier: 'ipad'         },
  { id: 'D1', name: 'Laptop ESSENTIALS',   w: 1366, h: 768,  orientation: 'landscape', tier: 'desktop'      },
  { id: 'D2', name: 'Laptop WHOLE FIELD',  w: 1366, h: 768,  orientation: 'landscape', tier: 'desktop-wf'   },
  { id: 'D3', name: 'Desktop ESSENTIALS',  w: 1920, h: 1080, orientation: 'landscape', tier: 'desktop'      },
  { id: 'D4', name: 'Desktop WHOLE FIELD', w: 1920, h: 1080, orientation: 'landscape', tier: 'desktop-wf'   },
];

const IS_PHONE      = (id) => ['P1','P2','P3'].includes(id);
const IS_PHONE_LAND = (id) => ['L1','L2'].includes(id);
const IS_IPAD       = (id) => ['T1','T2'].includes(id);
const IS_DESKTOP    = (id) => ['D1','D3'].includes(id);
const IS_DESKTOP_WF = (id) => ['D2','D4'].includes(id);

// awaitReady gates on window._fieldDataReady (set after first renderAll())
// then buffers for async data (ESPN, relay overlay).
async function awaitReady(page, bufferMs = 1500) {
  await page.waitForFunction(() => !!window._fieldDataReady, { timeout: 25000 });
  if (bufferMs > 0) await page.waitForTimeout(bufferMs);
}

// Capture uncaught JS errors during the page lifetime for assertion #1.
function trackJSErrors(page) {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message || String(err)));
  return errors;
}

// Enable WHOLE FIELD mode by clicking #wf-toggle (D2 / D4 only).
async function enableWholeField(page) {
  const toggle = page.locator('#wf-toggle');
  await toggle.click();
  await page.waitForFunction(() => document.body.classList.contains('wf-mode'), null, { timeout: 2000 });
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.id} — ${vp.name} (${vp.w}x${vp.h})`, () => {

    let jsErrors;

    test.beforeEach(async ({ page }) => {
      jsErrors = trackJSErrors(page);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto(LIVE_URL);
      await awaitReady(page);
      if (IS_DESKTOP_WF(vp.id)) await enableWholeField(page);
    });

    // ── #1 UNIVERSAL: no uncaught JS exceptions ────────────────────────────
    test('#1 page loads without uncaught JS errors', async () => {
      expect(jsErrors).toEqual([]);
    });

    // ── #2 UNIVERSAL: at least one .game-card renders ──────────────────────
    test('#2 at least one .game-card is visible', async ({ page }) => {
      const count = await page.locator('.game-card').count();
      expect(count).toBeGreaterThan(0);
    });

    // ── #3 UNIVERSAL: filter bar visible and interactive ───────────────────
    test('#3 filter bar visible and interactive', async ({ page }) => {
      const bar = page.locator('.filter-bar');
      await expect(bar).toBeVisible();
      const btnCount = await page.locator('.filter-bar .filter-btn').count();
      expect(btnCount).toBeGreaterThan(0);
    });

    // ── #4 UNIVERSAL: My Services modal does NOT appear (?wpt bypass) ──────
    test('#4 My Services modal is suppressed by ?wpt', async ({ page }) => {
      const modalOpen = await page.evaluate(() => {
        const ms = document.getElementById('my-services-modal') ||
                   document.querySelector('.my-services-panel.open, .my-services-modal.open');
        if (!ms) return false;
        const cs = getComputedStyle(ms);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
      });
      expect(modalOpen).toBe(false);
    });

    // ── #5 UNIVERSAL: SW_VERSION exposed (window.SW_VERSION) ───────────────
    test('#5 SW_VERSION exposed on window', async ({ page }) => {
      const sw = await page.evaluate(() => window.SW_VERSION || '');
      expect(sw).toMatch(/^\d{4}-\d{2}-\d{2}[a-z]?$/);
    });

    // ── #6 PHONE: bottom sheet opens on card tap ───────────────────────────
    if (IS_PHONE(vp.id)) {
      test('#6 bottom sheet opens on card tap', async ({ page }) => {
        const card = page.locator('.card-body[data-open]').first();
        await card.tap();
        const sheet = page.locator('#bottom-sheet');
        await expect(sheet).toHaveClass(/open/, { timeout: 2000 });
      });
    }

    // ── #7 PHONE: filter buttons ≥44px tap height ──────────────────────────
    if (IS_PHONE(vp.id)) {
      test('#7 filter button tap height ≥44px', async ({ page }) => {
        const btn = page.locator('.filter-bar .filter-btn').first();
        const box = await btn.boundingBox();
        expect(box).toBeTruthy();
        expect(box.height).toBeGreaterThanOrEqual(44);
      });
    }

    // ── #8 PHONE: cards are single-column ──────────────────────────────────
    if (IS_PHONE(vp.id)) {
      test('#8 .games-list is single column', async ({ page }) => {
        const cols = await page.evaluate(() => {
          const el = document.querySelector('.games-list');
          if (!el) return 'no-element';
          return el.style.getPropertyValue('--cols') ||
                 getComputedStyle(el).getPropertyValue('--cols').trim() || '1';
        });
        expect(['1', '']).toContain(cols);
      });
    }

    // ── #9 PHONE: score ticker visible ─────────────────────────────────────
    if (IS_PHONE(vp.id)) {
      test('#9 score ticker visible', async ({ page }) => {
        const ticker = page.locator('#score-ticker-wrap, .score-ticker').first();
        await expect(ticker).toBeVisible();
      });
    }

    // ── #10 L2: 2-col grid ─────────────────────────────────────────────────
    if (vp.id === 'L2') {
      test('#10 L2 renders 2-col grid', async ({ page }) => {
        const cols = await page.evaluate(() => {
          const el = document.querySelector('.sport-section-games, .games-list');
          if (!el) return 'no-element';
          return getComputedStyle(el).gridTemplateColumns || '';
        });
        const colCount = String(cols).split(/\s+/).filter(c => c && c !== 'none').length;
        expect(colCount).toBeGreaterThanOrEqual(2);
      });
    }

    // ── #11 PHONE LANDSCAPE: bottom sheet opens on card tap ────────────────
    if (IS_PHONE_LAND(vp.id)) {
      test('#11 bottom sheet opens on card tap', async ({ page }) => {
        const card = page.locator('.card-body[data-open]').first();
        await card.tap();
        const sheet = page.locator('#bottom-sheet');
        await expect(sheet).toHaveClass(/open/, { timeout: 2000 });
      });
    }

    // ── #12 IPAD: bottom sheet opens on card tap (V3 reverted) ─────────────
    if (IS_IPAD(vp.id)) {
      test('#12 bottom sheet opens on card tap (V3 reverted)', async ({ page }) => {
        const card = page.locator('.card-body[data-open]').first();
        await card.tap();
        const sheet = page.locator('#bottom-sheet');
        await expect(sheet).toHaveClass(/open/, { timeout: 2000 });
      });
    }

    // ── #13 IPAD: ambient panel visible ────────────────────────────────────
    if (IS_IPAD(vp.id)) {
      test('#13 ambient panel visible', async ({ page }) => {
        const panel = page.locator('#ambient-panel');
        await expect(panel).toBeVisible();
      });
    }

    // ── #14 IPAD: ambient panel scrollable when content overflows ──────────
    if (IS_IPAD(vp.id)) {
      test('#14 ambient panel overflow-y allows scrolling', async ({ page }) => {
        const overflowY = await page.evaluate(() => {
          const el = document.getElementById('ambient-panel');
          return el ? getComputedStyle(el).overflowY : '';
        });
        expect(['auto', 'scroll']).toContain(overflowY);
      });
    }

    // ── #15 IPAD: nav-link tap floor ≥44px ─────────────────────────────────
    if (IS_IPAD(vp.id)) {
      test('#15 Desk/Journal/Groups nav-link tap height ≥44px', async ({ page }) => {
        for (const id of ['desk-jump-link', 'jrn-nav-link']) {
          const link = page.locator(`#${id}`);
          if (await link.count() === 0) continue;
          const box = await link.boundingBox();
          expect(box, `#${id} bounding box`).toBeTruthy();
          expect(box.height, `#${id} height`).toBeGreaterThanOrEqual(44);
        }
      });
    }

    // ── #16 IPAD: Journal tab activates on a single tap ────────────────────
    if (IS_IPAD(vp.id)) {
      test('#16 Journal activates body.journalism-mode on single tap', async ({ page }) => {
        const before = await page.evaluate(() => document.body.classList.contains('journalism-mode'));
        expect(before).toBe(false);
        await page.locator('#jrn-nav-link').tap();
        await page.waitForFunction(
          () => document.body.classList.contains('journalism-mode'),
          null,
          { timeout: 1500 }
        );
        const after = await page.evaluate(() => document.body.classList.contains('journalism-mode'));
        expect(after).toBe(true);
      });
    }

    // ── #17 DESKTOP: 2-col grid at 1200+ ───────────────────────────────────
    if (IS_DESKTOP(vp.id)) {
      test('#17 2-col game grid at 1200+', async ({ page }) => {
        const cols = await page.evaluate(() => {
          const el = document.querySelector('.games-list');
          if (!el) return '';
          const v = getComputedStyle(el).getPropertyValue('--cols').trim();
          return v || '';
        });
        expect(cols).toBe('2');
      });
    }

    // ── #18 DESKTOP: WHOLE FIELD toggle visible ────────────────────────────
    if (IS_DESKTOP(vp.id) || IS_DESKTOP_WF(vp.id)) {
      test('#18 WHOLE FIELD toggle visible', async ({ page }) => {
        const toggle = page.locator('#wf-toggle');
        await expect(toggle).toBeVisible();
      });
    }

    // ── #19 DESKTOP: bottom sheet opens on card click ──────────────────────
    if (IS_DESKTOP(vp.id)) {
      test('#19 bottom sheet opens on card click', async ({ page }) => {
        const card = page.locator('.card-body[data-open]').first();
        await card.click();
        const sheet = page.locator('#bottom-sheet');
        await expect(sheet).toHaveClass(/open/, { timeout: 2000 });
      });
    }

    // ── #20 DESKTOP WHOLE FIELD: body.wf-mode is set ───────────────────────
    if (IS_DESKTOP_WF(vp.id)) {
      test('#20 body.wf-mode is set after toggle', async ({ page }) => {
        const wfMode = await page.evaluate(() => document.body.classList.contains('wf-mode'));
        expect(wfMode).toBe(true);
      });
    }

    // ── #21 DESKTOP WHOLE FIELD: ambient panel visible ─────────────────────
    if (IS_DESKTOP_WF(vp.id)) {
      test('#21 ambient panel visible in WHOLE FIELD mode', async ({ page }) => {
        const panel = page.locator('#ambient-panel');
        await expect(panel).toBeVisible();
      });
    }

    // ── #22 D4 ONLY: 3-col grid at 1440+ (CompactGrid promotion) ───────────
    if (vp.id === 'D4') {
      test('#22 D4 renders 3-col grid (CompactGrid at 1440+)', async ({ page }) => {
        const cols = await page.evaluate(() => {
          const el = document.querySelector('.games-list');
          if (!el) return '';
          return getComputedStyle(el).getPropertyValue('--cols').trim();
        });
        expect(cols).toBe('3');
      });
    }

  });
}
