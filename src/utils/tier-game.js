// Featured-tier predicate — true if game warrants a featured card slot.
// Reads MY_TEAMS and calls isScoutsPick as bare globals (both owned by field.js IIFE scope).

export function isFeaturedTierGame(g) {
  const rank = Math.min(g.homeCuratedRank ?? 99, g.awayCuratedRank ?? 99);
  if (rank <= 25) return true;
  if (MY_TEAMS.has(g.home) || MY_TEAMS.has(g.away)) return true;
  if (typeof isScoutsPick === 'function') {
    try { if (isScoutsPick(g)) return true; } catch(_e) {}
  }
  return false;
}
