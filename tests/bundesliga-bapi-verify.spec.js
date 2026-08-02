// tests/bundesliga-bapi-verify.spec.js
// CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts Task 1.
// Independent, jubilant-bassoon-only re-verification (no field-playground
// dependency):
//   1. Re-confirm the two originally-captured endpoints still return 200.
//   2. Attempt to find the real DFL-DAY-XXX ID resolution mechanism by
//      navigating between matchdays on the real site and capturing every
//      request to *.bundesliga.com, looking for (a) a different DFL-DAY-XXX
//      per matchday (confirms it's date-specific) and (b) any earlier
//      schedule/calendar/matchday-list call that could resolve date -> ID.
// Reports the honest result either way -- per the CC-CMD's own explicit
// instruction not to hardcode a guessed resolution if none is found.

const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('bundesliga bapi fresh re-verification + ID resolution search', async ({ page, request }) => {
  const result = {
    timestamp: new Date().toISOString(),
    originalEndpoints: {
      broadcasters: null,
      broadcastsDflDay004cbt: null,
    },
    capturedBundesligaRequests: [],
    distinctDflDayIds: [],
    candidateResolverEndpoints: [],
    matchdayNavAttempted: false,
    matchdayNavClickCount: 0,
  };

  // 1. Direct re-verification of the two originally-captured endpoints.
  const broadcastersResp = await request.get(
    'https://wapp.bapi.bundesliga.com/broadcasters?promoteInHeader=true',
    { timeout: 20000 }
  ).catch(e => ({ status: () => null, _err: String(e) }));
  result.originalEndpoints.broadcasters = broadcastersResp.status ? broadcastersResp.status() : null;

  const broadcastsResp = await request.get(
    'https://wapp.bapi.bundesliga.com/broadcasts/DFL-COM-000001/DFL-DAY-004CBT',
    { timeout: 20000 }
  ).catch(e => ({ status: () => null, _err: String(e) }));
  result.originalEndpoints.broadcastsDflDay004cbt = broadcastsResp.status ? broadcastsResp.status() : null;

  // 2. Real network capture while navigating the schedule/results page and
  // attempting to switch matchdays.
  const captured = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('bundesliga.com')) {
      captured.push({ url, method: req.method(), resourceType: req.resourceType() });
    }
  });

  await page.goto('https://www.bundesliga.com/en/bundesliga/matchday', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  }).catch(async () => {
    // Fallback path in case the exact URL structure has changed.
    await page.goto('https://www.bundesliga.com/en/bundesliga', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  });
  await page.waitForTimeout(3000);

  // Try to find and click matchday/date navigation controls generically --
  // real DOM structure unknown ahead of time, so this is defensive/broad.
  const navSelectors = [
    'button:has-text("Matchday")',
    '[aria-label*="matchday" i]',
    '[class*="matchday" i] button',
    '[class*="Matchday" i]',
    'button[class*="nav" i]',
  ];
  for (const sel of navSelectors) {
    const els = await page.locator(sel).all().catch(() => []);
    for (const el of els.slice(0, 3)) {
      try {
        await el.click({ timeout: 3000 });
        result.matchdayNavAttempted = true;
        result.matchdayNavClickCount++;
        await page.waitForTimeout(2000);
      } catch (e) { /* element not clickable, skip */ }
    }
    if (result.matchdayNavClickCount > 0) break;
  }

  result.capturedBundesligaRequests = captured.slice(0, 200).map(c => c.url);

  // Extract distinct DFL-DAY-XXX IDs from captured URLs.
  const dayIds = new Set();
  for (const c of captured) {
    const m = c.url.match(/DFL-DAY-[A-Z0-9]+/);
    if (m) dayIds.add(m[0]);
  }
  result.distinctDflDayIds = [...dayIds];

  // Look for any captured request that looks like a schedule/calendar/
  // matchday-list resolver rather than a single-matchday broadcast lookup.
  result.candidateResolverEndpoints = captured
    .filter(c => /matchdays|schedule|calendar|competition|season/i.test(c.url) && c.url.includes('bapi'))
    .map(c => c.url)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 20);

  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync('outbox/bundesliga-bapi-verify-result.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  // Honest-negative-result-is-valid -- do not hard-fail CI on "no resolver found".
});
