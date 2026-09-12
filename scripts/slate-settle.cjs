// The settle criterion for the main slate, alone in a module so the probe and
// its test share ONE definition.
//
// CC-CMD-2026-09-12-slate-size-variance: the probe used to wait a flat 12s and
// report whatever the page held. The same page then read 129 cards and 45
// cards 23 minutes apart, zero page errors on both, and every consumer of those
// manifests took both numbers as final.
//
// A slate is settled when THREE consecutive samples agree and are non-zero.
// Three, not two: the V2 poll injects sections one sport at a time, so two
// equal readings can straddle a gap between injections. Non-zero because a
// page that has rendered nothing yet is trivially "stable" at 0 — that is the
// absence-collapse this project has Rule 99 for, and it would have declared
// the blank past-date page settled.
//
// Returns the INDEX into the series, never a time: the caller owns the
// sampling interval, and a function that assumed one would silently be wrong
// the moment the interval changed.
function settleScan(totals) {
  let equalRun = 0, last = null;
  for (let i = 0; i < totals.length; i++) {
    const t = totals[i];
    if (last !== null && t === last && t > 0) equalRun++;
    else equalRun = 0;
    last = t;
    if (equalRun >= 2) return { settledIndex: i, reached: true };
  }
  return { settledIndex: null, reached: false };
}

module.exports = { settleScan };
