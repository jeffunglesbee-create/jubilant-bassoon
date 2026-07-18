// Field tier utilities — ranking and display labels for named game condition tiers.

/**
 * Numeric rank for sorting by tier importance.
 * Higher rank = higher priority. Returns 0 for unknown tiers.
 */
export function fieldTierRank(tier) {
  switch (tier) {
    case 'FINALS':           return 10;
    case 'ELIMINATION':      return 9;
    case 'CRUNCH':           return 8;
    case 'EXTRA_TIME':       return 7;
    case 'CLOSE_LATE':       return 6;
    case 'PLAYOFF_SERIES':   return 5;
    case 'MARQUEE_NATIONAL': return 4;
    case 'LIVE':             return 3;
    case 'UPCOMING':         return 2;
    default:                 return 0;
  }
}

/**
 * User-visible label for a tier. Factual condition string, never a number.
 */
export function fieldTierLabel(tier) {
  switch (tier) {
    case 'FINALS':           return 'FINALS';
    case 'ELIMINATION':      return 'ELIMINATION';
    case 'CRUNCH':           return 'CRUNCH TIME';
    case 'EXTRA_TIME':       return 'OT / EXTRA';
    case 'CLOSE_LATE':       return 'CLOSE GAME';
    case 'PLAYOFF_SERIES':   return 'PLAYOFF';
    case 'MARQUEE_NATIONAL': return 'MARQUEE';
    case 'LIVE':             return 'LIVE';
    default:                 return '';
  }
}
