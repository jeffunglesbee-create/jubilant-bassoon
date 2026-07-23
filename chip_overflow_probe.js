// chip_overflow_probe.js — verifies .stream-chip and .watch-now-btn overflow containment
// Measures real scrollWidth/clientWidth per chip and bounding-box sibling overlap.
// CC-CMD-2026-07-23-chip-overflow-containment TASK 2 live verification.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';
const SCRATCHPAD = 'outbox';

// Portrait mobile viewport matching IMG_9631
const VIEWPORT = { name: 'mobile_portrait_390', width: 390, height: 844 };

function ts() {
  return new Date().toISOString().replace(/[-:]/g,'').replace('T','T').slice(0,15) + 'Z';
}

function boxesOverlap(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function run() {
  const stamp = ts();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: VIEWPORT.width, height: VIEWPORT.height } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });

  // Wait for game cards to render (stream-row populated by first poll)
  const hasCards = await page.waitForFunction(
    () => document.querySelectorAll('.stream-chip, .watch-now-btn').length > 0,
    { timeout: 20000 }
  ).then(() => true).catch(() => false);

  // Give poll one extra tick
  await page.waitForTimeout(1000);

  // Screenshot the card area
  const screenshotPath = `${SCRATCHPAD}/chip-overflow-probe-${VIEWPORT.name}-${stamp}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });

  // Measure all chips and buttons
  const measurements = await page.evaluate(() => {
    const results = [];

    // Measure each stream-chip
    document.querySelectorAll('.stream-chip').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      results.push({
        type: 'stream-chip',
        index: i,
        label: el.textContent.trim().slice(0, 40),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflows: el.scrollWidth > el.clientWidth,
        rect: { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height },
      });
    });

    // Measure each watch-now-btn
    document.querySelectorAll('.watch-now-btn').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      results.push({
        type: 'watch-now-btn',
        index: i,
        label: el.textContent.trim().slice(0, 40),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflows: el.scrollWidth > el.clientWidth,
        rect: { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height },
      });
    });

    return results;
  });

  // Detect bounding-box overlaps between siblings within the same stream-row
  const overlapPairs = await page.evaluate(() => {
    const pairs = [];
    document.querySelectorAll('.stream-row').forEach(row => {
      const chips = Array.from(row.querySelectorAll('.stream-chip, .watch-now-btn, .cal-btn, .share-btn'));
      for (let i = 0; i < chips.length; i++) {
        for (let j = i + 1; j < chips.length; j++) {
          const a = chips[i].getBoundingClientRect();
          const b = chips[j].getBoundingClientRect();
          const overlap = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
          if (overlap && a.width > 0 && b.width > 0) {
            pairs.push({
              a: chips[i].className.split(' ')[0] + '[' + i + ']',
              b: chips[j].className.split(' ')[0] + '[' + j + ']',
              aRect: { top: a.top, right: a.right, bottom: a.bottom, left: a.left },
              bRect: { top: b.top, right: b.right, bottom: b.bottom, left: b.left },
            });
          }
        }
      }
    });
    return pairs;
  });

  const totalChips = measurements.length;
  const overflowingChips = measurements.filter(m => m.overflows);
  const allPass = overflowingChips.length === 0 && overlapPairs.length === 0;

  const manifest = {
    timestamp: stamp,
    viewport: VIEWPORT,
    url: FIELD_URL,
    hasCards,
    totalChipsMeasured: totalChips,
    overflowingChips: overflowingChips.length,
    overlapPairCount: overlapPairs.length,
    allPass,
    // Per VERIFY-ARTIFACT-A: falsifiable boolean fields
    noScrollWidthOverflow: overflowingChips.length === 0,
    noSiblingOverlap: overlapPairs.length === 0,
    measurements,
    overlapPairs,
    consoleErrors: errors.slice(0, 10),
    screenshotPath,
  };

  const manifestPath = `${SCRATCHPAD}/chip-overflow-probe-manifest-${stamp}.json`;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`=== Chip Overflow Probe [${stamp}] ===`);
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height} (${VIEWPORT.name})`);
  console.log(`Cards loaded: ${hasCards}`);
  console.log(`Chips measured: ${totalChips}`);
  console.log(`Overflowing (scrollWidth > clientWidth): ${overflowingChips.length}`);
  if (overflowingChips.length > 0) {
    overflowingChips.forEach(m => console.log(`  OVERFLOW: [${m.type}] "${m.label}" scrollWidth=${m.scrollWidth} clientWidth=${m.clientWidth}`));
  }
  console.log(`Sibling overlap pairs: ${overlapPairs.length}`);
  if (overlapPairs.length > 0) {
    overlapPairs.forEach(p => console.log(`  OVERLAP: ${p.a} ↔ ${p.b}`));
  }
  console.log(`Result: ${allPass ? 'ALL PASS ✓' : 'FAILURES DETECTED ✗'}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Screenshot: ${screenshotPath}`);

  await browser.close();

  if (!allPass) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Probe error:', err);
  process.exit(1);
});
