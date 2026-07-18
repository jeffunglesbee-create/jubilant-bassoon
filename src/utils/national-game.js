// National game predicate — true when the game carries a national broadcast bundle.

/**
 * Returns true if the game has a nationalBundle (i.e. is on a national broadcast).
 */
export function isNationalGame(g) { return !!(g.nationalBundle); }
