// tests/laliga-apim-verify.spec.js
// CC-CMD-2026-08-02-wire-laliga-apim-standings-v2 Task 1.
// Independent, jubilant-bassoon-only re-verification (no field-playground
// dependency). Real, confirmed answer from the v2 CC-CMD's own diagnostic:
// the key never rotated -- it's c13c3a8e2f6b46da9c5c425cf61fab3e (the
// ORIGINAL key), and the real query includes contentLanguage/countryCode
// params plus a specific real header set. This probe re-confirms that
// exact, already-verified shape fresh, rather than re-guessing.
//
// Hardened after a real failure: the first version used waitUntil:
// 'networkidle', which never resolves on this site (persistent analytics
// connections) -- a 45s timeout meant the test crashed before writing
// anything, silently leaving a stale prior result in place. Fixed to
// domcontentloaded + explicit wait, and wrapped in try/finally so any
// future failure still writes whatever partial result exists rather than
// leaving stale data looking current.

const { test, expect } = require('@playwright/test');
const fs = require('fs');

const CONFIRMED_KEY = 'c13c3a8e2f6b46da9c5c425cf61fab3e';
const CLASIFICACION_URL = 'https://apim.laliga.com/public-service/api/v1/digitalassets/clasificacion?contentLanguage=en&countryCode=US';

test('laliga apim fresh re-verification (confirmed real shape)', async ({ page }) => {
  const result = {
    timestamp: new Date().toISOString(),
    confirmedKeyStillWorks: null,
    confirmedShapeStatus: null,
    sampleTeams: [],
    nextDataKeyFound: false,
    subscriptionKeyInNextData: null,
    realClasificacionRequestCaptured: false,
    realClasificacionRequestHeaders: null,
    allApimRequestsSeen: [],
    error: null,
  };

  try {
    const capturedResponses = [];
    page.on('response', async (resp) => {
      const url = resp.url();
      if (url.includes('apim.laliga.com')) {
        result.allApimRequestsSeen.push({ url, status: resp.status() });
        if (url.includes('clasificacion')) {
          result.realClasificacionRequestCaptured = true;
          result.realClasificacionRequestHeaders = resp.request().headers();
          if (resp.ok()) {
            try { capturedResponses.push(await resp.json()); } catch (e) {}
          }
        }
      }
    });

    await page.goto('https://www.laliga.com/en-GB/laliga-easports/standing', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(async () => {
      await page.goto('https://www.laliga.com/en-GB/laliga-easports', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    });
    await page.waitForTimeout(6000);

    const nextData = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? el.textContent : null;
    });
    if (nextData) {
      const match = nextData.match(/[a-f0-9]{32}/i);
      if (match) {
        result.nextDataKeyFound = true;
        result.subscriptionKeyInNextData = match[0];
      }
    }

    if (capturedResponses.length) {
      const body = capturedResponses[0];
      const teams = Array.isArray(body) ? body : (body.data || body.teams || []);
      result.sampleTeams = (teams || []).slice(0, 3).map(t =>
        t.teamName || t.name || t.team || JSON.stringify(t).slice(0, 60)
      );
    }

    // Primary check: the exact, already-confirmed-working real shape from
    // the v2 CC-CMD's own diagnostic, called from within the page context
    // (real cookies/session/CORS handling, not a bare API request).
    const confirmed = await page.evaluate(async ({ url, key }) => {
      try {
        const r = await fetch(url, {
          headers: {
            'ocp-apim-subscription-key': key,
            'accept': 'application/json, text/plain, */*',
            'content-language': 'en',
            'country-code': 'US',
          },
        });
        const status = r.status;
        let body = null;
        try { body = await r.json(); } catch (e) {}
        return { status, ok: r.ok, body };
      } catch (e) {
        return { status: null, ok: false, error: String(e) };
      }
    }, { url: CLASIFICACION_URL, key: CONFIRMED_KEY });

    result.confirmedShapeStatus = confirmed.status;
    result.confirmedKeyStillWorks = confirmed.ok;
    if (confirmed.ok && confirmed.body) {
      const teams = Array.isArray(confirmed.body) ? confirmed.body : (confirmed.body.data || confirmed.body.teams || []);
      if (teams.length) {
        result.sampleTeams = teams.slice(0, 3).map(t =>
          t.teamName || t.name || t.team || JSON.stringify(t).slice(0, 60)
        );
      }
    }
  } catch (e) {
    result.error = String(e).slice(0, 500);
  } finally {
    fs.mkdirSync('outbox', { recursive: true });
    fs.writeFileSync('outbox/laliga-apim-verify-result.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  }

  // Don't hard-fail CI on a negative result -- a genuine "doesn't work"
  // finding is a valid, real Task 1 outcome, not a probe bug.
});
