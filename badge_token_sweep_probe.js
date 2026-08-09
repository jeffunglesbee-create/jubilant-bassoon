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
  const browser = await chromium.launch();
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
        count: els.length,
        rendered: els.length > 0,
        // Every instance, not the first — one matching element is not proof
        // the rule applies to all of them.
        computedColors: [...new Set(els.map((el) => getComputedStyle(el).color))],
        retiredRgb: retiredHex ? hexToRgb(retiredHex) : null,
      };
    });
  }, TARGETS);

  let pass = 0, fail = 0, notRendered = 0;
  for (const r of rows) {
    if (!r.rendered) { r.verdict = 'NOT-RENDERED'; notRendered++; continue; }
    if (!r.tokenDefined) { r.verdict = 'FAIL-TOKEN-UNDEFINED'; fail++; continue; }
    const allMatch = r.computedColors.every((c) => c === r.expectedRgb);
    const anyRetired = r.retiredRgb && r.computedColors.includes(r.retiredRgb);
    r.verdict = allMatch && !anyRetired ? 'PASS' : 'FAIL';
    r.verdict === 'PASS' ? pass++ : fail++;
  }

  const manifest = {
    ts: TS, url: URL, viewport: VIEWPORT,
    ccCmd: 'CC-CMD-2026-08-09-badge-chip-token-sweep',
    swVersion: await page.evaluate(() => window.SW_VERSION || null),
    summary: { pass, fail, notRendered, total: rows.length },
    // A run where nothing rendered proves nothing. Named explicitly so the
    // manifest cannot be read as a green result on an empty slate.
    conclusive: pass > 0 && fail === 0,
    rows,
  };

  const base = `outbox/badge-token-sweep-probe-${TS}`;
  fs.writeFileSync(`${base}-manifest.json`, JSON.stringify(manifest, null, 2));
  await page.screenshot({ path: `${base}.png`, fullPage: false });
  await browser.close();

  console.log(JSON.stringify(manifest.summary), 'conclusive=', manifest.conclusive);
  for (const r of rows) console.log(`  ${r.verdict.padEnd(20)} ${r.selector.padEnd(36)} n=${r.count} ${r.computedColors.join(',')} want ${r.expectedRgb}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('probe failed:', e.stack || e.message); process.exit(1); });
