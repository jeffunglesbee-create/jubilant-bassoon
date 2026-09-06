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
    cardsWithSetScore: null, cardsWithOpponent: null,
    cardsMissingScore: null, cardsMissingOpponent: null, chips: null,
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
      const cards = sec ? [...sec.querySelectorAll('.game-card')] : [];
      // textContent, not innerText. The first run read innerText and got "" on a
      // card the screenshot plainly showed, because innerText is layout-aware
      // and returns nothing for a hidden or not-yet-laid-out element.
      const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
      // A set score: "6-3", "7-6(6)", or several. This is what the card must
      // actually SAY. Counting cards is not reading them — the 05:30 run
      // reported PASS on seven cards that showed one player and no score at all.
      //
      // NO LEADING \b. The first version had one and reported 6 of 7 on a page
      // where all seven chips were correct. textContent concatenates a card's
      // elements with no separator, so the chip is glued to the player name:
      // "C. Papa v S. Ziegann" + "0-0 ○" reads as "Ziegann0-0", and `n` to `0`
      // is not a word boundary because both are word characters. The other six
      // matched by accident — their chips carry a second number after a space
      // ("· 30-15"), which does have one. The card the check named was correct
      // and the check was wrong.
      const SCORE = /\d{1,2}-\d{1,2}(\(\d{1,2}\))?/;
      const OPPONENT = / v /;
      // A COUNT CANNOT NAME WHAT IS OFF. The 05:47 run reported 6 of 7 cards
      // carrying a set score while its own screenshot showed seven chips, and
      // nothing in the manifest could say which card it meant. Same limitation
      // the F# gate solved by carrying the failing rows instead of a number.
      // Read the CHIP, not the whole card. The chip is where the score lives,
      // and scanning concatenated card text is what let a player's name change
      // whether the check could see it at all. A card with no chip element has
      // no score, which is the honest reading.
      const chipOf = (c) => txt(c.querySelector('.leader-chip'));
      const noScore = cards.filter((c) => !SCORE.test(chipOf(c)));
      const noOpp = cards.filter((c) => !OPPONENT.test(txt(c)));
      const name = (c) => (c.getAttribute('data-home') || txt(c).slice(0, 60) || '(unnamed)');
      return {
        present: Boolean(sec),
        cards: cards.length,
        withScore: cards.length - noScore.length,
        withOpponent: cards.length - noOpp.length,
        // The actual identities, plus their raw text, so a disagreement between
        // this and a screenshot is settleable rather than a puzzle.
        cardsMissingScore: noScore.map((c) => ({ home: name(c), text: txt(c).slice(0, 160) })),
        cardsMissingOpponent: noOpp.map((c) => ({ home: name(c), text: txt(c).slice(0, 160) })),
        // Every card's chip, so foreign content in a tennis card is visible.
        chips: cards.map((c) => ({
          home: c.getAttribute('data-home') || '(none)',
          chip: txt(c.querySelector('.leader-chip')) || '(no chip)',
        })),
        sample: cards.length ? txt(cards[0]).slice(0, 220) : null,
      };
    });
    manifest.tennisSectionPresent = counts.present;
    manifest.tennisCardCount = counts.cards;
    manifest.cardsWithSetScore = counts.withScore;
    manifest.cardsWithOpponent = counts.withOpponent;
    manifest.cardsMissingScore = counts.cardsMissingScore;
    manifest.cardsMissingOpponent = counts.cardsMissingOpponent;
    manifest.chips = counts.chips;
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
  } else if (manifest.tennisCardCount === 0) {
    manifest.verdict = 'FAIL';
    manifest.reason = `relay reports ${manifest.relayLiveMatches} live match(es), page renders `
      + `0 tennis cards — this is the 2026-06..09 regression`;
  } else if (manifest.cardsWithSetScore === 0 || manifest.cardsWithOpponent === 0) {
    // A card is not a result. The first run of this probe passed on seven cards
    // that each showed one player's name and nothing else — no opponent, no set
    // score — because it counted cards rather than reading them. Rendering an
    // empty card is a different defect from rendering none, and both are FAIL.
    manifest.verdict = 'FAIL';
    const names = [...(manifest.cardsMissingScore || []), ...(manifest.cardsMissingOpponent || [])]
      .map((c) => c.home).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    manifest.reason = `page renders ${manifest.tennisCardCount} tennis card(s) but `
      + `${manifest.cardsWithSetScore} carry a set score and `
      + `${manifest.cardsWithOpponent} name an opponent — empty: ${names || '(unnamed)'}`;
  } else {
    manifest.verdict = 'PASS';
    const short = (manifest.cardsMissingScore || []).map((c) => c.home);
    manifest.reason = `relay ${manifest.relayLiveMatches} live, page ${manifest.tennisCardCount} card(s), `
      + `${manifest.cardsWithSetScore} with a set score, ${manifest.cardsWithOpponent} with an opponent`
      // A partial PASS states WHICH card fell short in the same breath as the
      // verdict (Rule 91). "6 of 7" with no name is a puzzle, not a result.
      + (short.length ? ` — no score chip on: ${short.join(', ')}` : '');
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
