// CC-CMD-2026-08-09-ufl-epa-inline-token, done condition 5.
//
// Closes the gap that held that CC-CMD at 96. I wrote there that proving the
// fix end-to-end "needs a live UFL play with |epa| >= 0.5, and UFL is out of
// season". That conflated two claims, the same error as the earlier
// "blocked on an August slate":
//
//   1. does a live UFL game exist right now?          <- seasonal, irrelevant
//   2. when _buildUFLEpaHTML runs with a significant   <- what was actually
//      epa, does the chip render --white?                 unproven
//
// Only (2) matters, and _buildUFLEpaHTML is a PURE FUNCTION of its argument.
// ESPN supplies `state` in production; here the probe supplies it. Same
// function, same template, same stylesheet, same browser. The calendar was
// never in the way.
//
// What makes this evidence rather than theatre: the markup injected into the
// page is NOT hand-written here. It is the string the REAL function returns,
// extracted from src/legacy/field.js and executed. Re-typing the template
// would prove only that I can copy it -- the exact trap that made the four
// dead .mlb-park-badge variant rules look verified for weeks.
//
// Artifact form: an enumerated set of input/output pairs, all of which must
// pass (Rule 90).

const { chromium } = require('@playwright/test');
const fs = require('fs');

const URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const VIEWPORT = { width: 1440, height: 900 };

const SRC = fs.readFileSync('src/legacy/field.js', 'utf8');

// Extract the function by name from source and execute it. Brace-counted from
// its declaration rather than regex-sliced, so a nested block or a `}` inside
// the template literal cannot truncate it.
function extractFn(name) {
  const start = SRC.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in src/legacy/field.js`);
  let i = SRC.indexOf('{', start), depth = 0, end = -1;
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  if (end < 0) throw new Error(`${name}: unbalanced braces`);
  return SRC.slice(start, end);
}

const fnSource = extractFn('_buildUFLEpaHTML');
// eslint-disable-next-line no-new-func
const buildUFLEpaHTML = new Function(`${fnSource}; return _buildUFLEpaHTML;`)();

// The three branches, by their own thresholds. A "significant" play either way
// takes the same arm, so both signs are exercised rather than assumed
// symmetric.
const CASES = [
  { key: 'good',    epa: 0.9,  expectToken: '--white' },
  { key: 'bad',     epa: -0.9, expectToken: '--white' },
  { key: 'neutral', epa: 0.1,  expectToken: '--muted' },
];

const mkState = (epa) => ({
  lastPlay: { epa, situation: '2nd & 7 at MEM 42' },
  driveEpa: 1.2,
  drivePlayCount: 6,
});

(async () => {
  const browser = await chromium.launch(
    process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('.game-card', { timeout: 25000 }).catch(() => {});

  // The function source comes from the repo at HEAD; the page is the DEPLOYED
  // build. If those differ, this probe measures one build's function against
  // another build's stylesheet and the result means nothing. Asserted, not
  // assumed.
  const repoSW = (SRC.match(/const SW_VERSION = '([^']+)'/) || [])[1] || null;
  const deployedSW = await page.evaluate(() => window.SW_VERSION || null);
  const swMatch = repoSW != null && repoSW === deployedSW;

  const html = Object.fromEntries(CASES.map((c) => [c.key, buildUFLEpaHTML(mkState(c.epa))]));

  const rows = await page.evaluate(({ cases, html }) => {
    const rootCS = getComputedStyle(document.documentElement);
    const hexToRgb = (h) => {
      h = h.trim().replace('#', '');
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
    };
    // Injected into a REAL card, not document.body: .epa-chip inherits, and
    // the whole point is what it resolves to in its production ancestor chain.
    const host = document.querySelector('.game-card') || document.body;
    return cases.map((c) => {
      const wrap = document.createElement('div');
      wrap.innerHTML = html[c.key];
      host.appendChild(wrap);
      const chip = wrap.querySelector('.epa-chip');
      const tokenRaw = rootCS.getPropertyValue(c.expectToken).trim();
      const row = {
        ...c,
        emittedHtml: html[c.key].slice(0, 140),
        // The literal the real function put in the style attribute.
        emittedStyle: chip ? chip.getAttribute('style') : null,
        chipFound: !!chip,
        tokenValue: tokenRaw || null,
        expectedRgb: tokenRaw ? hexToRgb(tokenRaw) : null,
        computed: chip ? getComputedStyle(chip).color : null,
        parentComputed: chip ? getComputedStyle(wrap).color : null,
      };
      // Two separate assertions, deliberately not merged:
      //   emissionOk -- the function emitted the token it should have
      //   resolvedOk -- that token actually resolves to a colour in situ
      // The old bug passed the first and failed the second, which is exactly
      // why collapsing them into one boolean would hide this class of defect.
      row.emissionOk = !!row.emittedStyle && row.emittedStyle.includes(`var(${c.expectToken})`);
      row.resolvedOk = row.computed != null && row.computed === row.expectedRgb;
      row.verdict = row.chipFound && row.emissionOk && row.resolvedOk ? 'PASS' : 'FAIL';
      wrap.remove();
      return row;
    });
  }, { cases: CASES, html });

  const pass = rows.filter((r) => r.verdict === 'PASS').length;
  const fail = rows.length - pass;
  // The regression this whole CC-CMD is about: good and bad must NOT be
  // distinguishable from each other by colour (they share an arm), but the
  // significant arm MUST differ from neutral. Asserted rather than eyeballed.
  const good = rows.find((r) => r.key === 'good');
  const bad = rows.find((r) => r.key === 'bad');
  const neutral = rows.find((r) => r.key === 'neutral');
  const emphasisCorrect =
    good?.computed === bad?.computed && good?.computed !== neutral?.computed;

  const manifest = {
    ts: TS, url: URL, viewport: VIEWPORT,
    ccCmd: 'CC-CMD-2026-08-09-ufl-epa-inline-token',
    repoSW, deployedSW, swMatch,
    fnSourceSha: require('crypto').createHash('sha256').update(fnSource).digest('hex').slice(0, 16),
    summary: { pass, fail, total: rows.length },
    emphasisCorrect,
    conclusive: swMatch && fail === 0 && emphasisCorrect,
    rows,
  };

  const base = `outbox/ufl-epa-render-probe-${TS}`;
  fs.writeFileSync(`${base}-manifest.json`, JSON.stringify(manifest, null, 2));
  await browser.close();

  console.log(`swMatch=${swMatch} (repo ${repoSW} / deployed ${deployedSW})`);
  for (const r of rows) {
    console.log(`  ${r.verdict}  epa=${String(r.epa).padStart(5)}  emitted=${r.emittedStyle}  computed=${r.computed}  want=${r.expectedRgb}`);
  }
  console.log(`emphasisCorrect=${emphasisCorrect}  conclusive=${manifest.conclusive}`);
  process.exit(manifest.conclusive ? 0 : 1);
})().catch((e) => { console.error('probe failed:', e.stack || e.message); process.exit(1); });
