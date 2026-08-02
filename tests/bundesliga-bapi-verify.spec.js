// tests/bundesliga-bapi-verify.spec.js
// CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts Task 1.
// Independent, jubilant-bassoon-only re-verification (no field-playground
// dependency). Real fix over the first attempt: (1) use the REAL page's
// own request to wapp.bapi.bundesliga.com (captured via page.on('response'))
// to get the real headers/status rather than a bare API-context request
// that got 403 -- a headless bare request likely lacks Origin/Referer/
// session artifacts the real page sends; (2) take a real screenshot before
// guessing nav selectors, so any second attempt is informed by what the
// page actually looks like instead of blind CSS-selector guessing.

const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('bundesliga bapi fresh re-verification via real page network capture', async ({ page }) => {
  const result = {
    timestamp: new Date().toISOString(),
    realBroadcastersRequestCaptured: false,
    realBroadcastersStatus: null,
    realBroadcastsRequestCaptured: false,
    realBroadcastsStatus: null,
    realBroadcastsUrl: null,
    distinctDflDayIds: [],
    distinctDflComIds: [],
    navLinksFound: [],
    matchdayNavClickCount: 0,
  };

  const dayIds = new Set();
  const comIds = new Set();

  page.on('response', (resp) => {
    const url = resp.url();
    if (url.includes('bapi.bundesliga.com')) {
      if (url.includes('/broadcasters')) {
        result.realBroadcastersRequestCaptured = true;
        result.realBroadcastersStatus = resp.status();
      }
      if (url.includes('/broadcasts/')) {
        result.realBroadcastsRequestCaptured = true;
        result.realBroadcastsStatus = resp.status();
        result.realBroadcastsUrl = url;
        const dm = url.match(/DFL-DAY-[A-Z0-9]+/);
        const cm = url.match(/DFL-COM-[A-Z0-9]+/);
        if (dm) dayIds.add(dm[0]);
        if (cm) comIds.add(cm[0]);
      }
    }
  });

  await page.goto('https://www.bundesliga.com/en/bundesliga/matchday', {
    waitUntil: 'networkidle',
    timeout: 30000,
  }).catch(async () => {
    await page.goto('https://www.bundesliga.com/en/bundesliga', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
  });
  await page.waitForTimeout(3000);

  // Real screenshot -- ground truth for what nav elements actually exist,
  // instead of guessing CSS selectors against an unknown DOM a second time.
  fs.mkdirSync('outbox', { recursive: true });
  await page.screenshot({ path: 'outbox/bundesliga-matchday-page.png', fullPage: false }).catch(() => {});

  // Real DOM enumeration -- list every clickable element whose visible text
  // or aria-label mentions a matchday-like word, with its real selector-
  // relevant attributes, so any second-pass automation has real data to
  // act on instead of another blind guess.
  const candidates = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    return els
      .filter(el => {
        const t = (el.textContent || '').trim();
        const aria = el.getAttribute('aria-label') || '';
        return /matchday|spieltag|round|week/i.test(t) || /matchday|spieltag/i.test(aria);
      })
      .slice(0, 15)
      .map(el => ({
        tag: el.tagName,
        text: (el.textContent || '').trim().slice(0, 40),
        ariaLabel: el.getAttribute('aria-label') || null,
        className: (el.className || '').toString().slice(0, 80),
        id: el.id || null,
      }));
  });
  result.navLinksFound = candidates;

  // Attempt clicks using the REAL enumerated candidates (not a guessed
  // selector list) if any exist.
  for (const c of candidates.slice(0, 3)) {
    try {
      const locator = c.id
        ? page.locator(`[id="${c.id}"]`)
        : page.getByText(c.text, { exact: false }).first();
      await locator.click({ timeout: 3000 });
      result.matchdayNavClickCount++;
      await page.waitForTimeout(2000);
    } catch (e) { /* not clickable, skip */ }
  }

  result.distinctDflDayIds = [...dayIds];
  result.distinctDflComIds = [...comIds];

  fs.writeFileSync('outbox/bundesliga-bapi-verify-result.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  // Don't hard-fail CI on a negative/incomplete result -- honest limits
  // are a valid Task 1 outcome per the CC-CMD's own instructions.
});
