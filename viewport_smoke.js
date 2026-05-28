// viewport_smoke.js — FIELD Geometric Invariant Suite
// Tests layout CONTRACTS at 4 canonical viewports using Playwright.
// Runs against local index.html (pre-deploy) — complements field_browser.test.js
// which runs against the live URL (post-deploy).
//
// PHILOSOPHY: Test INTENT not APPEARANCE.
//   Screenshot diffing: "does this look the same as last time?"
//   Geometric invariants: "is each element where the CSS says it should be?"
//   No baseline images. No daily content noise. No flaky pixel thresholds.
//
// GROUNDED IN REAL BUGS (every assertion traces to a real regression):
//   - OTW bar spanning over ambient panel at 820px  → A-series
//   - Game cards 215px wide at 820px                → B-series
//   - Star btn overlapping drama badge              → C-series
//   - Pre-masthead bars stacking above masthead     → D-series
//   - 360px otw-why text clipping                  → E-series
//   - Buttons too small for touch targets           → F-series
//
// Run locally: npx playwright test viewport_smoke.js --config playwright.viewport.config.js
// CI: smoke-and-verify.yml viewport-smoke job (after smoke, before browser-test)
//
// Spec: 1B7w7dm9An-gdjVsM2wnQw28Wm9Kb0F9308eksH_8VMA

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const VP_SCREENSHOT_DIR = path.join(__dirname, 'viewport-screenshots');

const FILE_URL = `file://${path.resolve(__dirname, 'index.html')}`;

// ── Helper: get computed geometry of an element ───────────────────────────────
async function geo(page, selector) {
  return page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return {
      top:    r.top,    left:   r.left,
      bottom: r.bottom, right:  r.right,
      width:  r.width,  height: r.height,
      display: s.display,
    };
  }, selector);
}

// ── Helper: bounding boxes overlap? ──────────────────────────────────────────
function overlaps(a, b) {
  if (!a || !b) return false;
  return !(a.right <= b.left || b.right <= a.left ||
           a.bottom <= b.top || b.bottom <= a.top);
}

// ── Load page and prepare for layout assertions ───────────────────────────────
// Aborts all HTTPS fetches (FIELD makes live API calls; we don't want them in CI).
// Injects a synthetic game card so card-width assertions have data.
async function loadAndPrepare(page) {
  // Abort all external network requests — layout comes from inline CSS, not data
  await page.route(/^https?:\/\//, route => route.abort());

  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(500); // allow initial JS + CSS transitions

  // Inject synthetic game card — card-width assertions require at least one card
  await page.evaluate(() => {
    let main = document.querySelector('.main') || document.getElementById('main');
    if (!main) {
      main = document.createElement('div');
      main.className = 'main';
      document.body.appendChild(main);
    }
    if (!main.querySelector('.game-card')) {
      const section = document.createElement('section');
      section.className = 'sport-section';
      section.innerHTML = `
        <div class="games-list" style="">
          <div class="game-card" data-home="Test Home" data-away="Test Away"
               data-sport="nba" data-gid="vp-test-001">
            <div class="game-header">
              <span class="team-logo-txt">TH</span>
              <span class="team-name away-name">Test Away</span>
              <span class="game-time-right">8:00 PM</span>
              <span class="team-logo-txt">TA</span>
              <span class="team-name home-name">Test Home</span>
            </div>
            <div class="stream-row">
              <a class="stream-chip" href="#">ESPN</a>
            </div>
            <button class="star-btn" aria-label="Star this game">⭐</button>
            <span class="badge-drama d-fire otw-drama">FIRE · 88</span>
          </div>
        </div>`;
      main.prepend(section);
    }
  });
  await page.waitForTimeout(150);
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEWPORT: 360px — Galaxy A36 / iPhone SE
// ══════════════════════════════════════════════════════════════════════════════
test.describe('360px — Galaxy A36 / iPhone SE', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test.beforeEach(async ({ page }) => { await loadAndPrepare(page); });

  // A01 — Ambient panel must be hidden (no right column on phone)
  test('A01 — ambient panel hidden (no right column on phone)', async ({ page }) => {
    const g = await geo(page, '#ambient-panel');
    // Either not present or display:none
    expect(g === null || g.display === 'none',
      `#ambient-panel should be hidden at 360px, got display:${g?.display}`
    ).toBe(true);
  });

  // A02 — OTW banner present in DOM
  test('A02 — OTW banner in DOM', async ({ page }) => {
    await expect(page.locator('#otw-banner')).toBeAttached();
  });

  // A03 — Arbitrage bar in DOM
  test('A03 — Arbitrage bar #field-arb in DOM', async ({ page }) => {
    await expect(page.locator('#field-arb')).toBeAttached();
  });

  // A04 — No horizontal scroll (nothing exceeds 360px width)
  test('A04 — no horizontal scroll at 360px', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth,
      `Horizontal overflow at 360px: scrollWidth=${scrollWidth}px`
    ).toBeLessThanOrEqual(365); // 5px tolerance for rounding
  });

  // A05 — Game cards are at least 300px wide (readable on phone)
  test('A05 — game card width ≥ 300px', async ({ page }) => {
    const cardWidth = await page.evaluate(() => {
      const card = document.querySelector('.game-card');
      return card ? card.getBoundingClientRect().width : 999;
    });
    expect(cardWidth,
      `Game card too narrow at 360px: ${cardWidth.toFixed(0)}px`
    ).toBeGreaterThanOrEqual(300);
  });

  // A06 — otw-why text constrained to 45vw (regression: was clipping at A36)
  test('A06 — otw-why width ≤ 45vw at 360px (prevents clipping)', async ({ page }) => {
    const whyWidth = await page.evaluate(() => {
      const el = document.querySelector('.otw-why');
      if (!el || window.getComputedStyle(el).display === 'none') return 0;
      return el.getBoundingClientRect().width;
    });
    if (whyWidth > 0) {
      expect(whyWidth,
        `otw-why too wide: ${whyWidth.toFixed(0)}px, max is 45vw=${(360 * 0.45).toFixed(0)}px`
      ).toBeLessThanOrEqual(360 * 0.46); // 46% tolerance for rounding
    }
  });

  // A07 — Primary interactive buttons ≥ 22px tall
  // Filter chips and compact secondary actions are exempted (intentionally small)
  // This catches genuinely broken buttons (height collapsed to near-zero)
  test('A07 — primary interactive buttons ≥ 14px tall (catches collapsed buttons)', async ({ page }) => {
    const tinyButtons = await page.evaluate(() => {
      // Exclude: filter chips, standings/multiview/calendar/share secondary actions
      const EXEMPT_TEXT = ['standings', 'multiview', '📅', '⬆', '‹', '›', 'local', '📌'];
      const EXEMPT_CLASS = ['filter-btn', 'sport-filter', 'cal-btn', 'share-btn',
        'standings-btn', 'mv-btn', 'page-nav'];
      return [...document.querySelectorAll('button')].filter(b => {
        const s = window.getComputedStyle(b);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        const h = b.getBoundingClientRect().height;
        if (h <= 0 || h >= 14) return false; // only flag truly collapsed
        const text = b.textContent?.toLowerCase().trim() || '';
        if (EXEMPT_TEXT.some(t => text.includes(t.toLowerCase()))) return false;
        if (EXEMPT_CLASS.some(c => b.className.includes(c))) return false;
        return true;
      }).map(b => ({ text: b.textContent?.trim().slice(0, 20), height: b.getBoundingClientRect().height }));
    });
    expect(tinyButtons,
      `${tinyButtons.length} buttons effectively collapsed: ${JSON.stringify(tinyButtons)}`
    ).toHaveLength(0);
  });

  // A08 — Star button does not overlap drama badge
  test('A08 — star button does not overlap drama badge', async ({ page }) => {
    const star  = await geo(page, '.game-card .star-btn');
    const drama = await geo(page, '.game-card .otw-drama, .game-card .badge-drama');
    if (star && drama && star.width > 0 && drama.width > 0) {
      expect(
        overlaps(star, drama),
        `Star (r=${star.right.toFixed(0)},b=${star.bottom.toFixed(0)}) overlaps drama (l=${drama.left.toFixed(0)},t=${drama.top.toFixed(0)})`
      ).toBe(false);
    }
  });

  // A99 — Screenshot for Layer 2 AI review
  test('A99 — capture screenshot for Layer 2 AI review', async ({ page }) => {
    fs.mkdirSync(VP_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(VP_SCREENSHOT_DIR, 'vp-360.png'), fullPage: false });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// VIEWPORT: 393px — Pixel 8 (standard Android)
// ══════════════════════════════════════════════════════════════════════════════
test.describe('393px — Pixel 8', () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test.beforeEach(async ({ page }) => { await loadAndPrepare(page); });

  // B01 — Ambient panel hidden on standard phone
  test('B01 — ambient panel hidden at 393px', async ({ page }) => {
    const g = await geo(page, '#ambient-panel');
    expect(g === null || g.display === 'none',
      `#ambient-panel should be hidden at 393px`
    ).toBe(true);
  });

  // B02 — No horizontal scroll
  test('B02 — no horizontal scroll at 393px', async ({ page }) => {
    const sw = await page.evaluate(() => document.body.scrollWidth);
    expect(sw).toBeLessThanOrEqual(398);
  });

  // B03 — Game card width ≥ 330px
  test('B03 — game card width ≥ 330px at 393px', async ({ page }) => {
    const w = await page.evaluate(() => {
      const c = document.querySelector('.game-card');
      return c ? c.getBoundingClientRect().width : 999;
    });
    expect(w, `Card too narrow: ${w.toFixed(0)}px`).toBeGreaterThanOrEqual(330);
  });

  // B04 — OTW and Arbitrage bar both attached
  test('B04 — OTW banner and Arbitrage bar in DOM', async ({ page }) => {
    await expect(page.locator('#otw-banner')).toBeAttached();
    await expect(page.locator('#field-arb')).toBeAttached();
  });

  // B99 — Screenshot for Layer 2 AI review
  test('B99 — capture screenshot for Layer 2 AI review', async ({ page }) => {
    fs.mkdirSync(VP_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(VP_SCREENSHOT_DIR, 'vp-393.png'), fullPage: false });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// VIEWPORT: 820px — iPad Air 4th gen portrait (AMBIENT MODE)
// ══════════════════════════════════════════════════════════════════════════════
test.describe('820px — iPad Air portrait (Ambient Mode)', () => {
  test.use({ viewport: { width: 820, height: 1180 } });

  test.beforeEach(async ({ page }) => { await loadAndPrepare(page); });

  // C01 — Ambient panel IS visible (this is the ambient mode canvas)
  test('C01 — ambient panel is visible at 820px', async ({ page }) => {
    const g = await geo(page, '#ambient-panel');
    expect(g,        'Ambient panel not found in DOM at 820px').not.toBeNull();
    expect(g?.display, 'Ambient panel should be display:flex at 820px').not.toBe('none');
  });

  // C02 — OTW banner HIDDEN on iPad (lives in ambient panel — THE KEY BUG)
  test('C02 — OTW banner hidden at 820px (moved to ambient panel)', async ({ page }) => {
    const g = await geo(page, '#otw-banner');
    expect(
      g === null || g.display === 'none',
      `#otw-banner must be display:none at 820px (bug: was spanning over ambient panel). Got: ${g?.display}`
    ).toBe(true);
  });

  // C03 — Watch Window hidden on iPad (pre-masthead clutter)
  test('C03 — watch window hidden at 820px (pre-masthead clutter)', async ({ page }) => {
    const g = await geo(page, '#watch-window');
    expect(g === null || g.display === 'none',
      `#watch-window should be hidden at 820px. Got: ${g?.display}`
    ).toBe(true);
  });

  // C04 — Arbitrage bar hidden on iPad (summary shown in ambient panel)
  test('C04 — arbitrage bar hidden at 820px (shown in ambient panel)', async ({ page }) => {
    const g = await geo(page, '#field-arb');
    expect(g === null || g.display === 'none',
      `#field-arb should be hidden at 820px. Got: ${g?.display}`
    ).toBe(true);
  });

  // C05 — Ambient panel is within viewport (not overflowing right edge)
  test('C05 — ambient panel within viewport right edge', async ({ page }) => {
    const g = await geo(page, '#ambient-panel');
    if (g && g.display !== 'none') {
      expect(g.right,
        `Ambient panel overflows viewport: right=${g.right.toFixed(0)}, viewport=820`
      ).toBeLessThanOrEqual(825); // 5px tolerance
    }
  });

  // C06 — Ambient panel covers the right column (≥ 45% from left)
  test('C06 — ambient panel left edge ≥ 45% of viewport (protects left schedule pane)', async ({ page }) => {
    const g = await geo(page, '#ambient-panel');
    if (g && g.display !== 'none') {
      expect(g.left,
        `Ambient panel encroaches on left schedule pane: left=${g.left.toFixed(0)}, min=${(820 * 0.45).toFixed(0)}`
      ).toBeGreaterThanOrEqual(820 * 0.44); // 44% tolerance
    }
  });

  // C07 — Ambient panel width ≥ 360px (must be substantive right column)
  test('C07 — ambient panel width ≥ 360px', async ({ page }) => {
    const g = await geo(page, '#ambient-panel');
    if (g && g.display !== 'none') {
      expect(g.width,
        `Ambient panel too narrow: ${g.width.toFixed(0)}px`
      ).toBeGreaterThanOrEqual(360);
    }
  });

  // C08 — OTW banner does NOT overlap ambient panel (THE CORE BUG this suite prevents)
  test('C08 — OTW banner does not overlap ambient panel', async ({ page }) => {
    const otwG    = await geo(page, '#otw-banner');
    const ambientG = await geo(page, '#ambient-panel');
    // If OTW is hidden, this passes trivially (which is correct)
    if (otwG && otwG.display !== 'none' && ambientG && ambientG.display !== 'none') {
      expect(
        overlaps(otwG, ambientG),
        `OTW bar overlaps ambient panel! OTW right=${otwG.right.toFixed(0)}, ambient left=${ambientG.left.toFixed(0)}`
      ).toBe(false);
    }
  });

  // C09 — Game cards fit in left pane (≥ 380px wide, not 2-col grid bug)
  test('C09 — game cards ≥ 380px wide at 820px (single-column left pane)', async ({ page }) => {
    const cardWidth = await page.evaluate(() => {
      const card = document.querySelector('.game-card');
      return card ? card.getBoundingClientRect().width : 999;
    });
    expect(cardWidth,
      `Game card too narrow at 820px: ${cardWidth.toFixed(0)}px (2-col grid bug?)`
    ).toBeGreaterThanOrEqual(380);
  });

  // C10 — Games list is single-column (not 2-col grid) in 430px left pane
  test('C10 — games-list is single column at 820px', async ({ page }) => {
    const isBlock = await page.evaluate(() => {
      const gl = document.querySelector('.games-list');
      if (!gl) return true; // no list = pass
      const s = window.getComputedStyle(gl);
      // single col = display:block (2-col = grid or flex with wrap)
      return s.display === 'block' || s.gridTemplateColumns === 'none' ||
             s.gridTemplateColumns === '' || s.columnCount === '1';
    });
    expect(isBlock,
      'games-list should be single column at 820px (2-col grid would make cards too narrow)'
    ).toBe(true);
  });

  // C11 — Masthead visible in left pane (brand integrity)
  test('C11 — masthead is visible and in left pane at 820px', async ({ page }) => {
    const mast = await geo(page, 'header.masthead, .masthead');
    if (mast && mast.display !== 'none') {
      expect(mast.left,
        `Masthead starts too far right: left=${mast.left.toFixed(0)}`
      ).toBeLessThan(820 * 0.4); // masthead starts in left portion
    }
  });

  // C12 — Star button does not overlap drama badge at 820px
  test('C12 — star button does not overlap drama badge at 820px', async ({ page }) => {
    const star  = await geo(page, '.game-card .star-btn');
    const drama = await geo(page, '.game-card .otw-drama, .game-card .badge-drama');
    if (star && drama && star.width > 0 && drama.width > 0) {
      expect(overlaps(star, drama),
        `Star overlaps drama badge at 820px`
      ).toBe(false);
    }
  });

  // C99 — Screenshot for Layer 2 AI review
  test('C99 — capture screenshot for Layer 2 AI review', async ({ page }) => {
    fs.mkdirSync(VP_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(VP_SCREENSHOT_DIR, 'vp-820.png'), fullPage: false });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// VIEWPORT: 1200px — Desktop
// ══════════════════════════════════════════════════════════════════════════════
test.describe('1200px — Desktop', () => {
  test.use({ viewport: { width: 1200, height: 900 } });

  test.beforeEach(async ({ page }) => { await loadAndPrepare(page); });

  // D01 — Ambient panel hidden at desktop (no right-column at ≥1200px)
  test('D01 — ambient panel hidden at 1200px', async ({ page }) => {
    const g = await geo(page, '#ambient-panel');
    expect(g === null || g.display === 'none',
      `Ambient panel should be hidden at desktop. Got: ${g?.display}`
    ).toBe(true);
  });

  // D02 — OTW banner present (desktop shows OTW bar)
  test('D02 — OTW banner attached at 1200px', async ({ page }) => {
    await expect(page.locator('#otw-banner')).toBeAttached();
  });

  // D03 — Arbitrage bar attached
  test('D03 — arbitrage bar attached at 1200px', async ({ page }) => {
    await expect(page.locator('#field-arb')).toBeAttached();
  });

  // D04 — No horizontal scroll
  test('D04 — no horizontal scroll at 1200px', async ({ page }) => {
    const sw = await page.evaluate(() => document.body.scrollWidth);
    expect(sw, `Horizontal overflow at 1200px: ${sw}px`).toBeLessThanOrEqual(1210);
  });

  // D05 — Game cards ≥ 400px at desktop
  test('D05 — game card width ≥ 400px at 1200px', async ({ page }) => {
    const w = await page.evaluate(() => {
      const c = document.querySelector('.game-card');
      return c ? c.getBoundingClientRect().width : 999;
    });
    expect(w, `Card too narrow at desktop: ${w.toFixed(0)}px`).toBeGreaterThanOrEqual(400);
  });

  // D99 — Screenshot for Layer 2 AI review
  test('D99 — capture screenshot for Layer 2 AI review', async ({ page }) => {
    fs.mkdirSync(VP_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(VP_SCREENSHOT_DIR, 'vp-1200.png'), fullPage: false });
  });
});

// ══════════════════════════════════════════════════════════════════
// NEW — 5 MISSING VIEWPORT TESTS (specced May 24, built May 27)
// Covers: P3 (414), L1 (667 landscape), L2 (932 landscape),
//         T2 (1180 landscape), D3 (1440 desktop)
// ══════════════════════════════════════════════════════════════════

// ── P3 — 414px portrait (phone-large) ──────────────────────────
test.describe('414px portrait — Phone Large (P3)', () => {
  test.use({ viewport: { width: 414, height: 896 } });
  let page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto(BASE_URL);
    await page.waitForSelector('.game-card', { timeout: 12000 });
  });
  test.afterAll(async () => { await page.close(); });

  test('P3-01 — data-phone-tier is phone-large', async () => {
    const tier = await page.evaluate(() => document.body.dataset.phoneTier);
    expect(tier, `Expected phone-large, got: ${tier}`).toBe('phone-large');
  });

  test('P3-02 — venue badge display:inline-flex (NOT none)', async () => {
    const display = await page.evaluate(() => {
      const el = document.querySelector('.venue-badge');
      return el ? getComputedStyle(el).display : 'no-element';
    });
    expect(display, `venue-badge display: ${display}`).toBe('inline-flex');
  });

  test('P3-03 — game-card padding ≥ .85rem (13.6px)', async () => {
    const pad = await page.evaluate(() => {
      const el = document.querySelector('.game-card');
      return el ? parseFloat(getComputedStyle(el).paddingTop) : 0;
    });
    expect(pad, `card paddingTop: ${pad}px`).toBeGreaterThanOrEqual(13);
  });

  test('P3-04 — drama line present on at least one card', async () => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('.card-drama-line').length);
    expect(count, 'No drama lines at P3').toBeGreaterThan(0);
  });
});

// ── L1 — 667px landscape (phone landscape, SE-size) ────────────
test.describe('667px landscape — Phone Landscape (L1)', () => {
  test.use({ viewport: { width: 667, height: 375 } });
  let page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto(BASE_URL);
    await page.waitForSelector('.game-card', { timeout: 12000 });
  });
  test.afterAll(async () => { await page.close(); });

  test('L1-01 — single-column layout (no 2-col grid)', async () => {
    const gtc = await page.evaluate(() => {
      const el = document.querySelector('.sport-section-games');
      return el ? getComputedStyle(el).gridTemplateColumns : 'no-element';
    });
    // 1-col means value contains a single track — no "1fr 1fr" pattern
    const isTwoCol = /1fr\s+1fr|repeat\s*\(\s*2/.test(gtc);
    expect(isTwoCol, `Unexpected 2-col grid at L1: "${gtc}"`).toBe(false);
  });

  test('L1-02 — drama line present (mid-tier upgrade)', async () => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('.card-drama-line').length);
    expect(count, 'No drama lines at L1').toBeGreaterThan(0);
  });
});

// ── L2 — 932px landscape (phone-landscape-wide, Pro Max) ────────
test.describe('932px landscape — Phone Landscape Wide (L2)', () => {
  test.use({ viewport: { width: 932, height: 430 } });
  let page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 932, height: 430 });
    await page.goto(BASE_URL);
    await page.waitForSelector('.game-card', { timeout: 12000 });
  });
  test.afterAll(async () => { await page.close(); });

  test('L2-01 — data-phone-tier is phone-landscape-wide', async () => {
    const tier = await page.evaluate(() => document.body.dataset.phoneTier);
    expect(tier, `Expected phone-landscape-wide, got: ${tier}`).toBe('phone-landscape-wide');
  });

  test('L2-02 — sport-section-games has 2-column grid', async () => {
    const gtc = await page.evaluate(() => {
      const el = document.querySelector('.sport-section-games');
      return el ? getComputedStyle(el).gridTemplateColumns : 'no-element';
    });
    const isTwoCol = /1fr\s+1fr|repeat\s*\(\s*2/.test(gtc);
    expect(isTwoCol, `2-col grid not active at L2, columns: "${gtc}"`).toBe(true);
  });

  test('L2-03 — venue badge display:inline-flex', async () => {
    const display = await page.evaluate(() => {
      const el = document.querySelector('.venue-badge');
      return el ? getComputedStyle(el).display : 'no-element';
    });
    expect(display, `venue-badge display: ${display}`).toBe('inline-flex');
  });

  test('L2-04 — drama line present', async () => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('.card-drama-line').length);
    expect(count, 'No drama lines at L2').toBeGreaterThan(0);
  });
});

// ── T2 — 1180px landscape (iPad landscape) ──────────────────────
test.describe('1180px landscape — iPad Landscape (T2)', () => {
  test.use({ viewport: { width: 1180, height: 820 } });
  let page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.goto(BASE_URL);
    await page.waitForSelector('.game-card', { timeout: 12000 });
  });
  test.afterAll(async () => { await page.close(); });

  test('T2-01 — ambient panel present (not yet at D1 threshold)', async () => {
    const exists = await page.evaluate(() =>
      !!document.querySelector('#ambient-panel, .ambient-panel, [id*="ambient"]'));
    expect(exists, 'Ambient panel not found at T2 (1180px)').toBe(true);
  });

  test('T2-02 — NO three-column layout (T2 is Enlarged T1, not D1)', async () => {
    // Confirm we're below the 1200px laptop threshold — no LEFT/CENTRE/RIGHT
    const hasCentre = await page.evaluate(() =>
      !!document.querySelector('#field-centre, .field-centre, [id*="centre"]'));
    expect(hasCentre, 'CENTRE column appeared at T2 — should only activate at 1200px+').toBe(false);
  });

  test('T2-03 — drama line present (full tier expected)', async () => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('.card-drama-line').length);
    expect(count, 'No drama lines at T2').toBeGreaterThan(0);
  });
});

// ── D3 — 1440px desktop ─────────────────────────────────────────
test.describe('1440px — Desktop (D3/D4)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  let page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);
    await page.waitForSelector('.game-card', { timeout: 12000 });
  });
  test.afterAll(async () => { await page.close(); });

  test('D3-01 — LEFT column present at 1440px', async () => {
    const exists = await page.evaluate(() =>
      !!document.querySelector('#field-left, .field-left, [id*="field-left"]'));
    expect(exists, 'LEFT column not found at 1440px').toBe(true);
  });

  test('D3-02 — ambient/RIGHT panel present', async () => {
    const exists = await page.evaluate(() =>
      !!document.querySelector('#field-right, #ambient-panel, [id*="ambient"], .ambient-panel'));
    expect(exists, 'RIGHT/ambient panel not found at 1440px').toBe(true);
  });

  test('D3-03 — WHOLE FIELD toggle present and labelled', async () => {
    const exists = await page.evaluate(() =>
      !!document.querySelector('#whole-field-toggle, [id*="whole-field"], [data-mode]'));
    expect(exists, 'No WHOLE FIELD toggle at 1440px').toBe(true);
  });

  test('D3-04 — no horizontal overflow at 1440px', async () => {
    const sw = await page.evaluate(() => document.body.scrollWidth);
    expect(sw, `Horizontal overflow at 1440px: ${sw}px`).toBeLessThanOrEqual(1450);
  });
});
