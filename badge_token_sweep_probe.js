// CC-CMD-2026-08-09-badge-chip-token-sweep, Task 4.3.
//
// Rule 90: a colour change is a rendering change, so the artifact is a real
// browser against the LIVE deployed URL committing a structured manifest.
// Structure mirrors badge_visual_probe.js and ambient_skeleton_probe.js —
// one probe pattern in this repo, not three.
//
// The design decision that matters: expected colours are NOT hardcoded here.
// The probe reads each token's value off document.documentElement at runtime
// and compares the element's computed colour to THAT. A hardcoded rgb() would
// pass while proving only that I typed the same number twice, and would rot
// silently the first time a token is retuned. This asks the real question:
// "does this element resolve to the token it now claims to use?"
//
// Absence is not success. Playoff badges do not render in August, so every
// selector reports present/absent and an absent one is recorded as
// NOT-RENDERED — never folded into the pass count.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const VIEWPORT = { width: 1440, height: 900 };

// selector -> [token it must now resolve to, hex it must NO LONGER render]
const TARGETS = {
  '.field-chip--MUST':                 ['--drama-must',     '#ef4444'],
  '.field-chip--WATCH':                ['--drama-watch',    '#f59e0b'],
  '.field-chip--DISCOVERY':            ['--access-free',    null],
  '.field-chip--CAUTION':              ['--caution',        null],
  '.field-chip--QUIET':                ['--drama-low',      '#888888'],
  '.field-chip--INFO':                 ['--drama-watch',    '#60a5fa'],
  '.free-tonight-badge':               ['--access-free',    '#16a34a'],
  '.chip-auth.auth-free':              ['--access-free',    '#4ade80'],
  '.chip-have':                        ['--access-free',    '#4ade80'],
  '.badge-incl':                       ['--access-free',    '#4ade80'],
  '.importance-badge.elimination':     ['--angle-elim',     '#f87171'],
  '.importance-badge.series-deciding': ['--angle-deciding', '#fbbf24'],
  '.ts-badge.ts-elimination':          ['--angle-elim',     '#f87171'],
  '.ts-badge.ts-series_deciding':      ['--angle-deciding', '#fbbf24'],
  '.rival-badge':                      ['--angle-rivalry',  '#f97316'],
};

(async () => {
  // PW_EXECUTABLE lets this run against a locally-installed Chromium whose
  // build number does not match the npm package's expectation, which is the
  // case in the session sandbox. CI leaves it unset and uses the browser
  // `npx playwright install` fetched.
  const browser = await chromium.launch(
    process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
  const page = await browser.newPage({ viewport: VIEWPORT });
  // 'domcontentloaded', not 'networkidle': FIELD holds an SSE connection and
  // polls every 15-30s, so networkidle is not a slower wait, it is a wait that
  // cannot succeed. badge_visual_probe.js hung on exactly this.
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // Cards mount after the schedule fetch. Wait for any card rather than a
  // blind sleep; an empty slate is a real finding, handled as NOT-RENDERED.
  await page.waitForSelector('.game-card', { timeout: 25000 }).catch(() => {});

  const rows = await page.evaluate((targets) => {
    const hexToRgb = (h) => {
      h = h.trim().replace('#', '');
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
    };
    // SYNTHETIC PASS -- the correction that closed this probe's real gap.
    //
    // The first run left 14 of 15 rows NOT-RENDERED and I called it
    // "blocked on an August slate." That conflated two different claims:
    //   (1) does the DEPLOYED STYLESHEET resolve this selector to this token?
    //   (2) does the APP EMIT this class when it should?
    // Only (2) depends on fixtures. (1) is a pure property of the deployed
    // CSS, and it is answerable right now by creating an element with the
    // class in the live document and reading getComputedStyle off it. The
    // real page, the real stylesheet, a real browser -- only the element is
    // synthesized, and the element was never the thing under test.
    //
    // The two claims are reported as SEPARATE fields. A synthetic PASS is
    // not evidence of emission, and this must never be allowed to read as if
    // it were -- that would be the same conflation in the other direction.
    const mkSynthetic = (sel) => {
      const classes = sel.split('.').filter(Boolean);
      const host = document.createElement('span');
      host.className = classes.join(' ');
      host.textContent = 'probe';
      // Mounted inside a real card when one exists, so any ancestor-scoped
      // rule applies exactly as it would in situ; body otherwise.
      (document.querySelector('.game-card') || document.body).appendChild(host);
      const color = getComputedStyle(host).color;
      host.remove();
      return color;
    };
    const rootCS = getComputedStyle(document.documentElement);
    return Object.entries(targets).map(([sel, [token, retiredHex]]) => {
      const tokenRaw = rootCS.getPropertyValue(token).trim();
      const expected = tokenRaw ? hexToRgb(tokenRaw) : null;
      const els = Array.from(document.querySelectorAll(sel));
      return {
        selector: sel,
        token,
        tokenDefined: !!tokenRaw,
        tokenValue: tokenRaw || null,
        expectedRgb: expected,
        syntheticColor: mkSynthetic(sel),
        count: els.length,
        rendered: els.length > 0,
        // Every instance, not the first — one matching element is not proof
        // the rule applies to all of them.
        computedColors: [...new Set(els.map((el) => getComputedStyle(el).color))],
        retiredRgb: retiredHex ? hexToRgb(retiredHex) : null,
      };
    });
  }, TARGETS);

  // Two verdicts per row, deliberately not merged into one.
  //   cssVerdict       -- does the deployed stylesheet resolve this selector
  //                       to this token? Always answerable. This is what the
  //                       sweep changed, so this is what gates the sweep.
  //   emissionVerdict  -- does the app currently render this class? Fixture-
  //                       dependent, and NOT-EMITTED is a finding, not a
  //                       failure: it means either "no qualifying game today"
  //                       or "dead CSS", which only a grep for the emitter
  //                       can tell apart.
  let pass = 0, fail = 0, emitted = 0, notEmitted = 0;
  for (const r of rows) {
    if (!r.tokenDefined) { r.cssVerdict = 'FAIL-TOKEN-UNDEFINED'; fail++; }
    else {
      const synthOk = r.syntheticColor === r.expectedRgb;
      const synthRetired = r.retiredRgb && r.syntheticColor === r.retiredRgb;
      // Natural instances must agree too when any exist -- a synthetic node
      // cannot catch a more specific rule that only applies in situ.
      const naturalOk = !r.rendered || r.computedColors.every((c) => c === r.expectedRgb);
      r.cssVerdict = synthOk && !synthRetired && naturalOk ? 'PASS' : 'FAIL';
      r.cssVerdict === 'PASS' ? pass++ : fail++;
    }
    r.emissionVerdict = r.rendered ? 'EMITTED' : 'NOT-EMITTED';
    r.rendered ? emitted++ : notEmitted++;
    r.verdict = r.cssVerdict;   // kept so the earlier manifest shape still reads
  }

  const manifest = {
    ts: TS, url: URL, viewport: VIEWPORT,
    ccCmd: 'CC-CMD-2026-08-09-badge-chip-token-sweep',
    swVersion: await page.evaluate(() => window.SW_VERSION || null),
    summary: { pass, fail, emitted, notEmitted, total: rows.length },
    // Every row is now decidable, so conclusiveness is no longer "did enough
    // render" -- it is "was every selector checked and did all of them pass."
    // The previous definition (pass > 0 && fail === 0) returned true on a run
    // that proved 1 of 15, which is exactly the vacuous green this file's
    // header warns about.
    conclusive: pass + fail === rows.length && fail === 0,
    rows,
  };

  const base = `outbox/badge-token-sweep-probe-${TS}`;
  fs.writeFileSync(`${base}-manifest.json`, JSON.stringify(manifest, null, 2));
  await page.screenshot({ path: `${base}.png`, fullPage: false });
  await browser.close();

  console.log(JSON.stringify(manifest.summary), 'conclusive=', manifest.conclusive);
  for (const r of rows) console.log(`  css=${r.cssVerdict.padEnd(20)} ${r.emissionVerdict.padEnd(12)} ${r.selector.padEnd(36)} synth=${r.syntheticColor} natural=[${r.computedColors.join(',')}] want=${r.expectedRgb}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('probe failed:', e.stack || e.message); process.exit(1); });
