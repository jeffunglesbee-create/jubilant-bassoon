// tests/bundesliga-bapi-verify.spec.js
// CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts-v2 Task 1.
// Independent, jubilant-bassoon-only re-verification (no field-playground
// dependency). Real, confirmed answers from the v2 CC-CMD's own diagnostic:
// (1) a real x-api-key (60ETUJ4j5YagIHdu-PROD) was missing from the first
// attempt, explaining the 403s; (2) the matchday switcher is an Angular
// Material <mat-select>, not a button -- click .mat-mdc-select-placeholder
// to open it, then pick a different option from the opened panel.
//
// Hardened after a real LaLiga-probe failure with the same root cause risk:
// waitUntil:'networkidle' can hang indefinitely on sites with persistent
// analytics connections. Using domcontentloaded + explicit wait, and
// wrapping in try/finally so any failure still writes a real partial
// result instead of leaving stale data looking current.

const { test, expect } = require('@playwright/test');
const fs = require('fs');

const CONFIRMED_API_KEY = '60ETUJ4j5YagIHdu-PROD';

test('bundesliga bapi fresh re-verification + real matchday-nav ID resolution', async ({ page }) => {
  const result = {
    timestamp: new Date().toISOString(),
    confirmedKeyStillWorks: null,
    confirmedShapeStatus: null,
    consentDismissed: false,
    realBroadcastsRequestCaptured: false,
    realBroadcastsUrl: null,
    distinctDflDayIds: [],
    distinctDflComIds: [],
    matSelectFound: false,
    matSelectOptionsSeen: [],
    matchdaySwitchAttempted: false,
    matchdaySwitchSucceeded: false,
    error: null,
  };

  const dayIds = new Set();
  const comIds = new Set();

  try {
    page.on('response', (resp) => {
      const url = resp.url();
      if (url.includes('bapi.bundesliga.com') && url.includes('/broadcasts/')) {
        result.realBroadcastsRequestCaptured = true;
        result.realBroadcastsUrl = url;
        const dm = url.match(/DFL-DAY-[A-Z0-9]+/);
        const cm = url.match(/DFL-COM-[A-Z0-9]+/);
        if (dm) dayIds.add(dm[0]);
        if (cm) comIds.add(cm[0]);
      }
    });

    await page.goto('https://www.bundesliga.com/en/bundesliga/matchday', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(async () => {
      await page.goto('https://www.bundesliga.com/en/bundesliga', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    });
    await page.waitForTimeout(5000);

    // Real root cause, found by actually reading the committed screenshot
    // (outbox/bundesliga-matchday-page.png) rather than iterating on the
    // click mechanism again: the "outside of viewport" error was accurate,
    // not a scrolling bug -- a full-screen Sourcepoint/Contentpass consent
    // modal was still covering the entire page in every prior run. Every
    // guessed selector (OneTrust ID, generic "Accept"/"I agree" text) was
    // wrong -- the real buttons are "Agree & continue" / "Deny & surf
    // ad-free". Using the exact real text now.
    const consentSelectors = [
      'button:has-text("Agree & continue")',
      'button:has-text("Deny & surf ad-free")',
      'button:has-text("Accept")',
      'button:has-text("I agree")',
      'button:has-text("Alle akzeptieren")',
      '#onetrust-accept-btn-handler',
      '[data-testid="uc-accept-all-button"]',
    ];
    for (const sel of consentSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.count().catch(() => 0) > 0) {
        try {
          await btn.click({ timeout: 3000 });
          result.consentDismissed = true;
          await page.waitForTimeout(1500);
          break;
        } catch (e) { /* try next selector */ }
      }
    }
    // Consent banners are often inside a same-origin-looking but distinct
    // iframe (cp.bundesliga.com) -- also check inside any iframe directly.
    if (!result.consentDismissed) {
      for (const frame of page.frames()) {
        try {
          const btn = frame.locator('button:has-text("Agree & continue"), button:has-text("Accept"), button:has-text("Alle akzeptieren")').first();
          if (await btn.count().catch(() => 0) > 0) {
            await btn.click({ timeout: 3000 });
            result.consentDismissed = true;
            await page.waitForTimeout(1500);
            break;
          }
        } catch (e) { /* not this frame */ }
      }
    }
    fs.mkdirSync('outbox', { recursive: true });
    await page.screenshot({ path: 'outbox/bundesliga-post-consent.png', fullPage: false }).catch(() => {});

    // Real Material select interaction (identified via real DOM capture in
    // the v2 diagnostic) -- open the dropdown, enumerate real options, pick
    // a different one than what's currently shown.
    const selectPlaceholder = page.locator('.mat-mdc-select-placeholder, .mat-mdc-select-value-text').first();
    if (await selectPlaceholder.count().catch(() => 0) > 0) {
      result.matSelectFound = true;
      try {
        await selectPlaceholder.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await selectPlaceholder.click({ timeout: 5000 }).catch(() =>
          selectPlaceholder.click({ timeout: 5000, force: true })
        );
        await page.waitForTimeout(1000);
        const options = await page.locator('.mat-mdc-option, [role="option"]').allTextContents().catch(() => []);
        result.matSelectOptionsSeen = options.slice(0, 20);
        if (options.length > 1) {
          result.matchdaySwitchAttempted = true;
          // Pick an option that isn't "All Matchdays" / index 0, to force a
          // genuinely different matchday than whatever is currently shown.
          const targetIdx = options.findIndex((o, i) => i > 0 && !/all matchdays/i.test(o));
          if (targetIdx >= 0) {
            await page.locator('.mat-mdc-option, [role="option"]').nth(targetIdx).click({ timeout: 5000 });
            result.matchdaySwitchSucceeded = true;
            await page.waitForTimeout(4000);
          }
        }
      } catch (e) {
        result.matSelectError = String(e).slice(0, 300);
      }
    }

    result.distinctDflDayIds = [...dayIds];
    result.distinctDflComIds = [...comIds];

    // Direct confirmation of the real, already-verified auth key shape,
    // called from within the page context (real Origin/Referer handling).
    if (result.realBroadcastsUrl) {
      const confirmed = await page.evaluate(async ({ url, key }) => {
        try {
          const r = await fetch(url, {
            headers: {
              'x-api-key': key,
              'accept': 'application/json, text/plain, */*',
              'accept-language': 'en-EN',
            },
          });
          const status = r.status;
          return { status, ok: r.ok };
        } catch (e) {
          return { status: null, ok: false, error: String(e) };
        }
      }, { url: result.realBroadcastsUrl, key: CONFIRMED_API_KEY });
      result.confirmedShapeStatus = confirmed.status;
      result.confirmedKeyStillWorks = confirmed.ok;
    }
  } catch (e) {
    result.error = String(e).slice(0, 500);
  } finally {
    fs.mkdirSync('outbox', { recursive: true });
    await page.screenshot({ path: 'outbox/bundesliga-matchday-page.png', fullPage: false }).catch(() => {});
    fs.writeFileSync('outbox/bundesliga-bapi-verify-result.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  }

  // Don't hard-fail CI on a negative/incomplete result -- honest limits
  // are a valid Task 1 outcome per the CC-CMD's own instructions.
});
