'use strict';
// The forward-window probe's read of the field-data cache metadata, alone in a module so the probe and its checks
// share ONE definition (as scripts/forward-window-judge.cjs does for the verdict).
//
// WHY IT RETRIES. The page reloads itself when a freshly registered service worker reports `activated`
// (src/legacy/field.js: reg `updatefound` -> `statechange` -> `window.location.reload()`). A probe's browser context is
// always fresh, so its service worker is always the first, and whether the reload fires is a race with the probe's
// first read. When it fires between the wait resolving and the value being read, the read dies with
//   jsHandle.jsonValue: Execution context was destroyed, most likely because of a navigation
// and the whole run reported cacheAccepted:false, schema:null and "the window did not reach the client" for a page that
// was working. Of the 13 manifests committed 2026-10-19 to 2026-10-30, four carry exactly that metaError (10-21, 10-26,
// 10-28 and 10-30 21:11Z), each with two main-frame navigations where the green runs have one.
//
// WHAT IT RETRIES. A lost execution context, and nothing else. The wait has a 30 s timeout: a field-data file that was
// genuinely never accepted still has to fail, once, at 30 s, not three times for 90 s. Each retried loss is kept in the
// manifest's readFailures, so a survived race is visible in the artifact and not inferred.

const NAVIGATION_LOST = /Execution context was destroyed/;

// Runs in the page. Keeps the field names the manifest and the judge read: schema, for_date, window_dates, by_date.
const META_PREDICATE = () => {
  const m = window._plVerify && window._plVerify.fieldDataMeta && window._plVerify.fieldDataMeta();
  return m ? {
    schema: m.schema_version,
    for_date: m.for_date,
    window_dates: m.window_dates || null,
    by_date: m.games_found_by_date || null,
  } : false;
};

async function readFieldDataMeta(page, state, { attempts = 3, timeoutMs = 30000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const handle = await page.waitForFunction(META_PREDICATE, null, { timeout: timeoutMs });
      return await handle.jsonValue();
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (!NAVIGATION_LOST.test(msg) || attempt >= attempts) throw e;
      state.readFailures.push({ attempt, stage: 'meta', error: msg.slice(0, 200) });
    }
  }
}

module.exports = { readFieldDataMeta, META_PREDICATE, NAVIGATION_LOST };
