'use strict';
// The forward-window probe's read of the field-data cache metadata, alone in a module so the probe and its checks
// share ONE definition (as scripts/forward-window-judge.cjs does for the verdict).
//
// WHY IT RETRIES. The page reloads itself when a service worker reports `activated` while the page already has a
// controller (src/legacy/field.js: reg `updatefound` -> `statechange` -> `window.location.reload()`, the only automatic
// reload in the client). A probe's browser context is always fresh. Whether the reload fires on a given load varies, and
// what decides it is not established here; sw.js has skipWaiting and clients.claim, so the first worker activates and
// claims on a fresh load. When it does fire, it has landed in the probe's read every time: the wait resolves, the page
// reloads, and the value is read from a destroyed context:
//   jsHandle.jsonValue: Execution context was destroyed, most likely because of a navigation
// The run then reported cacheAccepted:false and schema:null for a page that was working.
// In the 14 manifests of this (shallow) clone's history, 2026-10-19T17:35Z to 2026-10-30T21:25Z, nine have one main-frame
// navigation and a clean read; five have a second navigation 284 to 1065 ms after the load: 10-21, 10-26, 10-28 and
// 10-30 21:11Z died on it, and the 10-30 21:25Z run (the first after this module) survived it, with one `meta` entry in
// readFailures. On 10-21 the forward-day reads had worked (3 of 3 days reached the client) and only the metadata read was
// lost; on the other three nothing was read. The race is not whether the page reloads, which the probe cannot affect;
// it is whether a reload that does fire lands between the wait resolving and the value being read.
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
