// CC-CMD-2026-08-09-badge-visual-probe.
//
// Rule 90: a visual/rendering change needs a REAL browser against the LIVE
// deployed URL, committing a screenshot plus a STRUCTURED manifest (booleans
// and computed values, not prose). Sandbox browser access has proven
// unreliable in this project, which is why this runs on a runner.
//
// Structure mirrors ambient_skeleton_probe.js deliberately — one probe
// pattern in this repo, not two.
//
// What it proves that reading the CSS cannot: `distinctColors`. All four
// .mlb-park-badge variants were collapsed to var(--smoke). If they still
// render different colours, CSS specificity did not win and the change is
// NOT live regardless of what index.html says.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const VIEWPORT = { width: 1440, height: 900 };

// The four hues this change retired. badgeComputedColor must be NONE of them.
const RETIRED = { '#f59e0b': 'rgb(245, 158, 11)', '#22c55e': 'rgb(34, 197, 94)',
                  '#60a5fa': 'rgb(96, 165, 250)', '#818cf8': 'rgb(129, 140, 248)' };
const SMOKE = 'rgb(106, 106, 138)';   // --smoke #6a6a8a

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  // 'domcontentloaded', NOT 'networkidle' — matching ambient_skeleton_probe.js,
  // which is the proven pattern here. My first version used networkidle and the
  // step hung: FIELD holds an SSE connection and polls ESPN every 15-30s, so the
  // network NEVER goes idle and the wait runs to timeout. On a live-polling PWA
  // networkidle is not a slower wait, it is a wait that cannot succeed.
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // Cards mount after the schedule fetch resolves. Wait for the badge itself
  // rather than a blind sleep; if none appears that is a real finding (empty
  // slate), handled below, not an error.
  await page.waitForSelector('.mlb-park-badge', { timeout: 25000 }).catch(() => {});

  const result = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.mlb-park-badge'));
    return els.map(el => {
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || '').trim(),
        variant: (el.className.match(/park-[a-z-]+/) || [])[0] || null,
        color: cs.color,
        fontFamily: cs.fontFamily,
      };
    });
  });

  const colors = [...new Set(result.map(r => r.color))];
  const fonts  = [...new Set(result.map(r => r.fontFamily))];
  const retiredHit = colors.filter(c => Object.values(RETIRED).includes(c));

  const manifest = {
    probe: 'badge-visual-probe',
    url: URL,
    viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
    utc: new Date().toISOString(),
    badgePresent: result.length > 0,
    badgeCount: result.length,
    variantsFound: [...new Set(result.map(r => r.variant).filter(Boolean))],
    badgeComputedColor: colors[0] || null,
    distinctColors: colors.length,
    allColors: colors,
    badgeFontFamily: fonts[0] || null,
    // Assertions, as booleans so the manifest itself is the artifact.
    assert_colorIsSmoke: colors.length > 0 && colors.every(c => c === SMOKE),
    assert_noRetiredHue: retiredHit.length === 0,
    assert_collapsedToOne: colors.length === 1,
    assert_isMonospace: fonts.some(f => /DM Mono|monospace/i.test(f || '')),
    retiredHuesStillRendering: retiredHit,
    samples: result.slice(0, 6),
  };

  const shot = `outbox/badge-visual-probe-${TS}.png`;
  await page.screenshot({ path: shot, fullPage: false });
  fs.writeFileSync(`outbox/badge-visual-probe-manifest-${TS}.json`, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
  await browser.close();

  // An empty slate proves NOTHING. Say so and exit 0 rather than letting a
  // green run read as verification (the CC-CMD requires this explicitly).
  if (!manifest.badgePresent) {
    console.log('\nNO .mlb-park-badge ON THE PAGE — MLB may be off-slate at this hour.');
    console.log('This run VERIFIES NOTHING. Re-run when a park badge is rendering.');
    process.exit(0);
  }
  const failed = ['assert_colorIsSmoke','assert_noRetiredHue','assert_collapsedToOne','assert_isMonospace']
    .filter(k => !manifest[k]);
  if (failed.length) { console.error('\nFAILED: ' + failed.join(', ')); process.exit(1); }
  console.log('\nPASS: badge renders monospace, single colour, --smoke, no retired hue.');
})();
