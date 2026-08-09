// CC-CMD-2026-08-09-surface-render-probe.
//
// Closes the named ceiling on CC-CMD-2026-08-09-phantom-css-token-audit
// (scored 95). That audit fixed 50 declarations that were INVALID at
// computed-value time -- `background:var(--bg2)` with --bg2 undefined and no
// fallback, which CSS drops entirely. Those surfaces were rendering with no
// background at all. Every one is now a visible difference on the deployed
// site and none was individually verified.
//
// Why badge_token_sweep_probe.js cannot cover these: it reads `color` off
// elements that exist or can be stood in for by a detached <span>. These
// surfaces are different in kind. They are hidden behind UI state, and the
// claim is about `background` on the REAL element in its REAL stacking
// context. A synthetic span cannot stand in for "the privacy modal is opaque."
//
// Every surface records HOW it was opened. The reveal paths are the app's
// own -- a click on the real control, or the exact line the app's own
// reveal function runs -- never an invented one, and never `display:block`
// standing in for a path that does something else too.
//
// A surface that could not be opened is NOT-OPENED and never a pass. Same
// rule as the badge probe's NOT-EMITTED: an absent thing proves nothing.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const VIEWPORT = { width: 1440, height: 900 };

// Expected colours are read from the deployed tokens at runtime, never
// hardcoded -- same reasoning as the badge probe. A literal rgb() would
// prove only that I typed the same number twice.
const SURFACES = [
  { key: 'privacy-banner',   selector: '#privacy-banner',  token: '--card',
    how: 'auto: initPrivacyBanner() shows it when localStorage.field_privacy_v1 is unset' },
  { key: 'privacy-modal',    selector: '.privacy-modal',   token: '--card',
    how: 'click #privacy-policy-link, the real control whose listener calls showPrivacyPolicyModal()' },
  { key: 'jrn-companion',    selector: '#jrn-companion',   token: '--obsidian',
    how: 'toggleJournalismView(), global at runtime (index.html carries onclick="toggleJournalismView()")' },
  { key: 'eu-push-consent',  selector: '#eu-push-consent', token: '--card',
    how: "el.style.display='block' -- byte-identical to showEUPushConsent()'s own reveal line; that function is not exposed on window and its natural trigger needs an EU timezone plus the push flow" },
];

const TRANSPARENT = new Set(['rgba(0, 0, 0, 0)', 'transparent', '']);

(async () => {
  const browser = await chromium.launch(
    process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
  const page = await browser.newPage({ viewport: VIEWPORT });
  // 'domcontentloaded', not 'networkidle': FIELD holds an SSE connection and
  // polls every 15-30s, so networkidle is a wait that cannot succeed.
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // The privacy banner suppresses itself once a choice is stored. A fresh
  // context has none, but clearing and reloading makes that explicit rather
  // than dependent on Playwright's isolation staying as it is today.
  await page.evaluate(() => localStorage.removeItem('field_privacy_v1'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('.game-card', { timeout: 25000 }).catch(() => {});

  // ── reveal, each by its own path ────────────────────────────────────────
  //
  // visible() is NOT offsetParent. My first version used it and reported all
  // four surfaces NOT-OPENED: offsetParent is null for EVERY position:fixed
  // element, and .jrn-companion and .eu-push-consent are both fixed. The
  // probe would have failed loudly about a bug that was not there.
  const VISIBLE_FN = `(el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }`;
  const opened = {};
  opened['privacy-banner'] = await page.evaluate((fn) =>
    eval(fn)(document.getElementById('privacy-banner')), VISIBLE_FN);

  await page.click('#privacy-policy-link', { timeout: 5000 }).catch(() => {});
  opened['privacy-modal'] = await page.evaluate((fn) =>
    eval(fn)(document.querySelector('.privacy-modal')), VISIBLE_FN);

  // window.toggleJournalismView, not a bare reference. The app ships as
  // <script type="module"> (esbuild format:'esm'), so nothing is global
  // except what the module explicitly assigns to window -- and this function
  // is one of exactly 55 such assignments. My first version inferred it was
  // global from index.html's inline onclick, which is not the same claim.
  //
  // The error is CAPTURED, not swallowed. A bare catch{} here would turn the
  // one piece of evidence explaining a NOT-OPENED into silence.
  const toggleError = await page.evaluate(() => {
    try { window.toggleJournalismView(); return null; }
    catch (e) { return String(e && e.message || e).slice(0, 160); }
  });
  await page.waitForTimeout(400);
  opened['jrn-companion'] = await page.evaluate((fn) =>
    document.body.classList.contains('journalism-mode')
    && eval(fn)(document.getElementById('jrn-companion')), VISIBLE_FN);

  opened['eu-push-consent'] = await page.evaluate((fn) => {
    const el = document.getElementById('eu-push-consent');
    if (!el) return false;
    el.style.display = 'block';
    return eval(fn)(el);
  }, VISIBLE_FN);

  // Did the app's module actually execute? On a build where it did not, every
  // surface reports NOT-OPENED and the cause is the bundle, not the CSS. Kept
  // as its own field so those two are never confused.
  const moduleBooted = await page.evaluate(() =>
    typeof window.toggleJournalismView === 'function');

  // ── measure ─────────────────────────────────────────────────────────────
  const rows = await page.evaluate(({ surfaces, opened, transparent }) => {
    const hexToRgb = (h) => {
      h = h.trim().replace('#', '');
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
    };
    const rootCS = getComputedStyle(document.documentElement);
    return surfaces.map((s) => {
      const el = document.querySelector(s.selector);
      const tokenRaw = rootCS.getPropertyValue(s.token).trim();
      const expected = tokenRaw ? hexToRgb(tokenRaw) : null;
      const bg = el ? getComputedStyle(el).backgroundColor : null;
      return {
        ...s,
        present: !!el,
        opened: !!opened[s.key],
        tokenValue: tokenRaw || null,
        expectedBackground: expected,
        background: bg,
        // The two claims kept separate. `opaque` is the bug that was fixed --
        // these rendered fully transparent. `matchesToken` is the stronger
        // claim that it is opaque in the RIGHT colour. Reporting only the
        // first would let any stray background count as success.
        opaque: bg != null && !transparent.includes(bg),
        matchesToken: bg != null && expected != null && bg === expected,
      };
    });
  }, { surfaces: SURFACES, opened, transparent: [...TRANSPARENT] });

  let pass = 0, fail = 0, notOpened = 0;
  for (const r of rows) {
    if (!r.present || !r.opened) { r.verdict = 'NOT-OPENED'; notOpened++; continue; }
    r.verdict = r.opaque && r.matchesToken ? 'PASS' : 'FAIL';
    r.verdict === 'PASS' ? pass++ : fail++;
  }

  // ── artifacts ───────────────────────────────────────────────────────────
  const base = `outbox/surface-render-probe-${TS}`;
  for (const r of rows) {
    if (r.verdict === 'NOT-OPENED') continue;
    await page.locator(r.selector).first()
      .screenshot({ path: `${base}-${r.key}.png` })
      .catch((e) => { r.screenshotError = e.message.slice(0, 120); });
  }
  await page.screenshot({ path: `${base}-full.png` });

  const manifest = {
    ts: TS, url: URL, viewport: VIEWPORT,
    ccCmd: 'CC-CMD-2026-08-09-surface-render-probe',
    swVersion: await page.evaluate(() => window.SW_VERSION || null),
    moduleBooted,
    toggleError,
    summary: { pass, fail, notOpened, total: rows.length },
    // Every surface must be decided. A run where nothing opened proves
    // nothing, and must not read as green.
    conclusive: pass + fail === rows.length && fail === 0,
    rows,
  };
  fs.writeFileSync(`${base}-manifest.json`, JSON.stringify(manifest, null, 2));
  await browser.close();

  console.log(JSON.stringify(manifest.summary), 'conclusive=', manifest.conclusive,
              'moduleBooted=', moduleBooted, 'toggleError=', toggleError);
  for (const r of rows) {
    console.log(`  ${r.verdict.padEnd(11)} ${r.key.padEnd(18)} bg=${r.background} want=${r.expectedBackground} opaque=${r.opaque}`);
  }
  process.exit(fail === 0 && notOpened === 0 ? 0 : 1);
})().catch((e) => { console.error('probe failed:', e.stack || e.message); process.exit(1); });
