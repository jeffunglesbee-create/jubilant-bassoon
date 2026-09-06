// Does the deployed page actually render tennis when tennis is being played?
//
// WHY A BROWSER AND NOT AN ASSERTION ON THE SOURCE. smoke.js verifies that
// fetchTennisLive exists, is merged, and slices sets correctly. All four of
// those passed on 2026-09-06 while the page rendered no tennis at all — because
// the failure was never in the code that renders tennis, it was that no section
// was ever created. Structure and integration are different claims, and only
// one of them needs a browser.
//
// THE FAILURE THIS EXISTS TO CATCH went unnoticed for roughly three months.
// Tennis was gated on two hardcoded tournament windows, the Italian Open and
// Roland Garros, both of which closed in mid-2026. From then until 2026-09-06
// the sport rendered nothing, through an entire US Open, and nothing said so.
// A check that only ever runs on a day tennis happens to work is no check.
//
// THE COMPARISON IS THE POINT. This probe asks the relay how many tennis
// matches are live, then asks the page how many tennis cards it shows. Either
// number alone is meaningless: zero cards is correct at 4am and a defect during
// a Grand Slam. Only the pair decides.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const RELAY = process.env.RELAY_BASE || 'https://field-relay-nba.jeffunglesbee.workers.dev';
const TS = new Date().toISOString();
const stamp = TS.replace(/[:.]/g, '-');

(async () => {
  const manifest = {
    ts: TS, fieldUrl: FIELD_URL, relay: RELAY,
    relayReachable: null, relayLiveMatches: null,
    pageLoaded: null, tennisSectionPresent: null, tennisCardCount: null,
    sampleCardText: null, verdict: null, reason: null,
  };

  // 1. What the relay says is being played.
  try {
    const r = await fetch(`${RELAY}/bsd/tennis/matches/live`, { signal: AbortSignal.timeout(20000) });
    manifest.relayReachable = r.ok;
    if (r.ok) {
      const rows = await r.json();
      manifest.relayLiveMatches = Array.isArray(rows) ? rows.length : 0;
    }
  } catch (e) {
    manifest.relayReachable = false;
    manifest.reason = `relay unreachable: ${e.message}`;
  }

  // 2. What the page shows.
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
    await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // The tennis section arrives on the async supplemental merge, not on first
    // paint. Wait for the app's own readiness sentinel, then give the merge a
    // bounded window — a fixed sleep would be a guess about someone's network.
    await page.waitForFunction(() => window._fieldDataReady, { timeout: 30000 }).catch(() => {});
    await page.waitForSelector('.sport-section[data-sport="Tennis"]', { timeout: 20000 }).catch(() => {});
    manifest.pageLoaded = true;

    const counts = await page.evaluate(() => {
      const sec = document.querySelector('.sport-section[data-sport="Tennis"]');
      const cards = sec ? sec.querySelectorAll('.game-card') : [];
      return {
        present: Boolean(sec),
        cards: cards.length,
        sample: cards.length ? (cards[0].innerText || '').slice(0, 200) : null,
      };
    });
    manifest.tennisSectionPresent = counts.present;
    manifest.tennisCardCount = counts.cards;
    manifest.sampleCardText = counts.sample;

    await page.screenshot({ path: `outbox/tennis-live-probe-${stamp}.png`, fullPage: false });
    const sec = await page.$('.sport-section[data-sport="Tennis"]');
    if (sec) await sec.screenshot({ path: `outbox/tennis-live-probe-section-${stamp}.png` });
  } catch (e) {
    manifest.pageLoaded = false;
    manifest.reason = `page: ${e.message}`;
  } finally {
    if (browser) await browser.close();
  }

  // 3. The verdict, which needs BOTH numbers.
  //
  // UNKNOWN is a real outcome and is deliberately not a pass. If the relay
  // could not be reached, the page's zero cards proves nothing — that is the
  // "200 with an empty body" failure wearing a different hat.
  if (manifest.relayReachable !== true) {
    manifest.verdict = 'UNKNOWN';
    manifest.reason = manifest.reason || 'relay did not answer; the page count cannot be judged';
  } else if (manifest.pageLoaded !== true) {
    manifest.verdict = 'UNKNOWN';
  } else if (manifest.relayLiveMatches === 0) {
    // No tennis is being played. An empty page is correct, and saying it PASSED
    // would let a permanently broken page report green every night.
    manifest.verdict = 'NO PLAY';
    manifest.reason = 'relay reports zero live matches — nothing to render, nothing proven';
  } else if (manifest.tennisCardCount > 0) {
    manifest.verdict = 'PASS';
    manifest.reason = `relay ${manifest.relayLiveMatches} live, page ${manifest.tennisCardCount} card(s)`;
  } else {
    manifest.verdict = 'FAIL';
    manifest.reason = `relay reports ${manifest.relayLiveMatches} live match(es), page renders `
      + `${manifest.tennisCardCount} tennis card(s) — this is the 2026-06..09 regression`;
  }

  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/tennis-live-probe-manifest-${stamp}.json`, JSON.stringify(manifest, null, 2));
  fs.writeFileSync('outbox/tennis-live-probe-latest.json', JSON.stringify(manifest, null, 2));

  console.log(JSON.stringify(manifest, null, 2));
  console.log(`\n${manifest.verdict}: ${manifest.reason}`);
  // FAIL is the only exit-1. NO PLAY and UNKNOWN are honest non-results and
  // must not go red, or the probe trains people to ignore it.
  process.exit(manifest.verdict === 'FAIL' ? 1 : 0);
})();
