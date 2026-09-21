// Extracted from tennis_live_probe.js so a test can exercise THIS function
// rather than a copy of it — the mistake check-sections-gap-streak-logic.mjs
// already names in its own header. The probe requires it; nothing here touches
// the network, the filesystem or a browser, so importing it is free.
'use strict';

/**
 * WHERE THE ROWS WERE LOST, as one clause for the reason line.
 *
 * Reads the producer's own account in order and stops at the FIRST boundary
 * that explains the loss, because naming two is naming none. Every branch ends
 * in a fact that was read, never in a cause that was inferred.
 */
function boundaryLine(m) {
  if (m.diagRan === 'absent') {
    return 'the page carries no tennis instrumentation, so the boundary is unknown '
      + '(deployed bundle predates it — check SW_VERSION)';
  }
  if (m.diagRan !== true) {
    return 'the producer never ran: fetchTennisLive did not reach its first await';
  }
  if (m.producerThrew) return `the producer threw: ${m.producerThrew}`;
  const live = m.feedLiveOutcome, day = m.feedByDateOutcome;
  const feeds = `feeds live=${live ?? '?'} by-date=${day ?? '?'}`;
  // `empty` IS A SUCCESSFUL READ. The feed answered, parsed, and had no tennis
  // in it — which is a day with no matches, not a failure to ask. Treating it
  // as bad was the first version of this line and it called a quiet Tuesday a
  // double outage. The same absence collapse this whole document is about,
  // rebuilt inside the reader written to report it, and caught by the test
  // rather than by reading it back.
  const bad = (o) => o != null && !String(o).startsWith('ok:') && String(o) !== 'empty';
  if (m.rowsBeforeTier === 0) {
    // BOTH FEEDS EMPTY-HANDED, and the outcomes say whether that is a real
    // empty day or two failures wearing one.
    return bad(live) && bad(day)
      ? `NEITHER FEED DELIVERED: ${feeds} — the page never got rows to render`
      : `both feeds returned no rows: ${feeds}`;
  }
  if (m.rowsAfterTier === 0) {
    return `the TIER FILTER dropped all ${m.rowsBeforeTier} row(s) the page received (${feeds})`;
  }
  if (m.sectionReturned === 0) {
    return `the row MAPPING dropped all ${m.rowsAfterTier} allowed row(s) — every one failed the player-name guard`;
  }
  if (m.sectionInAllData === false) {
    return `the producer returned ${m.sectionReturned} game(s) but the section is NOT in allData — the async merge dropped it`;
  }
  if (m.sectionInAllData === true) {
    return `the section IS in allData with ${m.sectionReturned} game(s) — the RENDER dropped it, not the producer`;
  }
  return `the producer reports ${m.rowsAfterTier} allowed row(s) and ${m.sectionReturned} mapped (${feeds})`;
}

module.exports = { boundaryLine };
