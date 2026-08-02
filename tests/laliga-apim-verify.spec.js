// tests/laliga-apim-verify.spec.js
// CC-CMD-2026-08-02-wire-laliga-apim-standings Task 1.
// Independent, jubilant-bassoon-only re-verification (no field-playground
// dependency): (1) does www.laliga.com's __NEXT_DATA__ still ship a real
// subscription key, (2) does apim.laliga.com/.../clasificacion still
// authenticate with it and return real 200 standings data.
// Writes a structured result to outbox/laliga-apim-verify-result.json
// (Rule 90 artifact -- exact key found or NOT_FOUND, real HTTP status,
// real response shape, not prose).

const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('laliga apim fresh re-verification', async ({ page, request }) => {
  const result = {
    timestamp: new Date().toISOString(),
    nextDataKeyFound: false,
    subscriptionKey: null,
    clasificacionStatus: null,
    clasificacionOk: false,
    sampleTeams: [],
  };

  await page.goto('https://www.laliga.com/en-GB/laliga-easports/standing', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const nextData = await page.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    return el ? el.textContent : null;
  });

  if (nextData) {
    // The key ships somewhere inside the SSR payload as a plain string --
    // search broadly rather than assuming an exact JSON path, since the
    // payload shape is undocumented and could have shifted since discovery.
    const match = nextData.match(/[a-f0-9]{32}/i);
    if (match) {
      result.nextDataKeyFound = true;
      result.subscriptionKey = match[0];
    }
  }

  if (result.subscriptionKey) {
    const resp = await request.get(
      'https://apim.laliga.com/public-service/api/v1/digitalassets/clasificacion',
      {
        headers: { 'Ocp-Apim-Subscription-Key': result.subscriptionKey },
        timeout: 20000,
      }
    );
    result.clasificacionStatus = resp.status();
    result.clasificacionOk = resp.ok();
    if (resp.ok()) {
      try {
        const body = await resp.json();
        const teams = Array.isArray(body) ? body : (body.data || body.teams || []);
        result.sampleTeams = (teams || []).slice(0, 3).map(t =>
          t.teamName || t.name || t.team || JSON.stringify(t).slice(0, 60)
        );
      } catch (e) {
        result.parseError = String(e).slice(0, 200);
      }
    }
  }

  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync('outbox/laliga-apim-verify-result.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  // Don't hard-fail the CI job on a negative result -- a genuine "key
  // stopped working" finding is a valid, real Task 1 outcome per the
  // CC-CMD's own honesty requirement, not a bug in this probe.
});
