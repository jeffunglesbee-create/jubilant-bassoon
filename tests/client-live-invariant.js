// tests/client-live-invariant.js — Client-side live invariant
// (CC-CMD-2026-07-13-client-live-invariant)
//
// Checks the REAL deployed app's REAL rendered DOM against its own
// already-fetched game data: no .game-card may still carry the
// 'espn-live' class if the app's own findESPNScore(game) lookup for
// that same game already reports state === 'post' (final).
//
// Motivating bug (f71ac727): MLB game cards stuck showing Inn 9 live
// forever after the game had actually ended — two live witnesses (MLB
// Stats API status vs. the ESPN/V2 relay witness) disagreed, and
// nothing kept checking the fix stays fixed against real ongoing games.
// This is jubilant-bassoon's first client-side live invariant, matching
// field-relay-nba's post-deploy-live-verify.yml shape for the relay
// layer — but this one checks *rendering*, not stored data, so it has
// to run a real browser against the real deployed URL.
//
// Per STANDARDS.md Rule 47 (RELAY-CPU-A) and this CC-CMD's own explicit
// instruction: this reads a named state string ('post') and a named CSS
// class ('espn-live') only — it never computes or asserts on any
// composite drama/interest score.
//
// No fallback: this must load a real URL and read the real DOM/real
// in-page state. It never re-parses static index.html source (that
// would just be field_smoke.js again under a new name). If zero games
// are currently in a final-transition-relevant state, it reports that
// honestly via test.skip() and exits 0 — it does not fabricate a
// scenario or silently no-op forever.
//
// CLIENT_LIVE_INVARIANT_URL overrides the live production URL. CI never
// sets this — it always checks the real deployed site. It exists so
// this exact same checker can be pointed at a local fixture reproducing
// the stuck-card DOM shape, to prove (per Rule 97) that the invariant
// can actually fail before it's trusted — see
// docs/outbox/cc-client-live-invariant-2026-07-13.md for that proof.

const { test, expect } = require('@playwright/test');

const TARGET_URL = process.env.CLIENT_LIVE_INVARIANT_URL ||
  'https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt';

// Same wait-condition the existing viewport/browser test suites already use
// for "app ready" (window._fieldDataReady, set after first renderAll()) —
// not a new pattern.
async function awaitReady(page, bufferMs = 2000) {
  await page.waitForFunction(() => !!window._fieldDataReady, { timeout: 20000 }).catch(() => {});
  if (bufferMs > 0) await page.waitForTimeout(bufferMs);
}

test('client live invariant — no card stuck live for a game the data already says is final', async ({ page }) => {
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page, 2000);

  const result = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.game-card[data-gameid]'));
    const games = (typeof allData !== 'undefined' && allData && allData.sports)
      ? allData.sports.flatMap(sec => sec.games || [])
      : [];
    const gameById = new Map(games.map(g => [g._id, g]));

    let finalCount = 0;
    const violations = [];

    for (const card of cards) {
      const gameId = card.getAttribute('data-gameid');
      const game = gameById.get(gameId);
      if (!game) continue;
      if (typeof findESPNScore !== 'function') continue;

      // findESPNScore() is the exact same fact-lookup call renderESPNScores()
      // itself uses to decide the card's live/final class — not a re-derived
      // or approximated value.
      const score = findESPNScore(game);
      if (!score || score.state !== 'post') continue;

      finalCount++;
      if (card.classList.contains('espn-live')) {
        violations.push({
          gameId,
          home: game.home || card.getAttribute('data-home') || '',
          away: game.away || card.getAttribute('data-away') || '',
        });
      }
    }

    return { finalCount, violations, checked: cards.length };
  });

  if (result.finalCount === 0) {
    test.skip(true, 'SKIPPED — no relevant live data at check time (zero final-state games among rendered cards)');
    return;
  }

  expect(
    result.violations,
    `${result.violations.length} card(s) stuck live for a game the data already says is final: ${JSON.stringify(result.violations)}`
  ).toEqual([]);
});
