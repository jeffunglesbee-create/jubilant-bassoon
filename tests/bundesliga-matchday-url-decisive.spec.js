// tests/bundesliga-matchday-url-decisive.spec.js
// CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts-v2 -- decisive retest.
//
// Real methodological bug found in the prior spec (bundesliga-bapi-verify):
// every run's matchday-switch logic picked `targetIdx = first option that
// isn't "All Matchdays"`, which is always the SAME option (Matchday 1) on
// every single run. Three "independent" capture windows all reported the
// DFL-DAY id staying constant -- but they were all testing the identical
// selection every time, never two DIFFERENT matchdays in the same run. That
// is not evidence the ID doesn't vary by matchday; it's evidence the test
// never varied the matchday.
//
// The prior run also found a real, load-bearing new fact: switching
// matchdays changes the page's own URL to
// /en/bundesliga/matchday/{season}/{matchdayNumber}
// (confirmed: urlAfterSwitch was exactly
// https://www.bundesliga.com/en/bundesliga/matchday/2026-2027/1).
//
// This spec uses that URL pattern directly: navigate to matchday 1, then
// navigate to matchday 5, in the SAME run, and compare the captured
// DFL-DAY id for each. This is the actual decisive test -- if the two
// direct-URL navigations produce two different DFL-DAY ids, the
// resolution mechanism is: matchdayNumber -> URL -> DFL-DAY (client
// resolves it, not necessarily an API call we can observe directly, but
// we CAN observe the resulting broadcasts request per matchday, which is
// exactly what a relay proxy would need).

const { test } = require('@playwright/test');
const fs = require('fs');

const SEASON = '2026-2027';
const MATCHDAYS_TO_TEST = [1, 5, 10];

test('bundesliga matchday URL directly determines DFL-DAY id -- decisive multi-matchday compare', async ({ page }) => {
  const result = {
    timestamp: new Date().toISOString(),
    season: SEASON,
    matchdaysTested: MATCHDAYS_TO_TEST,
    perMatchdayDayId: {},
    perMatchdayBroadcastsUrl: {},
    distinctDayIdsAcrossMatchdays: [],
    conclusiveVariation: null,
    error: null,
  };

  try {
    for (const md of MATCHDAYS_TO_TEST) {
      const dayIdsThisNav = new Set();
      let broadcastsUrlThisNav = null;

      const listener = (resp) => {
        const url = resp.url();
        if (!url.includes('bapi.bundesliga.com') || !url.includes('/broadcasts/')) return;
        const dm = url.match(/DFL-DAY-[A-Z0-9]+/);
        if (dm) dayIdsThisNav.add(dm[0]);
        broadcastsUrlThisNav = url;
      };
      page.on('response', listener);

      const targetUrl = `https://www.bundesliga.com/en/bundesliga/matchday/${SEASON}/${md}`;
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(5000);

      page.off('response', listener);

      result.perMatchdayDayId[md] = [...dayIdsThisNav];
      result.perMatchdayBroadcastsUrl[md] = broadcastsUrlThisNav;
    }

    const allIds = new Set();
    Object.values(result.perMatchdayDayId).forEach((ids) => ids.forEach((id) => allIds.add(id)));
    result.distinctDayIdsAcrossMatchdays = [...allIds];
    result.conclusiveVariation = allIds.size > 1;
  } catch (e) {
    result.error = String(e).slice(0, 500);
  } finally {
    fs.mkdirSync('outbox', { recursive: true });
    fs.writeFileSync('outbox/bundesliga-matchday-url-decisive-result.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  }
});
