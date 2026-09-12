// Featured-tier predicate — true if game warrants a featured card slot.
//
// MY_TEAMS IS A PARAMETER, NOT A GLOBAL. This file's previous comment read
// "Reads MY_TEAMS and calls isScoutsPick as bare globals (both owned by
// field.js IIFE scope)", and that belief was false: esbuild bundles this module
// into its own scope, so `MY_TEAMS` — a `let` inside field.js's IIFE, never on
// `window` — is an undeclared identifier here.
//
// Measured live 2026-09-12 (outbox/odds-line-probe-manifest-20260912T152317Z.json):
// twelve uncaught `ReferenceError: MY_TEAMS is not defined` at boot, every one
// `at isFeaturedTierGame`, called from an Array.filter. The CFB section carried
// 80 rows, crossed FEATURED_TIER_OVERFLOW_THRESHOLD, and every filter call
// threw. Today's slate rendered 16 cards where the same page had rendered 44.
//
// `isScoutsPick` survived only because it was reached through a `typeof` guard.
// Passing the Set in removes the question rather than guarding it: a caller
// that has no Set says so, and an absent Set and an empty one mean the same
// thing HERE — no team is followed — which is a real state, not a missing one.

export function isFeaturedTierGame(g, myTeams) {
  const rank = Math.min(g.homeCuratedRank ?? 99, g.awayCuratedRank ?? 99);
  if (rank <= 25) return true;
  if (myTeams && typeof myTeams.has === 'function' &&
      (myTeams.has(g.home) || myTeams.has(g.away))) return true;
  if (typeof isScoutsPick === 'function') {
    try { if (isScoutsPick(g)) return true; } catch(_e) {}
  }
  return false;
}
