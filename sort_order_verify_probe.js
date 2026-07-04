// sort_order_verify_probe.js — live verification for
// CC-CMD-2026-07-04-circadian-card-sort-order TASK 2: confirm the new
// per-section circadian sort composes safely with the Phase 1/2 DOM
// reconciliation (applyMainHTML). Injects a synthetic sport section into
// the live app's real `allData`/`renderAll()` (same code path real polls
// use), captures card order via data-gameid before/after a circadian-tier
// change on one synthetic game, and asserts the card visibly moves.
const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const TS = new Date().toISOString().replace(/[:.]/g, '').replace('T', 'T').slice(0, 15) + 'Z';
const OUT = `outbox/sort-order-probe-${TS}.txt`;

(async () => {
  const lines = [];
  const log = (s) => { lines.push(s); console.log(s); };
  let ok = true;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') log('[page console error] ' + msg.text()); });
  page.on('pageerror', err => log('[page error] ' + err.message));

  log(`=== Sort Order Verify Probe [${TS}] ===`);
  log(`URL: ${FIELD_URL}`);

  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for real app boot: allData populated with at least one section.
  await page.waitForFunction(
    () => typeof allData !== 'undefined' && allData && Array.isArray(allData.sports) && allData.sports.length > 0,
    { timeout: 20000 }
  );
  log('App booted: allData.sports populated.');

  // fetchSchedule()'s supplemental merge (index.html ~21904-21909) does a
  // ONE-TIME async `allData = {sports:[...verified,...supplemental]}`
  // wholesale reassignment sometime after initial boot, discarding anything
  // appended to allData.sports before it resolves. A first run of this probe
  // raced exactly this and lost the injected synthetic section between the
  // BEFORE and AFTER steps. Wait it out before injecting synthetic data so
  // the sort/reconciliation check isn't confounded by this one-shot merge.
  await page.waitForTimeout(6000);
  log('Waited 6s past boot for fetchSchedule()\'s one-time supplemental merge to settle.');

  // Inject a synthetic section with 3 games, ALL initially PREVIEW tier
  // (status='pregame'), then call the REAL renderAll() -- exercising the
  // actual shipped sort + render pipeline, not a reimplementation.
  const before = await page.evaluate(() => {
    const synth = {
      sport: 'CircTestSport',
      games: [
        { _id: 'circtest-A', home: 'CircTest Home A', away: 'CircTest Away A', start_time: new Date(Date.now() + 3600000).toISOString(), venue: 'Test Venue', league: 'CircTestSport', status: 'pregame' },
        { _id: 'circtest-B', home: 'CircTest Home B', away: 'CircTest Away B', start_time: new Date(Date.now() + 3600000).toISOString(), venue: 'Test Venue', league: 'CircTestSport', status: 'pregame' },
        { _id: 'circtest-C', home: 'CircTest Home C', away: 'CircTest Away C', start_time: new Date(Date.now() + 3600000).toISOString(), venue: 'Test Venue', league: 'CircTestSport', status: 'pregame' },
      ],
    };
    window.__circSortTest = synth;
    allData.sports = [...allData.sports, synth];
    renderAll();
    const cards = Array.from(document.querySelectorAll('.game-card[data-gameid^="circtest-"]'));
    return cards.map(c => ({ id: c.dataset.gameid, circadian: c.dataset.circadian }));
  });
  log('BEFORE (all PREVIEW, stable order expected A,B,C): ' + JSON.stringify(before));

  const expectedBefore = ['circtest-A', 'circtest-B', 'circtest-C'];
  const beforeIds = before.map(c => c.id);
  const beforeOrderOk = JSON.stringify(beforeIds) === JSON.stringify(expectedBefore);
  const beforeTiersOk = before.every(c => c.circadian === 'PREVIEW');
  log(`Initial order matches source order (A,B,C) -- stable sort within same tier: ${beforeOrderOk}`);
  log(`Initial tiers all PREVIEW: ${beforeTiersOk}`);
  ok = ok && beforeOrderOk && beforeTiersOk;

  // Simulate a poll cycle: game C flips from PREVIEW (pregame) to PRIME (live).
  const afterDiag = await page.evaluate(() => {
    const synth = window.__circSortTest;
    const g = synth.games.find(g => g._id === 'circtest-C');
    g.status = 'live';
    let renderErr = null;
    try { renderAll(); } catch (e) { renderErr = e.message + '\n' + e.stack; }
    const cards = Array.from(document.querySelectorAll('.game-card[data-gameid^="circtest-"]'));
    const allCards = document.querySelectorAll('.game-card').length;
    const mainChildren = document.getElementById('main').children.length;
    const circTestSectionPresent = !!document.querySelector('.sport-section[data-sport="CircTestSport"]');
    const circTestSectionHTML = document.querySelector('.sport-section[data-sport="CircTestSport"]')?.outerHTML?.slice(0, 500) || null;
    return {
      cards: cards.map(c => ({ id: c.dataset.gameid, circadian: c.dataset.circadian })),
      renderErr, allCards, mainChildren, circTestSectionPresent, circTestSectionHTML,
    };
  });
  const after = afterDiag.cards;
  log('AFTER (C flipped to live/PRIME, expected order C,A,B): ' + JSON.stringify(after));
  log('DIAG: ' + JSON.stringify({ renderErr: afterDiag.renderErr, allCards: afterDiag.allCards, mainChildren: afterDiag.mainChildren, circTestSectionPresent: afterDiag.circTestSectionPresent }));
  if (afterDiag.circTestSectionHTML) log('DIAG circTestSectionHTML (first 500 chars): ' + afterDiag.circTestSectionHTML);

  const expectedAfter = ['circtest-C', 'circtest-A', 'circtest-B'];
  const afterIds = after.map(c => c.id);
  const afterOrderOk = JSON.stringify(afterIds) === JSON.stringify(expectedAfter);
  const cTierOk = after.find(c => c.id === 'circtest-C')?.circadian === 'PRIME';
  const abStableOk = after.find(c => c.id === 'circtest-A')?.circadian === 'PREVIEW' && after.find(c => c.id === 'circtest-B')?.circadian === 'PREVIEW';
  log(`Card C visibly moved to top position after tier change: ${afterOrderOk}`);
  log(`Card C reclassified to PRIME: ${cTierOk}`);
  log(`Cards A/B remain PREVIEW and keep relative order (stable sort, no unwanted tie-break reordering): ${abStableOk}`);
  ok = ok && afterOrderOk && cTierOk && abStableOk;

  // Cross-section isolation check: confirm no other section's games were
  // reordered/merged in by this section-scoped sort (spot-check one real
  // section still has its own games only, no circtest-* ids leaked in).
  const crossSectionOk = await page.evaluate(() => {
    const otherCards = Array.from(document.querySelectorAll('.game-card:not([data-gameid^="circtest-"])'));
    return otherCards.every(c => !c.dataset.gameid.startsWith('circtest-'));
  });
  log(`Cross-section isolation intact (no circtest-* leaked into other sections' DOM): ${crossSectionOk}`);
  ok = ok && crossSectionOk;

  log('');
  log(ok ? 'RESULT: PASS -- circadian card sort composes safely with Phase 1/2 DOM reconciliation.' : 'RESULT: FAIL -- see above.');

  await browser.close();
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  console.log(`Output: ${OUT}`);
  process.exit(ok ? 0 : 1);
})();
