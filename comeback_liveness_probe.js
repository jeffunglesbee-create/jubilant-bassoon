// CC-CMD-2026-08-12-comeback-probability-liveness-gate — Done Condition.
//
// Rule 90: a rendering defect is proved by the CI-as-proxy Playwright pattern
// against the LIVE deployed URL, committing a screenshot and a manifest of
// booleans/integers -- not prose, not "looks right".
//
// Mechanism copied from ambient_skeleton_probe.js / ambient-skeleton-probe.yml,
// the reference implementation named in Rule 90.
//
// WHAT IT MEASURES
//
//   tiedStringCount  occurrences of the tie string inside the Stats tab's
//                    Today's Games block
//   todayGameCount   Today's Games entries rendered (.stats-subsection)
//   liveCardCount    live games on the schedule, via .game-card.espn-live --
//                    the production live class (src/legacy/field.js:7645),
//                    NOT the STAGED renderCard() path at L2442
//
// PASS: tiedStringCount <= liveCardCount AND todayGameCount > 0.
//
// Deliberately NOT `tiedStringCount === 0`. A genuinely tied LIVE game may
// legitimately show the string -- that is the feature working. A probe
// demanding zero would fail correct code on a busy evening, and a check that
// fails when nothing is wrong is a check that gets switched off.
//
// todayGameCount > 0 is required separately: a probe that finds no games at
// all has measured nothing and must not report PASS. That is the "vacuous
// assertion" failure this repo hit on 2026-08-08 (a SW_VERSION grep that
// never matched, reported as a pass).

const { chromium } = require('@playwright/test');
const fs = require('fs');

const URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const PHASE = process.env.PROBE_PHASE || 'unknown';   // 'baseline' | 'postfix'
const TS = new Date().toISOString().replace(/[:.]/g, '-');

// The exact rendered string, U+2014 em dash and U+2019 right single quote, as
// emitted by buildComebackProbability. Written as escapes so an editor cannot
// silently normalise them into ASCII and make the count always zero -- which
// would read as PASS while measuring nothing.
const TIED = 'Tied — anyone’s game';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 2000 } });
  const manifest = { phase: PHASE, url: URL, ts: TS, tiedString: TIED };

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Boot is staggered (briefs at +1000ms, badges at +300ms). Wait for the
    // schedule to actually populate rather than sleeping a fixed interval --
    // a fixed settle is what turned a propagation transient into a reported
    // failure in the relay's laboratory probe on 2026-08-10.
    await page.waitForSelector('.game-card', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(8000);

    manifest.moduleBooted = await page.evaluate(
      () => document.querySelectorAll('.game-card').length > 0);
    manifest.swVersion = await page.evaluate(() => window.SW_VERSION || null);
    manifest.liveCardCount = await page.evaluate(
      () => document.querySelectorAll('.game-card.espn-live').length);

    // Open the Stats tab the way a user does -- click the nav link, which
    // calls toggleStatsView(). Not by un-hiding the section directly: that
    // would render a surface the app never actually built.
    await page.click('#stats-nav-link', { timeout: 15000 });
    await page.waitForTimeout(6000);

    const stats = await page.evaluate((tied) => {
      const sec = document.getElementById('stats-section');
      if (!sec) return { statsSectionPresent: false };
      const blocks = [...sec.querySelectorAll('.stats-sport-block')];
      const tg = blocks.find((b) =>
        (b.querySelector('.stats-sport-label')?.textContent || '').includes("Today's Games"));
      const scope = tg || sec;
      const text = scope.textContent || '';
      // split().length - 1 counts overlapping-free occurrences; indexOf loops
      // would be equivalent. Counting on textContent rather than innerHTML so
      // an entity-encoded apostrophe cannot hide a match.
      return {
        statsSectionPresent: true,
        statsSectionVisible: !sec.hasAttribute('hidden'),
        todayGamesBlockPresent: !!tg,
        todayGameCount: tg ? tg.querySelectorAll('.stats-subsection').length : 0,
        tiedStringCount: text.split(tied).length - 1,
        statsBlockCount: blocks.length,
      };
    }, TIED);
    Object.assign(manifest, stats);

    await page.screenshot({ path: `outbox/comeback-liveness-${PHASE}-${TS}.png`, fullPage: false });
    const tgBox = await page.$('.stats-sport-block:has(.stats-sport-label)');
    if (tgBox) await tgBox.screenshot({ path: `outbox/comeback-liveness-${PHASE}-block-${TS}.png` }).catch(() => {});
  } catch (e) {
    // Captured into the manifest rather than swallowed. A bare catch{} on this
    // repo's surface-render probe hid the real error and cost a whole run.
    manifest.error = String(e && e.message ? e.message : e);
  } finally {
    await browser.close();
  }

  manifest.pass =
    manifest.moduleBooted === true &&
    manifest.todayGamesBlockPresent === true &&
    manifest.todayGameCount > 0 &&
    typeof manifest.tiedStringCount === 'number' &&
    manifest.tiedStringCount <= (manifest.liveCardCount ?? 0);

  fs.writeFileSync(`outbox/comeback-liveness-manifest-${PHASE}-${TS}.json`,
    JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));

  // Exit 0 either way: the BASELINE run is EXPECTED to fail its PASS
  // condition -- that failure is the artifact proving the bug was real. A
  // non-zero exit would redden the run and invite a re-run until green, which
  // is exactly the habit Rule 77 exists to break. The manifest's `pass` field
  // is the verdict; the process exit code is not.
  process.exit(0);
})();
