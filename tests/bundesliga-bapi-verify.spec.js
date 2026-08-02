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
    initialPayloadCaptureCount: 0,
    initialPayloadCaptures: [],
    postConsentPayloadCaptureCount: 0,
    postConsentPayloadCaptures: [],
    // Novel-thinking retry: three prior real capture windows (initial load,
    // post-consent, post-matchday-switch UI click) all agreed the bapi
    // surface never sends a per-matchday day-ID. Rather than a 4th retry of
    // the same mechanism, this pass checks two different angles: (1) does
    // ANY other domain (not just bapi.bundesliga.com) carry a fixture list
    // with day-IDs, and (2) does the site's own URL change per matchday --
    // if so, direct URL navigation (not UI click) might be the real
    // resolution mechanism instead of a same-page refetch.
    otherDomainsSeen: [],
    otherDomainFixtureLikeHits: [],
    urlBeforeSwitch: null,
    urlAfterSwitch: null,
    directNavAttempted: false,
    directNavUrl: null,
    directNavDayId: null,
    error: null,
  };

  const dayIds = new Set();
  const comIds = new Set();
  const initialPayloadCaptures = [];
  const otherDomains = new Set();
  const fixtureLikeHits = [];
  let postConsentStartIdx = null;

  try {
    page.on('response', (resp) => {
      const url = resp.url();

      if (!url.includes('bapi.bundesliga.com')) {
        try {
          const host = new URL(url).host;
          if (host && host !== 'www.bundesliga.com') otherDomains.add(host);
        } catch (e) { /* ignore malformed URL */ }
        if (/fixture|schedule|calendar|matchlist|matches\b|season-?matches/i.test(url)) {
          fixtureLikeHits.push({ url, status: resp.status() });
        }
        return;
      }

      const dm = url.match(/DFL-DAY-[A-Z0-9]+/);
      const cm = url.match(/DFL-COM-[A-Z0-9]+/);
      if (dm) dayIds.add(dm[0]);
      if (cm) comIds.add(cm[0]);

      if (url.includes('/broadcasts/')) {
        result.realBroadcastsRequestCaptured = true;
        result.realBroadcastsUrl = url;
      }

      // Capture every bapi.bundesliga.com response seen from page load itself
      // (not just /broadcasts/) to check whether a single upfront call
      // already returns a full-season fixture list with day-IDs attached --
      // per the v2 outbox's own Rule 74 unblock criteria.
      resp.json().then((body) => {
        initialPayloadCaptures.push({
          url,
          status: resp.status(),
          bodyPreview: JSON.stringify(body).slice(0, 2000),
        });
      }).catch(() => {
        initialPayloadCaptures.push({ url, status: resp.status(), bodyPreview: null, nonJson: true });
      });
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

    // Snapshot whatever bapi.bundesliga.com responses fired during the raw
    // page load itself, before any consent dismissal or UI interaction --
    // this is the actual answer to "does the initial payload already carry
    // a full-season day-ID mapping."
    result.initialPayloadCaptureCount = initialPayloadCaptures.length;
    result.initialPayloadCaptures = initialPayloadCaptures.slice(0, 10);

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

    // Post-consent capture window: the prior run only captured traffic
    // BEFORE consent was dismissed. Real CMP-gated sites commonly defer
    // their real data fetches until consent is granted -- this is the
    // exact caveat disclosed as the remaining unblock criterion in the
    // v2 outbox doc. Mark the capture-array boundary now, wait for any
    // consent-triggered refetch, then diff against that boundary.
    postConsentStartIdx = initialPayloadCaptures.length;
    await page.waitForTimeout(5000);
    result.postConsentPayloadCaptureCount = initialPayloadCaptures.length - postConsentStartIdx;
    result.postConsentPayloadCaptures = initialPayloadCaptures.slice(postConsentStartIdx, postConsentStartIdx + 15);

    // Real root cause (found by reading outbox/bundesliga-post-consent.png,
    // taken once consent no longer blocked the view): the page has THREE
    // real mat-selects (season / matchday / clubs), all genuinely visible.
    // `.first()` on a generic class selector was grabbing whichever matches
    // first in DOM order -- very likely a hidden mobile/duplicate variant
    // of the same component (a common Angular responsive pattern), not the
    // visible "All Matchdays" one. Targeting by its real visible text
    // instead of DOM order.
    result.urlBeforeSwitch = page.url();

    const selectPlaceholder = page.getByText('All Matchdays', { exact: true }).first();
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

    result.urlAfterSwitch = page.url();
    result.otherDomainsSeen = [...otherDomains];
    result.otherDomainFixtureLikeHits = fixtureLikeHits.slice(0, 10);

    // Novel angle: if the UI switch changed the page's own URL (a route
    // param, not just an in-page mat-select state), the site may resolve
    // matchday -> data via URL-based routing rather than a same-page
    // refetch. Real test: navigate DIRECTLY to that URL fresh (simulating
    // a user landing on it, e.g. from a shared link) and see if the
    // resulting broadcasts call carries a different DFL-DAY id than the
    // one already seen (004CBT).
    if (result.urlAfterSwitch && result.urlAfterSwitch !== result.urlBeforeSwitch) {
      result.directNavAttempted = true;
      result.directNavUrl = result.urlAfterSwitch;
      const dayIdsBeforeNav = new Set(dayIds);
      try {
        await page.goto(result.urlAfterSwitch, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(4000);
        const newIds = [...dayIds].filter((id) => !dayIdsBeforeNav.has(id));
        result.directNavDayId = newIds.length ? newIds[0] : (result.realBroadcastsUrl
          ? (result.realBroadcastsUrl.match(/DFL-DAY-[A-Z0-9]+/) || [null])[0]
          : null);
      } catch (e) {
        result.directNavError = String(e).slice(0, 300);
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
    // response.json() promises may resolve after the point captured above --
    // take a final snapshot so late-resolving bodies aren't lost.
    result.initialPayloadCaptureCount = initialPayloadCaptures.length;
    result.initialPayloadCaptures = initialPayloadCaptures.slice(0, 10);
    if (typeof postConsentStartIdx === 'number') {
      result.postConsentPayloadCaptureCount = initialPayloadCaptures.length - postConsentStartIdx;
      result.postConsentPayloadCaptures = initialPayloadCaptures.slice(postConsentStartIdx, postConsentStartIdx + 15);
    }
    result.distinctDflDayIds = [...dayIds];
    result.distinctDflComIds = [...comIds];
    result.otherDomainsSeen = [...otherDomains];
    result.otherDomainFixtureLikeHits = fixtureLikeHits.slice(0, 10);
    fs.mkdirSync('outbox', { recursive: true });
    await page.screenshot({ path: 'outbox/bundesliga-matchday-page.png', fullPage: false }).catch(() => {});
    fs.writeFileSync('outbox/bundesliga-bapi-verify-result.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  }

  // Don't hard-fail CI on a negative/incomplete result -- honest limits
  // are a valid Task 1 outcome per the CC-CMD's own instructions.
});
